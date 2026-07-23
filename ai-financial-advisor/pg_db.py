# pg_db.py — Postgres connection pool (replaces Cosmos DB, cf ai-financial-advisor/SCHEMA.md).
# Schema owned by the Drizzle package at C:\AI\Sandbox\Millionaire\db (users/holdings/quote_cache/decisions),
# DB `millionaire` lives on the shared pg-apps-surface:5434 instance (no dedicated server for this project).
import os
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')

pool = None
if DATABASE_URL:
    try:
        pool = SimpleConnectionPool(1, 5, DATABASE_URL)
    except Exception as e:
        print(f'Postgres unavailable, DB-backed routes (signup/login/portfolio) will fail: {e}')
else:
    print('DATABASE_URL not set, skipping Postgres setup. '
          'DB-backed routes (signup/login/portfolio) will fail until configured.')


def get_conn():
    if pool is None:
        return None
    return pool.getconn()


def put_conn(conn):
    if pool is not None and conn is not None:
        pool.putconn(conn)
