"""Generate downloadable sample files into the frontend public/samples folder."""
import csv
import os
from pathlib import Path
from fpdf import FPDF
from docx import Document

OUT = Path("/app/frontend/public/samples")
OUT.mkdir(parents=True, exist_ok=True)

# 1) PDF — Quarterly business report
pdf = FPDF()
pdf.add_page()
pdf.set_font("Helvetica", "B", 18)
pdf.cell(0, 12, "Acme Corp - Q3 Business Report", new_x="LMARGIN", new_y="NEXT")
pdf.ln(2)
pdf.set_font("Helvetica", "", 11)
sections = [
    ("Executive Summary",
     "Acme Corp closed Q3 with $4.2M in revenue, up 28% quarter-over-quarter. "
     "Net revenue retention reached 118%. We added 47 new enterprise logos and reduced churn to 3.1%."),
    ("Revenue Breakdown",
     "Subscription revenue was $3.6M (86%), professional services $0.4M (10%), and usage overages $0.2M (4%). "
     "The EMEA region grew fastest at 41% QoQ."),
    ("Product Milestones",
     "Launched the multi-model AI assistant, shipped SSO for enterprise customers, and reduced average query "
     "latency by 35%. The mobile app entered public beta with 2,300 testers."),
    ("Key Metrics",
     "Monthly active users: 58,400. Average revenue per account: $18,200. Gross margin: 79%. "
     "Support CSAT: 94%. P1 incidents this quarter: 2, both resolved within SLA."),
    ("Outlook for Q4",
     "We are targeting $5.4M in revenue, general availability of the mobile app, and expansion into the "
     "Asia-Pacific region. Hiring plan adds 12 engineers and 6 account executives."),
]
for title, body in sections:
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 9, title, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, body)
    pdf.ln(3)
pdf.output(str(OUT / "acme-q3-report.pdf"))

# 2) DOCX — Project meeting notes
doc = Document()
doc.add_heading("Project Atlas - Kickoff Meeting Notes", level=1)
doc.add_paragraph("Date: October 3, 2025    Attendees: Priya (PM), Marcus (Eng Lead), Dana (Design), Sam (QA)")
doc.add_heading("Goals", level=2)
for g in ["Ship the customer analytics dashboard by December 15.",
          "Support CSV and API data sources at launch.",
          "Achieve page load under 1.5 seconds for 10k-row datasets."]:
    doc.add_paragraph(g, style="List Bullet")
doc.add_heading("Decisions", level=2)
for d in ["Use server-side pagination for large tables.",
          "Design system: reuse the existing component library, dark theme first.",
          "Weekly demo every Friday at 2 PM."]:
    doc.add_paragraph(d, style="List Bullet")
doc.add_heading("Action Items", level=2)
for a in ["Marcus: set up the data ingestion service by Oct 10.",
          "Dana: deliver dashboard mockups by Oct 8.",
          "Sam: draft the test plan and edge cases by Oct 12.",
          "Priya: finalize scope with stakeholders and share the roadmap."]:
    doc.add_paragraph(a, style="List Bullet")
doc.add_heading("Risks", level=2)
doc.add_paragraph("Data source API rate limits may throttle large syncs; mitigation is a batched retry queue. "
                  "Holiday season may reduce reviewer availability in December.")
doc.save(str(OUT / "project-atlas-notes.docx"))

# 3) CSV — Product catalog / inventory
rows = [
    ["sku", "product", "category", "price_usd", "stock", "supplier", "rating"],
    ["ACM-101", "Cloud Starter Plan", "Subscription", "29", "unlimited", "Acme", "4.6"],
    ["ACM-102", "Cloud Pro Plan", "Subscription", "99", "unlimited", "Acme", "4.8"],
    ["ACM-201", "Data Connector Pack", "Add-on", "49", "unlimited", "Acme", "4.3"],
    ["HW-310", "Edge Gateway Device", "Hardware", "349", "128", "Northwind", "4.5"],
    ["HW-311", "Sensor Kit (10-pack)", "Hardware", "189", "540", "Northwind", "4.2"],
    ["SVC-400", "Onboarding Package", "Service", "1200", "n/a", "Acme", "4.9"],
    ["SVC-401", "Premium Support (Annual)", "Service", "4800", "n/a", "Acme", "4.7"],
    ["ACM-105", "Enterprise Plan", "Subscription", "custom", "unlimited", "Acme", "4.9"],
]
with open(OUT / "acme-product-catalog.csv", "w", newline="") as f:
    csv.writer(f).writerows(rows)

print("Generated:", [p.name for p in OUT.iterdir()])
