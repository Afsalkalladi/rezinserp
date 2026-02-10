"""
Shared permissions for role-based access control.
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsShopManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'shop_manager'


class IsWarehouseManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'warehouse_manager'


class IsProcurementOfficer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'procurement_officer'


class IsPayrollManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'payroll_manager'


class IsWorker(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'worker'


class IsAdminOrShopManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            'admin', 'shop_manager'
        )


class IsAdminOrWarehouse(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            'admin', 'warehouse_manager'
        )


class IsAdminOrProcurement(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            'admin', 'procurement_officer'
        )


class IsAdminOrPayrollManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            'admin', 'payroll_manager'
        )


class IsAdminOrShopManagerOrWarehouse(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            'admin', 'shop_manager', 'warehouse_manager'
        )


class IsAdminOrShopManagerOrPayroll(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            'admin', 'shop_manager', 'payroll_manager'
        )
