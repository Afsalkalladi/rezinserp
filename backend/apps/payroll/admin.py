from django.contrib import admin
from .models import Payroll

@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ['worker', 'shop', 'month', 'year', 'net_salary', 'status']
    list_filter = ['status', 'shop', 'year', 'month']
