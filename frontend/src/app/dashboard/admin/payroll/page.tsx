'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Payroll, Shop } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminPayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [filterShop, setFilterShop] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    hourly_rate: '', bonus: '', deductions: '', notes: '',
  });

  const fetchData = async () => {
    try {
      const [payRes, shopRes] = await Promise.all([
        api.get('/payroll/'),
        api.get('/shops/'),
      ]);
      setPayrolls(payRes.data.results || payRes.data);
      setShops((shopRes.data.results ?? shopRes.data) || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const startEdit = (p: Payroll) => {
    setEditingId(p.id);
    setEditForm({
      hourly_rate: String(p.hourly_rate),
      bonus: String(p.bonus),
      deductions: String(p.deductions),
      notes: p.notes || '',
    });
  };

  const saveEdit = async (id: number) => {
    try {
      await api.patch(`/payroll/${id}/`, {
        hourly_rate: Number(editForm.hourly_rate),
        bonus: Number(editForm.bonus),
        deductions: Number(editForm.deductions),
        notes: editForm.notes,
      });
      toast.success('Payroll updated');
      setEditingId(null);
      fetchData();
    } catch {
      toast.error('Failed to update');
    }
  };

  const markPaid = async (id: number) => {
    try {
      await api.post(`/payroll/${id}/mark_paid/`);
      toast.success('Marked as paid');
      fetchData();
    } catch {
      toast.error('Failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this payroll record?')) return;
    try {
      await api.delete(`/payroll/${id}/`);
      toast.success('Deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = payrolls.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (filterShop !== 'all' && String(p.shop) !== filterShop) return false;
    if (filterWeek && p.week_start_date !== filterWeek) return false;
    return true;
  });

  // Get unique weeks for filter dropdown
  const uniqueWeeks = Array.from(new Set(payrolls.map(p => p.week_start_date))).sort().reverse();

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="All Payroll Records" />

      {/* Shop and Week Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Shop</label>
          <select value={filterShop} onChange={(e) => setFilterShop(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-w-[180px]">
            <option value="all">All Shops</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Week Starting</label>
          <select value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-w-[180px]">
            <option value="">All Weeks</option>
            {uniqueWeeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

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
                <th className="text-right px-6 py-3 font-medium text-gray-500">Rate</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Hours</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Base</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Bonus</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Ded.</th>
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
                  <td className="px-6 py-4 text-xs">{p.week_start_date}<br/>{p.week_end_date}</td>
                  {editingId === p.id ? (
                    <>
                      <td className="px-6 py-4">
                        <input type="number" step="0.01" value={editForm.hourly_rate}
                          onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value })}
                          className="border rounded px-2 py-1 text-sm w-20" />
                      </td>
                      <td className="px-6 py-4 text-right">{p.total_hours}</td>
                      <td className="px-6 py-4 text-right">A${p.base_salary}</td>
                      <td className="px-6 py-4">
                        <input type="number" step="0.01" value={editForm.bonus}
                          onChange={(e) => setEditForm({ ...editForm, bonus: e.target.value })}
                          className="border rounded px-2 py-1 text-sm w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <input type="number" step="0.01" value={editForm.deductions}
                          onChange={(e) => setEditForm({ ...editForm, deductions: e.target.value })}
                          className="border rounded px-2 py-1 text-sm w-20" />
                      </td>
                      <td className="px-6 py-4 text-right font-bold">A${p.net_salary}</td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={p.status} /></td>
                      <td className="px-6 py-4 flex gap-1">
                        <button onClick={() => saveEdit(p.id)}
                          className="text-green-600 text-xs hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)}
                          className="text-gray-400 text-xs hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-right">A${p.hourly_rate}</td>
                      <td className="px-6 py-4 text-right">{p.total_hours}</td>
                      <td className="px-6 py-4 text-right">A${p.base_salary}</td>
                      <td className="px-6 py-4 text-right text-green-600">A${p.bonus}</td>
                      <td className="px-6 py-4 text-right text-red-600">A${p.deductions}</td>
                      <td className="px-6 py-4 text-right font-bold">A${p.net_salary}</td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={p.status} /></td>
                      <td className="px-6 py-4 flex gap-1">
                        <button onClick={() => startEdit(p)}
                          className="text-brand-600 text-xs hover:underline">Edit</button>
                        {p.status === 'pending' && (
                          <button onClick={() => markPaid(p.id)}
                            className="text-green-600 text-xs hover:underline">Pay</button>
                        )}
                        <button onClick={() => handleDelete(p.id)}
                          className="text-red-600 text-xs hover:underline">Del</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedRoute>
  );
}
