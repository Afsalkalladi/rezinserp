from django.db import models
from django.conf import settings


class WeeklyRoster(models.Model):
    """A weekly roster grouping shifts for a full week."""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'

    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE, related_name='rosters'
    )
    week_start_date = models.DateField(help_text='Monday of the roster week')
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_rosters'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('shop', 'week_start_date')
        ordering = ['-week_start_date']

    def __str__(self):
        return f"{self.shop.name} | Week of {self.week_start_date} ({self.get_status_display()})"


class Shift(models.Model):
    """A shift created by a manager for next-day planning."""

    class ShiftType(models.TextChoices):
        OPENING = 'opening', 'Opening'
        AFTERNOON = 'afternoon', 'Afternoon'
        CUSTOM = 'custom', 'Custom'

    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE, related_name='shifts'
    )
    roster = models.ForeignKey(
        WeeklyRoster, on_delete=models.CASCADE, null=True, blank=True, related_name='shifts'
    )
    date = models.DateField()
    shift_type = models.CharField(
        max_length=20, choices=ShiftType.choices, default=ShiftType.CUSTOM
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_shifts'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', 'start_time']

    def __str__(self):
        return f"{self.shop.name} | {self.date} {self.get_shift_type_display()} {self.start_time}-{self.end_time}"


class ShiftAssignment(models.Model):
    """Assigns a worker to a shift with a specific role."""
    shift = models.ForeignKey(
        Shift, on_delete=models.CASCADE, related_name='assignments'
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shift_assignments'
    )
    role_in_shift = models.CharField(
        max_length=60, help_text='e.g. Cashier, Cook, Counter', default='general'
    )
    start_time = models.TimeField(
        null=True, blank=True,
        help_text='Individual start time (overrides shift default)'
    )
    end_time = models.TimeField(
        null=True, blank=True,
        help_text='Individual end time (overrides shift default)'
    )

    class Meta:
        unique_together = ('shift', 'worker')
        ordering = ['shift']

    def __str__(self):
        return f"{self.worker.get_full_name()} as {self.role_in_shift}"
