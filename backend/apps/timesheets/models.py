from django.db import models
from django.conf import settings
from decimal import Decimal


class TimesheetEntry(models.Model):
    """Actual attendance / work tracking entry per worker per day."""
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE, related_name='timesheet_entries'
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='timesheet_entries'
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recorded_timesheets'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('worker', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.worker.get_full_name()} | {self.date}"

    @property
    def hours_worked(self):
        """Calculate total hours worked as a Decimal."""
        from datetime import datetime, timedelta
        start = datetime.combine(self.date, self.start_time)
        end = datetime.combine(self.date, self.end_time)
        if end < start:
            end += timedelta(days=1)  # overnight shift
        diff = end - start
        return Decimal(str(round(diff.total_seconds() / 3600, 2)))
