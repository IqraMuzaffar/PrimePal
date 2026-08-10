import asyncpg
from app.config import settings

pool: asyncpg.Pool | None = None

async def init_pool():
    global pool
    pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=5, max_size=20)

async def close_pool():
    global pool
    if pool:
        await pool.close()

async def query(sql: str, *args) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *args)
        return [dict(r) for r in rows]

async def query_one(sql: str, *args) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(sql, *args)
        return dict(row) if row else None

async def execute(sql: str, *args) -> str:
    async with pool.acquire() as conn:
        return await conn.execute(sql, *args)
