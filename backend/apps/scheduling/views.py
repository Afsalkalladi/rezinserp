from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.permissions import IsAdmin, IsAdminOrShopManager, IsWorker
from .models import Shift, ShiftAssignment, WeeklyRoster
from .serializers import (
    ShiftSerializer, ShiftCreateSerializer, ShiftAssignmentSerializer,
    WeeklyRosterSerializer, WeeklyRosterCreateSerializer, WeeklyRosterUpdateSerializer,
)


class WeeklyRosterViewSet(viewsets.ModelViewSet):
    """
    Manager: create/update/view rosters for own shop.
    Worker: view rosters for own shop.
    Admin: full access + add emergency worker.
    """
    filterset_fields = ['week_start_date', 'shop']
    ordering_fields = ['week_start_date']

    def get_queryset(self):
        user = self.request.user
        qs = WeeklyRoster.objects.select_related('shop', 'created_by').prefetch_related(
            'shifts__assignments__worker'
        )
        if user.role == 'shop_manager':
            return qs.filter(shop=user.shop)
        if user.role == 'worker':
            return qs.filter(shop=user.shop)
        if user.role == 'admin':
            return qs.all()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return WeeklyRosterCreateSerializer
        if self.action in ('update', 'partial_update'):
            return WeeklyRosterUpdateSerializer
        return WeeklyRosterSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrShopManager()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        roster = serializer.save()
        return Response(
            WeeklyRosterSerializer(roster).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        roster = serializer.save()
        return Response(WeeklyRosterSerializer(roster).data)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        roster = serializer.save()
        return Response(WeeklyRosterSerializer(roster).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def add_worker(self, request, pk=None):
        """Admin can add an emergency worker to a specific day in the roster."""
        roster = self.get_object()
        shift_date = request.data.get('date')
        worker_id = request.data.get('worker')
        role_in_shift = request.data.get('role_in_shift', 'general')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')

        if not shift_date or not worker_id:
            return Response(
                {'error': 'date and worker are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find or create shift for that date
        shift = roster.shifts.filter(date=shift_date).first()
        if not shift:
            if not start_time or not end_time:
                return Response(
                    {'error': 'start_time and end_time required for new shift'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            shift = Shift.objects.create(
                shop=roster.shop,
                roster=roster,
                date=shift_date,
                start_time=start_time,
                end_time=end_time,
                created_by=request.user,
            )

        # Add assignment
        assignment, created = ShiftAssignment.objects.get_or_create(
            shift=shift,
            worker_id=worker_id,
            defaults={'role_in_shift': role_in_shift},
        )
        if not created:
            return Response(
                {'error': 'Worker already assigned to this shift'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            WeeklyRosterSerializer(roster).data,
            status=status.HTTP_201_CREATED,
        )


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
