from flask import Flask, request, jsonify, session
import requests
from flask_caching import Cache
from flask_cors import CORS
import logging
# from sentence_transformers import SentenceTransformer
# from flask_jwt_extended import create_access_token, jwt_required, JWTManager
# import chromadb
# from chromadb.config import Settings
import json
import os
import re
import subprocess
from pathlib import Path
import numpy as np
import datetime
from datetime import timedelta
import bcrypt

# Postgres (pg-apps-surface:5434, DB `millionaire` — cf pg_db.py)
import psycopg2.extras
import pg_db
from pg_db import get_conn, put_conn

# Market data: yfinance (free, no API key/quota) — replaces Alpha Vantage, cf yf_data.py
import yf_data

def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)
    # app.secret_key = os.urandom(24)

    # Configure JWT
    # app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'AI-Financial-Advisor-151124')  # Replace with a secure secret key
    # app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
    # jwt = JWTManager(app)

    cache = Cache(app, config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 300})
    logging.basicConfig(level=logging.DEBUG)
    # Initializing Embeddings model
    # embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

    # Initialize the ChromaDB client with updated settings
    # chroma_settings = Settings(persist_directory="chroma_data")
    # client = chromadb.Client(chroma_settings)
    # collection = client.get_or_create_collection("stock_data")

    # ------------ Hashing Passwords ------------
    # from werkzeug.security import generate_password_hash, check_password_hash

    # # Storing a hashed password
    # hashed_password = generate_password_hash(password)

    # # Verifying a password
    # check_password_hash(hashed_password, password)

    # ------------- Logging ------------------

    @app.before_request
    def log_request_info():
        app.logger.debug('--- Incoming Request ---')
        app.logger.debug('Request Method: %s', request.method)
        app.logger.debug('Request URL: %s', request.url)
        app.logger.debug('Request Headers: %s', request.headers)
        app.logger.debug('Request Body: %s', request.get_data())

    @app.after_request
    def log_response_info(response):
        app.logger.debug('--- Outgoing Response ---')
        app.logger.debug('Response Status: %s', response.status)
        app.logger.debug('Response Headers: %s', response.headers)
        app.logger.debug('Response Body: %s', response.get_data(as_text=True))
        return response

    # Local admin account that works without Cosmos DB configured
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@admin.com').lower()
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'password123')

    #  -------------- Postgres Initialization --------------
    # DB `millionaire` on pg-apps-surface:5434 (shared instance, cf pg_db.py). Optional locally:
    # without DATABASE_URL, skip DB setup so the app still starts and non-DB routes like /stocks/* keep working.
    db_pool = pg_db.pool
    if db_pool is not None:
        print('Postgres pool ready (millionaire DB).')

    # holdings columns are snake_case in Postgres but the frontend (ported from the
    # Cosmos-era shape) reads camelCase fields (purchasePrice, dateOfPurchase, ...)
    # -- alias here so callers get keys that actually match, instead of silently
    # returning undefined on the frontend.
    def fetch_holdings(cur, user_id):
        cur.execute(
            """SELECT id, symbol, amount, shares,
                   investment_type AS "investmentType",
                   purchase_price AS "purchasePrice",
                   current_price AS "currentPrice",
                   date_of_purchase AS "dateOfPurchase",
                   predicted_price AS "predictedPrice",
                   risk_assessment AS "riskAssessment"
               FROM holdings WHERE user_id = %s ORDER BY id""",
            (user_id,)
        )
        return cur.fetchall()

    # Temporary JSON-file portfolio for the local admin account (no Cosmos DB needed; survives restarts)
    ADMIN_PORTFOLIO_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'admin_portfolio.json')

    def load_admin_portfolio():
        if os.path.exists(ADMIN_PORTFOLIO_FILE):
            with open(ADMIN_PORTFOLIO_FILE, 'r') as f:
                return json.load(f)
        return []

    def save_admin_portfolio():
        with open(ADMIN_PORTFOLIO_FILE, 'w') as f:
            json.dump(admin_portfolio, f, indent=2)

    admin_portfolio = load_admin_portfolio()

    # -------------- TradingAgents chat bridge --------------
    # Runs the multi-agent TradingAgents graph (analysts -> debators -> trader) as a
    # subprocess in its own venv (heavy/conflicting deps vs this app's venv). Ticker
    # extraction uses a small Ollama call first since chat messages are free text but
    # TradingAgents needs an exact symbol. Both Ollama models used here are context-capped
    # aliases (see TradingAgents/.env) — the OpenAI-compat /v1 endpoint never sends
    # num_ctx, so an unaliased model loads at its max context and cold-loads for
    # >100s or silently truncates a large prompt (cf feedback_ollama_openai_compat_no_numctx).
    OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://192.168.100.200:11434')
    TICKER_EXTRACT_MODEL = os.environ.get('TICKER_EXTRACT_MODEL', 'mistral-small3.2-16k')
    TRADINGAGENTS_DIR = Path(os.environ.get(
        'TRADINGAGENTS_DIR', r'C:\AI\Tools\invest-brain-tester\TradingAgents'
    ))
    TRADINGAGENTS_PYTHON = TRADINGAGENTS_DIR / 'venv' / 'Scripts' / 'python.exe'
    # Ollama/Thor n'a pas la VRAM pour garder les 2 modèles TradingAgents chargés
    # en simultané (cf .env TradingAgents) -> bascules quick/deep fréquentes, et un
    # run avec beaucoup de rounds de débat peut accumuler largement plus de temps
    # que le cas nominal (AAPL: quelques minutes ; TSLA observé >900s). Marge large.
    TRADINGAGENTS_TIMEOUT_S = int(os.environ.get('TRADINGAGENTS_TIMEOUT_S', '1800'))

    def extract_ticker_symbol(query, conversation_history):
        history_lines = []
        for turn in (conversation_history or [])[-6:]:
            for role, text in turn.items():
                history_lines.append(f'{role}: {text}')
        prompt = (
            'Extract the single stock ticker symbol the user is asking about '
            '(e.g. AAPL, TSLA, MSFT). Reply with ONLY compact JSON, no prose: '
            '{"symbol": "TICKER"} or {"symbol": null} if none is clearly identifiable.\n\n'
            f'Conversation so far:\n{chr(10).join(history_lines)}\n\n'
            f'Latest message: {query}'
        )
        try:
            resp = requests.post(
                f'{OLLAMA_BASE_URL}/api/chat',
                json={
                    'model': TICKER_EXTRACT_MODEL,
                    'messages': [{'role': 'user', 'content': prompt}],
                    'stream': False,
                    'format': 'json',
                },
                timeout=30,
            )
            resp.raise_for_status()
            content = resp.json()['message']['content']
            symbol = json.loads(content).get('symbol')
            if symbol and re.fullmatch(r'[A-Za-z.\-]{1,6}', symbol):
                return symbol.upper()
        except Exception as e:
            app.logger.error('Ticker extraction failed: %s', str(e))
        return None

    def run_trading_agents(symbol):
        env = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
        proc = subprocess.run(
            [str(TRADINGAGENTS_PYTHON), 'run_decision_json.py', symbol],
            cwd=str(TRADINGAGENTS_DIR), env=env,
            capture_output=True, text=True, encoding='utf-8', errors='replace',
            timeout=TRADINGAGENTS_TIMEOUT_S,
        )
        marker = '###RESULT_JSON###'
        idx = proc.stdout.rfind(marker)
        if idx == -1:
            raise RuntimeError(
                (proc.stderr or proc.stdout or 'TradingAgents run produced no output')[-2000:]
            )
        return json.loads(proc.stdout[idx + len(marker):].strip())

    def persist_decision(result):
        if db_pool is None:
            return
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO decisions
                           (ticker, run_at, recommendation, deep_thinking_model,
                            quick_thinking_model, agent_output, tool_call_verified)
                       VALUES (%s, now(), %s, %s, %s, %s, %s)""",
                    (
                        result['ticker'], result['rating'],
                        result.get('deep_thinking_model'), result.get('quick_thinking_model'),
                        psycopg2.extras.Json(result), True,
                    )
                )
                conn.commit()
        except psycopg2.Error as e:
            conn.rollback()
            app.logger.error('Failed to persist decision for %s: %s', result.get('ticker'), str(e))
        finally:
            put_conn(conn)

    # Routes that need Cosmos DB; return a clean 503 instead of crashing when it's unavailable.
    # 'login', 'get_user_details', 'add_stock_to_portfolio' and 'delete_portfolio' are excluded
    # because they handle the admin account (and the DB-unavailable case) themselves.
    DB_BACKED_ENDPOINTS = {'signup'}

    @app.before_request
    def require_db_when_needed():
        if db_pool is None and request.endpoint in DB_BACKED_ENDPOINTS:
            return jsonify({"message": "Postgres is not configured locally (DATABASE_URL missing)."}), 503

    # -------------- Auth Routes --------------

    @app.route('/')
    def home():
        return "<h1>AI Financial Advisor Backend</h1><p>The backend is running successfully.</p>"


    @app.errorhandler(404)
    def not_found(e):
        return "<h1>404 Not Found</h1><p>The requested resource could not be found.</p>", 404



    @app.route('/signup', methods=['POST'])
    def signup():
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        gender = data.get('gender')
        age = data.get('age')
        investment_goal = data.get('investmentGoal')
        risk_appetite = data.get('riskAppetite')
        time_horizon = data.get('timeHorizon')

        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM users WHERE email = %s", (email,))
                if cur.fetchone():
                    return jsonify({"message": "Email already exists"}), 400

                cur.execute(
                    """INSERT INTO users (email, username, password_hash, gender, age,
                       investment_goal, risk_appetite, time_horizon)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (email, username, hashed_password.decode('utf-8'), gender, age,
                     investment_goal, risk_appetite, time_horizon)
                )
                conn.commit()
            return jsonify({"message": "User signed up successfully"}), 201
        except psycopg2.Error as e:
            conn.rollback()
            return jsonify({"message": "Error creating user", "error": str(e)}), 500
        finally:
            put_conn(conn)

    # Login Route
    @app.route('/login', methods=['POST'])
    def login():
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        # Local admin account, works even without Cosmos DB configured
        if email and email.lower() == ADMIN_EMAIL and password == ADMIN_PASSWORD:
            return jsonify({
                "message": "Login successful",
                "email": ADMIN_EMAIL,
                "username": "admin",
            }), 200

        if db_pool is None:
            return jsonify({"message": "Postgres is not configured locally (DATABASE_URL missing)."}), 503

        # Retrieve user by email
        conn = get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT email, username, password_hash FROM users WHERE email = %s", (email,))
                user = cur.fetchone()
            if not user:
                return jsonify({"message": "User not found"}), 400
        except psycopg2.Error as e:
            return jsonify({"message": "Error retrieving user", "error": str(e)}), 500
        finally:
            put_conn(conn)

        # Check if password matches
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({"message": "Invalid credentials"}), 400

        # Return user details in the response
        response_data = {
            "message": "Login successful",
            "email": user['email'],
            "username": user['username'],
            # Include other user details if needed
        }
        return jsonify(response_data), 200

    # -------------- User Account Routes --------------

    @app.route('/user-details/<email>', methods=['GET'])
    def get_user_details(email):
        # Local admin account, works even without Cosmos DB configured
        if email.lower() == ADMIN_EMAIL:
            return jsonify({
                "email": ADMIN_EMAIL,
                "username": "admin",
                "gender": "N/A",
                "age": None,
                "investmentGoal": "Income Generation",
                "riskAppetite": "Medium",
                "timeHorizon": "Short Term",
                "portfolio": admin_portfolio
            }), 200

        if db_pool is None:
            return jsonify({"message": "Postgres is not configured locally (DATABASE_URL missing)."}), 503

        # Retrieve user + portfolio by email
        conn = get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """SELECT id, email, username, gender, age, investment_goal,
                       risk_appetite, time_horizon FROM users WHERE email = %s""",
                    (email,)
                )
                user = cur.fetchone()
                if not user:
                    return jsonify({"message": "User not found"}), 404

                portfolio = fetch_holdings(cur, user['id'])

            user_details = {
                "email": user['email'],
                "username": user['username'],
                "gender": user['gender'],
                "age": user['age'],
                "investmentGoal": user['investment_goal'],
                "riskAppetite": user['risk_appetite'],
                "timeHorizon": user['time_horizon'],
                "portfolio": portfolio
            }
            return jsonify(user_details), 200
        except psycopg2.Error as e:
            return jsonify({"message": "Error retrieving user details", "error": str(e)}), 500
        finally:
            put_conn(conn)

    @app.route('/user/<email>/portfolio', methods=['POST'])
    def add_stock_to_portfolio(email):
        data = request.get_json()
        new_stock = data.get('stock')

        if not new_stock:
            return jsonify({"message": "No stock data provided"}), 400

        # Local admin account, works even without Cosmos DB configured
        if email.lower() == ADMIN_EMAIL:
            admin_portfolio.append(new_stock)
            save_admin_portfolio()
            return jsonify({"message": "Stock added to portfolio successfully", "portfolio": admin_portfolio}), 200

        if db_pool is None:
            return jsonify({"message": "Postgres is not configured locally (DATABASE_URL missing)."}), 503

        conn = get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                user = cur.fetchone()
                if not user:
                    return jsonify({"message": "User not found"}), 404

                cur.execute(
                    """INSERT INTO holdings (user_id, symbol, amount, shares, investment_type,
                       purchase_price, current_price, date_of_purchase, predicted_price, risk_assessment)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (user['id'], new_stock.get('symbol'), new_stock.get('amount'), new_stock.get('shares'),
                     new_stock.get('investmentType'), new_stock.get('purchasePrice'), new_stock.get('currentPrice'),
                     new_stock.get('dateOfPurchase'), new_stock.get('predictedPrice'), new_stock.get('riskAssessment'))
                )
                conn.commit()

                portfolio = fetch_holdings(cur, user['id'])

            return jsonify({"message": "Stock added to portfolio successfully", "portfolio": portfolio}), 200

        except psycopg2.Error as e:
            conn.rollback()
            return jsonify({"message": "Error updating portfolio", "error": str(e)}), 500
        finally:
            put_conn(conn)

    # Saves the AI (TradingAgents) rating onto every holding of this symbol for the
    # user -- risk_assessment is a property of the symbol, not of a specific lot.
    @app.route('/user/<email>/portfolio/<symbol>/risk-assessment', methods=['PATCH'])
    def update_holding_risk_assessment(email, symbol):
        data = request.get_json(force=True, silent=True) or {}
        risk_assessment = data.get('riskAssessment')
        if not risk_assessment:
            return jsonify({"message": "riskAssessment is required"}), 400

        symbol = symbol.strip().upper()

        if email.lower() == ADMIN_EMAIL:
            updated = False
            for stock in admin_portfolio:
                if (stock.get('symbol') or '').upper() == symbol:
                    stock['riskAssessment'] = risk_assessment
                    updated = True
            if not updated:
                return jsonify({"message": f"No holding found for {symbol}"}), 404
            save_admin_portfolio()
            return jsonify({"message": "Updated", "portfolio": admin_portfolio}), 200

        if db_pool is None:
            return jsonify({"message": "Postgres is not configured locally (DATABASE_URL missing)."}), 503

        conn = get_conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                user = cur.fetchone()
                if not user:
                    return jsonify({"message": "User not found"}), 404

                cur.execute(
                    "UPDATE holdings SET risk_assessment = %s WHERE user_id = %s AND symbol = %s",
                    (risk_assessment, user['id'], symbol)
                )
                if cur.rowcount == 0:
                    conn.rollback()
                    return jsonify({"message": f"No holding found for {symbol}"}), 404
                conn.commit()

                portfolio = fetch_holdings(cur, user['id'])

            return jsonify({"message": "Updated", "portfolio": portfolio}), 200
        except psycopg2.Error as e:
            conn.rollback()
            return jsonify({"message": "Error updating holding", "error": str(e)}), 500
        finally:
            put_conn(conn)

    @app.route('/delete-portfolio/<email>', methods=['DELETE'])
    def delete_portfolio(email):
        # Local admin account, works even without Cosmos DB configured
        if email.lower() == ADMIN_EMAIL:
            admin_portfolio.clear()
            save_admin_portfolio()
            return jsonify({"message": "User portfolio deleted successfully"}), 200

        if db_pool is None:
            return jsonify({"message": "Postgres is not configured locally (DATABASE_URL missing)."}), 503

        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                user = cur.fetchone()
                if not user:
                    return jsonify({"message": "User not found"}), 404

                cur.execute("DELETE FROM holdings WHERE user_id = %s", (user[0],))
                conn.commit()

            return jsonify({"message": "User portfolio deleted successfully"}), 200

        except psycopg2.Error as e:
            conn.rollback()
            return jsonify({"message": "Error deleting user portfolio", "error": str(e)}), 500
        finally:
            put_conn(conn)

    # -------------- Stock Routes --------------

    @cache.cached()
    @app.route('/stocks/quote', methods=['GET'])
    def get_stock_quote():
        symbol = request.args.get('symbol')

        if not symbol:
            return jsonify({'error': 'Please provide the stock symbol as a parameter.'}), 400

        try:
            data = yf_data.get_quote(symbol)
        except Exception as e:
            app.logger.error('yfinance quote failed for %s: %s', symbol, str(e))
            return jsonify({'error': f'Failed to fetch quote for {symbol}.'}), 500

        if data is None:
            return jsonify({'error': f'No quote data found for {symbol}.'}), 400

        return jsonify(data)

    @cache.cached()
    @app.route('/stocks/overview', methods=['GET'])
    def get_stock_overview():
        symbol = request.args.get('symbol')

        if not symbol:
            return jsonify({'error': 'Please provide the stock symbol as a parameter.'}), 400

        try:
            data = yf_data.get_overview(symbol)
        except Exception as e:
            app.logger.error('yfinance overview failed for %s: %s', symbol, str(e))
            return jsonify({'error': f'Failed to fetch overview for {symbol}.'}), 500

        if data is None:
            return jsonify({'error': f'No company overview found for {symbol}.'}), 400

        return jsonify(data)

    @cache.cached()
    @app.route('/stocks/income_statement', methods=['GET'])
    def get_income_statement():
        symbol = request.args.get('symbol')

        if not symbol:
            return jsonify({'error': 'Please provide the stock symbol as a parameter.'}), 400

        try:
            data = yf_data.get_income_statement(symbol)
        except Exception as e:
            app.logger.error('yfinance income statement failed for %s: %s', symbol, str(e))
            return jsonify({'error': f'Failed to fetch income statement for {symbol}.'}), 500

        return jsonify(data)

    @cache.cached()
    @app.route('/stocks/news', methods=['GET'])
    def get_stock_news():
        symbol = request.args.get('symbol')

        if not symbol:
            return jsonify({'error': 'Please provide the stock symbol as a parameter.'}), 400

        try:
            data = yf_data.get_news(symbol)
        except Exception as e:
            app.logger.error('yfinance news failed for %s: %s', symbol, str(e))
            return jsonify({'error': f'Failed to fetch news for {symbol}.'}), 500

        return jsonify(data)

    @cache.cached()
    @app.route('/stocks/insider_transactions', methods=['GET'])
    def get_insider_transactions():
        symbol = request.args.get('symbol')

        if not symbol:
            return jsonify({'error': 'Please provide the stock symbol as a parameter.'}), 400

        try:
            data = yf_data.get_insider_transactions(symbol)
        except Exception as e:
            app.logger.error('yfinance insider transactions failed for %s: %s', symbol, str(e))
            return jsonify({'error': f'Failed to fetch insider transactions for {symbol}.'}), 500

        return jsonify(data)

    @app.route('/stocks/time_series_monthly', methods=['GET'])
    @cache.cached(timeout=300, query_string=True)  # Cache for 5 minutes
    def get_stock_time_series_monthly():
        symbol = request.args.get('symbol')
        if not symbol:
            return jsonify({'error': 'Please provide the stock symbol as a parameter.'}), 400

        try:
            processed_data = yf_data.get_time_series(symbol, 'TIME_SERIES_MONTHLY')
        except Exception as e:
            app.logger.error('yfinance monthly time series failed for %s: %s', symbol, str(e))
            return jsonify({'error': f'Failed to fetch time series for {symbol}.'}), 500

        if processed_data is None:
            return jsonify({'error': 'No data found for the requested time series.'}), 400

        return jsonify({'symbol': symbol, 'data': processed_data})

    @app.route('/stocks/time_series', methods=['GET'])
    @cache.cached(timeout=300, query_string=True)
    def get_stock_time_series():
        symbol = request.args.get('symbol')
        time_series_function = request.args.get('function', 'TIME_SERIES_DAILY')

        app.logger.debug(f"Received time_series_function: {time_series_function}")

        if not symbol:
            return jsonify({'error': 'Please provide the stock symbol as a parameter.'}), 400

        if time_series_function not in ['TIME_SERIES_DAILY', 'TIME_SERIES_WEEKLY', 'TIME_SERIES_MONTHLY']:
            return jsonify({'error': f'Invalid time series function: {time_series_function}'}), 400

        try:
            processed_data = yf_data.get_time_series(symbol, time_series_function)
        except Exception as e:
            app.logger.error('yfinance time series failed for %s: %s', symbol, str(e))
            return jsonify({'error': f'Failed to fetch time series for {symbol}.'}), 500

        if processed_data is None:
            return jsonify({'error': 'No data found for the requested time series.'}), 400

        return jsonify({'symbol': symbol, 'data': processed_data})

    @cache.cached()
    @app.route('/stocks/daily', methods=['GET'])
    def get_stock_daily():
        symbol = request.args.get('symbol')
        outputsize = request.args.get('outputsize', 'compact')

        if not symbol:
            return jsonify({'error': 'Please provide the stock symbol as a parameter.'}), 400

        try:
            data = yf_data.get_daily_raw(symbol, outputsize)
        except Exception as e:
            app.logger.error('yfinance daily failed for %s: %s', symbol, str(e))
            return jsonify({'error': f'Failed to fetch daily data for {symbol}.'}), 500

        if data is None:
            return jsonify({'error': 'No data found for the requested time series.'}), 400

        return jsonify(data)

    # -------------- Top Stocks & Chat Routes --------------

    @cache.cached()
    @app.route('/stocks/top_movers', methods=['GET'])
    def get_top_movers():
        try:
            combined_data = yf_data.get_top_movers()
        except Exception as e:
            app.logger.error('yfinance top movers failed: %s', str(e))
            return jsonify({'error': 'Failed to fetch top movers.'}), 500

        if not combined_data['top_gainers'] and not combined_data['top_losers'] and not combined_data['most_active']:
            return jsonify({'error': 'No data found for top gainers, losers, or most active.'}), 400

        # Upsert into quote_cache (best-effort; skip if DB isn't configured)
        if db_pool is not None:
            conn = get_conn()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO quote_cache (symbol, data, fetched_at)
                           VALUES ('top_movers', %s, now())
                           ON CONFLICT (symbol) DO UPDATE SET data = EXCLUDED.data, fetched_at = now()""",
                        (json.dumps(combined_data),)
                    )
                    conn.commit()
            except psycopg2.Error as e:
                conn.rollback()
                app.logger.error('An error occurred while upserting quote_cache: %s', str(e))
            finally:
                put_conn(conn)

        return jsonify(combined_data)

    @app.route('/chat', methods=['POST'])
    def chat():
        data = request.get_json(force=True, silent=True) or {}
        query = (data.get('query') or '').strip()
        conversation_history = data.get('conversation_history') or []

        if not query:
            return jsonify({'response': "Pose une question sur une valeur, ex: \"Should I buy AAPL?\""})

        symbol = extract_ticker_symbol(query, conversation_history)
        if not symbol:
            return jsonify({
                'response': "Je n'ai pas identifié de symbole boursier clair dans ta question. "
                            "Précise un ticker (ex: AAPL, TSLA, MSFT)."
            })

        try:
            result = run_trading_agents(symbol)
        except subprocess.TimeoutExpired:
            app.logger.error('TradingAgents run timed out for %s', symbol)
            return jsonify({'response': f"L'analyse de {symbol} a pris trop de temps (>{TRADINGAGENTS_TIMEOUT_S}s). Réessaie."}), 504
        except Exception as e:
            app.logger.error('TradingAgents run failed for %s: %s', symbol, str(e))
            return jsonify({'response': f"Erreur pendant l'analyse de {symbol}: {e}"}), 500

        persist_decision(result)

        response_text = f"**{result['ticker']} — {result['rating']}**\n\n{result.get('final_trade_decision', '')}"
        return jsonify({'response': response_text})

    # On-demand TradingAgents run for a known ticker (Advisor "Ajouter au portefeuille"
    # flow and Portfolio "Analyser" button both need a real rating, not free-text chat).
    # Same multi-minute cost as /chat (cf run_trading_agents) -- always button-triggered
    # on the frontend, never fetched automatically on page load.
    @app.route('/stocks/<symbol>/analyze', methods=['POST'])
    def analyze_stock(symbol):
        symbol = symbol.strip().upper()

        try:
            result = run_trading_agents(symbol)
        except subprocess.TimeoutExpired:
            app.logger.error('TradingAgents run timed out for %s', symbol)
            return jsonify({'error': f'Analysis of {symbol} timed out (>{TRADINGAGENTS_TIMEOUT_S}s).'}), 504
        except Exception as e:
            app.logger.error('TradingAgents run failed for %s: %s', symbol, str(e))
            return jsonify({'error': f'Analysis of {symbol} failed: {e}'}), 500

        persist_decision(result)

        return jsonify({
            'ticker': result['ticker'],
            'rating': result['rating'],
            'summary': result.get('final_trade_decision', ''),
        })

    # -------------- Invest Brain Tester (n8n wf1/wf2 proxy) --------------
    # Ported from the standalone 1 PROJECTS/Millionaire/docs/index.html tester.
    # Thin proxy so the browser never needs the n8n URL/mode directly.
    N8N_BASE_URL = os.environ.get('N8N_BASE_URL', 'http://192.168.100.200:5678')
    N8N_TEST_MODE = os.environ.get('N8N_TEST_MODE', 'true').lower() == 'true'
    N8N_WEBHOOK_PREFIX = 'webhook-test' if N8N_TEST_MODE else 'webhook'
    # LLM node inside the workflow -- same Thor/Ollama contention as TradingAgents
    # (cf TRADINGAGENTS_TIMEOUT_S), can run well past the original UI's "10-60s" estimate.
    N8N_TIMEOUT_S = int(os.environ.get('N8N_TIMEOUT_S', '300'))

    def call_n8n_webhook(path, payload):
        url = f'{N8N_BASE_URL}/{N8N_WEBHOOK_PREFIX}/{path}'
        resp = requests.post(url, json=payload, timeout=N8N_TIMEOUT_S)
        try:
            body = resp.json()
        except ValueError:
            body = resp.text
        return body, resp.status_code

    @app.route('/api/config', methods=['GET'])
    def invest_brain_config():
        return jsonify({'baseUrl': N8N_BASE_URL, 'testMode': N8N_TEST_MODE})

    @app.route('/api/wf1', methods=['POST'])
    def invest_brain_wf1():
        data = request.get_json(force=True, silent=True) or {}
        try:
            body, status = call_n8n_webhook('chasseur-test-evaluateur', data)
        except requests.RequestException as e:
            app.logger.error('n8n wf1 call failed: %s', str(e))
            return jsonify({'error': f'n8n unreachable: {e}'}), 502
        return jsonify(body), status

    @app.route('/api/wf2', methods=['POST'])
    def invest_brain_wf2():
        data = request.get_json(force=True, silent=True) or {}
        try:
            body, status = call_n8n_webhook('anti-ruine-gatekeeper', data)
        except requests.RequestException as e:
            app.logger.error('n8n wf2 call failed: %s', str(e))
            return jsonify({'error': f'n8n unreachable: {e}'}), 502
        return jsonify(body), status

    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        return response

    # @app.route('/query', methods=['POST'])
    # def query_data():
    #     data = request.get_json()
    #     query_text = data.get('query')

    #     if not query_text:
    #         return jsonify({'error': 'Please provide a query in the request body.'}), 400

    #     # Generate embedding for the query
    #     # query_embedding = generate_embedding(query_text)

    #     # Query the vector database
    #     # results = collection.query(
    #     #     # query_embeddings=[query_embedding],
    #     #     n_results=5,  # Number of results to return
    #     #     include=['documents', 'metadatas']  # Include documents and metadata in the response
    #     # )

    #     return jsonify(results)

    # -------------- ML Processing Routes --------------

    # Re-Ranking news articles
    @app.route('/api/rank-news', methods=['POST'])
    def rank_news():
        data = request.get_json()
        news_articles = data.get('newsArticles', [])

        if not news_articles:
            return jsonify({'error': 'No news articles provided.'}), 400

        # Perform ranking
        ranked_articles = rank_news_by_impact(news_articles)

        return jsonify(ranked_articles), 200

    def rank_news_by_impact(news_articles):
        # Define weights for different factors
        SENTIMENT_WEIGHT = 0.5
        RECENCY_WEIGHT = 0.3
        SOURCE_WEIGHT = 0.2

        # Current date for recency calculation
        current_time = datetime.datetime.utcnow()

        # Predefined credibility scores for sources (example values)
        source_credibility = {
            'Reuters': 1.0,
            'Bloomberg': 0.9,
            'Wall Street Journal': 0.9,
            'CNBC': 0.8,
            'Yahoo Finance': 0.7,
            'Motley Fool': 0.6,
            'Seeking Alpha': 0.6,
            'Benzinga': 0.5,
            # Add more sources as needed
        }

        ranked_articles = []

        for idx, article in enumerate(news_articles):
            try:
                # Sentiment score: Convert to absolute value to capture extreme sentiments
                sentiment_score = abs(float(article.get('overall_sentiment_score', 0)))

                # Recency score: Inverse of the time difference in hours
                time_published = article.get('time_published')
                # Parse time_published, expected format: '20241023T224500'
                try:
                    article_time = datetime.datetime.strptime(time_published, '%Y%m%dT%H%M%S')
                    time_diff = (current_time - article_time).total_seconds() / 3600  # Time difference in hours
                    recency_score = 1 / (1 + time_diff)
                except ValueError as ve:
                    app.logger.warning(f"Article {idx} has invalid time_published format: {time_published}. Setting recency_score to 0.")
                    recency_score = 0  # If parsing fails, set recency to 0

                # Source credibility score
                source = article.get('source', '').strip()
                credibility_score = source_credibility.get(source, 0.5)  # Default credibility is 0.5

                # Calculate overall impact score
                impact_score = (SENTIMENT_WEIGHT * sentiment_score +
                                RECENCY_WEIGHT * recency_score +
                                SOURCE_WEIGHT * credibility_score)

                # Add impact_score to the article
                ranked_article = article.copy()
                ranked_article['impact_score'] = impact_score

                ranked_articles.append(ranked_article)

            except Exception as e:
                app.logger.error(f"Error processing article {idx}: {e}")
                continue  # Skip this article and proceed with others

        # Sort articles by impact_score in descending order
        ranked_articles = sorted(ranked_articles, key=lambda x: x.get('impact_score', 0), reverse=True)

        return ranked_articles

    return app

# Create the Flask app
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
