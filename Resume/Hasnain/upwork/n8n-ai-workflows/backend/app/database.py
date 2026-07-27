import json
import os
from datetime import datetime, timezone

import aiosqlite

from app.config import get_settings

settings = get_settings()


def _db_path() -> str:
    return settings.DATABASE_PATH


async def _get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(_db_path())
    db.row_factory = aiosqlite.Row
    return db


async def init_db() -> None:
    """Create tables and ensure the data directory exists."""
    os.makedirs(os.path.dirname(_db_path()) or ".", exist_ok=True)

    db = await _get_db()
    try:
        await db.executescript(
            """
            CREATE TABLE IF NOT EXISTS processed_emails (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT,
                sender TEXT,
                body_preview TEXT,
                category TEXT,
                confidence REAL,
                ai_summary TEXT,
                suggested_action TEXT,
                processed_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS processed_invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                vendor TEXT,
                amount REAL,
                currency TEXT DEFAULT 'USD',
                invoice_number TEXT,
                invoice_date TEXT,
                due_date TEXT,
                line_items TEXT,
                needs_approval INTEGER DEFAULT 0,
                status TEXT DEFAULT 'extracted',
                processed_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS processed_leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT,
                last_name TEXT,
                email TEXT,
                company TEXT,
                job_title TEXT,
                message TEXT,
                ai_score INTEGER,
                ai_category TEXT,
                ai_reasoning TEXT,
                key_signals TEXT,
                draft_email_subject TEXT,
                draft_email_body TEXT,
                processed_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS workflow_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workflow_name TEXT,
                status TEXT DEFAULT 'success',
                items_processed INTEGER DEFAULT 1,
                duration_ms INTEGER,
                error_message TEXT,
                run_at TEXT DEFAULT (datetime('now'))
            );
            """
        )
        await db.commit()
    finally:
        await db.close()


# ---------------------------------------------------------------------------
# Save helpers
# ---------------------------------------------------------------------------


