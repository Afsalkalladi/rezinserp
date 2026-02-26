from rest_framework import serializers
from .models import InventoryItem, InventoryRequest, InventoryRequestItem
from apps.utils.invoice import generate_invoice_image


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = ['id', 'name', 'unit', 'price', 'category', 'is_active']


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
            'date', 'time', 'status', 'notes', 'invoice_image',
            'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'requested_by', 'created_at', 'updated_at']


class InventoryRequestCreateSerializer(serializers.ModelSerializer):
    items = InventoryRequestItemSerializer(many=True)

    class Meta:
        model = InventoryRequest
        fields = ['id', 'date', 'time', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        request_obj = InventoryRequest.objects.create(
            shop=user.shop,
            requested_by=user,
            **validated_data,
        )
        invoice_items = []
        for item_data in items_data:
            # Skip items with quantity 0 or less
            qty = item_data.get('quantity', 0)
            if qty is not None and float(qty) > 0:
                ri = InventoryRequestItem.objects.create(request=request_obj, **item_data)
                invoice_items.append({
                    'name': ri.item.name,
                    'quantity': str(ri.quantity),
                    'unit_price': ri.item.price,
                })

        # Auto-generate invoice for warehouse order
        try:
            invoice = generate_invoice_image(
                invoice_number=f"WH-{request_obj.pk:05d}",
                date=request_obj.date,
                shop_name=request_obj.shop.name,
                shop_address=request_obj.shop.address,
                items=invoice_items,
                notes=request_obj.notes,
                order_type='Warehouse Requisition',
            )
            request_obj.invoice_image.save(invoice.name, invoice, save=True)
        except Exception:
            pass

        return request_obj
