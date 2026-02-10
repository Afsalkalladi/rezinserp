from django.db import models
from django.conf import settings


class Payroll(models.Model):
    """Weekly payroll record per worker."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'

    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payrolls'
    )
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE, related_name='payrolls'
    )
    week_start_date = models.DateField(help_text='Start date of the pay week')
    week_end_date = models.DateField(help_text='End date of the pay week')
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_days = models.PositiveIntegerField(default=0)
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bonus = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_payrolls'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('worker', 'week_start_date')
        ordering = ['-week_start_date']

    def __str__(self):
        return f"{self.worker.get_full_name()} - Week of {self.week_start_date}"

    def calculate_salary(self):
        """Calculate salary from timesheet data for the week."""
        from apps.timesheets.models import TimesheetEntry

        entries = TimesheetEntry.objects.filter(
            worker=self.worker,
            date__gte=self.week_start_date,
            date__lte=self.week_end_date,
            is_present=True,
        )
        self.total_days = entries.count()
        self.total_hours = sum(e.hours_worked for e in entries)
        self.base_salary = self.total_hours * self.hourly_rate
        self.net_salary = self.base_salary + self.bonus - self.deductions
