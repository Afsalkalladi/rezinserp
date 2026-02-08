from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.permissions import IsAdminOrShopManager, IsAdminOrProcurement
from .models import ProcurementRequest
from .serializers import (
    ProcurementRequestSerializer, ProcurementCreateSerializer,
    ProcurementUpdateSerializer,
)


class ProcurementRequestViewSet(viewsets.ModelViewSet):
    """
    Shop Manager: create request.
    Procurement Officer: view & update.
    Admin: full access.
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['status', 'shop']
    ordering_fields = ['created_at']

    def get_queryset(self):
        user = self.request.user
        qs = ProcurementRequest.objects.select_related(
            'shop', 'requested_by', 'handled_by'
        )
        if user.role == 'shop_manager':
            return qs.filter(shop=user.shop)
        if user.role == 'procurement_officer':
            return qs.all()
        if user.role == 'admin':
            return qs.all()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return ProcurementCreateSerializer
        if self.action in ('update', 'partial_update'):
            if self.request.user.role == 'procurement_officer':
                return ProcurementUpdateSerializer
        return ProcurementRequestSerializer

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
