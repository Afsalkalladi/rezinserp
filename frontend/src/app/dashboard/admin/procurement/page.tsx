'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ProcurementRequest } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminProcurementPage() {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    item_name: '', quantity: '', estimated_unit_price: '', notes: '',
    status: '', vendor_name: '',
  });

  const fetchData = async () => {
    const res = await api.get('/procurement/');
    setRequests(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const startEdit = (r: ProcurementRequest) => {
    setEditingId(r.id);
    setEditForm({
      item_name: r.item_name,
      quantity: r.quantity,
      estimated_unit_price: String(r.estimated_unit_price || ''),
      notes: r.notes || '',
      status: r.status,
      vendor_name: r.vendor_name || '',
    });
  };

  const saveEdit = async (id: number) => {
    try {
      await api.patch(`/procurement/${id}/`, {
        item_name: editForm.item_name,
        quantity: editForm.quantity,
        estimated_unit_price: editForm.estimated_unit_price ? Number(editForm.estimated_unit_price) : null,
        notes: editForm.notes,
        status: editForm.status,
        vendor_name: editForm.vendor_name,
      });
      toast.success('Procurement updated');
      setEditingId(null);
      fetchData();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this procurement request?')) return;
    try {
      await api.delete(`/procurement/${id}/`);
      toast.success('Deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="All Procurement Orders" />

      {loading ? <div className="text-gray-400">Loading...</div> : requests.length === 0 ? (
        <EmptyState message="No procurement orders yet" />
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{r.item_name}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-gray-400">{r.shop_name} — {r.requested_by_name}</span>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <input value={editForm.item_name}
                    onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })}
                    placeholder="Item name" className="border rounded-lg px-3 py-2 text-sm" />
                  <input value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    placeholder="Quantity" className="border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" step="0.01" value={editForm.estimated_unit_price}
                    onChange={(e) => setEditForm({ ...editForm, estimated_unit_price: e.target.value })}
                    placeholder="Unit Price (A$)" className="border rounded-lg px-3 py-2 text-sm" />
                  <input value={editForm.vendor_name}
                    onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                    placeholder="Vendor" className="border rounded-lg px-3 py-2 text-sm" />
                  <select value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm">
                    <option value="pending">Pending</option>
                    <option value="ordered">Ordered</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <input value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Notes" className="border rounded-lg px-3 py-2 text-sm" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-gray-400">Quantity</span><p className="font-medium">{r.quantity}</p></div>
                  <div><span className="text-gray-400">Unit Price</span><p className="font-medium">{r.estimated_unit_price ? `A$${r.estimated_unit_price}` : '—'}</p></div>
                  <div><span className="text-gray-400">Vendor</span><p className="font-medium">{r.vendor_name || '—'}</p></div>
                  <div><span className="text-gray-400">Notes</span><p className="font-medium">{r.notes || '—'}</p></div>
                </div>
              )}
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
