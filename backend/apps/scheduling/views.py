from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.permissions import IsAdminOrShopManager, IsWorker
from .models import Shift, ShiftAssignment
from .serializers import ShiftSerializer, ShiftCreateSerializer, ShiftAssignmentSerializer


class ShiftViewSet(viewsets.ModelViewSet):
    """
    Manager: create/view shifts for own shop.
    Worker: view assigned shifts.
    Admin: full access.
    """
    filterset_fields = ['date', 'shop']
    ordering_fields = ['date', 'start_time']

    def get_queryset(self):
        user = self.request.user
        qs = Shift.objects.select_related('shop', 'created_by').prefetch_related('assignments__worker')
        if user.role == 'shop_manager':
            return qs.filter(shop=user.shop)
        if user.role == 'worker':
            return qs.filter(assignments__worker=user)
        if user.role == 'admin':
            return qs.all()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return ShiftCreateSerializer
        return ShiftSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrShopManager()]
        return [IsAuthenticated()]


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    """Manage individual shift assignments."""
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [IsAdminOrShopManager]

    def get_queryset(self):
        return ShiftAssignment.objects.filter(
            shift_id=self.kwargs.get('shift_pk')
        ).select_related('worker')
