"""
Management command to generate daily report PDFs for all active shops
and upload them to Cloudinary, organized by shop name and date.

Usage:
    python manage.py save_daily_reports                # yesterday's reports
    python manage.py save_daily_reports --date 2025-01-15  # specific date
"""
import io
from datetime import date, timedelta

import cloudinary
import cloudinary.uploader
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.shops.models import Shop
from apps.timesheets.models import TimesheetEntry
from apps.procurement.models import ProcurementRequest
from apps.inventory.models import InventoryRequest
from apps.sales.models import DailyClosingReport
from apps.utils.daily_report import generate_daily_shop_report


class Command(BaseCommand):
    help = 'Generate daily report PDFs for all active shops and upload to Cloudinary'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            default=None,
            help='Report date in YYYY-MM-DD format (defaults to yesterday)',
        )

    def handle(self, *args, **options):
        # Determine the target date
        date_str = options.get('date')
        if date_str:
            try:
                report_date = date.fromisoformat(date_str)
            except ValueError:
                self.stderr.write(self.style.ERROR(f'Invalid date format: {date_str}. Use YYYY-MM-DD'))
                return
        else:
            report_date = date.today() - timedelta(days=1)

        # Ensure Cloudinary is configured
        cloud_name = getattr(settings, 'CLOUDINARY_STORAGE', {}).get('CLOUD_NAME', '')
        if not cloud_name:
            self.stderr.write(self.style.ERROR(
                'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, '
                'CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET environment variables.'
            ))
            return

        # Configure cloudinary
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
            api_key=settings.CLOUDINARY_STORAGE['API_KEY'],
            api_secret=settings.CLOUDINARY_STORAGE['API_SECRET'],
        )

        shops = Shop.objects.filter(is_active=True).order_by('name')
        if not shops.exists():
            self.stdout.write(self.style.WARNING('No active shops found.'))
            return

        self.stdout.write(f'Generating daily reports for {report_date} ...')
        success_count = 0
        skip_count = 0

        for shop in shops:
            # Gather data for this shop
            entries = list(
                TimesheetEntry.objects.filter(
                    shop=shop, date=report_date
                ).select_related('worker').order_by('worker__first_name')
            )
            procurement_orders = list(
                ProcurementRequest.objects.filter(
                    shop=shop, created_at__date=report_date
                ).select_related('requested_by')
            )
            warehouse_orders = list(
                InventoryRequest.objects.filter(
                    shop=shop, date=report_date
                ).select_related('requested_by').prefetch_related('items__item')
            )
            closing_report = DailyClosingReport.objects.filter(
                shop=shop, date=report_date
            ).select_related('submitted_by').first()

            # Skip shops with no activity for this date
            if not entries and not procurement_orders and not warehouse_orders and not closing_report:
                skip_count += 1
                self.stdout.write(f'  Skipping {shop.name} — no activity')
                continue

            try:
                # Generate PDF
                pdf_bytes = generate_daily_shop_report(
                    shop, report_date, entries,
                    procurement_orders=procurement_orders,
                    warehouse_orders=warehouse_orders,
                    closing_report=closing_report,
                )

                # Upload to Cloudinary
                # Folder structure: daily_reports/{shop_name}/{YYYY-MM-DD}
                safe_shop_name = shop.name.replace(' ', '_').replace('/', '-')
                folder = f'daily_reports/{safe_shop_name}'
                public_id = f'{folder}/{report_date.isoformat()}'

                result = cloudinary.uploader.upload(
                    io.BytesIO(pdf_bytes),
                    resource_type='raw',
                    public_id=public_id,
                    overwrite=True,
                    format='pdf',
                )

                url = result.get('secure_url', result.get('url', ''))
                self.stdout.write(self.style.SUCCESS(
                    f'  ✓ {shop.name} — uploaded → {url}'
                ))
                success_count += 1

            except Exception as e:
                self.stderr.write(self.style.ERROR(
                    f'  ✗ {shop.name} — error: {e}'
                ))

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. Uploaded: {success_count}, Skipped: {skip_count}'
        ))
