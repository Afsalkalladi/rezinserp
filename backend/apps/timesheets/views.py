from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.permissions import IsAdminOrShopManager
from .models import TimesheetEntry
from .serializers import TimesheetEntrySerializer, TimesheetEntryCreateSerializer


class TimesheetEntryViewSet(viewsets.ModelViewSet):
    """
    Manager: create/view for own shop workers.
    Worker: view own entries.
    Admin: full access.
    """
    filterset_fields = ['worker', 'date']
    ordering_fields = ['date']

    def get_queryset(self):
        user = self.request.user
        qs = TimesheetEntry.objects.select_related('shop', 'worker', 'recorded_by')
        if user.role == 'shop_manager':
            return qs.filter(shop=user.shop)
        if user.role == 'worker':
            return qs.filter(worker=user)
        if user.role == 'admin':
            return qs.all()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return TimesheetEntryCreateSerializer
        return TimesheetEntrySerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrShopManager()]
        return [IsAuthenticated()]
