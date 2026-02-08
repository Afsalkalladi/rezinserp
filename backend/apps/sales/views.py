from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.permissions import IsAdminOrShopManager
from .models import DailyClosingReport
from .serializers import DailyClosingReportSerializer, DailyClosingReportCreateSerializer


class DailyClosingReportViewSet(viewsets.ModelViewSet):
    """
    Manager: create/view for own shop. One per day enforced.
    Admin: full access.
    """
    permission_classes = [IsAdminOrShopManager]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['shop', 'date']
    ordering_fields = ['date']

    def get_queryset(self):
        user = self.request.user
        qs = DailyClosingReport.objects.select_related('shop', 'submitted_by')
        if user.role == 'shop_manager':
            return qs.filter(shop=user.shop)
        if user.role == 'admin':
            return qs.all()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return DailyClosingReportCreateSerializer
        return DailyClosingReportSerializer
