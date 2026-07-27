import time

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.database import log_workflow_run, save_invoice
from app.models.schemas import InvoiceResponse
from app.services.ai_client import extract_invoice

router = APIRouter(prefix="/api", tags=["invoice"])


@router.post("/extract-invoice", response_model=InvoiceResponse)
async def extract_invoice_endpoint(file: UploadFile = File(...)):
    start = time.time()
    try:
        # Read PDF and extract text
        contents = await file.read()
        try:
            import io
            from PyPDF2 import PdfReader

            reader = PdfReader(io.BytesIO(contents))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from the uploaded PDF.",
            )

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="The uploaded PDF contains no extractable text.",
            )

        result = await extract_invoice(text)

        record_id = await save_invoice(
            {
                "filename": file.filename,
                "vendor": result.get("vendor", ""),
                "amount": result.get("amount", 0),
                "currency": result.get("currency", "USD"),
                "invoice_number": result.get("invoice_number", ""),
                "invoice_date": result.get("invoice_date", ""),
                "due_date": result.get("due_date", ""),
                "line_items": result.get("line_items", []),
                "needs_approval": result.get("needs_approval", False),
                "status": "extracted",
            }
        )

        duration_ms = int((time.time() - start) * 1000)
        await log_workflow_run("invoice_extraction", "success", 1, duration_ms)

        return InvoiceResponse(
            id=record_id,
            vendor=result.get("vendor", ""),
            amount=result.get("amount", 0),
            currency=result.get("currency", "USD"),
            invoice_number=result.get("invoice_number", ""),
            invoice_date=result.get("invoice_date", ""),
            due_date=result.get("due_date", ""),
            line_items=result.get("line_items", []),
            needs_approval=result.get("needs_approval", False),
            confidence=result.get("confidence", 0),
        )
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        await log_workflow_run(
            "invoice_extraction", "error", 0, duration_ms, str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))
