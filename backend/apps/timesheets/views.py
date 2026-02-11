from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from django.db import transaction
from django.db.models import Sum, F, ExpressionWrapper, DurationField
from datetime import timedelta, date as date_cls, datetime
from collections import defaultdict
from apps.permissions import IsAdminOrShopManager
from apps.scheduling.models import Shift, ShiftAssignment
from apps.accounts.serializers import UserSerializer
from apps.shops.models import Shop
from apps.utils.daily_report import generate_daily_shop_report
from .models import TimesheetEntry
from .serializers import (
    TimesheetEntrySerializer, TimesheetEntryCreateSerializer,
    BulkTimesheetEntrySerializer,
)


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

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrShopManager])
    def roster_workers(self, request):
        """Return workers assigned via roster for a given date."""
        date = request.query_params.get('date')
        if not date:
            return Response({'error': 'date parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        # Get shifts for this date in manager's shop (or all for admin)
        shifts_qs = Shift.objects.filter(date=date)
        if user.role == 'shop_manager':
            shifts_qs = shifts_qs.filter(shop=user.shop)

        assignments = ShiftAssignment.objects.filter(
            shift__in=shifts_qs
        ).select_related('worker', 'shift')

        workers_data = []
        seen = set()
        for a in assignments:
            if a.worker_id not in seen:
                seen.add(a.worker_id)
                # Use per-worker times if available, else fall back to shift times
                w_start = a.start_time or a.shift.start_time
                w_end = a.end_time or a.shift.end_time
                workers_data.append({
                    'id': a.worker.id,
                    'name': a.worker.get_full_name(),
                    'role_in_shift': a.role_in_shift,
                    'shift_start': str(w_start)[:5] if w_start else '',
                    'shift_end': str(w_end)[:5] if w_end else '',
                })

        # Also get existing timesheet entries for this date
        entries_qs = TimesheetEntry.objects.filter(date=date)
        if user.role == 'shop_manager':
            entries_qs = entries_qs.filter(shop=user.shop)
        existing = {}
        for e in entries_qs:
            existing[e.worker_id] = {
                'id': e.id,
                'is_present': e.is_present,
                'start_time': str(e.start_time)[:5] if e.start_time else '',
                'end_time': str(e.end_time)[:5] if e.end_time else '',
                'hours_worked': str(e.hours_worked),
            }

        return Response({
            'workers': workers_data,
            'existing_entries': existing,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrShopManager])
    def bulk_create(self, request):
        """Bulk create/update attendance entries for multiple workers at once."""
        serializer = BulkTimesheetEntrySerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            entries = serializer.save()
        # Re-fetch with select_related for proper serialization
        entry_ids = [e.id for e in entries]
        entries_qs = TimesheetEntry.objects.filter(
            id__in=entry_ids
        ).select_related('shop', 'worker', 'recorded_by')
        return Response(
            TimesheetEntrySerializer(entries_qs, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrShopManager])
    def daily_report(self, request):
        """Generate a daily shop report as a PDF."""
        date_str = request.query_params.get('date')
        shop_id = request.query_params.get('shop')

        if not date_str:
            return Response({'error': 'date parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import date as date_cls
        try:
            report_date = date_cls.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format, use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if user.role == 'shop_manager':
            shop = user.shop
        elif shop_id:
            try:
                shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'error': 'shop parameter required for admin'}, status=status.HTTP_400_BAD_REQUEST)

        entries = TimesheetEntry.objects.filter(
            shop=shop, date=report_date
        ).select_related('worker').order_by('worker__first_name')

        pdf_bytes = generate_daily_shop_report(shop, report_date, list(entries))

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="daily_report_{shop.name}_{date_str}.pdf"'
        return response

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrShopManager])
    def worker_hours(self, request):
        """
        Return a matrix of workers × dates with hours worked.
        Query params: start_date, end_date (both required, YYYY-MM-DD).
        """
        start_str = request.query_params.get('start_date')
        end_str = request.query_params.get('end_date')

        if not start_str or not end_str:
            return Response(
                {'error': 'start_date and end_date parameters required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = date_cls.fromisoformat(start_str)
            end_date = date_cls.fromisoformat(end_str)
        except ValueError:
            return Response(
                {'error': 'Invalid date format, use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if end_date < start_date:
            return Response(
                {'error': 'end_date must be >= start_date'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        entries_qs = TimesheetEntry.objects.filter(
            date__gte=start_date, date__lte=end_date
        ).select_related('worker')

        if user.role == 'shop_manager':
            entries_qs = entries_qs.filter(shop=user.shop)

        # Build dates list
        dates = []
        d = start_date
        while d <= end_date:
            dates.append(d.isoformat())
            d += timedelta(days=1)

        # Build worker → date → entry data
        workers_map = {}  # worker_id → { name, dates: { date → entry_data } }
        for entry in entries_qs:
            wid = entry.worker_id
            if wid not in workers_map:
                workers_map[wid] = {
                    'id': wid,
                    'name': entry.worker.get_full_name(),
                    'dates': {},
                    'total_hours': 0,
                }
            hours = float(entry.hours_worked)
            workers_map[wid]['dates'][entry.date.isoformat()] = {
                'is_present': entry.is_present,
                'start_time': str(entry.start_time)[:5] if entry.start_time else '',
                'end_time': str(entry.end_time)[:5] if entry.end_time else '',
                'hours': hours,
            }
            workers_map[wid]['total_hours'] += hours

        # Round totals
        for w in workers_map.values():
            w['total_hours'] = round(w['total_hours'], 2)

        return Response({
            'dates': dates,
            'workers': list(workers_map.values()),
        })
