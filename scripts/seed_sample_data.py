"""Seed sample knowledge-base documents (with embeddings) for a real user.
Run: cd /app/backend && python /app/scripts/seed_sample_data.py <user_id>
"""
import sys
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path("/app/backend")))
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

from db import documents, chunks, usage_logs  # noqa: E402
from extract import chunk_text  # noqa: E402
from ai import embed_texts  # noqa: E402

SAMPLES = {
    "Acme Corp — Employee Handbook.md": """# Acme Corp Employee Handbook

## Working Hours
Standard working hours are 9:00 AM to 6:00 PM, Monday to Friday. Acme operates a hybrid model: employees are expected in the office on Tuesdays and Thursdays and may work remotely on other days.

## Leave & Time Off
Full-time employees receive 24 days of paid annual leave per year, accrued monthly. Unused leave (up to 5 days) may be carried over into the next calendar year. Sick leave is 12 days per year and does not require a doctor's note for absences of 2 days or fewer.

## Code of Conduct
All employees must treat colleagues, customers, and partners with respect. Harassment, discrimination, or retaliation of any kind is strictly prohibited and may result in termination.

## Expenses & Reimbursement
Business expenses must be submitted within 30 days with a valid receipt. Meals during business travel are reimbursed up to $60 per day. Reimbursements are processed with the next payroll cycle.
""",
    "Acme Cloud — Product FAQ.txt": """Acme Cloud Product FAQ

Q: What is Acme Cloud?
A: Acme Cloud is a managed data platform that lets teams store, query, and analyze data without managing servers.

Q: How is pricing calculated?
A: Pricing is usage-based. You pay per GB stored per month and per compute-hour used for queries. The free tier includes 5 GB of storage and 10 compute-hours per month.

Q: What is the refund policy?
A: Customers may request a full refund within 30 days of the initial purchase. Refunds are processed within 5 business days to the original payment method. Annual enterprise plans are non-refundable after 14 days.

Q: Which regions are supported?
A: Acme Cloud is available in US-East, US-West, EU-Frankfurt, and Asia-Singapore.

Q: How do I get support?
A: Free tier users get community support. Pro and Enterprise plans include 24/7 email and chat support with a 1-hour response SLA for critical issues.
""",
    "Security & Data Policy.md": """# Acme Security & Data Policy

## Data Encryption
All customer data is encrypted at rest using AES-256 and in transit using TLS 1.3. Encryption keys are rotated every 90 days.

## Access Control
Access to production systems follows the principle of least privilege and requires multi-factor authentication. Access reviews are conducted quarterly.

## Incident Response
Security incidents must be reported to security@acme.example within 1 hour of discovery. The incident response team will triage, contain, and notify affected customers within 72 hours as required by GDPR.

## Data Retention
Customer data is retained for the duration of the contract plus 30 days, after which it is permanently deleted. Backups are retained for 35 days.
""",
    "Engineering Onboarding Guide.md": """# Engineering Onboarding Guide

## Day 1 Setup
New engineers should install the Acme CLI, request access to the GitHub organization, and join the #engineering Slack channel. Laptops come pre-configured with VS Code, Docker, and Node.js 20.

## Git Workflow
We use trunk-based development. Create a short-lived feature branch, open a pull request, and require at least 2 approvals before merging to main. All PRs must pass CI (lint, unit tests, and type checks) before merge.

## Code Review Standards
Reviews should be completed within one business day. Keep PRs under 400 lines where possible. Every new feature must include tests and update relevant documentation.

## Deployment
We deploy via CI/CD on merge to main. Production deploys happen automatically after staging validation. Rollbacks are performed with the `acme deploy rollback` command and take under 2 minutes.

## On-Call
Engineers join the on-call rotation after 90 days. On-call shifts last one week. Critical (P1) incidents require acknowledgement within 15 minutes.
""",
    "Sales Playbook.txt": """Acme Sales Playbook

Ideal Customer Profile:
Mid-market and enterprise companies (200-5000 employees) in fintech, healthcare, and SaaS that handle large volumes of data.

Sales Stages:
1. Discovery - qualify budget, authority, need, and timeline (BANT).
2. Demo - tailored 30-minute product walkthrough.
3. Proof of Concept - 14-day guided trial with success criteria.
4. Proposal - pricing and contract sent via DocuSign.
5. Close - signature and handoff to onboarding.

Discounting:
Sales reps may offer up to 10% discount independently. Discounts between 10% and 20% require manager approval. Anything above 20% requires VP of Sales approval.

Standard Contract Terms:
Annual contracts billed upfront. Net-30 payment terms. Auto-renewal unless cancelled 30 days before renewal date.

Competitors:
Our main competitors are DataForge and CloudNimbus. Acme differentiates on ease of use, transparent usage-based pricing, and 24/7 support.
""",
    "Remote Work & Benefits Policy.md": """# Remote Work & Benefits Policy

## Remote Work Stipend
Remote employees receive a one-time $1,000 home-office setup stipend and $75 per month toward internet and utilities.

## Health Benefits
Acme covers 100% of the employee medical premium and 60% for dependents. Dental and vision are included. Coverage begins on the first day of employment.

## Retirement
Acme offers a 401(k) with a 4% company match, vesting immediately.

## Parental Leave
Primary caregivers receive 16 weeks of fully paid parental leave; secondary caregivers receive 8 weeks. Leave must be taken within 12 months of the birth or adoption.

## Learning & Development
Each employee has an annual $1,500 learning budget for courses, books, and conferences, plus 5 dedicated learning days per year.
""",
    "Customer Support Runbook.txt": """Acme Customer Support Runbook

Support Tiers & SLAs:
- Critical (P1): service down for many customers. Response 1 hour, updates every 30 minutes.
- High (P2): major feature broken. Response 4 hours.
- Normal (P3): minor issue or question. Response 1 business day.

Escalation Path:
Tier 1 agent -> Tier 2 specialist -> Engineering on-call -> Engineering Manager. Escalate P1 issues to engineering on-call immediately.

Refund Requests:
Verify purchase date. If within 30 days, process a full refund in the billing console. Refunds over $5,000 require finance approval.

Common Issues:
- Login failures: ask the customer to reset their password and clear cookies.
- Slow queries: check the customer's region and current compute-hour usage.
- Billing questions: direct to the self-serve billing portal or escalate to finance.

Business Hours:
Support operates 24/7 for Enterprise, and 9 AM - 9 PM local time for Pro customers.
""",
}


