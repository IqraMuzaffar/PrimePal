from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_staff
from app.database import query, query_one, execute
from app.models.schemas import FAQCreate, FAQUpdate
import uuid

router = APIRouter(
    prefix="/api/admin/faqs",
    tags=["admin-faqs"],
    dependencies=[Depends(get_current_staff)],
)


# ---------------------------------------------------------------------------
# GET /api/admin/faqs
# ---------------------------------------------------------------------------

@router.get("")
async def list_faqs(user: dict = Depends(get_current_staff)):
    """Return all FAQs for this clinic, ordered by category then question."""
    rows = await query(
        """
        SELECT id, category, question, answer, source, created_at
        FROM health_faqs
        WHERE clinic_id = $1
        ORDER BY category, question
        """,
        user["clinic_id"],
    )
    return rows


# ---------------------------------------------------------------------------
# POST /api/admin/faqs
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
async def create_faq(
    body: FAQCreate,
    user: dict = Depends(get_current_staff),
):
    """Create a new FAQ entry for this clinic."""
    faq_id = str(uuid.uuid4())

    await execute(
        """
        INSERT INTO health_faqs (id, clinic_id, category, question, answer, source)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        faq_id,
        user["clinic_id"],
        body.category,
        body.question,
        body.answer,
        body.source,
    )

    return await query_one("SELECT * FROM health_faqs WHERE id = $1", faq_id)


# ---------------------------------------------------------------------------
# PATCH /api/admin/faqs/{faq_id}
# ---------------------------------------------------------------------------

@router.patch("/{faq_id}")
async def update_faq(
    faq_id: str,
    body: FAQUpdate,
    user: dict = Depends(get_current_staff),
):
    """Partially update a FAQ (only provided fields are SET)."""
    existing = await query_one(
        "SELECT id FROM health_faqs WHERE id = $1 AND clinic_id = $2",
        faq_id,
        user["clinic_id"],
    )
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_parts = []
    values = []
    for i, (field, value) in enumerate(updates.items(), start=1):
        set_parts.append(f"{field} = ${i}")
        values.append(value)

    values.append(faq_id)
    sql = f"UPDATE health_faqs SET {', '.join(set_parts)} WHERE id = ${len(values)}"
    await execute(sql, *values)

    return await query_one("SELECT * FROM health_faqs WHERE id = $1", faq_id)


# ---------------------------------------------------------------------------
# DELETE /api/admin/faqs/{faq_id}
# ---------------------------------------------------------------------------

@router.delete("/{faq_id}", status_code=204)
async def delete_faq(
    faq_id: str,
    user: dict = Depends(get_current_staff),
):
    """Delete a FAQ entry."""
    existing = await query_one(
        "SELECT id FROM health_faqs WHERE id = $1 AND clinic_id = $2",
        faq_id,
        user["clinic_id"],
    )
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")

    await execute("DELETE FROM health_faqs WHERE id = $1", faq_id)
