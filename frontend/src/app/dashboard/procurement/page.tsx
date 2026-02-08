'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { StatCard, PageHeader } from '@/components/ui';

export default function ProcurementDashboard() {
  const [stats, setStats] = useState({ pending: 0, ordered: 0, delivered: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/procurement/', { params: { status: 'pending' } }),
      api.get('/procurement/', { params: { status: 'ordered' } }),
      api.get('/procurement/', { params: { status: 'delivered' } }),
    ]).then(([pRes, oRes, dRes]) => {
      setStats({
        pending: pRes.data.count ?? pRes.data.results?.length ?? 0,
        ordered: oRes.data.count ?? oRes.data.results?.length ?? 0,
        delivered: dRes.data.count ?? dRes.data.results?.length ?? 0,
      });
    });
  }, []);

  return (
    <ProtectedRoute allowedRoles={['procurement_officer']}>
      <PageHeader title="Procurement Dashboard" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Pending Requests" value={stats.pending} />
        <StatCard title="Ordered" value={stats.ordered} />
        <StatCard title="Delivered" value={stats.delivered} />
      </div>
    </ProtectedRoute>
  );
}
