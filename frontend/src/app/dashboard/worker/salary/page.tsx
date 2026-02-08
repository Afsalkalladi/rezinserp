'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Payroll } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';

export default function WorkerSalaryPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payroll/').then((res) => {
      setPayrolls(res.data.results || res.data);
      setLoading(false);
    });
  }, []);

  return (
    <ProtectedRoute allowedRoles={['worker']}>
      <PageHeader title="My Salary Records" />

      {loading ? <div className="text-gray-400">Loading...</div> : payrolls.length === 0 ? (
        <EmptyState message="No salary records yet" />
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Period</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Hours</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Days</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Base</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Bonus</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Deductions</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Net Salary</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">
                    {new Date(2000, p.month - 1).toLocaleString('default', { month: 'long' })} {p.year}
                  </td>
                  <td className="px-6 py-4 text-right">{p.total_hours}</td>
                  <td className="px-6 py-4 text-right">{p.total_days}</td>
                  <td className="px-6 py-4 text-right">₹{p.base_salary}</td>
                  <td className="px-6 py-4 text-right text-green-600">₹{p.bonus}</td>
                  <td className="px-6 py-4 text-right text-red-600">₹{p.deductions}</td>
                  <td className="px-6 py-4 text-right font-bold">₹{p.net_salary}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedRoute>
  );
}