async def save_email(data: dict) -> int:
    db = await _get_db()
    try:
        cursor = await db.execute(
            """
            INSERT INTO processed_emails
                (subject, sender, body_preview, category, confidence, ai_summary, suggested_action)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.get("subject"),
                data.get("sender"),
                data.get("body_preview"),
                data.get("category"),
                data.get("confidence"),
                data.get("ai_summary"),
                data.get("suggested_action"),
            ),
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def save_invoice(data: dict) -> int:
    db = await _get_db()
    try:
        line_items_json = json.dumps(data.get("line_items", []))
        cursor = await db.execute(
            """
            INSERT INTO processed_invoices
                (filename, vendor, amount, currency, invoice_number,
                 invoice_date, due_date, line_items, needs_approval, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.get("filename"),
                data.get("vendor"),
                data.get("amount"),
                data.get("currency", "USD"),
                data.get("invoice_number"),
                data.get("invoice_date"),
                data.get("due_date"),
                line_items_json,
                1 if data.get("needs_approval") else 0,
                data.get("status", "extracted"),
            ),
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def save_lead(data: dict) -> int:
    db = await _get_db()
    try:
        cursor = await db.execute(
            """
            INSERT INTO processed_leads
                (first_name, last_name, email, company, job_title,
                 message, ai_score, ai_category, ai_reasoning,
                 key_signals, draft_email_subject, draft_email_body)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.get("first_name"),
                data.get("last_name"),
                data.get("email"),
                data.get("company"),
                data.get("job_title"),
                data.get("message"),
                data.get("ai_score"),
                data.get("ai_category"),
                data.get("ai_reasoning"),
                json.dumps(data.get("key_signals", [])),
                data.get("draft_email_subject"),
                data.get("draft_email_body"),
            ),
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def log_workflow_run(
    name: str,
    status: str = "success",
    items: int = 1,
    duration_ms: int = 0,
    error: str | None = None,
) -> int:
    db = await _get_db()
    try:
        cursor = await db.execute(
            """
            INSERT INTO workflow_runs
                (workflow_name, status, items_processed, duration_ms, error_message)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, status, items, duration_ms, error),
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


# ---------------------------------------------------------------------------
# Read helpers
# ---------------------------------------------------------------------------


def _row_to_dict(row: aiosqlite.Row) -> dict:
    return dict(row)


async def get_emails(limit: int = 50) -> list[dict]:
    db = await _get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM processed_emails ORDER BY id DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [_row_to_dict(r) for r in rows]
    finally:
        await db.close()


async def get_invoices(limit: int = 50) -> list[dict]:
    db = await _get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM processed_invoices ORDER BY id DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        results = []
        for r in rows:
            d = _row_to_dict(r)
            if d.get("line_items"):
                try:
                    d["line_items"] = json.loads(d["line_items"])
                except (json.JSONDecodeError, TypeError):
                    d["line_items"] = []
            d["needs_approval"] = bool(d.get("needs_approval"))
            results.append(d)
        return results
    finally:
        await db.close()


async def get_leads(limit: int = 50) -> list[dict]:
    db = await _get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM processed_leads ORDER BY id DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        results = []
        for r in rows:
            d = _row_to_dict(r)
            if d.get("key_signals"):
                try:
                    d["key_signals"] = json.loads(d["key_signals"])
                except (json.JSONDecodeError, TypeError):
                    d["key_signals"] = []
            results.append(d)
        return results
    finally:
        await db.close()


async def get_workflow_runs(limit: int = 50) -> list[dict]:
    db = await _get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM workflow_runs ORDER BY id DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [_row_to_dict(r) for r in rows]
    finally:
        await db.close()


async def get_stats() -> dict:
    db = await _get_db()
    try:
        # Totals
        cur = await db.execute("SELECT COUNT(*) as c FROM processed_emails")
        total_emails = (await cur.fetchone())["c"]

        cur = await db.execute("SELECT COUNT(*) as c FROM processed_invoices")
        total_invoices = (await cur.fetchone())["c"]

        cur = await db.execute("SELECT COUNT(*) as c FROM processed_leads")
        total_leads = (await cur.fetchone())["c"]

        total_processed = total_emails + total_invoices + total_leads

        # Email breakdown by category
        cur = await db.execute(
            "SELECT category, COUNT(*) as c FROM processed_emails GROUP BY category"
        )
        email_breakdown = {row["category"]: row["c"] for row in await cur.fetchall()}

        # Invoice totals
        cur = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as c FROM processed_invoices"
        )
        inv_row = await cur.fetchone()
        cur2 = await db.execute(
            "SELECT COUNT(*) as c FROM processed_invoices WHERE needs_approval = 1"
        )
        inv_pending = (await cur2.fetchone())["c"]

        # Leads breakdown by category
        cur = await db.execute(
            "SELECT ai_category, COUNT(*) as c FROM processed_leads GROUP BY ai_category"
        )
        lead_breakdown = {row["ai_category"]: row["c"] for row in await cur.fetchall()}
        cur3 = await db.execute(
            "SELECT COALESCE(AVG(ai_score), 0) as avg FROM processed_leads"
        )
        lead_avg = (await cur3.fetchone())["avg"]

        # Today counts
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        cur = await db.execute(
            "SELECT COUNT(*) as c FROM processed_emails WHERE processed_at LIKE ?",
            (f"{today}%",),
        )
        today_emails = (await cur.fetchone())["c"]
        cur = await db.execute(
            "SELECT COUNT(*) as c FROM processed_invoices WHERE processed_at LIKE ?",
            (f"{today}%",),
        )
        today_invoices = (await cur.fetchone())["c"]
        cur = await db.execute(
            "SELECT COUNT(*) as c FROM processed_leads WHERE processed_at LIKE ?",
            (f"{today}%",),
        )
        today_leads = (await cur.fetchone())["c"]

        # Recent workflow runs
        cur = await db.execute(
            "SELECT * FROM workflow_runs ORDER BY id DESC LIMIT 10"
        )
        recent = [_row_to_dict(r) for r in await cur.fetchall()]

        # Pipeline summary
        cur = await db.execute(
            "SELECT workflow_name, COUNT(*) as runs, "
            "SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as successes, "
            "COALESCE(AVG(duration_ms), 0) as avg_duration "
            "FROM workflow_runs GROUP BY workflow_name"
        )
        pipeline = {}
        for row in await cur.fetchall():
            pipeline[row["workflow_name"]] = {
                "runs": row["runs"],
                "successes": row["successes"],
                "avg_duration_ms": round(row["avg_duration"], 1),
            }

        return {
            "total_processed": total_processed,
            "emails": {
                "total": total_emails,
                "breakdown": email_breakdown,
            },
            "invoices": {
                "total": total_invoices,
                "total_amount": inv_row["total"],
                "pending_approval": inv_pending,
            },
            "leads": {
                "total": total_leads,
                "breakdown": lead_breakdown,
                "average_score": round(lead_avg, 1),
            },
            "today": {
                "emails": today_emails,
                "invoices": today_invoices,
                "leads": today_leads,
            },
            "recent_activity": recent,
            "pipeline_summary": pipeline,
        }
    finally:
        await db.close()
