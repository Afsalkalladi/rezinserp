from rest_framework import serializers
from .models import ProcurementRequest
from apps.utils.invoice import generate_invoice_image


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
            'item_name', 'quantity', 'estimated_unit_price', 'notes', 'status',
            'vendor_name', 'order_date', 'invoice_image', 'delivery_date',
            'handled_by', 'handled_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'requested_by', 'created_at', 'updated_at']


class ProcurementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcurementRequest
        fields = ['id', 'item_name', 'quantity', 'estimated_unit_price', 'vendor_name', 'notes']

    def create(self, validated_data):
        user = self.context['request'].user
        obj = ProcurementRequest.objects.create(
            shop=user.shop,
            requested_by=user,
            **validated_data,
        )
        # Auto-generate invoice
        try:
            invoice = generate_invoice_image(
                invoice_number=f"PO-{obj.pk:05d}",
                date=obj.created_at,
                shop_name=obj.shop.name,
                shop_address=obj.shop.address,
                items=[{
                    'name': obj.item_name,
                    'quantity': obj.quantity,
                    'unit_price': obj.estimated_unit_price or 0,
                }],
                vendor_name=obj.vendor_name,
                notes=obj.notes,
                order_type='Procurement Order',
            )
            obj.invoice_image.save(invoice.name, invoice, save=True)
        except Exception:
            pass  # Don't fail the order if invoice generation fails
        return obj


class ProcurementUpdateSerializer(serializers.ModelSerializer):
    """Used by procurement officer to update order status."""
    class Meta:
        model = ProcurementRequest
        fields = [
            'status', 'vendor_name', 'order_date', 'invoice_image', 'delivery_date',
        ]
