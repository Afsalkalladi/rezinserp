from rest_framework import serializers
from .models import Shift, ShiftAssignment, WeeklyRoster


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source='worker.get_full_name', read_only=True)

    class Meta:
        model = ShiftAssignment
        fields = ['id', 'worker', 'worker_name', 'role_in_shift', 'start_time', 'end_time']


class ShiftSerializer(serializers.ModelSerializer):
    assignments = ShiftAssignmentSerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = Shift
        fields = [
            'id', 'shop', 'shop_name', 'roster', 'date', 'shift_type',
            'start_time', 'end_time',
            'assignments', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


class ShiftCreateSerializer(serializers.ModelSerializer):
    assignments = ShiftAssignmentSerializer(many=True)

    class Meta:
        model = Shift
        fields = ['id', 'date', 'shift_type', 'start_time', 'end_time', 'assignments']

    def create(self, validated_data):
        assignments_data = validated_data.pop('assignments')
        user = self.context['request'].user
        shift = Shift.objects.create(
            shop=user.shop,
            created_by=user,
            **validated_data,
        )
        for a_data in assignments_data:
            ShiftAssignment.objects.create(shift=shift, **a_data)
        return shift


class WeeklyRosterShiftSerializer(serializers.Serializer):
    """Used inside roster creation to define shifts for each day."""
    date = serializers.DateField()
    shift_type = serializers.ChoiceField(
        choices=Shift.ShiftType.choices, default='custom'
    )
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    assignments = serializers.ListField(child=serializers.DictField())


class WeeklyRosterSerializer(serializers.ModelSerializer):
    shifts = ShiftSerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = WeeklyRoster
        fields = [
            'id', 'shop', 'shop_name', 'week_start_date', 'notes', 'status',
            'shifts', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


class WeeklyRosterCreateSerializer(serializers.Serializer):
    """Create a weekly roster with shifts for multiple days."""
    week_start_date = serializers.DateField()
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    shifts = WeeklyRosterShiftSerializer(many=True)

    def validate_week_start_date(self, value):
        user = self.context['request'].user
        if WeeklyRoster.objects.filter(shop=user.shop, week_start_date=value).exists():
            raise serializers.ValidationError(
                f'A roster already exists for this shop on week starting {value}. '
                'Please edit the existing roster instead.'
            )
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        shifts_data = validated_data.pop('shifts')
        roster = WeeklyRoster.objects.create(
            shop=user.shop,
            created_by=user,
            week_start_date=validated_data['week_start_date'],
            notes=validated_data.get('notes', ''),
            status='draft',
        )
        for shift_data in shifts_data:
            assignments_data = shift_data.pop('assignments')
            shift = Shift.objects.create(
                shop=user.shop,
                roster=roster,
                created_by=user,
                **shift_data,
            )
            for a_data in assignments_data:
                # Convert 'worker' (id int) to 'worker_id' for ORM FK assignment
                if 'worker' in a_data:
                    a_data['worker_id'] = a_data.pop('worker')
                # Use per-worker times if provided, else fall back to shift times
                if not a_data.get('start_time'):
                    a_data['start_time'] = shift.start_time
                if not a_data.get('end_time'):
                    a_data['end_time'] = shift.end_time
                ShiftAssignment.objects.create(shift=shift, **a_data)
        return roster


class WeeklyRosterUpdateSerializer(serializers.Serializer):
    """Update an existing weekly roster — replaces all shifts."""
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    shifts = WeeklyRosterShiftSerializer(many=True)

    def update(self, instance, validated_data):
        if instance.status == 'published':
            raise serializers.ValidationError(
                'Cannot edit a published roster. Unpublish first.'
            )
        user = self.context['request'].user
        shifts_data = validated_data.pop('shifts', [])
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()

        # Delete old shifts (cascade deletes assignments)
        instance.shifts.all().delete()

        # Re-create shifts
        for shift_data in shifts_data:
            assignments_data = shift_data.pop('assignments')
            shift = Shift.objects.create(
                shop=instance.shop,
                roster=instance,
                created_by=user,
                **shift_data,
            )
            for a_data in assignments_data:
                if 'worker' in a_data:
                    a_data['worker_id'] = a_data.pop('worker')
                if not a_data.get('start_time'):
                    a_data['start_time'] = shift.start_time
                if not a_data.get('end_time'):
                    a_data['end_time'] = shift.end_time
                ShiftAssignment.objects.create(shift=shift, **a_data)
        return instance
