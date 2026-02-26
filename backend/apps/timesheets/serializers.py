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
            'date', 'is_present', 'scheduled_start', 'scheduled_end',
            'start_time', 'end_time', 'hours_worked',
            'recorded_by', 'created_at',
        ]
        read_only_fields = ['id', 'recorded_by', 'created_at']


class TimesheetEntryCreateSerializer(serializers.ModelSerializer):
    shop = serializers.PrimaryKeyRelatedField(required=False, queryset=TimesheetEntry._meta.get_field('shop').related_model.objects.all())

    class Meta:
        model = TimesheetEntry
        fields = ['id', 'shop', 'worker', 'date', 'is_present', 'start_time', 'end_time']

    def create(self, validated_data):
        user = self.context['request'].user
        if user.role == 'admin' and 'shop' in validated_data:
            shop = validated_data.pop('shop')
        elif user.role == 'admin':
            # Resolve shop from worker
            shop = validated_data['worker'].shop
        else:
            shop = user.shop
        return TimesheetEntry.objects.create(
            shop=shop,
            recorded_by=user,
            **validated_data,
        )


class BulkTimesheetEntrySerializer(serializers.Serializer):
    """Accept a list of entries for bulk attendance logging."""
    entries = serializers.ListField(child=serializers.DictField(), min_length=1)
    shop = serializers.IntegerField(required=False, help_text='Shop ID (required for admin)')

    def create(self, validated_data):
        from apps.shops.models import Shop
        from apps.accounts.models import User as UserModel
        user = self.context['request'].user
        shop_id = validated_data.get('shop')
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

            # Determine shop
            if user.role == 'admin':
                if shop_id:
                    shop = Shop.objects.get(id=shop_id)
                else:
                    worker = UserModel.objects.get(id=worker_id)
                    shop = worker.shop
            else:
                shop = user.shop

            # Update or create
            obj, created = TimesheetEntry.objects.update_or_create(
                worker_id=worker_id,
                date=date,
                defaults={
                    'shop': shop,
                    'is_present': is_present,
                    'start_time': start_time if is_present else None,
                    'end_time': end_time if is_present else None,
                    'recorded_by': user,
                },
            )
            results.append(obj)
        return results
