'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Payroll } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function PayrollMgrPayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const fetchData = async () => {
    const res = await api.get('/payroll/');
    setPayrolls(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const markPaid = async (id: number) => {
    try {
      await api.post(`/payroll/${id}/mark_paid/`);
      toast.success('Marked as paid');
      fetchData();
    } catch {
      toast.error('Failed to mark as paid');
    }
  };

  const filtered = filter === 'all' ? payrolls : payrolls.filter((p) => p.status === filter);

  return (
    <ProtectedRoute allowedRoles={['payroll_manager']}>
      <PageHeader title="All Payroll Records" />

      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'paid'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {f} {f !== 'all' && `(${payrolls.filter((p) => p.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? <div className="text-gray-400">Loading...</div> : filtered.length === 0 ? (
        <EmptyState message="No payroll records found" />
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Worker</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Shop</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Week</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Hours</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Days</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Rate</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Net</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{p.worker_name}</td>
                  <td className="px-6 py-4 text-gray-500">{p.shop_name}</td>
                  <td className="px-6 py-4">{p.week_start_date} — {p.week_end_date}</td>
                  <td className="px-6 py-4 text-right">{p.total_hours}</td>
                  <td className="px-6 py-4 text-right">{p.total_days}</td>
                  <td className="px-6 py-4 text-right">A${p.hourly_rate}</td>
                  <td className="px-6 py-4 text-right font-bold">A${p.net_salary}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4">
                    {p.status === 'pending' && (
                      <button onClick={() => markPaid(p.id)}
                        className="text-green-600 hover:underline text-xs font-medium">
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedRoute>
  );
}
