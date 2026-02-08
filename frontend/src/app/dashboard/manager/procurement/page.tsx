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
  const [form, setForm] = useState({ item_name: '', quantity: '', notes: '' });

  const fetchData = async () => {
    const res = await api.get('/procurement/');
    setRequests(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/procurement/', form);
      toast.success('Request submitted');
      setShowForm(false);
      setForm({ item_name: '', quantity: '', notes: '' });
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

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Item name" value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required />
            <input placeholder="Quantity (e.g. 10 kg)" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required />
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
              {req.notes && <p className="text-sm text-gray-400">{req.notes}</p>}
              {req.vendor_name && (
                <p className="text-sm text-gray-500 mt-1">Vendor: {req.vendor_name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
