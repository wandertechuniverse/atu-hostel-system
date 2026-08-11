"""Generate public/docs/sample-hostel-prospectus.pdf for the academic demo."""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

root = Path(__file__).resolve().parent.parent
out = root / "public" / "docs"
out.mkdir(parents=True, exist_ok=True)
path = out / "sample-hostel-prospectus.pdf"

doc = SimpleDocTemplate(
    str(path),
    pagesize=A4,
    leftMargin=20 * mm,
    rightMargin=20 * mm,
    topMargin=18 * mm,
    bottomMargin=18 * mm,
    title="Sample ATU Hostel Prospectus",
    author="ATU HBMS Academic Demo",
)
styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(name="Tiny", parent=styles["Normal"], fontSize=8, textColor=colors.grey)
)
styles.add(ParagraphStyle(name="Body", parent=styles["Normal"], fontSize=10, leading=14))
styles.add(ParagraphStyle(name="H", parent=styles["Heading2"], spaceBefore=12, spaceAfter=6))

story = []
story.append(Paragraph("Accra Technical University", styles["Title"]))
story.append(
    Paragraph(
        "Hostel Booking Management System — Sample Prospectus",
        styles["Heading2"],
    )
)
story.append(
    Paragraph(
        "<b>Academic demonstration document</b> for Group 13 (Diploma in Information Technology). "
        "Not an official ATU publication. Figures and rules are illustrative.",
        styles["Tiny"],
    )
)
story.append(Spacer(1, 8))
story.append(Paragraph("1. Purpose", styles["H"]))
story.append(
    Paragraph(
        "This sample prospectus summarises how students request accommodation through the HBMS platform: "
        "search hostels, request a room, await manager approval, submit Mobile Money (simulated), and download a receipt.",
        styles["Body"],
    )
)
story.append(Paragraph("2. Who may apply", styles["H"]))
story.append(
    Paragraph(
        "Registered ATU students with a valid student ID, active account, and accepted platform rules. "
        "Managers control rooms for one hostel; administrators oversee all hostels.",
        styles["Body"],
    )
)
story.append(Paragraph("3. Academic session &amp; fees", styles["H"]))
story.append(
    Paragraph(
        "Rooms are priced <b>per academic year / session</b> (e.g. 2026/2027), not per night. "
        "Demo fees range approximately GH₵ 3,500 – 6,000 depending on room type and hostel.",
        styles["Body"],
    )
)
data = [
    [Paragraph("<b>Item</b>", styles["Body"]), Paragraph("<b>Demo illustration</b>", styles["Body"])],
    [Paragraph("Session", styles["Body"]), Paragraph("2026/2027", styles["Body"])],
    [Paragraph("Room types", styles["Body"]), Paragraph("Single, Double, Shared", styles["Body"])],
    [
        Paragraph("Payment", styles["Body"]),
        Paragraph("Simulated MoMo (MTN / Vodafone / AirtelTigo)", styles["Body"]),
    ],
    [
        Paragraph("Confirmation", styles["Body"]),
        Paragraph("After manager approval + verified payment", styles["Body"]),
    ],
]
t = Table(data, colWidths=[45 * mm, 120 * mm])
t.setStyle(
    TableStyle(
        [
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.93, 0.93, 0.95)),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
    )
)
story.append(Spacer(1, 6))
story.append(t)
story.append(Paragraph("4. Booking rules (sample)", styles["H"]))
items = [
    "A booking is a <b>request</b> until a manager approves it.",
    "Capacity is enforced: beds = room capacity − confirmed bookings (no double allocation).",
    "Payment amount is taken from the booking record, never from the browser.",
    "Mock gateway — no real money moves in this academic demo.",
    "Students should read the disclaimer and privacy notice before requesting a room.",
]
story.append(
    ListFlowable(
        [
            ListItem(Paragraph(i, styles["Body"]), leftIndent=8, bulletColor=colors.black)
            for i in items
        ],
        bulletType="bullet",
    )
)
story.append(Paragraph("5. Documents &amp; contacts", styles["H"]))
story.append(
    Paragraph(
        "In the live system: search on the student home page, open a hostel detail page for rooms, "
        "request booking, track status under <b>My bookings</b>. Demo admin: admin@atu.edu.gh / password. "
        "Legal pages: /disclaimer and /privacy.",
        styles["Body"],
    )
)
story.append(Spacer(1, 16))
story.append(
    Paragraph(
        "© Academic sample for ATU HBMS · Generated for project documentation and viva demonstration.",
        styles["Tiny"],
    )
)
doc.build(story)
print("wrote", path, path.stat().st_size)
