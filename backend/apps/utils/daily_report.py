"""
Daily shop report generation utility.
Generates a comprehensive PDF report showing employee attendance, procurement orders,
warehouse orders, and daily closing sales data.
Uses ReportLab to generate the report.
"""
import io
import os
import tempfile
from datetime import datetime, date as date_type
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image,
)


def _build_section_table(header_row, data_rows, col_widths):
    """Helper to build a styled table for a report section."""
    table_data = [header_row] + data_rows
    if not data_rows:
        table_data.append([''] * len(header_row))
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F5F5F5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1E1E1E')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#DC5014')),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FAFAFA')))
    table.setStyle(TableStyle(style_commands))
    return table


def generate_daily_shop_report(shop, report_date, entries,
                                procurement_orders=None,
                                warehouse_orders=None,
                                closing_report=None):
    """
    Generate a comprehensive daily shop report PDF.

    Args:
        shop: Shop model instance
        report_date: date object
        entries: list of TimesheetEntry for that shop/date
        procurement_orders: list of ProcurementRequest (optional)
        warehouse_orders: list of InventoryRequest with items (optional)
        closing_report: DailyClosingReport instance (optional)

    Returns:
        bytes — PDF content
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'ReportTitle', parent=styles['Title'],
        fontSize=18, textColor=colors.HexColor('#DC5014'),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle', parent=styles['Normal'],
        fontSize=11, textColor=colors.HexColor('#1E1E1E'),
        spaceAfter=2,
    )
    info_style = ParagraphStyle(
        'ReportInfo', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#555555'),
        spaceAfter=6,
    )
    section_style = ParagraphStyle(
        'SectionTitle', parent=styles['Heading2'],
        fontSize=12, textColor=colors.HexColor('#DC5014'),
        spaceBefore=8, spaceAfter=4,
    )
    footer_style = ParagraphStyle(
        'ReportFooter', parent=styles['Normal'],
        fontSize=8, textColor=colors.HexColor('#999999'),
        spaceBefore=12,
    )

    elements = []

    # ── Header ──
    elements.append(Paragraph('DAILY SHOP REPORT', title_style))
    elements.append(Paragraph(f'Rezins Burger Chain &mdash; {shop.name}', subtitle_style))

    date_str = report_date.strftime('%A, %d %B %Y') if hasattr(report_date, 'strftime') else str(report_date)
    address = shop.address or 'N/A'
    elements.append(Paragraph(f'Date: {date_str} &nbsp;&nbsp;&nbsp; Address: {address}', info_style))
    elements.append(Spacer(1, 4 * mm))

    # ══════════════════════════════════════════
    # 1) EMPLOYEE TIMESHEET / ATTENDANCE
    # ══════════════════════════════════════════
    elements.append(Paragraph('1. Employee Attendance', section_style))

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
    elements.append(Spacer(1, 2 * mm))

    header_row = ['#', 'Employee Name', 'Status', 'Start', 'End', 'Hours', 'Min']
    att_rows = []
    for idx, entry in enumerate(entries, 1):
        worker_name = entry.worker.get_full_name() or entry.worker.username
        start = str(entry.start_time)[:5] if entry.start_time else '\u2014'
        end = str(entry.end_time)[:5] if entry.end_time else '\u2014'
        h_worked = float(entry.hours_worked)
        h = int(h_worked)
        m = int((h_worked - h) * 60)
        status_text = 'Present' if entry.is_present else 'Absent'
        att_rows.append([str(idx), worker_name[:30], status_text, start, end, f'{h}h', f'{m}m'])

    if not att_rows:
        att_rows.append(['', 'No attendance records for this date.', '', '', '', '', ''])

    col_widths = [22, 145, 55, 48, 48, 40, 40]
    att_table = Table([header_row] + att_rows, colWidths=col_widths, repeatRows=1)
    att_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F5F5F5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1E1E1E')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (3, 0), (-1, -1), 'CENTER'),
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#DC5014')),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    for i in range(1, len(att_rows) + 1):
        if i % 2 == 0:
            att_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FAFAFA')))
        status_val = ([header_row] + att_rows)[i][2] if i < len(att_rows) + 1 else ''
        if status_val == 'Present':
            att_style.append(('TEXTCOLOR', (2, i), (2, i), colors.HexColor('#228B22')))
        elif status_val == 'Absent':
            att_style.append(('TEXTCOLOR', (2, i), (2, i), colors.HexColor('#B42828')))
    att_table.setStyle(TableStyle(att_style))
    elements.append(att_table)
    elements.append(Spacer(1, 4 * mm))

    # ══════════════════════════════════════════
    # 2) WAREHOUSE / INVENTORY ORDERS
    # ══════════════════════════════════════════
    if warehouse_orders is not None:
        elements.append(Paragraph('2. Warehouse Orders', section_style))
        if warehouse_orders:
            wh_rows = []
            for idx, req in enumerate(warehouse_orders, 1):
                item_names = ', '.join(
                    f"{ri.item.name} x{ri.quantity}" for ri in req.items.all()
                )
                wh_rows.append([
                    str(idx),
                    item_names[:60] or 'N/A',
                    req.get_status_display(),
                    req.requested_by.get_full_name() if req.requested_by else '—',
                    str(req.date),
                ])
            wh_header = ['#', 'Items', 'Status', 'Requested By', 'Date']
            wh_table = _build_section_table(wh_header, wh_rows, [22, 200, 60, 100, 70])
            elements.append(wh_table)
        else:
            elements.append(Paragraph('No warehouse orders for this date.', info_style))
        elements.append(Spacer(1, 4 * mm))

    # ══════════════════════════════════════════
    # 3) PROCUREMENT ORDERS
    # ══════════════════════════════════════════
    if procurement_orders is not None:
        elements.append(Paragraph('3. Procurement Orders', section_style))
        if procurement_orders:
            po_rows = []
            for idx, po in enumerate(procurement_orders, 1):
                po_rows.append([
                    str(idx),
                    po.item_name[:40],
                    str(po.quantity),
                    f'A${po.estimated_unit_price}' if po.estimated_unit_price else '—',
                    po.get_status_display(),
                    po.vendor_name[:20] or '—',
                ])
            po_header = ['#', 'Item', 'Qty', 'Price', 'Status', 'Vendor']
            po_table = _build_section_table(po_header, po_rows, [22, 140, 50, 55, 65, 100])
            elements.append(po_table)
        else:
            elements.append(Paragraph('No procurement orders for this date.', info_style))
        elements.append(Spacer(1, 4 * mm))

    # ══════════════════════════════════════════
    # 4) DAILY CLOSING / SALES REPORT
    # ══════════════════════════════════════════
    if closing_report is not None:
        elements.append(Paragraph('4. Daily Closing Report', section_style))
        cr = closing_report
        sales_data = [
            ['Cash Sales', f'A${cr.cash_sales}'],
            ['Digital Sales', f'A${cr.digital_sales}'],
            ['Online Orders', f'A${cr.online_orders}'],
            ['Total Sales', f'A${cr.total_sales}'],
            ['Expenses', f'A${cr.expenses}'],
            ['Net Revenue', f'A${cr.net_revenue}'],
        ]
        if cr.expense_notes:
            sales_data.append(['Expense Notes', cr.expense_notes[:80]])
        sales_data.insert(0, ['Description', 'Amount'])
        sales_table = Table(sales_data, colWidths=[200, 200])
        sales_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F5F5F5')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#DC5014')),
            ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]
        sales_table.setStyle(TableStyle(sales_style))
        elements.append(sales_table)
        submitted = cr.submitted_by.get_full_name() if cr.submitted_by else 'N/A'
        elements.append(Paragraph(f'Submitted by: {submitted}', info_style))

        # Include bill image if available
        if cr.bill_image:
            try:
                elements.append(Spacer(1, 3 * mm))
                elements.append(Paragraph('<b>Attached Bill Image:</b>', info_style))
                img_path = None
                # Try to get the file path (local storage)
                if hasattr(cr.bill_image, 'path'):
                    try:
                        img_path = cr.bill_image.path
                    except Exception:
                        pass
                # For Cloudinary or remote storage, download to temp file
                if not img_path or not os.path.exists(str(img_path)):
                    try:
                        import urllib.request
                        img_url = cr.bill_image.url
                        if img_url.startswith('/'):
                            pass  # local relative URL, skip
                        else:
                            suffix = os.path.splitext(img_url.split('?')[0])[-1] or '.jpg'
                            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
                            urllib.request.urlretrieve(img_url, tmp.name)
                            img_path = tmp.name
                    except Exception:
                        img_path = None
                if img_path and os.path.exists(str(img_path)):
                    try:
                        img = Image(str(img_path), width=150 * mm, height=100 * mm)
                        img.hAlign = 'LEFT'
                        elements.append(img)
                    except Exception:
                        elements.append(Paragraph('(Bill image could not be rendered)', info_style))
            except Exception:
                pass
    elif closing_report is None and (procurement_orders is not None or warehouse_orders is not None):
        elements.append(Paragraph('4. Daily Closing Report', section_style))
        elements.append(Paragraph('No closing report submitted for this date.', info_style))

    # ── Footer ──
    elements.append(Spacer(1, 6 * mm))
    generated = datetime.now().strftime('%d/%m/%Y %H:%M')
    elements.append(Paragraph(
        f'Generated: {generated} AEST | Rezins ERP System',
        footer_style,
    ))

    doc.build(elements)
    return buffer.getvalue()
