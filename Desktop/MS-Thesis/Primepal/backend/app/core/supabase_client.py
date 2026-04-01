"""
Supabase client factory.
- get_supabase()       uses the anon key  → respects RLS (public-facing queries)
- get_supabase_admin() uses the service role key → bypasses RLS (server-side writes)
"""
from supabase import Client, create_client

from app.core.config import settings


def get_supabase() -> Client:
    """Anon client — obeys Row Level Security policies."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def get_supabase_admin() -> Client:
    """Service-role client — bypasses RLS. Use only for trusted server-side operations."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
