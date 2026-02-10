'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User, Shop } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'shop_manager', label: 'Shop Manager' },
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
  { value: 'procurement_officer', label: 'Procurement Officer' },
  { value: 'payroll_manager', label: 'Payroll Manager' },
  { value: 'worker', label: 'Worker' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    username: '', password: '', first_name: '', last_name: '',
    email: '', role: 'worker', phone: '', shop: '',
    tfn_number: '', mobile_number: '', home_address: '', is_active: true,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [usersRes, shopsRes] = await Promise.all([
        api.get('/auth/users/'),
        api.get('/shops/'),
      ]);
      const usersData = usersRes.data.results ?? usersRes.data;
      const shopsData = shopsRes.data.results ?? shopsRes.data;
      setUsers(Array.isArray(usersData) ? usersData : []);
      setShops(Array.isArray(shopsData) ? shopsData : []);
    } catch (err: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const emptyForm = {
    username: '', password: '', first_name: '', last_name: '',
    email: '', role: 'worker', phone: '', shop: '',
    tfn_number: '', mobile_number: '', home_address: '', is_active: true,
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      username: u.username,
      password: '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      email: u.email || '',
      role: u.role,
      phone: u.phone || '',
      shop: u.shop ? String(u.shop) : '',
      tfn_number: u.tfn_number || '',
      mobile_number: u.mobile_number || '',
      home_address: u.home_address || '',
      is_active: u.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...form, shop: form.shop ? Number(form.shop) : null };
      if (editingId) {
        // Don't send empty password on update
        if (!payload.password) delete payload.password;
        await api.put(`/auth/users/${editingId}/`, payload);
        toast.success('User updated');
      } else {
        await api.post('/auth/users/', payload);
        toast.success('User created');
      }
      resetForm();
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data;
      toast.error(typeof msg === 'string' ? msg : editingId ? 'Failed to update user' : 'Failed to create user');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/auth/users/${id}/`);
      toast.success('User deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="Users"
        action={
          <button onClick={() => { if (showForm && !editingId) resetForm(); else { resetForm(); setShowForm(true); } }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700">
            {showForm && !editingId ? 'Cancel' : '+ New User'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">{editingId ? 'Edit User' : 'New User'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input placeholder="Username" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required />
            <input placeholder={editingId ? 'New Password (leave blank to keep)' : 'Password'}
              type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
              required={!editingId} />
            <input placeholder="First Name" value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Last Name" value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Email" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={form.shop}
              onChange={(e) => setForm({ ...form, shop: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">No Shop</option>
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input placeholder="TFN Number" value={form.tfn_number}
              onChange={(e) => setForm({ ...form, tfn_number: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Mobile Number" value={form.mobile_number}
              onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Home Address" value={form.home_address}
              onChange={(e) => setForm({ ...form, home_address: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
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
              {editingId ? 'Update User' : 'Create User'}
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
      ) : users.length === 0 ? (
        <EmptyState message="No users yet" />
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Username</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Shop</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Mobile</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">TFN</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{u.username}</td>
                  <td className="px-6 py-4">{u.first_name} {u.last_name}</td>
                  <td className="px-6 py-4 capitalize">{u.role.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-gray-500">{u.shop_name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{u.mobile_number || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{u.tfn_number || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => startEdit(u)}
                      className="text-brand-600 text-xs font-medium hover:underline mr-3">Edit</button>
                    <button onClick={() => handleDelete(u.id)}
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
