from rest_framework import viewsets
from apps.permissions import IsAdmin
from .models import Shop
from .serializers import ShopSerializer


class ShopViewSet(viewsets.ModelViewSet):
    """Admin-only shop management."""
    queryset = Shop.objects.all()
    serializer_class = ShopSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['is_active']
    search_fields = ['name', 'address']
