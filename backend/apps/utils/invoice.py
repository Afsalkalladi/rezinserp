"""
Invoice generation utility for GST-compliant invoices.
Generates invoice images using Pillow, saved to Cloudinary or local media.
"""
import io
import os
from datetime import datetime
from decimal import Decimal
from PIL import Image, ImageDraw, ImageFont
from django.core.files.base import ContentFile


# GST rate for Australia
GST_RATE = Decimal('0.10')


def generate_invoice_image(
    invoice_number,
    date,
    shop_name,
    shop_address,
    items,  # list of dicts: {'name': str, 'quantity': str, 'unit_price': Decimal}
    vendor_name='',
    notes='',
    order_type='Procurement',
):
    """
    Generate a GST invoice image.

    Args:
        invoice_number: Unique invoice identifier
        date: Date string or date object
        shop_name: Name of the shop placing the order
        shop_address: Address of the shop
        items: List of item dicts with name, quantity, unit_price
        vendor_name: Supplier/vendor name
        notes: Additional notes
        order_type: 'Procurement' or 'Warehouse'

    Returns:
        ContentFile ready to save to ImageField
    """
    # Canvas setup
    width, height = 800, 1100
    bg_color = (255, 255, 255)
    text_color = (30, 30, 30)
    accent_color = (220, 80, 20)
    line_color = (200, 200, 200)
    header_bg = (245, 245, 245)

    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Use default font (Pillow built-in)
    try:
        font_large = ImageFont.truetype("arial.ttf", 28)
        font_medium = ImageFont.truetype("arial.ttf", 18)
        font_small = ImageFont.truetype("arial.ttf", 14)
        font_bold = ImageFont.truetype("arialbd.ttf", 16)
    except (IOError, OSError):
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_bold = ImageFont.load_default()

    y = 30

    # Header background
    draw.rectangle([(0, 0), (width, 120)], fill=header_bg)

    # Company header
    draw.text((40, y), "REZINS BURGER CHAIN", fill=accent_color, font=font_large)
    y += 35
    draw.text((40, y), "ABN: 12 345 678 901", fill=text_color, font=font_small)
    y += 20
    draw.text((40, y), "Melbourne, VIC, Australia", fill=text_color, font=font_small)

    # Invoice title - right aligned
    draw.text((500, 30), "TAX INVOICE", fill=accent_color, font=font_large)
    draw.text((500, 65), f"GST Inclusive", fill=text_color, font=font_small)

    y = 140

    # Divider
    draw.line([(40, y), (width - 40, y)], fill=accent_color, width=2)
    y += 20

    # Invoice details
    draw.text((40, y), f"Invoice No:", fill=text_color, font=font_bold)
    draw.text((160, y), f"{invoice_number}", fill=text_color, font=font_medium)
    draw.text((420, y), f"Date:", fill=text_color, font=font_bold)
    date_str = date.strftime('%d/%m/%Y') if hasattr(date, 'strftime') else str(date)
    draw.text((480, y), date_str, fill=text_color, font=font_medium)
    y += 30

    draw.text((40, y), f"Order Type:", fill=text_color, font=font_bold)
    draw.text((160, y), order_type, fill=text_color, font=font_medium)
    y += 30

    # Bill To
    draw.text((40, y), "Bill To:", fill=accent_color, font=font_bold)
    y += 22
    draw.text((40, y), shop_name, fill=text_color, font=font_medium)
    y += 22
    if shop_address:
        draw.text((40, y), shop_address, fill=text_color, font=font_small)
        y += 20

    # Vendor
    if vendor_name:
        y += 10
        draw.text((420, y - 52), "Supplier:", fill=accent_color, font=font_bold)
        draw.text((420, y - 30), vendor_name, fill=text_color, font=font_medium)

    y += 20

    # Divider
    draw.line([(40, y), (width - 40, y)], fill=line_color, width=1)
    y += 10

    # Table header
    draw.rectangle([(40, y), (width - 40, y + 30)], fill=header_bg)
    draw.text((50, y + 5), "#", fill=text_color, font=font_bold)
    draw.text((80, y + 5), "Item", fill=text_color, font=font_bold)
    draw.text((380, y + 5), "Qty", fill=text_color, font=font_bold)
    draw.text((480, y + 5), "Unit Price", fill=text_color, font=font_bold)
    draw.text((620, y + 5), "Amount", fill=text_color, font=font_bold)
    y += 35

    # Table rows
    subtotal = Decimal('0.00')
    for idx, item in enumerate(items, 1):
        name = item.get('name', 'Item')
        qty = item.get('quantity', '1')
        unit_price = Decimal(str(item.get('unit_price', 0)))

        try:
            qty_num = Decimal(str(qty))
        except Exception:
            qty_num = Decimal('1')

        amount = qty_num * unit_price
        subtotal += amount

        draw.text((50, y), str(idx), fill=text_color, font=font_small)
        draw.text((80, y), str(name)[:35], fill=text_color, font=font_small)
        draw.text((380, y), str(qty), fill=text_color, font=font_small)
        draw.text((480, y), f"A${unit_price:.2f}", fill=text_color, font=font_small)
        draw.text((620, y), f"A${amount:.2f}", fill=text_color, font=font_small)
        y += 25

        # Row divider
        draw.line([(40, y), (width - 40, y)], fill=line_color, width=1)
        y += 5

    y += 15

    # Totals
    gst_amount = subtotal * GST_RATE / (1 + GST_RATE)  # GST inclusive
    net_amount = subtotal - gst_amount

    draw.line([(460, y), (width - 40, y)], fill=line_color, width=1)
    y += 10

    draw.text((480, y), "Subtotal (excl. GST):", fill=text_color, font=font_bold)
    draw.text((640, y), f"A${net_amount:.2f}", fill=text_color, font=font_medium)
    y += 25

    draw.text((480, y), "GST (10%):", fill=text_color, font=font_bold)
    draw.text((640, y), f"A${gst_amount:.2f}", fill=text_color, font=font_medium)
    y += 25

    draw.line([(460, y), (width - 40, y)], fill=accent_color, width=2)
    y += 10

    draw.text((460, y), "TOTAL (inc. GST):", fill=accent_color, font=font_bold)
    y += 28
    draw.text((460, y), f"A${subtotal:.2f}", fill=accent_color, font=font_large)
    y += 45

    # Notes
    if notes:
        draw.line([(40, y), (width - 40, y)], fill=line_color, width=1)
        y += 15
        draw.text((40, y), "Notes:", fill=text_color, font=font_bold)
        y += 20
        draw.text((40, y), str(notes)[:80], fill=text_color, font=font_small)
        y += 25

    # Footer
    footer_y = height - 80
    draw.line([(40, footer_y), (width - 40, footer_y)], fill=line_color, width=1)
    draw.text(
        (40, footer_y + 15),
        "This is a computer-generated invoice. GST is calculated on an inclusive basis.",
        fill=(150, 150, 150), font=font_small,
    )
    draw.text(
        (40, footer_y + 35),
        f"Generated: {datetime.now().strftime('%d/%m/%Y %H:%M')} AEST | Rezins ERP System",
        fill=(150, 150, 150), font=font_small,
    )

    # Save to bytes
    buffer = io.BytesIO()
    img.save(buffer, format='PNG', quality=95)
    buffer.seek(0)

    filename = f"invoice_{invoice_number}_{date_str.replace('/', '-')}.png"
    return ContentFile(buffer.read(), name=filename)
