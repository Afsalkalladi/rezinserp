from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with role-based access control."""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        SHOP_MANAGER = 'shop_manager', 'Shop Manager'
        WAREHOUSE_MANAGER = 'warehouse_manager', 'Warehouse Manager'
        PROCUREMENT_OFFICER = 'procurement_officer', 'Procurement Officer'
        WORKER = 'worker', 'Worker'

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.WORKER,
    )
    phone = models.CharField(max_length=15, blank=True)
    shop = models.ForeignKey(
        'shops.Shop',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff',
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['username']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_shop_manager(self):
        return self.role == self.Role.SHOP_MANAGER

    @property
    def is_warehouse_manager(self):
        return self.role == self.Role.WAREHOUSE_MANAGER

    @property
    def is_procurement_officer(self):
        return self.role == self.Role.PROCUREMENT_OFFICER

    @property
    def is_worker(self):
        return self.role == self.Role.WORKER
