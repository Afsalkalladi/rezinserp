from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.permissions import IsAdmin
from .models import Shop
from .serializers import ShopSerializer


class ShopViewSet(viewsets.ModelViewSet):
    """
    Admin: full CRUD.
    Authenticated users: read-only list/retrieve (needed for dropdowns).
    """
    queryset = Shop.objects.all()
    serializer_class = ShopSerializer
    filterset_fields = ['is_active']
    search_fields = ['name', 'address']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]
