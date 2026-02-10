'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Payroll, User } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ManagerPayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  // Default to this Monday
  const d = new Date(now);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  const defaultMonday = d.toISOString().split('T')[0];

  const [form, setForm] = useState({
    worker: '', week_start_date: defaultMonday,
    hourly_rate: '', bonus: '0', deductions: '0', notes: '',
  });

  const fetchData = async () => {
    const [prRes, usersRes] = await Promise.all([
      api.get('/payroll/'),
      api.get('/auth/users/', { params: { role: 'worker' } }),
    ]);
    setPayrolls(prRes.data.results || prRes.data);
    const allUsers = usersRes.data.results || usersRes.data;
    setWorkers(allUsers.filter((u: User) => u.role === 'worker'));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payroll/', {
        worker: Number(form.worker),
        week_start_date: form.week_start_date,
        hourly_rate: Number(form.hourly_rate),
        bonus: Number(form.bonus),
        deductions: Number(form.deductions),
        notes: form.notes,
      });
      toast.success('Payroll created');
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.non_field_errors?.[0] || 'Failed');
    }
  };

  const markPaid = async (id: number) => {
    await api.post(`/payroll/${id}/mark_paid/`);
    toast.success('Marked as paid');
    fetchData();
  };

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader
        title="Payroll"
        action={
          <button onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700">
            {showForm ? 'Cancel' : '+ Generate Payroll'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <select value={form.worker}
              onChange={(e) => setForm({ ...form, worker: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Select worker</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
              ))}
            </select>
            <div>
              <label className="text-xs text-gray-500">Week Start (Monday)</label>
              <input type="date" value={form.week_start_date}
                onChange={(e) => setForm({ ...form, week_start_date: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <input type="number" step="0.01" placeholder="Hourly rate (A$)" value={form.hourly_rate}
              onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required />
            <input type="number" step="0.01" placeholder="Bonus" value={form.bonus}
              onChange={(e) => setForm({ ...form, bonus: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" step="0.01" placeholder="Deductions" value={form.deductions}
              onChange={(e) => setForm({ ...form, deductions: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
            Generate Payroll
          </button>
        </form>
      )}

      {loading ? <div className="text-gray-400">Loading...</div> : payrolls.length === 0 ? (
        <EmptyState message="No payroll records yet" />
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Worker</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Week</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Hours</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Days</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Base</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Bonus</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Ded.</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Net</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{p.worker_name}</td>
                  <td className="px-6 py-4 text-xs">{p.week_start_date} — {p.week_end_date}</td>
                  <td className="px-6 py-4 text-right">{p.total_hours}</td>
                  <td className="px-6 py-4 text-right">{p.total_days}</td>
                  <td className="px-6 py-4 text-right">A${p.base_salary}</td>
                  <td className="px-6 py-4 text-right text-green-600">A${p.bonus}</td>
                  <td className="px-6 py-4 text-right text-red-600">A${p.deductions}</td>
                  <td className="px-6 py-4 text-right font-bold">A${p.net_salary}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4">
                    {p.status === 'pending' && (
                      <button onClick={() => markPaid(p.id)}
                        className="text-green-600 hover:underline text-xs">Mark Paid</button>
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
