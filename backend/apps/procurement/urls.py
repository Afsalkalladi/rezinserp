from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('suppliers', views.SupplierViewSet, basename='supplier')
router.register('orders', views.ProcurementOrderViewSet, basename='procurement-order')

urlpatterns = [
    path('', include(router.urls)),
]
