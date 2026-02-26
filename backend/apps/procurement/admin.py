from django.contrib import admin
from .models import Supplier, ProcurementOrder, ProcurementOrderItem, ProcurementRequest


class ProcurementOrderItemInline(admin.TabularInline):
    model = ProcurementOrderItem
    extra = 1


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'is_active']
    list_filter = ['is_active']


@admin.register(ProcurementOrder)
class ProcurementOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'supplier', 'shop', 'date', 'status', 'requested_by']
    list_filter = ['status', 'shop', 'supplier']
    inlines = [ProcurementOrderItemInline]


@admin.register(ProcurementRequest)
class ProcurementRequestAdmin(admin.ModelAdmin):
    list_display = ['item_name', 'shop', 'status', 'vendor_name', 'requested_by', 'handled_by']
    list_filter = ['status', 'shop']
