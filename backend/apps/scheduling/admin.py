from django.contrib import admin
from .models import Shift, ShiftAssignment, WeeklyRoster


class ShiftAssignmentInline(admin.TabularInline):
    model = ShiftAssignment
    extra = 1


class ShiftInline(admin.TabularInline):
    model = Shift
    extra = 0
    show_change_link = True


@admin.register(WeeklyRoster)
class WeeklyRosterAdmin(admin.ModelAdmin):
    list_display = ['shop', 'week_start_date', 'status', 'created_by', 'created_at']
    list_filter = ['shop', 'status']
    inlines = [ShiftInline]


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['shop', 'date', 'shift_type', 'start_time', 'end_time', 'created_by']
    list_filter = ['shop', 'date', 'shift_type']
    inlines = [ShiftAssignmentInline]
