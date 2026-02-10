from django.db import models
from django.conf import settings


class ProcurementRequest(models.Model):
    """Purchase request for items not available from internal warehouse."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ORDERED = 'ordered', 'Ordered'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'

    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE, related_name='procurement_requests'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='procurement_requests'
    )
    item_name = models.CharField(max_length=200)
    quantity = models.CharField(max_length=100)
    estimated_unit_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, help_text='Estimated price per unit in AUD'
    )
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    # Procurement officer fields
    vendor_name = models.CharField(max_length=200, blank=True)
    order_date = models.DateField(null=True, blank=True)
    invoice_image = models.ImageField(
        upload_to='procurement_invoices/', blank=True, null=True
    )
    delivery_date = models.DateField(null=True, blank=True)
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='handled_procurements'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.item_name} - {self.shop.name} ({self.get_status_display()})"
