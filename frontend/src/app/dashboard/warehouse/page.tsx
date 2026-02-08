'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { StatCard, PageHeader } from '@/components/ui';

export default function WarehouseDashboard() {
  const [stats, setStats] = useState({ pending: 0, dispatched: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/inventory/requests/', { params: { status: 'pending' } }),
      api.get('/inventory/requests/', { params: { status: 'dispatched' } }),
    ]).then(([pendRes, dispRes]) => {
      setStats({
        pending: pendRes.data.count ?? pendRes.data.results?.length ?? 0,
        dispatched: dispRes.data.count ?? dispRes.data.results?.length ?? 0,
      });
    });
  }, []);

  return (
    <ProtectedRoute allowedRoles={['warehouse_manager']}>
      <PageHeader title="Warehouse Dashboard" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard title="Pending Requests" value={stats.pending} />
        <StatCard title="Dispatched Today" value={stats.dispatched} />
      </div>
    </ProtectedRoute>
  );
}
