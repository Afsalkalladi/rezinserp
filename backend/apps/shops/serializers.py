from rest_framework import serializers
from .models import Shop


class ShopSerializer(serializers.ModelSerializer):
    staff_count = serializers.IntegerField(source='staff.count', read_only=True)

    class Meta:
        model = Shop
        fields = ['id', 'name', 'address', 'phone', 'is_active', 'staff_count', 'created_at']
        read_only_fields = ['id', 'created_at']
