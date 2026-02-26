from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.permissions import IsAdmin, IsAdminOrShopManager, IsAdminOrWarehouse, IsAdminOrShopManagerOrWarehouse
from .models import InventoryItem, InventoryRequest
from .serializers import (
    InventoryItemSerializer, InventoryRequestSerializer,
    InventoryRequestCreateSerializer,
)


class InventoryItemViewSet(viewsets.ModelViewSet):
    """Manage master item catalog. Admin can CRUD. Others can list."""
    serializer_class = InventoryItemSerializer
    search_fields = ['name']
    filterset_fields = ['is_active', 'category']

    def get_queryset(self):
        return InventoryItem.objects.all()

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAdminOrShopManagerOrWarehouse()]
        return [IsAdmin()]

    def perform_destroy(self, instance):
        """Soft-delete: deactivate instead of deleting if item has history."""
        from .models import InventoryRequestItem
        has_history = InventoryRequestItem.objects.filter(item=instance).exists()
        if has_history:
            instance.is_active = False
            instance.save()
        else:
            instance.delete()


class InventoryRequestViewSet(viewsets.ModelViewSet):
    """
    Shop Manager: create & view own shop requests.
    Warehouse Manager: view all & update status.
    Admin: full access.
    """
    serializer_class = InventoryRequestSerializer
    filterset_fields = ['status', 'shop', 'date']
    ordering_fields = ['date', 'created_at']

    def get_permissions(self):
        if self.action in ('create',):
            return [IsAdminOrShopManager()]
        if self.action in ('update', 'partial_update'):
            return [IsAdminOrWarehouse()]
        return [IsAdminOrShopManagerOrWarehouse()]

    def get_queryset(self):
        user = self.request.user
        qs = InventoryRequest.objects.select_related('shop', 'requested_by').prefetch_related('items__item')
        if user.role == 'shop_manager':
            return qs.filter(shop=user.shop)
        if user.role == 'warehouse_manager':
            return qs.all()
        if user.role == 'admin':
            return qs.all()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return InventoryRequestCreateSerializer
        return InventoryRequestSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrWarehouse])
    def approve(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'approved'
        obj.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrWarehouse])
    def dispatch_items(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'dispatched'
        obj.save()
        return Response({'status': 'dispatched'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrWarehouse])
    def reject(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'rejected'
        obj.save()
        return Response({'status': 'rejected'})
