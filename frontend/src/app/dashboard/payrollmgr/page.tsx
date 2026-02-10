'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function PayrollManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pending: 0, paid: 0, totalWorkers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [payrollRes, usersRes] = await Promise.all([
          api.get('/payroll/'),
          api.get('/auth/users/', { params: { role: 'worker' } }),
        ]);
        const payrolls = payrollRes.data.results || payrollRes.data;
        const workers = usersRes.data.results || usersRes.data;
        setStats({
          pending: payrolls.filter((p: any) => p.status === 'pending').length,
          paid: payrolls.filter((p: any) => p.status === 'paid').length,
          totalWorkers: workers.filter((u: any) => u.role === 'worker').length,
        });
      } catch {}
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Pending Payouts', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Paid This Period', value: stats.paid, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Workers', value: stats.totalWorkers, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <ProtectedRoute allowedRoles={['payroll_manager']}>
      <PageHeader title={`Welcome, ${user?.first_name || 'Payroll Manager'}`} />
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {cards.map((c) => (
              <div key={c.label} className={`${c.bg} rounded-xl p-6 border`}>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a href="/dashboard/payrollmgr/payroll"
              className="bg-white border rounded-xl p-8 hover:border-brand-400 transition text-center">
              <div className="text-4xl mb-3">💰</div>
              <h2 className="text-lg font-semibold">All Payroll</h2>
              <p className="text-sm text-gray-500 mt-1">View and manage all payroll records</p>
            </a>
            <a href="/dashboard/payrollmgr/workers"
              className="bg-white border rounded-xl p-8 hover:border-brand-400 transition text-center">
              <div className="text-4xl mb-3">👥</div>
              <h2 className="text-lg font-semibold">Workers</h2>
              <p className="text-sm text-gray-500 mt-1">View all worker details by shop</p>
            </a>
          </div>
        </>
      )}
    </ProtectedRoute>
  );
}
