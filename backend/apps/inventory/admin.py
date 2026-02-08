from django.contrib import admin
from .models import InventoryItem, InventoryRequest, InventoryRequestItem

class InventoryRequestItemInline(admin.TabularInline):
    model = InventoryRequestItem
    extra = 1

@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'unit', 'is_active']
    list_filter = ['is_active']

@admin.register(InventoryRequest)
class InventoryRequestAdmin(admin.ModelAdmin):
    list_display = ['shop', 'date', 'status', 'requested_by', 'created_at']
    list_filter = ['status', 'shop']
    inlines = [InventoryRequestItemInline]
