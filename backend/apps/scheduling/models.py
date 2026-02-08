from django.db import models
from django.conf import settings


class Shift(models.Model):
    """A shift created by a manager for next-day planning."""
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE, related_name='shifts'
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_shifts'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', 'start_time']

    def __str__(self):
        return f"{self.shop.name} | {self.date} {self.start_time}-{self.end_time}"


class ShiftAssignment(models.Model):
    """Assigns a worker to a shift with a specific role."""
    shift = models.ForeignKey(
        Shift, on_delete=models.CASCADE, related_name='assignments'
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shift_assignments'
    )
    role_in_shift = models.CharField(
        max_length=60, help_text='e.g. Cashier, Cook, Counter'
    )

    class Meta:
        unique_together = ('shift', 'worker')
        ordering = ['shift']

    def __str__(self):
        return f"{self.worker.get_full_name()} as {self.role_in_shift}"
