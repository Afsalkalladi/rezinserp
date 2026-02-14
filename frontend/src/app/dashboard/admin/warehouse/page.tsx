'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { InventoryRequest, Shop } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminWarehousePage() {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [filterShop, setFilterShop] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  const fetchData = async () => {
    try {
      const params: any = {};
      if (filterShop !== 'all') params.shop = filterShop;
      if (filterDate) params.date = filterDate;
      const [reqRes, shopRes] = await Promise.all([
        api.get('/inventory/requests/', { params }),
        api.get('/shops/'),
      ]);
      setRequests(reqRes.data.results || reqRes.data);
      setShops((shopRes.data.results ?? shopRes.data) || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterShop, filterDate]);

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

      {/* Shop and Date Filters */}
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
          <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        {(filterShop !== 'all' || filterDate) && (
          <button onClick={() => { setFilterShop('all'); setFilterDate(''); }}
            className="text-xs text-red-500 hover:underline mt-5">Clear Filters</button>
        )}
      </div>

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
