'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Store, Users, Package, Calendar, Clock,
  DollarSign, ShoppingCart, Receipt, LogOut, Menu, X, ClipboardList, FileText,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: <LayoutDashboard size={20} /> },
    { label: 'Shops', href: '/dashboard/admin/shops', icon: <Store size={20} /> },
    { label: 'Users', href: '/dashboard/admin/users', icon: <Users size={20} /> },
    { label: 'Inventory', href: '/dashboard/admin/inventory', icon: <Package size={20} /> },
    { label: 'Rosters', href: '/dashboard/admin/roster', icon: <Calendar size={20} /> },
    { label: 'Sales Reports', href: '/dashboard/admin/sales', icon: <Receipt size={20} /> },
    { label: 'Daily Reports', href: '/dashboard/admin/reports', icon: <FileText size={20} /> },
    { label: 'Procurement', href: '/dashboard/admin/procurement', icon: <ShoppingCart size={20} /> },
    { label: 'Warehouse', href: '/dashboard/admin/warehouse', icon: <ClipboardList size={20} /> },
    { label: 'Payroll', href: '/dashboard/admin/payroll', icon: <DollarSign size={20} /> },
  ],
  shop_manager: [
    { label: 'Dashboard', href: '/dashboard/manager', icon: <LayoutDashboard size={20} /> },
    { label: 'Inventory', href: '/dashboard/manager/inventory', icon: <Package size={20} /> },
    { label: 'Weekly Roster', href: '/dashboard/manager/roster', icon: <Calendar size={20} /> },
    { label: 'Attendance', href: '/dashboard/manager/timesheets', icon: <ClipboardList size={20} /> },
    { label: 'Sales Report', href: '/dashboard/manager/sales', icon: <Receipt size={20} /> },
    { label: 'Procurement', href: '/dashboard/manager/procurement', icon: <ShoppingCart size={20} /> },
    { label: 'Payroll', href: '/dashboard/manager/payroll', icon: <DollarSign size={20} /> },
  ],
  warehouse_manager: [
    { label: 'Dashboard', href: '/dashboard/warehouse', icon: <LayoutDashboard size={20} /> },
    { label: 'Requests', href: '/dashboard/warehouse/requests', icon: <Package size={20} /> },
  ],
  procurement_officer: [
    { label: 'Dashboard', href: '/dashboard/procurement', icon: <LayoutDashboard size={20} /> },
    { label: 'Orders', href: '/dashboard/procurement/orders', icon: <ShoppingCart size={20} /> },
  ],
  payroll_manager: [
    { label: 'Dashboard', href: '/dashboard/payrollmgr', icon: <LayoutDashboard size={20} /> },
    { label: 'All Payroll', href: '/dashboard/payrollmgr/payroll', icon: <DollarSign size={20} /> },
    { label: 'Workers', href: '/dashboard/payrollmgr/workers', icon: <Users size={20} /> },
  ],
  worker: [
    { label: 'Dashboard', href: '/dashboard/worker', icon: <LayoutDashboard size={20} /> },
    { label: 'My Schedule', href: '/dashboard/worker/shifts', icon: <Calendar size={20} /> },
    { label: 'My Attendance', href: '/dashboard/worker/attendance', icon: <ClipboardList size={20} /> },
    { label: 'My Salary', href: '/dashboard/worker/salary', icon: <DollarSign size={20} /> },
  ],
};

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const navItems = navByRole[user.role] || [];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-brand-700">🍔 RezinsERP</h1>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                pathname === item.href
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-sm text-gray-500 mb-2 truncate">
            {user.first_name} {user.last_name}
          </div>
          <div className="text-xs text-gray-400 mb-3 capitalize">
            {user.role.replace('_', ' ')}
            {user.shop_name && ` — ${user.shop_name}`}
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1 className="ml-4 text-lg font-semibold text-brand-700">RezinsERP</h1>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
