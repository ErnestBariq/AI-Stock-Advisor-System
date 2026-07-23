"""yfinance-backed replacements for the Alpha Vantage calls in app.py.

Every function here returns the exact same JSON shape the old Alpha Vantage
passthrough produced (frontend and any n8n workflow reading /stocks/* rely on
those field names), just sourced from yfinance instead — free, no API key,
no 25-req/day cap.
"""
import re
from datetime import datetime, timezone

import yfinance as yf

_TIME_SERIES_PARAMS = {
    'TIME_SERIES_DAILY': ('6mo', '1d'),
    'TIME_SERIES_WEEKLY': ('2y', '1wk'),
    'TIME_SERIES_MONTHLY': ('5y', '1mo'),
}


def _is_nan(value):
    return value is None or value != value  # NaN != NaN


def get_quote(symbol):
    # FastInfo is attribute-accessed, not a real dict — .get() silently returns None.
    fi = yf.Ticker(symbol).fast_info
    price = getattr(fi, 'last_price', None)
    prev_close = getattr(fi, 'previous_close', None)
    if price is None or prev_close is None:
        return None
    change = price - prev_close
    change_pct = (change / prev_close * 100) if prev_close else 0
    return {
        'Global Quote': {
            '01. symbol': symbol.upper(),
            '02. open': getattr(fi, 'open', None),
            '03. high': getattr(fi, 'day_high', None),
            '04. low': getattr(fi, 'day_low', None),
            '05. price': price,
            '06. volume': getattr(fi, 'last_volume', None),
            '07. latest trading day': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            '08. previous close': prev_close,
            '09. change': change,
            '10. change percent': f'{change_pct:.4f}%',
        }
    }


def get_overview(symbol):
    info = yf.Ticker(symbol).info or {}
    name = info.get('longName') or info.get('shortName')
    if not name:
        return None
    return {
        'Symbol': symbol.upper(),
        'Name': name,
        'Description': info.get('longBusinessSummary', ''),
        'Sector': info.get('sector', 'N/A'),
        'Industry': info.get('industry', 'N/A'),
        'MarketCapitalization': info.get('marketCap'),
        'PERatio': info.get('trailingPE'),
        'EPS': info.get('trailingEps'),
        'DividendYield': info.get('dividendYield'),
        '52WeekHigh': info.get('fiftyTwoWeekHigh'),
        '52WeekLow': info.get('fiftyTwoWeekLow'),
    }


def _income_reports(stmt):
    if stmt is None or stmt.empty:
        return []
    reports = []
    for col in stmt.columns:
        def val(row):
            if row not in stmt.index:
                return None
            v = stmt.loc[row, col]
            return None if _is_nan(v) else float(v)

        reports.append({
            'fiscalDateEnding': col.strftime('%Y-%m-%d'),
            'totalRevenue': val('Total Revenue'),
            'grossProfit': val('Gross Profit'),
            'netIncome': val('Net Income'),
        })
    return reports


def get_income_statement(symbol):
    ticker = yf.Ticker(symbol)
    return {
        'quarterlyReports': _income_reports(ticker.quarterly_income_stmt),
        'annualReports': _income_reports(ticker.income_stmt),
    }


def get_news(symbol, limit=10):
    items = yf.Ticker(symbol).news or []
    feed = []
    for item in items[:limit]:
        c = item.get('content', item)
        thumb = c.get('thumbnail') or {}
        resolutions = thumb.get('resolutions') or []
        banner = resolutions[-1]['url'] if resolutions else thumb.get('originalUrl')
        url = (
            (c.get('canonicalUrl') or {}).get('url')
            or (c.get('clickThroughUrl') or {}).get('url')
            or ''
        )
        feed.append({
            'title': c.get('title'),
            'summary': c.get('summary') or c.get('description') or '',
            'url': url,
            'banner_image': banner,
            'publishedDate': c.get('pubDate'),
            'sentiment': None,
            'source': (c.get('provider') or {}).get('displayName'),
        })
    return {'feed': feed}


def _infer_transaction_type(text):
    t = (text or '').lower()
    if 'sale' in t:
        return 'Sale'
    if 'purchase' in t or 'buy' in t:
        return 'Purchase'
    if 'award' in t or 'grant' in t:
        return 'Award'
    return 'N/A'


