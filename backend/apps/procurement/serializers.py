from rest_framework import serializers
from .models import ProcurementRequest


class ProcurementRequestSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    requested_by_name = serializers.CharField(
        source='requested_by.get_full_name', read_only=True
    )
    handled_by_name = serializers.CharField(
        source='handled_by.get_full_name', read_only=True, default=''
    )

    class Meta:
        model = ProcurementRequest
        fields = [
            'id', 'shop', 'shop_name', 'requested_by', 'requested_by_name',
            'item_name', 'quantity', 'notes', 'status',
            'vendor_name', 'order_date', 'invoice_image', 'delivery_date',
            'handled_by', 'handled_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'requested_by', 'created_at', 'updated_at']


class ProcurementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcurementRequest
        fields = ['id', 'item_name', 'quantity', 'notes']

    def create(self, validated_data):
        user = self.context['request'].user
        return ProcurementRequest.objects.create(
            shop=user.shop,
            requested_by=user,
            **validated_data,
        )


class ProcurementUpdateSerializer(serializers.ModelSerializer):
    """Used by procurement officer to update order status."""
    class Meta:
        model = ProcurementRequest
        fields = [
            'status', 'vendor_name', 'order_date', 'invoice_image', 'delivery_date',
        ]
