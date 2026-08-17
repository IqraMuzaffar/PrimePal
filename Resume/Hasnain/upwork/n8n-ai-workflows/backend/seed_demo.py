"""Seed demo data into the n8n AI Workflows SQLite database."""
import asyncio
import sys
sys.path.insert(0, ".")

from app.database import init_db, save_email, save_invoice, save_lead, log_workflow_run

async def seed():
    await init_db()

    # --- EMAILS ---
    emails = [
        {"subject": "URGENT: Contract review needed by 5 PM", "sender": "michael.chen@globalventures.com",
         "body_preview": "Our board meeting is tomorrow and we need the revised partnership agreement reviewed before 5 PM today.",
         "category": "urgent", "confidence": 0.95,
         "ai_summary": "VP of Operations at Global Ventures needs contract reviewed before board meeting. Time-sensitive.",
         "suggested_action": "Forward to legal team immediately. Flag as priority."},
        {"subject": "Re: Q3 Marketing Budget Proposal", "sender": "sarah@techcorp.io",
         "body_preview": "We loved your proposal for the AI automation project. Budget approved for Q3. Schedule a call this week.",
         "category": "sales_lead", "confidence": 0.92,
         "ai_summary": "Hot lead from TechCorp VP of Marketing. Budget approved, wants to schedule call.",
         "suggested_action": "Respond within 2 hours. Schedule discovery call."},
        {"subject": "Issue with API integration - Error 500", "sender": "dev@startupxyz.com",
         "body_preview": "Getting consistent 500 errors on /api/process endpoint after your last update. Blocking our launch.",
         "category": "support", "confidence": 0.88,
         "ai_summary": "Critical API bug. 500 errors after recent update. Blocking client launch.",
         "suggested_action": "Escalate to engineering. Priority P1 bug fix."},
        {"subject": "You have been selected for a FREE cruise!", "sender": "offers@spampromo.net",
         "body_preview": "Congratulations! You have been selected to win a free Caribbean cruise. Click here now!",
         "category": "spam", "confidence": 0.99,
         "ai_summary": "Obvious spam/phishing email. No action needed.",
         "suggested_action": "Delete. Mark sender as spam."},
        {"subject": "Partnership opportunity - AI for Healthcare", "sender": "dr.ahmed@afyahealth.co.ke",
         "body_preview": "Health-tech startup in Nairobi looking for AI development partners. Need a patient triage chatbot.",
         "category": "sales_lead", "confidence": 0.89,
         "ai_summary": "Healthcare startup in Nairobi seeking AI partner for patient triage chatbot.",
         "suggested_action": "Respond with portfolio. Schedule intro call."},
        {"subject": "Weekly newsletter - Tech Digest", "sender": "newsletter@techdigest.com",
         "body_preview": "This week: AI regulations update, new React framework, startup funding roundup...",
         "category": "spam", "confidence": 0.72,
         "ai_summary": "Weekly tech newsletter. Low priority.",
         "suggested_action": "Archive. Read when free."},
        {"subject": "Re: Invoice #1082 - Payment delayed", "sender": "accounts@bigcorp.com",
         "body_preview": "Payment for invoice #1082 ($12,500) will be processed by end of week. Finance reviewing.",
         "category": "urgent", "confidence": 0.85,
         "ai_summary": "Payment delay for $12,500 invoice. Expected by end of week.",
         "suggested_action": "Acknowledge. Follow up Friday if not received."},
        {"subject": "Interested in AI automation services", "sender": "james@logisticsafrica.ng",
         "body_preview": "Logistics company in Lagos. 500+ delivery orders daily. Need AI for routing and dispatch.",
         "category": "sales_lead", "confidence": 0.91,
         "ai_summary": "Logistics CEO in Lagos. 500+ daily orders. Needs AI route optimization.",
         "suggested_action": "High priority response. Send case study."},
    ]
    for e in emails:
        await save_email(e)
    print(f"Seeded {len(emails)} emails")

    # --- INVOICES ---
    invoices = [
        {"filename": "invoice-001.pdf", "vendor": "AWS Cloud Services", "amount": 2450.00, "currency": "USD",
         "invoice_number": "INV-2026-001", "invoice_date": "2026-08-01", "due_date": "2026-08-31",
         "line_items": [{"description": "EC2 Instances", "amount": 1200}, {"description": "S3 Storage", "amount": 450}, {"description": "RDS PostgreSQL", "amount": 800}],
         "needs_approval": False, "status": "extracted"},
        {"filename": "invoice-002.pdf", "vendor": "Figma Inc", "amount": 180.00, "currency": "USD",
         "invoice_number": "FIG-88921", "invoice_date": "2026-08-05", "due_date": "2026-09-05",
         "line_items": [{"description": "Figma Professional - 3 seats", "amount": 180}],
         "needs_approval": False, "status": "extracted"},
        {"filename": "invoice-003.pdf", "vendor": "DataCenter Nigeria Ltd", "amount": 8500.00, "currency": "USD",
         "invoice_number": "DCN-2026-044", "invoice_date": "2026-08-03", "due_date": "2026-08-17",
         "line_items": [{"description": "Dedicated Server Rack Q3", "amount": 6000}, {"description": "Bandwidth 1Gbps", "amount": 2500}],
         "needs_approval": True, "status": "pending_approval"},
        {"filename": "invoice-004.pdf", "vendor": "OpenAI API", "amount": 342.50, "currency": "USD",
         "invoice_number": "OAPI-AUG-26", "invoice_date": "2026-08-08", "due_date": "2026-09-08",
         "line_items": [{"description": "GPT-4o API Usage", "amount": 280}, {"description": "Embeddings API", "amount": 62.50}],
         "needs_approval": False, "status": "extracted"},
        {"filename": "invoice-005.pdf", "vendor": "Vercel", "amount": 95.00, "currency": "USD",
         "invoice_number": "VCL-112358", "invoice_date": "2026-08-01", "due_date": "2026-09-01",
         "line_items": [{"description": "Pro Plan + Edge Functions", "amount": 95}],
         "needs_approval": False, "status": "extracted"},
        {"filename": "invoice-006.pdf", "vendor": "Office Equipment Co", "amount": 12750.00, "currency": "USD",
         "invoice_number": "OEC-5567", "invoice_date": "2026-07-28", "due_date": "2026-08-28",
         "line_items": [{"description": "Standing Desks x5", "amount": 7500}, {"description": "Chairs x5", "amount": 4000}, {"description": "Monitor Arms x5", "amount": 1250}],
         "needs_approval": True, "status": "pending_approval"},
    ]
    for inv in invoices:
        await save_invoice(inv)
    print(f"Seeded {len(invoices)} invoices")

    # --- LEADS ---
    leads = [
        {"first_name": "Sarah", "last_name": "Johnson", "email": "sarah@techcorp.io", "company": "TechCorp",
         "job_title": "VP of Marketing", "message": "We need AI automation for our 50-person sales team. Budget approved for Q3.",
         "ai_score": 92, "ai_category": "hot",
         "ai_reasoning": "Senior decision maker with approved budget and clear Q3 timeline.",
         "key_signals": ["Budget approved", "50-person team", "Q3 timeline", "VP-level"],
         "draft_email_subject": "Re: AI Automation for TechCorp",
         "draft_email_body": "Hi Sarah, I'd love to discuss automating your sales workflows. Our multi-agent AI handles lead scoring, email drafting, and CRM updates. Would Thursday 2 PM work?"},
        {"first_name": "James", "last_name": "Okafor", "email": "james@logisticsafrica.ng", "company": "LogisticsAfrica",
         "job_title": "CEO", "message": "Logistics company in Lagos. 500+ daily orders. Need AI for route optimization.",
         "ai_score": 85, "ai_category": "hot",
         "ai_reasoning": "CEO with clear pain point at scale. Direct decision maker.",
         "key_signals": ["CEO-level", "500+ daily orders", "Lagos market", "Route optimization"],
         "draft_email_subject": "AI-Powered Logistics Optimization",
         "draft_email_body": "Hi James, 500+ daily orders is impressive scale! Our AI optimizes routes, predicts demand, and automates dispatch. Built similar for African logistics. Free this week?"},
        {"first_name": "Ahmed", "last_name": "Hassan", "email": "ahmed@cairofintech.eg", "company": "CairoFintech",
         "job_title": "CTO", "message": "Looking for AI developer to build chatbot for our banking app.",
         "ai_score": 78, "ai_category": "warm",
         "ai_reasoning": "CTO with specific need. Banking = high budget. Chatbot aligns with our expertise.",
         "key_signals": ["CTO-level", "Banking sector", "Chatbot need"],
         "draft_email_subject": "AI Chatbot for CairoFintech",
         "draft_email_body": "Hi Ahmed, I've built production chatbots including a multi-agent triage system. Happy to share a demo. When works for a call?"},
        {"first_name": "Dr. Amina", "last_name": "Osei", "email": "amina@afyahealth.co.ke", "company": "AfyaHealth",
         "job_title": "Founder & CEO", "message": "Need patient triage AI chatbot for telemedicine. 50K+ patients monthly.",
         "ai_score": 95, "ai_category": "hot",
         "ai_reasoning": "Founder with massive scale (50K patients). Healthcare AI = our #1 domain.",
         "key_signals": ["Founder-CEO", "50K patients/month", "Triage chatbot", "Healthcare AI"],
         "draft_email_subject": "AI Patient Triage for AfyaHealth",
         "draft_email_body": "Dr. Amina, This is exactly our specialty! I built TriageBot — AI patient triage with WhatsApp, severity scoring, and receptionist dashboard. Deployed and tested. Demo this week?"},
        {"first_name": "Lisa", "last_name": "Kim", "email": "lisa@globalhr.com", "company": "GlobalHR",
         "job_title": "Product Manager", "message": "Exploring AI tools for resume screening. Early research phase.",
         "ai_score": 45, "ai_category": "warm",
         "ai_reasoning": "PM, not decision maker. Early research with no timeline or budget.",
         "key_signals": ["Early research", "No budget mentioned"],
         "draft_email_subject": "AI Resume Screening Solutions",
         "draft_email_body": "Hi Lisa, Happy to share an overview when you're ready to evaluate options. No rush."},
        {"first_name": "Tom", "last_name": "Williams", "email": "tom@randomblog.com", "company": "RandomBlog",
         "job_title": "Blogger", "message": "Can you build me a simple website with a blog?",
         "ai_score": 15, "ai_category": "cold",
         "ai_reasoning": "Basic website request. Not our target market. No AI need.",
         "key_signals": ["Basic website", "Not AI-related", "Low budget"],
         "draft_email_subject": None, "draft_email_body": None},
    ]
    for lead in leads:
        await save_lead(lead)
    print(f"Seeded {len(leads)} leads")

    # --- WORKFLOW RUNS ---
    runs = [
        ("email_classification", "success", 8, 1250),
        ("email_classification", "success", 5, 890),
        ("invoice_extraction", "success", 6, 2100),
        ("invoice_extraction", "success", 3, 1450),
        ("lead_qualification", "success", 6, 1800),
        ("lead_qualification", "success", 4, 1200),
        ("email_classification", "success", 3, 650),
        ("invoice_extraction", "error", 1, 500),
        ("lead_qualification", "success", 2, 900),
    ]
    for name, status, items, ms in runs:
        await log_workflow_run(name, status, items, ms)
    print(f"Seeded {len(runs)} workflow runs")

    print("\nDONE! Refresh http://localhost:3000 to see the data.")

asyncio.run(seed())
