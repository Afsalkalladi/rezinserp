from rest_framework import serializers
from .models import Payroll


class PayrollSerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source='worker.get_full_name', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = Payroll
        fields = [
            'id', 'worker', 'worker_name', 'shop', 'shop_name',
            'month', 'year', 'hourly_rate', 'total_hours', 'total_days',
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
        fields = ['id', 'worker', 'month', 'year', 'hourly_rate', 'bonus', 'deductions', 'notes']

    def validate(self, data):
        if Payroll.objects.filter(
            worker=data['worker'], month=data['month'], year=data['year']
        ).exists():
            raise serializers.ValidationError(
                'Payroll already exists for this worker for this month.'
            )
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        payroll = Payroll(
            shop=user.shop,
            created_by=user,
            **validated_data,
        )
        payroll.calculate_salary()
        payroll.save()
        return payroll
