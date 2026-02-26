'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { InventoryItem } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', unit: '', price: '0', is_active: true, category: 'warehouse' });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    const params: any = {};
    if (filterCategory !== 'all') params.category = filterCategory;
    const res = await api.get('/inventory/items/', { params });
    setItems(res.data.results || res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterCategory]);

  const resetForm = () => {
    setForm({ name: '', unit: '', price: '0', is_active: true, category: 'warehouse' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editingId) {
        await api.patch(`/inventory/items/${editingId}/`, payload);
        toast.success('Item updated');
      } else {
        await api.post('/inventory/items/', payload);
        toast.success('Item created');
      }
      resetForm();
      fetchData();
    } catch {
      toast.error('Failed to save item');
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      unit: item.unit,
      price: String(item.price),
      is_active: item.is_active,
      category: item.category || 'warehouse',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/inventory/items/${id}/`);
      toast.success('Item deleted / deactivated');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleActive = async (item: InventoryItem) => {
    try {
      await api.patch(`/inventory/items/${item.id}/`, { is_active: !item.is_active });
      toast.success(item.is_active ? 'Item deactivated' : 'Item activated');
      fetchData();
    } catch {
      toast.error('Failed to update');
    }
  };

  const filtered = searchTerm
    ? items.filter((it) => it.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : items;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader
        title="Inventory Items"
        action={
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            {showForm && !editingId ? 'Cancel' : '+ New Item'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <h3 className="font-medium text-gray-700">
            {editingId ? 'Edit Item' : 'Add New Item'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Item Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full"
                placeholder="e.g. Burger Buns"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full"
                placeholder="e.g. kg, pcs, litre"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (A$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="warehouse">Warehouse</option>
                <option value="procurement">Procurement (Supplier)</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded"
                />
                Active
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
              {editingId ? 'Update' : 'Create'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="text-gray-600 text-sm hover:underline">Cancel Edit</button>
            )}
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-w-[160px]">
            <option value="all">All Categories</option>
            <option value="warehouse">Warehouse</option>
            <option value="procurement">Procurement</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Search</label>
          <input placeholder="Search items..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-w-[200px]" />
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState message="No inventory items found" />
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">ID</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Unit</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Category</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Price (A$)</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 ${!item.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 text-gray-400">{item.id}</td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4 text-gray-600">{item.unit}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.category === 'procurement'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.category === 'procurement' ? 'Supplier' : 'Warehouse'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">A${Number(item.price).toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleActive(item)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => startEdit(item)}
                      className="text-brand-600 text-sm hover:underline mr-3">Edit</button>
                    <button onClick={() => handleDelete(item.id)}
                      className="text-red-600 text-sm hover:underline">Delete</button>
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
