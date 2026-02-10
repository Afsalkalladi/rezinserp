from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model

from apps.permissions import IsAdmin, IsAdminOrShopManager
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer, LoginSerializer, ProfileSerializer,
)

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate and return JWT tokens."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        username=serializer.validated_data['username'],
        password=serializer.validated_data['password'],
    )
    if not user or not user.is_active:
        return Response(
            {'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED
        )
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Blacklist refresh token."""
    try:
        token = RefreshToken(request.data.get('refresh'))
        token.blacklist()
    except Exception:
        pass
    return Response({'detail': 'Logged out'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return current user profile."""
    return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    """
    Admin: full CRUD on all users.
    Shop Manager: read-only list of workers in own shop.
    """
    filterset_fields = ['role', 'shop', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.select_related('shop').all()
        if user.role == 'shop_manager':
            # Managers can only see staff in their own shop
            return qs.filter(shop=user.shop)
        return qs

    def get_permissions(self):
        # Managers can list / retrieve users; only admin can create/update/delete
        if self.action in ('list', 'retrieve'):
            return [IsAdminOrShopManager()]
        return [IsAdmin()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer
