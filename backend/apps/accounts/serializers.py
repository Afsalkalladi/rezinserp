from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.shops.models import Shop

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'tfn_number', 'mobile_number', 'home_address',
            'shop', 'shop_name', 'is_active',
        ]
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'tfn_number', 'mobile_number', 'home_address',
            'shop', 'password', 'is_active',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Update user — password is optional."""
    password = serializers.CharField(write_only=True, min_length=6, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'tfn_number', 'mobile_number', 'home_address',
            'shop', 'password', 'is_active',
        ]
        read_only_fields = ['id']

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class ProfileSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'tfn_number', 'mobile_number', 'home_address',
            'shop', 'shop_name',
        ]
        read_only_fields = ['id', 'username', 'role', 'shop']
