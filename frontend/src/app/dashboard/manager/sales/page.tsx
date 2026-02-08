'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DailyClosingReport } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ManagerSalesPage() {
  const [reports, setReports] = useState<DailyClosingReport[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    cash_sales: '', digital_sales: '', online_orders: '',
    expenses: '', expense_notes: '',
  });

  const fetchData = async () => {
    const res = await api.get('/sales/reports/');
    setReports(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/sales/reports/', {
        ...form,
        cash_sales: Number(form.cash_sales) || 0,
        digital_sales: Number(form.digital_sales) || 0,
        online_orders: Number(form.online_orders) || 0,
        expenses: Number(form.expenses) || 0,
      });
      toast.success('Report submitted');
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.non_field_errors?.[0] || 'Failed';
      toast.error(msg);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader
        title="Daily Closing Reports"
        action={
          <button onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700">
            {showForm ? 'Cancel' : '+ New Report'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cash Sales</label>
              <input type="number" step="0.01" value={form.cash_sales}
                onChange={(e) => setForm({ ...form, cash_sales: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Digital Sales</label>
              <input type="number" step="0.01" value={form.digital_sales}
                onChange={(e) => setForm({ ...form, digital_sales: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Online Orders</label>
              <input type="number" step="0.01" value={form.online_orders}
                onChange={(e) => setForm({ ...form, online_orders: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expenses</label>
              <input type="number" step="0.01" value={form.expenses}
                onChange={(e) => setForm({ ...form, expenses: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expense Notes</label>
              <input value={form.expense_notes}
                onChange={(e) => setForm({ ...form, expense_notes: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Optional" />
            </div>
          </div>
          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
            Submit Report
          </button>
        </form>
      )}

      {loading ? <div className="text-gray-400">Loading...</div> : reports.length === 0 ? (
        <EmptyState message="No closing reports yet" />
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Cash</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Digital</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Online</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Total</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Expenses</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{r.date}</td>
                  <td className="px-6 py-4 text-right">₹{r.cash_sales}</td>
                  <td className="px-6 py-4 text-right">₹{r.digital_sales}</td>
                  <td className="px-6 py-4 text-right">₹{r.online_orders}</td>
                  <td className="px-6 py-4 text-right font-medium">₹{r.total_sales}</td>
                  <td className="px-6 py-4 text-right text-red-600">₹{r.expenses}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-700">₹{r.net_revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedRoute>
  );
}