async def seed(user_id: str):
    # Idempotent: clear previous sample docs for this user
    old = await documents.find({"user_id": user_id, "source": "sample"}, {"_id": 0, "id": 1}).to_list(100)
    for d in old:
        await chunks.delete_many({"document_id": d["id"]})
    await documents.delete_many({"user_id": user_id, "source": "sample"})

    now = datetime.now(timezone.utc).isoformat()
    for filename, text in SAMPLES.items():
        parts = chunk_text(text)
        embeddings = await embed_texts(parts)
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
        ext = filename.rsplit(".", 1)[-1].lower()
        chunk_docs = [{
            "id": f"chunk_{uuid.uuid4().hex[:12]}", "document_id": doc_id, "user_id": user_id,
            "filename": filename, "chunk_index": i, "text": p, "embedding": e,
        } for i, (p, e) in enumerate(zip(parts, embeddings))]
        await chunks.insert_many(chunk_docs)
        await documents.insert_one({
            "id": doc_id, "user_id": user_id, "filename": filename, "file_type": ext,
            "size": len(text.encode("utf-8")), "status": "ready", "chunk_count": len(chunk_docs),
            "source": "sample", "created_at": now,
        })
        await usage_logs.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, "type": "embedding",
            "model": "local", "token_count": sum(len(p) for p in parts) // 4, "created_at": now,
        })
        print(f"Seeded: {filename} ({len(chunk_docs)} chunks)")


if __name__ == "__main__":
    uid = sys.argv[1] if len(sys.argv) > 1 else "user_6254b4bab510"
    asyncio.run(seed(uid))
    print("Done.")
