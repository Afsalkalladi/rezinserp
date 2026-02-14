'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DailyClosingReport, Shop } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminSalesPage() {
  const [reports, setReports] = useState<DailyClosingReport[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterShop, setFilterShop] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    cash_sales: '', digital_sales: '', online_orders: '', expenses: '', expense_notes: '',
  });

  const fetchData = async () => {
    try {
      const params: any = {};
      if (filterShop !== 'all') params.shop = filterShop;
      if (filterDate) params.date = filterDate;
      const [salesRes, shopRes] = await Promise.all([
        api.get('/sales/reports/', { params }),
        api.get('/shops/'),
      ]);
      const data = salesRes.data.results ?? salesRes.data;
      setReports(Array.isArray(data) ? data : []);
      setShops((shopRes.data.results ?? shopRes.data) || []);
    } catch (err: any) {
      toast.error('Failed to load sales reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterShop, filterDate]);

  const startEdit = (r: DailyClosingReport) => {
    setEditingId(r.id);
    setEditForm({
      cash_sales: String(r.cash_sales),
      digital_sales: String(r.digital_sales),
      online_orders: String(r.online_orders),
      expenses: String(r.expenses),
      expense_notes: r.expense_notes || '',
    });
  };

  const saveEdit = async (id: number) => {
    try {
      await api.patch(`/sales/reports/${id}/`, {
        cash_sales: Number(editForm.cash_sales),
        digital_sales: Number(editForm.digital_sales),
        online_orders: Number(editForm.online_orders),
        expenses: Number(editForm.expenses),
        expense_notes: editForm.expense_notes,
      });
      toast.success('Report updated');
      setEditingId(null);
      fetchData();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this sales report?')) return;
    try {
      await api.delete(`/sales/reports/${id}/`);
      toast.success('Report deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="All Sales Reports" />

      {/* Shop and Date Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Shop</label>
          <select value={filterShop} onChange={(e) => setFilterShop(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-w-[180px]">
            <option value="all">All Shops</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        {(filterShop !== 'all' || filterDate) && (
          <button onClick={() => { setFilterShop('all'); setFilterDate(''); }}
            className="text-xs text-red-500 hover:underline mt-5">Clear Filters</button>
        )}
      </div>

      {loading ? <div className="text-gray-400">Loading...</div> : reports.length === 0 ? (
        <EmptyState message="No sales reports yet" />
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-semibold">{r.shop_name}</span>
                  <span className="text-gray-400 ml-3 text-sm">{r.date}</span>
                  <span className="text-gray-400 ml-2 text-xs">by {r.submitted_by_name}</span>
                </div>
                <div className="flex gap-2">
                  {editingId === r.id ? (
                    <>
                      <button onClick={() => saveEdit(r.id)}
                        className="text-green-600 text-xs font-medium hover:underline">Save</button>
                      <button onClick={() => setEditingId(null)}
                        className="text-gray-400 text-xs hover:underline">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(r)}
                        className="text-brand-600 text-xs font-medium hover:underline">Edit</button>
                      <button onClick={() => handleDelete(r.id)}
                        className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                    </>
                  )}
                </div>
              </div>
              {editingId === r.id ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Cash Sales</label>
                    <input type="number" step="0.01" value={editForm.cash_sales}
                      onChange={(e) => setEditForm({ ...editForm, cash_sales: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Digital Sales</label>
                    <input type="number" step="0.01" value={editForm.digital_sales}
                      onChange={(e) => setEditForm({ ...editForm, digital_sales: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Online Orders</label>
                    <input type="number" step="0.01" value={editForm.online_orders}
                      onChange={(e) => setEditForm({ ...editForm, online_orders: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Expenses</label>
                    <input type="number" step="0.01" value={editForm.expenses}
                      onChange={(e) => setEditForm({ ...editForm, expenses: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Expense Notes</label>
                    <input value={editForm.expense_notes}
                      onChange={(e) => setEditForm({ ...editForm, expense_notes: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm w-full" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div><span className="text-gray-400">Cash</span><p className="font-medium">A${r.cash_sales}</p></div>
                  <div><span className="text-gray-400">Digital</span><p className="font-medium">A${r.digital_sales}</p></div>
                  <div><span className="text-gray-400">Online</span><p className="font-medium">A${r.online_orders}</p></div>
                  <div><span className="text-gray-400">Expenses</span><p className="font-medium text-red-600">A${r.expenses}</p></div>
                  <div><span className="text-gray-400">Net Revenue</span><p className="font-bold text-green-600">A${r.net_revenue}</p></div>
                </div>
              )}
              {r.bill_image && (
                <a href={r.bill_image} target="_blank" className="text-brand-600 text-xs mt-2 inline-block hover:underline">
                  View Bill Image →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
