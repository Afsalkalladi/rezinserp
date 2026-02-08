from django.db import models
from django.conf import settings


class DailyClosingReport(models.Model):
    """End-of-day sales report submitted by the manager. One per shop per day."""
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE, related_name='closing_reports'
    )
    date = models.DateField()
    cash_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    digital_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    online_orders = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expense_notes = models.TextField(blank=True)
    bill_image = models.ImageField(upload_to='closing_reports/', blank=True, null=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='closing_reports'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('shop', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.shop.name} | {self.date}"

    @property
    def total_sales(self):
        return self.cash_sales + self.digital_sales + self.online_orders

    @property
    def net_revenue(self):
        return self.total_sales - self.expenses
