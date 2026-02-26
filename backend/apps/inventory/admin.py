from django.contrib import admin
from .models import InventoryItem, InventoryRequest, InventoryRequestItem

class InventoryRequestItemInline(admin.TabularInline):
    model = InventoryRequestItem
    extra = 1

@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'unit', 'price', 'category', 'is_active']
    list_filter = ['is_active', 'category']
    list_editable = ['price', 'is_active']
    search_fields = ['name']

@admin.register(InventoryRequest)
class InventoryRequestAdmin(admin.ModelAdmin):
    list_display = ['shop', 'date', 'status', 'requested_by', 'created_at']
    list_filter = ['status', 'shop']
    inlines = [InventoryRequestItemInline]
