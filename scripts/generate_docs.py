"""Convert PROJECT_DOCUMENTATION.md into downloadable .docx and .pdf in public/samples."""
import re
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor
from fpdf import FPDF

SRC = Path("/app/PROJECT_DOCUMENTATION.md")
OUT = Path("/app/frontend/public/samples")
OUT.mkdir(parents=True, exist_ok=True)
lines = SRC.read_text(encoding="utf-8").split("\n")


def clean(text):
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)   # bold
    text = re.sub(r"`(.+?)`", r"\1", text)          # inline code
    return text


# ---------- DOCX ----------
doc = Document()
doc.styles["Normal"].font.name = "Calibri"
doc.styles["Normal"].font.size = Pt(11)

in_code = False
code_buf = []
for raw in lines:
    line = raw.rstrip()
    if line.strip().startswith("```"):
        if in_code:
            p = doc.add_paragraph()
            run = p.add_run("\n".join(code_buf))
            run.font.name = "Consolas"
            run.font.size = Pt(8)
            run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
            code_buf = []
        in_code = not in_code
        continue
    if in_code:
        code_buf.append(raw)
        continue
    if not line.strip():
        continue
    if line.startswith("# "):
        doc.add_heading(clean(line[2:]), level=0)
    elif line.startswith("## "):
        doc.add_heading(clean(line[3:]), level=1)
    elif line.startswith("### "):
        doc.add_heading(clean(line[4:]), level=2)
    elif line.startswith("|"):
        # render table rows as simple tab-separated text
        cells = [clean(c.strip()) for c in line.strip("|").split("|")]
        if set("".join(cells).replace("-", "").strip()) == set():
            continue  # separator row
        doc.add_paragraph("   ".join(cells))
    elif line.startswith("- "):
        doc.add_paragraph(clean(line[2:]), style="List Bullet")
    elif line.startswith("---"):
        continue
    else:
        doc.add_paragraph(clean(line))
doc.save(str(OUT / "KnowledgeAI-Documentation.docx"))

# ---------- PDF ----------
pdf = FPDF()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()


def w(text, h=6, size=11, style="", fill=False):
    pdf.set_font("Helvetica", style, size)
    pdf.set_x(pdf.l_margin)
    text = text.encode("latin-1", "replace").decode("latin-1")
    pdf.multi_cell(0, h, text, fill=fill)


BOX = {"│": "|", "─": "-", "┌": "+", "┐": "+", "└": "+", "┘": "+", "├": "+",
       "┤": "+", "┬": "+", "┴": "+", "┼": "+", "▼": "v", "▲": "^", "·": "-"}


def to_ascii(s):
    for k, v in BOX.items():
        s = s.replace(k, v)
    return s.encode("latin-1", "replace").decode("latin-1")


def hard_wrap(s, width=92):
    out = []
    while len(s) > width:
        out.append(s[:width])
        s = s[width:]
    out.append(s)
    return out


in_code = False
code_buf = []
for raw in lines:
    line = raw.rstrip()
    if line.strip().startswith("```"):
        if in_code:
            pdf.set_fill_color(244, 244, 245)
            pdf.set_font("Courier", "", 7)
            pdf.set_x(pdf.l_margin)
            for cl in code_buf:
                for seg in hard_wrap(to_ascii(cl)):
                    pdf.set_x(pdf.l_margin)
                    pdf.multi_cell(0, 3.6, seg or " ", fill=True)
            code_buf = []
            pdf.ln(2)
        in_code = not in_code
        continue
    if in_code:
        code_buf.append(raw)
        continue
    if not line.strip():
        pdf.ln(2)
        continue
    if line.startswith("# "):
        pdf.ln(2); w(clean(line[2:]), h=10, size=20, style="B"); pdf.ln(1)
    elif line.startswith("## "):
        pdf.ln(2); w(clean(line[3:]), h=8, size=15, style="B")
    elif line.startswith("### "):
        w(clean(line[4:]), h=7, size=12, style="B")
    elif line.startswith("|"):
        cells = [clean(c.strip()) for c in line.strip("|").split("|")]
        if set("".join(cells).replace("-", "").strip()) == set():
            continue
        w("  |  ".join(cells), h=5, size=9)
    elif line.startswith("- "):
        w("  - " + clean(line[2:]), h=5, size=10)
    elif line.startswith("---"):
        continue
    else:
        w(clean(line), h=5, size=10)
pdf.output(str(OUT / "KnowledgeAI-Documentation.pdf"))

print("Generated:", [p.name for p in OUT.iterdir()])
