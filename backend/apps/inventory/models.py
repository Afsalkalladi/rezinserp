from django.db import models
from django.conf import settings


class InventoryItem(models.Model):
    """Master item catalog available for ordering."""

    class Category(models.TextChoices):
        WAREHOUSE = 'warehouse', 'Warehouse'
        PROCUREMENT = 'procurement', 'Procurement'

    name = models.CharField(max_length=150)
    unit = models.CharField(max_length=30, help_text='e.g. kg, pcs, litre')
    price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text='Default price per unit in AUD',
    )
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.WAREHOUSE,
        help_text='Which ordering system this item belongs to',
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.unit}) - A${self.price}"


class InventoryRequest(models.Model):
    """A requirement sheet submitted by a shop to the warehouse."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        DISPATCHED = 'dispatched', 'Dispatched'
        REJECTED = 'rejected', 'Rejected'

    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE, related_name='inventory_requests'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inventory_requests'
    )
    date = models.DateField()
    time = models.TimeField(null=True, blank=True, help_text='Time of request')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    notes = models.TextField(blank=True)
    invoice_image = models.ImageField(
        upload_to='warehouse_invoices/', blank=True, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"Request #{self.pk} - {self.shop.name} ({self.date})"


class InventoryRequestItem(models.Model):
    """Line item inside an inventory request."""
    request = models.ForeignKey(
        InventoryRequest, on_delete=models.CASCADE, related_name='items'
    )
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.item.name} x {self.quantity}"
