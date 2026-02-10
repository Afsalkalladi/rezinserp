from rest_framework import serializers
from .models import TimesheetEntry


class TimesheetEntrySerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source='worker.get_full_name', read_only=True)
    hours_worked = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = TimesheetEntry
        fields = [
            'id', 'shop', 'shop_name', 'worker', 'worker_name',
            'date', 'is_present', 'start_time', 'end_time', 'hours_worked',
            'recorded_by', 'created_at',
        ]
        read_only_fields = ['id', 'recorded_by', 'created_at']


class TimesheetEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimesheetEntry
        fields = ['id', 'worker', 'date', 'is_present', 'start_time', 'end_time']

    def create(self, validated_data):
        user = self.context['request'].user
        return TimesheetEntry.objects.create(
            shop=user.shop,
            recorded_by=user,
            **validated_data,
        )


class BulkTimesheetEntrySerializer(serializers.Serializer):
    """Accept a list of entries for bulk attendance logging."""
    entries = serializers.ListField(child=serializers.DictField(), min_length=1)

    def create(self, validated_data):
        user = self.context['request'].user
        results = []
        for entry in validated_data['entries']:
            worker_id = entry.get('worker')
            date = entry.get('date')
            is_present = entry.get('is_present', True)
            # Coerce string booleans and truthy values
            if isinstance(is_present, str):
                is_present = is_present.lower() not in ('false', '0', 'no', '')
            else:
                is_present = bool(is_present)

            start_time = entry.get('start_time') or None
            end_time = entry.get('end_time') or None

            if not worker_id or not date:
                continue

            # Update or create
            obj, created = TimesheetEntry.objects.update_or_create(
                worker_id=worker_id,
                date=date,
                defaults={
                    'shop': user.shop,
                    'is_present': is_present,
                    'start_time': start_time if is_present else None,
                    'end_time': end_time if is_present else None,
                    'recorded_by': user,
                },
            )
            results.append(obj)
        return results
