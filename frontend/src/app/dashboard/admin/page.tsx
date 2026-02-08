'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { StatCard, PageHeader } from '@/components/ui';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ shops: 0, users: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/shops/'),
      api.get('/auth/users/'),
    ]).then(([shopsRes, usersRes]) => {
      setStats({
        shops: shopsRes.data.count ?? shopsRes.data.results?.length ?? 0,
        users: usersRes.data.count ?? usersRes.data.results?.length ?? 0,
      });
    });
  }, []);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="Admin Dashboard" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Shops" value={stats.shops} />
        <StatCard title="Total Users" value={stats.users} />
      </div>
    </ProtectedRoute>
  );
}
