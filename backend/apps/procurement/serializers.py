from rest_framework import serializers
from .models import Supplier, ProcurementOrder, ProcurementOrderItem
from apps.inventory.models import InventoryItem


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'phone', 'email', 'is_active']


class ProcurementOrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_unit = serializers.CharField(source='item.unit', read_only=True)

    class Meta:
        model = ProcurementOrderItem
        fields = ['id', 'item', 'item_name', 'item_unit', 'quantity', 'price']


class ProcurementOrderSerializer(serializers.ModelSerializer):
    items = ProcurementOrderItemSerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    requested_by_name = serializers.CharField(
        source='requested_by.get_full_name', read_only=True
    )
    handled_by_name = serializers.CharField(
        source='handled_by.get_full_name', read_only=True, default=''
    )
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ProcurementOrder
        fields = [
            'id', 'shop', 'shop_name', 'supplier', 'supplier_name',
            'requested_by', 'requested_by_name',
            'date', 'status', 'notes', 'invoice_image', 'total',
            'handled_by', 'handled_by_name',
            'created_at', 'updated_at',
            'items',
        ]
        read_only_fields = ['id', 'requested_by', 'created_at', 'updated_at']


class ProcurementOrderCreateSerializer(serializers.ModelSerializer):
    items = ProcurementOrderItemSerializer(many=True)

    class Meta:
        model = ProcurementOrder
        fields = ['id', 'supplier', 'date', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        order = ProcurementOrder.objects.create(
            shop=user.shop,
            requested_by=user,
            **validated_data,
        )
        for item_data in items_data:
            # Skip items with quantity 0
            qty = item_data.get('quantity', 0)
            if qty is not None and float(qty) > 0:
                ProcurementOrderItem.objects.create(order=order, **item_data)

        # Auto-generate invoice
        try:
            from apps.utils.invoice import generate_invoice_image
            invoice_items = [
                {
                    'name': poi.item.name,
                    'quantity': str(poi.quantity),
                    'unit_price': poi.price,
                }
                for poi in order.items.select_related('item').all()
            ]
            if invoice_items:
                invoice = generate_invoice_image(
                    invoice_number=f"PO-{order.pk:05d}",
                    date=order.date,
                    shop_name=order.shop.name,
                    shop_address=order.shop.address,
                    items=invoice_items,
                    vendor_name=order.supplier.name,
                    notes=order.notes,
                    order_type='Procurement Order',
                )
                order.invoice_image.save(invoice.name, invoice, save=True)
        except Exception:
            pass

        return order


class ProcurementOrderUpdateSerializer(serializers.ModelSerializer):
    """Used by procurement officer to update order status."""
    class Meta:
        model = ProcurementOrder
        fields = ['status', 'notes', 'invoice_image']

