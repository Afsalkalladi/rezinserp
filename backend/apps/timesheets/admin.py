from django.contrib import admin
from .models import TimesheetEntry

@admin.register(TimesheetEntry)
class TimesheetEntryAdmin(admin.ModelAdmin):
    list_display = ['worker', 'shop', 'date', 'start_time', 'end_time', 'recorded_by']
    list_filter = ['shop', 'date']