def get_insider_transactions(symbol, limit=10):
    df = yf.Ticker(symbol).insider_transactions
    if df is None or df.empty:
        return {'transactions': []}

    transactions = []
    for _, row in df.head(limit).iterrows():
        shares = row.get('Shares')
        value = row.get('Value')
        text = row.get('Text') or ''
        transaction_type = row.get('Transaction') or _infer_transaction_type(text)

        price = None
        if not _is_nan(value) and not _is_nan(shares) and shares:
            price = round(float(value) / float(shares), 2)
        if price is None:
            m = re.search(r'price\s+([\d.]+)', text)
            if m:
                price = float(m.group(1))

        start_date = row.get('Start Date')
        transactions.append({
            'Director': row.get('Insider'),
            'Relation': row.get('Position'),
            'TransactionType': transaction_type,
            'Shares': None if _is_nan(shares) else int(shares),
            'Price': price,
            'TransactionDate': start_date.strftime('%Y-%m-%d') if hasattr(start_date, 'strftime') else str(start_date),
        })
    return {'transactions': transactions}


def get_time_series(symbol, function='TIME_SERIES_DAILY'):
    period, interval = _TIME_SERIES_PARAMS.get(function, _TIME_SERIES_PARAMS['TIME_SERIES_DAILY'])
    hist = yf.Ticker(symbol).history(period=period, interval=interval)
    if hist is None or hist.empty:
        return None
    data = []
    for idx, row in hist.iterrows():
        data.append({
            'time': idx.strftime('%Y-%m-%d'),
            'open': float(row['Open']),
            'high': float(row['High']),
            'low': float(row['Low']),
            'close': float(row['Close']),
            'volume': 0 if _is_nan(row['Volume']) else int(row['Volume']),
        })
    return data  # yfinance history() is already chronological (ascending)


def get_daily_raw(symbol, outputsize='compact'):
    """Alpha-Vantage-shaped passthrough (Meta Data + Time Series (Daily), string
    values) for consumers (n8n workflows) still expecting the raw AV envelope."""
    period = '1mo' if outputsize == 'compact' else '2y'
    hist = yf.Ticker(symbol).history(period=period, interval='1d')
    if hist is None or hist.empty:
        return None
    series = {}
    for idx, row in hist.iterrows():
        series[idx.strftime('%Y-%m-%d')] = {
            '1. open': f"{row['Open']:.4f}",
            '2. high': f"{row['High']:.4f}",
            '3. low': f"{row['Low']:.4f}",
            '4. close': f"{row['Close']:.4f}",
            '5. volume': str(0 if _is_nan(row['Volume']) else int(row['Volume'])),
        }
    last_date = hist.index[-1].strftime('%Y-%m-%d')
    return {
        'Meta Data': {
            '1. Information': 'Daily Prices (open, high, low, close) and Volumes',
            '2. Symbol': symbol.upper(),
            '3. Last Refreshed': last_date,
            '4. Output Size': 'Compact' if outputsize == 'compact' else 'Full',
            '5. Time Zone': 'US/Eastern',
        },
        'Time Series (Daily)': series,
    }


def _mover_entry(quote):
    change_pct = quote.get('regularMarketChangePercent')
    sign = '-' if (change_pct or 0) < 0 else '+'
    return {
        'ticker': quote.get('symbol'),
        'price': quote.get('regularMarketPrice'),
        'change_amount': quote.get('regularMarketChange'),
        'change_percentage': f"{sign}{abs(change_pct or 0):.2f}%",
        'volume': quote.get('regularMarketVolume'),
    }


def get_top_movers(count=10):
    gainers = yf.screen('day_gainers', count=count).get('quotes', [])
    losers = yf.screen('day_losers', count=count).get('quotes', [])
    actives = yf.screen('most_actives', count=count).get('quotes', [])
    return {
        'top_gainers': [_mover_entry(q) for q in gainers],
        'top_losers': [_mover_entry(q) for q in losers],
        'most_active': [_mover_entry(q) for q in actives],
    }
