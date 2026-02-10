from rest_framework import serializers
from datetime import timedelta
from .models import Payroll


class PayrollSerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source='worker.get_full_name', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = Payroll
        fields = [
            'id', 'worker', 'worker_name', 'shop', 'shop_name',
            'week_start_date', 'week_end_date',
            'hourly_rate', 'total_hours', 'total_days',
            'base_salary', 'bonus', 'deductions', 'net_salary',
            'status', 'notes', 'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'total_hours', 'total_days', 'base_salary', 'net_salary',
            'created_by', 'created_at', 'updated_at',
        ]


class PayrollCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payroll
        fields = ['id', 'worker', 'week_start_date', 'hourly_rate', 'bonus', 'deductions', 'notes']

    def validate_week_start_date(self, value):
        return value

    def validate(self, data):
        week_start = data['week_start_date']
        if Payroll.objects.filter(
            worker=data['worker'], week_start_date=week_start
        ).exists():
            raise serializers.ValidationError(
                'Payroll already exists for this worker for this week.'
            )
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        week_start = validated_data['week_start_date']
        week_end = week_start + timedelta(days=6)
        payroll = Payroll(
            shop=validated_data['worker'].shop or user.shop,
            created_by=user,
            week_end_date=week_end,
            **validated_data,
        )
        payroll.calculate_salary()
        payroll.save()
        return payroll
