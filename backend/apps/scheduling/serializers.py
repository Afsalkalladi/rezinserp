from rest_framework import serializers
from .models import Shift, ShiftAssignment


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source='worker.get_full_name', read_only=True)

    class Meta:
        model = ShiftAssignment
        fields = ['id', 'worker', 'worker_name', 'role_in_shift']


class ShiftSerializer(serializers.ModelSerializer):
    assignments = ShiftAssignmentSerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = Shift
        fields = [
            'id', 'shop', 'shop_name', 'date', 'start_time', 'end_time',
            'assignments', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


class ShiftCreateSerializer(serializers.ModelSerializer):
    assignments = ShiftAssignmentSerializer(many=True)

    class Meta:
        model = Shift
        fields = ['id', 'date', 'start_time', 'end_time', 'assignments']

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
