from django.contrib import admin
from .models import DailyClosingReport

@admin.register(DailyClosingReport)
class DailyClosingReportAdmin(admin.ModelAdmin):
    list_display = ['shop', 'date', 'cash_sales', 'digital_sales', 'online_orders', 'expenses']
    list_filter = ['shop', 'date']
