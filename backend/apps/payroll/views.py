from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.permissions import IsAdminOrShopManager
from .models import Payroll
from .serializers import PayrollSerializer, PayrollCreateSerializer


class PayrollViewSet(viewsets.ModelViewSet):
    """
    Manager: create/view payroll for own shop workers.
    Worker: view own payroll.
    Admin: full access.
    """
    filterset_fields = ['worker', 'month', 'year', 'status']
    ordering_fields = ['year', 'month']

    def get_queryset(self):
        user = self.request.user
        qs = Payroll.objects.select_related('worker', 'shop', 'created_by')
        if user.role == 'shop_manager':
            return qs.filter(shop=user.shop)
        if user.role == 'worker':
            return qs.filter(worker=user)
        if user.role == 'admin':
            return qs.all()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return PayrollCreateSerializer
        return PayrollSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrShopManager()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrShopManager])
    def mark_paid(self, request, pk=None):
        payroll = self.get_object()
        payroll.status = 'paid'
        payroll.save()
        return Response({'status': 'paid'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrShopManager])
    def recalculate(self, request, pk=None):
        payroll = self.get_object()
        payroll.calculate_salary()
        payroll.save()
        return Response(PayrollSerializer(payroll).data)
