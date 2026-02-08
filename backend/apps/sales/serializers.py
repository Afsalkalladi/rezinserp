from rest_framework import serializers
from .models import DailyClosingReport


class DailyClosingReportSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    submitted_by_name = serializers.CharField(
        source='submitted_by.get_full_name', read_only=True
    )
    total_sales = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    net_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DailyClosingReport
        fields = [
            'id', 'shop', 'shop_name', 'date',
            'cash_sales', 'digital_sales', 'online_orders', 'expenses',
            'expense_notes', 'bill_image', 'total_sales', 'net_revenue',
            'submitted_by', 'submitted_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'submitted_by', 'created_at']


class DailyClosingReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyClosingReport
        fields = [
            'id', 'date', 'cash_sales', 'digital_sales', 'online_orders',
            'expenses', 'expense_notes', 'bill_image',
        ]

    def validate(self, data):
        user = self.context['request'].user
        if DailyClosingReport.objects.filter(shop=user.shop, date=data['date']).exists():
            raise serializers.ValidationError(
                'A closing report already exists for this shop on this date.'
            )
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        return DailyClosingReport.objects.create(
            shop=user.shop,
            submitted_by=user,
            **validated_data,
        )
