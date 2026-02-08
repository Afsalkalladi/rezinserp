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
            'date', 'start_time', 'end_time', 'hours_worked',
            'recorded_by', 'created_at',
        ]
        read_only_fields = ['id', 'recorded_by', 'created_at']


class TimesheetEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimesheetEntry
        fields = ['id', 'worker', 'date', 'start_time', 'end_time']

    def create(self, validated_data):
        user = self.context['request'].user
        return TimesheetEntry.objects.create(
            shop=user.shop,
            recorded_by=user,
            **validated_data,
        )
