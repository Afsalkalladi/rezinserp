'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ProcurementRequest } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ManagerProcurementPage() {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('');
  const [form, setForm] = useState({ item_name: '', quantity: '', estimated_unit_price: '', vendor_name: '', notes: '' });

  const fetchData = async () => {
    const params: any = {};
    if (filterDate) params.date = filterDate;
    const res = await api.get('/procurement/', { params });
    setRequests(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/procurement/', {
        ...form,
        estimated_unit_price: form.estimated_unit_price ? Number(form.estimated_unit_price) : null,
      });
      toast.success('Request submitted');
      setShowForm(false);
      setForm({ item_name: '', quantity: '', estimated_unit_price: '', vendor_name: '', notes: '' });
      fetchData();
    } catch {
      toast.error('Failed to submit');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader
        title="Procurement Requests"
        action={
          <button onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700">
            {showForm ? 'Cancel' : '+ New Request'}
          </button>
        }
      />

      {/* Date Filter */}
      <div className="flex gap-3 mb-4 items-center">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Filter by Date</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        {filterDate && (
          <button onClick={() => setFilterDate('')}
            className="text-xs text-red-500 hover:underline mt-5">Clear</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Item name" value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required />
            <input placeholder="Quantity (e.g. 10 kg)" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required />
            <input type="number" step="0.01" placeholder="Est. Unit Price (A$)" value={form.estimated_unit_price}
              onChange={(e) => setForm({ ...form, estimated_unit_price: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Vendor name" value={form.vendor_name}
              onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Notes" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
            Submit
          </button>
        </form>
      )}

      {loading ? <div className="text-gray-400">Loading...</div> : requests.length === 0 ? (
        <EmptyState message="No procurement requests yet" />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{req.item_name}</span>
                <StatusBadge status={req.status} />
              </div>
              <p className="text-sm text-gray-500">Qty: {req.quantity}</p>
              {req.estimated_unit_price > 0 && (
                <p className="text-sm text-gray-500">Est. Price: A${req.estimated_unit_price}/unit</p>
              )}
              {req.notes && <p className="text-sm text-gray-400">{req.notes}</p>}
              {req.vendor_name && (
                <p className="text-sm text-gray-500 mt-1">Vendor: {req.vendor_name}</p>
              )}
              {req.invoice_image && (
                <a href={req.invoice_image} target="_blank" className="text-brand-600 text-xs mt-2 inline-block hover:underline">
                  View Invoice →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
