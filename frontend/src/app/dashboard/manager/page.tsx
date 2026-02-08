'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { StatCard, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingRequests: 0,
    todayShifts: 0,
    todayTimesheets: 0,
    pendingProcurement: 0,
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      api.get('/inventory/requests/', { params: { status: 'pending' } }),
      api.get('/scheduling/shifts/', { params: { date: today } }),
      api.get('/timesheets/', { params: { date: today } }),
      api.get('/procurement/', { params: { status: 'pending' } }),
    ]).then(([invRes, shiftRes, tsRes, procRes]) => {
      setStats({
        pendingRequests: invRes.data.count ?? invRes.data.results?.length ?? 0,
        todayShifts: shiftRes.data.count ?? shiftRes.data.results?.length ?? 0,
        todayTimesheets: tsRes.data.count ?? tsRes.data.results?.length ?? 0,
        pendingProcurement: procRes.data.count ?? procRes.data.results?.length ?? 0,
      });
    }).catch(() => {});
  }, []);

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader title={`Shop Dashboard${user?.shop_name ? ` — ${user.shop_name}` : ''}`} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Pending Inventory Requests" value={stats.pendingRequests} />
        <StatCard title="Today's Shifts" value={stats.todayShifts} />
        <StatCard title="Today's Timesheets" value={stats.todayTimesheets} />
        <StatCard title="Pending Procurement" value={stats.pendingProcurement} />
      </div>
    </ProtectedRoute>
  );
}
