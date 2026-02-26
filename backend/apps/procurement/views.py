from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.permissions import IsAdmin, IsAdminOrShopManager, IsAdminOrProcurement
from .models import Supplier, ProcurementOrder
from .serializers import (
    SupplierSerializer, ProcurementOrderSerializer,
    ProcurementOrderCreateSerializer, ProcurementOrderUpdateSerializer,
)


class SupplierViewSet(viewsets.ModelViewSet):
    """Admin can CRUD suppliers. Others can list."""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filterset_fields = ['is_active']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]

    def perform_destroy(self, instance):
        """Soft-delete: deactivate instead of deleting if supplier has orders."""
        if instance.orders.exists():
            instance.is_active = False
            instance.save()
        else:
            instance.delete()


class ProcurementOrderViewSet(viewsets.ModelViewSet):
    """
    Shop Manager: create orders.
    Procurement Officer: view & update status.
    Admin: full access.
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['status', 'shop', 'date', 'supplier']
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = ProcurementOrder.objects.select_related(
            'shop', 'supplier', 'requested_by', 'handled_by'
        ).prefetch_related('items__item')
        if user.role == 'shop_manager':
            return qs.filter(shop=user.shop)
        if user.role in ('procurement_officer', 'admin'):
            return qs.all()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return ProcurementOrderCreateSerializer
        if self.action in ('update', 'partial_update'):
            if self.request.user.role == 'procurement_officer':
                return ProcurementOrderUpdateSerializer
        return ProcurementOrderSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAdminOrShopManager()]
        if self.action in ('update', 'partial_update'):
            return [IsAdminOrProcurement()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        if self.request.user.role == 'procurement_officer':
            serializer.save(handled_by=self.request.user)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrProcurement])
    def mark_ordered(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'ordered'
        obj.handled_by = request.user
        obj.save()
        return Response({'status': 'ordered'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrProcurement])
    def mark_delivered(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'delivered'
        obj.save()
        return Response({'status': 'delivered'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrProcurement])
    def cancel(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'cancelled'
        obj.save()
        return Response({'status': 'cancelled'})

