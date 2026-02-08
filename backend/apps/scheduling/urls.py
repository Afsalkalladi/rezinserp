from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('shifts', views.ShiftViewSet, basename='shift')

urlpatterns = [
    path('', include(router.urls)),
    path(
        'shifts/<int:shift_pk>/assignments/',
        views.ShiftAssignmentViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='shift-assignments',
    ),
]
