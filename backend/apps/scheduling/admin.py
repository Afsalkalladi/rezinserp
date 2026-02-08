from django.contrib import admin
from .models import Shift, ShiftAssignment

class ShiftAssignmentInline(admin.TabularInline):
    model = ShiftAssignment
    extra = 1

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['shop', 'date', 'start_time', 'end_time', 'created_by']
    list_filter = ['shop', 'date']
    inlines = [ShiftAssignmentInline]
