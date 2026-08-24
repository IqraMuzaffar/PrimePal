import asyncpg
from app.config import settings

pool: asyncpg.Pool | None = None

async def get_pool() -> asyncpg.Pool:
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(settings.DATABASE_URL)
    return pool

async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None

async def query(sql: str, *args) -> list[dict]:
    """Execute a query and return all rows as dicts."""
    p = await get_pool()
    rows = await p.fetch(sql, *args)
    return [dict(r) for r in rows]

async def query_one(sql: str, *args) -> dict | None:
    """Execute a query and return one row as dict, or None."""
    p = await get_pool()
    row = await p.fetchrow(sql, *args)
    return dict(row) if row else None

async def execute(sql: str, *args) -> str:
    """Execute a statement (INSERT/UPDATE/DELETE)."""
    p = await get_pool()
    return await p.execute(sql, *args)
