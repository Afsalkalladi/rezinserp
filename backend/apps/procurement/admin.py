from django.contrib import admin
from .models import ProcurementRequest

@admin.register(ProcurementRequest)
class ProcurementRequestAdmin(admin.ModelAdmin):
    list_display = ['item_name', 'shop', 'status', 'vendor_name', 'requested_by', 'handled_by']
    list_filter = ['status', 'shop']
