from fastapi import APIRouter, Depends, Query
from app.routes.auth import get_current_user
from app.db.pool import query, query_one

router = APIRouter(tags=["analytics"])

@router.get("/analytics/summary")
async def get_summary(days: int = Query(default=7, le=90), user: str = Depends(get_current_user)):
    interval = f"{days} days"
    total = await query_one(
        "SELECT COUNT(*) as total FROM triage_sessions WHERE created_at >= NOW() - $1::interval", interval
    )
    severity_breakdown = await query(
        "SELECT severity, COUNT(*) as count FROM triage_sessions WHERE created_at >= NOW() - $1::interval AND severity IS NOT NULL GROUP BY severity", interval
    )
    top_departments = await query(
        "SELECT department, COUNT(*) as count FROM triage_sessions WHERE created_at >= NOW() - $1::interval AND department IS NOT NULL GROUP BY department ORDER BY count DESC LIMIT 5", interval
    )
    avg_triage_time = await query_one(
        "SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))) as avg_seconds FROM triage_sessions WHERE reviewed_at IS NOT NULL AND created_at >= NOW() - $1::interval", interval
    )
    daily_volume = await query(
        "SELECT DATE(created_at) as date, COUNT(*) as count FROM triage_sessions WHERE created_at >= NOW() - $1::interval GROUP BY DATE(created_at) ORDER BY date", interval
    )
    return {
        "total": total["total"] if total else 0,
        "severity_breakdown": severity_breakdown,
        "top_departments": top_departments,
        "avg_triage_seconds": avg_triage_time["avg_seconds"] if avg_triage_time else None,
        "daily_volume": daily_volume,
    }
