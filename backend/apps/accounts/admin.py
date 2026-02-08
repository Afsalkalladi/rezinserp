from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'first_name', 'last_name', 'role', 'shop', 'is_active']
    list_filter = ['role', 'is_active', 'shop']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role & Shop', {'fields': ('role', 'phone', 'shop')}),
    )
