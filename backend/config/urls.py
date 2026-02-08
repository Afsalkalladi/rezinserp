"""
rezinserp URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/shops/', include('apps.shops.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/scheduling/', include('apps.scheduling.urls')),
    path('api/timesheets/', include('apps.timesheets.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/procurement/', include('apps.procurement.urls')),
    path('api/payroll/', include('apps.payroll.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
