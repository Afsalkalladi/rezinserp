from rest_framework import serializers
from .models import InventoryItem, InventoryRequest, InventoryRequestItem


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = ['id', 'name', 'unit', 'is_active']


class InventoryRequestItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_unit = serializers.CharField(source='item.unit', read_only=True)

    class Meta:
        model = InventoryRequestItem
        fields = ['id', 'item', 'item_name', 'item_unit', 'quantity']


class InventoryRequestSerializer(serializers.ModelSerializer):
    items = InventoryRequestItemSerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    requested_by_name = serializers.CharField(
        source='requested_by.get_full_name', read_only=True
    )

    class Meta:
        model = InventoryRequest
        fields = [
            'id', 'shop', 'shop_name', 'requested_by', 'requested_by_name',
            'date', 'status', 'notes', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'requested_by', 'created_at', 'updated_at']


class InventoryRequestCreateSerializer(serializers.ModelSerializer):
    items = InventoryRequestItemSerializer(many=True)

    class Meta:
        model = InventoryRequest
        fields = ['id', 'date', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        request_obj = InventoryRequest.objects.create(
            shop=user.shop,
            requested_by=user,
            **validated_data,
        )
        for item_data in items_data:
            InventoryRequestItem.objects.create(request=request_obj, **item_data)
        return request_obj
