"""Generate sample invoice PDFs using fpdf2."""
from fpdf import FPDF


def create_invoice(filename, vendor, invoice_num, date, due_date, line_items, total):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(20, 20, 20)

    # Header: Vendor name
    pdf.set_font("Helvetica", "B", 22)
    pdf.cell(0, 12, vendor, ln=True, align="L")
    pdf.ln(2)

    # Divider
    pdf.set_draw_color(100, 100, 100)
    pdf.set_line_width(0.5)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(6)

    # Invoice metadata
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(50, 7, "Invoice Number:", ln=False)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, invoice_num, ln=True)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(50, 7, "Invoice Date:", ln=False)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, date, ln=True)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(50, 7, "Due Date:", ln=False)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, due_date, ln=True)
    pdf.ln(8)

    # Line items table header
    pdf.set_fill_color(50, 50, 50)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(130, 9, "  Description", fill=True, border=0, ln=False)
    pdf.cell(40, 9, "Amount (USD)", fill=True, border=0, ln=True, align="R")
    pdf.set_text_color(0, 0, 0)

    # Line items rows
    fill = False
    for desc, amount in line_items:
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(130, 8, f"  {desc}", fill=fill, border=0, ln=False)
        pdf.cell(40, 8, f"${amount:,.2f}", fill=fill, border=0, ln=True, align="R")
        fill = not fill

    pdf.ln(4)

    # Total line
    pdf.set_line_width(0.5)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(130, 9, "  TOTAL DUE", ln=False)
    pdf.cell(40, 9, f"${total:,.2f}", ln=True, align="R")

    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, "Please remit payment by the due date. Thank you for your business.", ln=True)

    pdf.output(filename)
    print(f"Created: {filename}")


if __name__ == "__main__":
    base = "C:/Users/Iqra Muzaffar/Desktop/MS-Thesis/Primepal/Resume/Hasnain/upwork/n8n-ai-workflows/sample-data/invoices"

    create_invoice(
        filename=f"{base}/invoice-001.pdf",
        vendor="Acme Web Services",
        invoice_num="INV-2024-001",
        date="2024-07-15",
        due_date="2024-08-15",
        line_items=[
            ("Web Development", 2500.00),
            ("Hosting Annual", 700.00),
        ],
        total=3200.00,
    )

    create_invoice(
        filename=f"{base}/invoice-002.pdf",
        vendor="CloudHost Pro",
        invoice_num="INV-2024-002",
        date="2024-07-18",
        due_date="2024-08-18",
        line_items=[
            ("Enterprise Cloud", 5000.00),
            ("Support Plan", 1500.00),
            ("Migration", 1000.00),
        ],
        total=7500.00,
    )

    create_invoice(
        filename=f"{base}/invoice-003.pdf",
        vendor="DesignStudio",
        invoice_num="INV-2024-003",
        date="2024-07-20",
        due_date="2024-08-20",
        line_items=[
            ("Logo Design", 800.00),
            ("Brand Guidelines", 600.00),
            ("Social Media Kit", 400.00),
        ],
        total=1800.00,
    )
