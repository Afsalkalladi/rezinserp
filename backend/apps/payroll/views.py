from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.permissions import IsAdminOrShopManager, IsAdminOrPayrollManager, IsAdminOrShopManagerOrPayroll
from .models import Payroll
from .serializers import PayrollSerializer, PayrollCreateSerializer


class PayrollViewSet(viewsets.ModelViewSet):
    """
    Manager: create/view payroll for own shop workers.
    Worker: view own payroll.
    Admin: full access.
    Payroll Manager: view all, mark paid.
    """
    filterset_fields = ['worker', 'week_start_date', 'status', 'shop']
    ordering_fields = ['week_start_date']

    def get_queryset(self):
        user = self.request.user
        qs = Payroll.objects.select_related('worker', 'shop', 'created_by')
        if user.role == 'shop_manager':
            return qs.filter(shop=user.shop)
        if user.role == 'worker':
            return qs.filter(worker=user)
        if user.role in ('admin', 'payroll_manager'):
            return qs.all()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return PayrollCreateSerializer
        return PayrollSerializer

    def get_permissions(self):
        if self.action in ('create',):
            return [IsAdminOrShopManager()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAdminOrShopManager()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrShopManagerOrPayroll])
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
