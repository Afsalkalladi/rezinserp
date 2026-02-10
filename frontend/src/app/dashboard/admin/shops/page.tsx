'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Shop } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', is_active: true });
  const [loading, setLoading] = useState(true);

  const fetchShops = async () => {
    const res = await api.get('/shops/');
    setShops(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchShops(); }, []);

  const resetForm = () => {
    setForm({ name: '', address: '', phone: '', is_active: true });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (shop: Shop) => {
    setEditingId(shop.id);
    setForm({ name: shop.name, address: shop.address || '', phone: shop.phone || '', is_active: shop.is_active });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/shops/${editingId}/`, form);
        toast.success('Shop updated');
      } else {
        await api.post('/shops/', form);
        toast.success('Shop created');
      }
      resetForm();
      fetchShops();
    } catch {
      toast.error(editingId ? 'Failed to update shop' : 'Failed to create shop');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this shop? This will also remove all associated data.')) return;
    try {
      await api.delete(`/shops/${id}/`);
      toast.success('Shop deleted');
      fetchShops();
    } catch {
      toast.error('Failed to delete shop');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader
        title="Shops"
        action={
          <button
            onClick={() => { if (showForm && !editingId) resetForm(); else { resetForm(); setShowForm(true); } }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            {showForm && !editingId ? 'Cancel' : '+ New Shop'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{editingId ? 'Edit Shop' : 'New Shop'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Shop name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required />
            <input placeholder="Address" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          {editingId && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-gray-300 text-brand-600" />
              Active
            </label>
          )}
          <div className="flex gap-3">
            <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
              {editingId ? 'Update Shop' : 'Create Shop'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="text-gray-500 px-4 py-2 rounded-lg text-sm hover:text-gray-700">Cancel</button>
            )}
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : shops.length === 0 ? (
        <EmptyState message="No shops yet" />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Address</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Phone</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Staff</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shops.map((shop) => (
                <tr key={shop.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{shop.name}</td>
                  <td className="px-6 py-4 text-gray-500">{shop.address || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{shop.phone || '—'}</td>
                  <td className="px-6 py-4">{shop.staff_count}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium ${shop.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {shop.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => startEdit(shop)}
                      className="text-brand-600 text-xs font-medium hover:underline mr-3">Edit</button>
                    <button onClick={() => handleDelete(shop.id)}
                      className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedRoute>
  );
}
