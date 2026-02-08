'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ProcurementRequest } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ProcurementOrdersPage() {
  const [orders, setOrders] = useState<ProcurementRequest[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    status: '', vendor_name: '', order_date: '', delivery_date: '',
  });

  const fetchData = async () => {
    const params: any = {};
    if (filter) params.status = filter;
    const res = await api.get('/procurement/', { params });
    setOrders(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const startEdit = (order: ProcurementRequest) => {
    setEditingId(order.id);
    setEditForm({
      status: order.status,
      vendor_name: order.vendor_name,
      order_date: order.order_date || '',
      delivery_date: order.delivery_date || '',
    });
  };

  const handleUpdate = async (id: number) => {
    try {
      await api.patch(`/procurement/${id}/`, editForm);
      toast.success('Updated');
      setEditingId(null);
      fetchData();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['procurement_officer']}>
      <PageHeader title="Third-Party Orders" />

      <div className="mb-4 flex gap-2">
        {['', 'pending', 'ordered', 'delivered', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === s ? 'bg-brand-600 text-white' : 'bg-white border text-gray-600'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-gray-400">Loading...</div> : orders.length === 0 ? (
        <EmptyState message="No orders found" />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium">{order.item_name}</span>
                  <span className="text-gray-400 ml-3 text-sm">{order.shop_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  {editingId !== order.id && (
                    <button onClick={() => startEdit(order)}
                      className="text-brand-600 text-sm hover:underline">Edit</button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500">Qty: {order.quantity}</p>
              {order.notes && <p className="text-sm text-gray-400">{order.notes}</p>}
              <p className="text-sm text-gray-400 mt-1">Requested by: {order.requested_by_name}</p>

              {editingId === order.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <select value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm">
                      <option value="pending">Pending</option>
                      <option value="ordered">Ordered</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <input placeholder="Vendor name" value={editForm.vendor_name}
                      onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm" />
                    <input type="date" value={editForm.order_date}
                      onChange={(e) => setEditForm({ ...editForm, order_date: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm" placeholder="Order date" />
                    <input type="date" value={editForm.delivery_date}
                      onChange={(e) => setEditForm({ ...editForm, delivery_date: e.target.value })}
                      className="border rounded-lg px-3 py-2 text-sm" placeholder="Delivery date" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(order.id)}
                      className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm">Save</button>
                    <button onClick={() => setEditingId(null)}
                      className="text-gray-600 text-sm hover:underline">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
