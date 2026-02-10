from django.contrib import admin
from .models import Payroll

@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ['worker', 'shop', 'week_start_date', 'week_end_date', 'net_salary', 'status']
    list_filter = ['status', 'shop', 'week_start_date']
