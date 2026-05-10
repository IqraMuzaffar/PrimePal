"""
Shared rate limiter instance for the application.

Usage in endpoint files:
    from app.core.rate_limit import limiter

    @router.get("/endpoint")
    @limiter.limit("20/minute")
    async def my_endpoint(request: Request, ...):
        ...
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
