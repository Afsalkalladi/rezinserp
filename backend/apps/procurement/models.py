from django.db import models
from django.conf import settings


class Supplier(models.Model):
    """External supplier for procurement orders."""
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ProcurementOrder(models.Model):
    """A procurement order to an external supplier."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ORDERED = 'ordered', 'Ordered'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'

    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE, related_name='procurement_orders'
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, related_name='orders'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='procurement_orders'
    )
    date = models.DateField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    notes = models.TextField(blank=True)
    invoice_image = models.ImageField(
        upload_to='procurement_invoices/', blank=True, null=True
    )
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='handled_procurement_orders'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"PO #{self.pk} - {self.supplier.name} ({self.date})"

    @property
    def total(self):
        """Calculate total for items with quantity > 0."""
        return sum(
            item.quantity * item.price
            for item in self.items.all()
            if item.quantity > 0
        )


class ProcurementOrderItem(models.Model):
    """Line item inside a procurement order."""
    order = models.ForeignKey(
        ProcurementOrder, on_delete=models.CASCADE, related_name='items'
    )
    item = models.ForeignKey(
        'inventory.InventoryItem', on_delete=models.CASCADE
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text='Price per unit at time of order'
    )

    def __str__(self):
        return f"{self.item.name} x {self.quantity}"


# Keep old model for backward compatibility with existing data
class ProcurementRequest(models.Model):
    """DEPRECATED: Legacy single-item procurement request. Use ProcurementOrder instead."""

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

