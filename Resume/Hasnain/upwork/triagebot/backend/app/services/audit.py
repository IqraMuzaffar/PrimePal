from app.db.queries import log_audit

async def audit_tool_call(session_id, tool_name: str, input_data: dict, output_data: dict):
    await log_audit(
        session_id=session_id,
        action="tool_call",
        tool_used=tool_name,
        input_data=input_data,
        output_data=output_data,
    )
