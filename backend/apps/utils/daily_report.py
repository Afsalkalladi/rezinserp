"""
Daily shop report generation utility.
Generates a PDF report showing each employee's hours/minutes per shop per day.
Uses ReportLab to generate the report.
"""
import io
from datetime import datetime, date as date_type
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
)


def generate_daily_shop_report(shop, report_date, entries):
    """
    Generate a daily shop report PDF showing each employee's hours/minutes.

    Args:
        shop: Shop model instance
        report_date: date object
        entries: queryset of TimesheetEntry for that shop/date

    Returns:
        bytes — PDF content
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=25 * mm,
        rightMargin=25 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'ReportTitle', parent=styles['Title'],
        fontSize=20, textColor=colors.HexColor('#DC5014'),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle', parent=styles['Normal'],
        fontSize=12, textColor=colors.HexColor('#1E1E1E'),
        spaceAfter=2,
    )
    info_style = ParagraphStyle(
        'ReportInfo', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#555555'),
        spaceAfter=6,
    )
    footer_style = ParagraphStyle(
        'ReportFooter', parent=styles['Normal'],
        fontSize=8, textColor=colors.HexColor('#999999'),
        spaceBefore=12,
    )

    elements = []

    # Header
    elements.append(Paragraph('DAILY SHOP REPORT', title_style))
    elements.append(Paragraph(f'Rezins Burger Chain &mdash; {shop.name}', subtitle_style))

    date_str = report_date.strftime('%A, %d %B %Y') if hasattr(report_date, 'strftime') else str(report_date)
    address = shop.address or 'N/A'
    elements.append(Paragraph(f'Date: {date_str} &nbsp;&nbsp;&nbsp; Address: {address}', info_style))

    elements.append(Spacer(1, 6 * mm))

    # Summary
    total_present = sum(1 for e in entries if e.is_present)
    total_absent = len(entries) - total_present
    total_hours = sum(e.hours_worked for e in entries)
    total_minutes = int(float(total_hours) * 60)
    hrs = total_minutes // 60
    mins = total_minutes % 60

    summary_text = (
        f'<b>Total Staff:</b> {len(entries)} &nbsp;&nbsp; '
        f'<font color="#228B22"><b>Present:</b> {total_present}</font> &nbsp;&nbsp; '
        f'<font color="#B42828"><b>Absent:</b> {total_absent}</font> &nbsp;&nbsp; '
        f'<font color="#DC5014"><b>Total Hours:</b> {hrs}h {mins}m</font>'
    )
    elements.append(Paragraph(summary_text, info_style))
    elements.append(Spacer(1, 4 * mm))

    # Table
    header_row = ['#', 'Employee Name', 'Status', 'Start', 'End', 'Hours', 'Minutes']
    table_data = [header_row]

    for idx, entry in enumerate(entries, 1):
        worker_name = entry.worker.get_full_name() or entry.worker.username
        is_present = entry.is_present
        start = str(entry.start_time)[:5] if entry.start_time else '\u2014'
        end = str(entry.end_time)[:5] if entry.end_time else '\u2014'
        h_worked = float(entry.hours_worked)
        h = int(h_worked)
        m = int((h_worked - h) * 60)
        status_text = 'Present' if is_present else 'Absent'
        table_data.append([
            str(idx), worker_name[:30], status_text, start, end, f'{h}h', f'{m}m',
        ])

    if len(entries) == 0:
        table_data.append(['', 'No attendance records for this date.', '', '', '', '', ''])

    col_widths = [25, 160, 60, 50, 50, 45, 50]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    # Table styling
    style_commands = [
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F5F5F5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1E1E1E')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),

        # Body
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (3, 0), (-1, -1), 'CENTER'),

        # Grid
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#DC5014')),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]

    # Alternating row colours & status colour coding
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FAFAFA')))
        # Color-code status column
        if i > 0 and i < len(table_data):
            status_val = table_data[i][2]
            if status_val == 'Present':
                style_commands.append(('TEXTCOLOR', (2, i), (2, i), colors.HexColor('#228B22')))
            elif status_val == 'Absent':
                style_commands.append(('TEXTCOLOR', (2, i), (2, i), colors.HexColor('#B42828')))

    table.setStyle(TableStyle(style_commands))
    elements.append(table)

    # Footer
    elements.append(Spacer(1, 8 * mm))
    generated = datetime.now().strftime('%d/%m/%Y %H:%M')
    elements.append(Paragraph(
        f'Generated: {generated} AEST | Rezins ERP System',
        footer_style,
    ))

    doc.build(elements)
    return buffer.getvalue()
