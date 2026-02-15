'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { InventoryRequest } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function WarehouseRequestsPage() {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const params: any = {};
    if (filter) params.status = filter;
    const res = await api.get('/inventory/requests/', { params });
    setRequests(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleAction = async (id: number, action: string) => {
    try {
      await api.post(`/inventory/requests/${id}/${action}/`);
      toast.success(`Request ${action}d`);
      fetchData();
    } catch {
      toast.error('Action failed');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['warehouse_manager']}>
      <PageHeader title="Inventory Requests" />

      <div className="mb-4 flex gap-2">
        {['', 'pending', 'approved', 'dispatched', 'rejected'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === s ? 'bg-brand-600 text-white' : 'bg-white border text-gray-600'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-gray-400">Loading...</div> : requests.length === 0 ? (
        <EmptyState message="No requests found" />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-medium">#{req.id} — {req.shop_name}</span>
                  <span className="text-gray-400 ml-3 text-sm">{req.date}</span>
                  {req.time && <span className="text-gray-400 ml-2 text-sm">{req.time}</span>}
                  <span className="text-gray-400 ml-2 text-sm">by {req.requested_by_name}</span>
                </div>
                <StatusBadge status={req.status} />
              </div>
              {req.notes && <p className="text-sm text-gray-500 mb-2">{req.notes}</p>}
              <div className="text-sm text-gray-600 mb-3">
                {req.items.map((item) => (
                  <span key={item.id} className="inline-block bg-gray-100 rounded px-2 py-1 mr-2 mb-1">
                    {item.item_name}: {item.quantity} {item.item_unit}
                  </span>
                ))}
              </div>
              {req.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(req.id, 'approve')}
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">
                    Approve
                  </button>
                  <button onClick={() => handleAction(req.id, 'reject')}
                    className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700">
                    Reject
                  </button>
                </div>
              )}
              {req.status === 'approved' && (
                <button onClick={() => handleAction(req.id, 'dispatch_items')}
                  className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700">
                  Mark Dispatched
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
