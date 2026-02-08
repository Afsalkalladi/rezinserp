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
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const [loading, setLoading] = useState(true);

  const fetchShops = async () => {
    const res = await api.get('/shops/');
    setShops(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchShops(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/shops/', form);
      toast.success('Shop created');
      setForm({ name: '', address: '', phone: '' });
      setShowForm(false);
      fetchShops();
    } catch {
      toast.error('Failed to create shop');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader
        title="Shops"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            {showForm ? 'Cancel' : '+ New Shop'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              placeholder="Shop name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
            Create Shop
          </button>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedRoute>
  );
}
