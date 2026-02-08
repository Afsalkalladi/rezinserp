from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('items', views.InventoryItemViewSet, basename='inventory-item')
router.register('requests', views.InventoryRequestViewSet, basename='inventory-request')

urlpatterns = [
    path('', include(router.urls)),
]
