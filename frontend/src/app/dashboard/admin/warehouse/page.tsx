'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { InventoryRequest } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminWarehousePage() {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchData = async () => {
    const res = await api.get('/inventory/requests/');
    setRequests(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/inventory/requests/${id}/`, { status });
      toast.success(`Request ${status}`);
      fetchData();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this inventory request?')) return;
    try {
      await api.delete(`/inventory/requests/${id}/`);
      toast.success('Deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="All Warehouse / Inventory Requests" />

      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'approved', 'dispatched', 'rejected'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {f} {f !== 'all' && `(${requests.filter((r) => r.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? <div className="text-gray-400">Loading...</div> : filtered.length === 0 ? (
        <EmptyState message="No inventory requests found" />
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-semibold">{r.shop_name}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-gray-400 ml-2">{r.date} — by {r.requested_by_name}</span>
                </div>
                <div className="flex gap-2">
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(r.id, 'approved')}
                        className="text-green-600 text-xs font-medium hover:underline">Approve</button>
                      <button onClick={() => updateStatus(r.id, 'rejected')}
                        className="text-red-600 text-xs font-medium hover:underline">Reject</button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <button onClick={() => updateStatus(r.id, 'dispatched')}
                      className="text-blue-600 text-xs font-medium hover:underline">Mark Dispatched</button>
                  )}
                  <button onClick={() => handleDelete(r.id)}
                    className="text-red-400 text-xs hover:underline">Delete</button>
                </div>
              </div>
              <div className="space-y-1">
                {r.items.map((item) => (
                  <div key={item.id} className="text-sm flex gap-4">
                    <span className="font-medium">{item.item_name}</span>
                    <span className="text-gray-500">{item.quantity} {item.item_unit}</span>
                  </div>
                ))}
              </div>
              {r.notes && <p className="text-xs text-gray-400 mt-2">{r.notes}</p>}
              {r.invoice_image && (
                <a href={r.invoice_image} target="_blank" className="text-brand-600 text-xs mt-2 inline-block hover:underline">
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
