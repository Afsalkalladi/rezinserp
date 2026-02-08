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
  { value: 'worker', label: 'Worker' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: '', password: '', first_name: '', last_name: '',
    email: '', role: 'worker', phone: '', shop: '',
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [usersRes, shopsRes] = await Promise.all([
      api.get('/auth/users/'),
      api.get('/shops/'),
    ]);
    setUsers(usersRes.data.results || usersRes.data);
    setShops(shopsRes.data.results || shopsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, shop: form.shop ? Number(form.shop) : null };
      await api.post('/auth/users/', payload);
      toast.success('User created');
      setForm({
        username: '', password: '', first_name: '', last_name: '',
        email: '', role: 'worker', phone: '', shop: '',
      });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data;
      toast.error(typeof msg === 'string' ? msg : 'Failed to create user');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader
        title="Users"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            {showForm ? 'Cancel' : '+ New User'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input placeholder="Username" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required
            />
            <input placeholder="Password" type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required
            />
            <input placeholder="First Name" value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input placeholder="Last Name" value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input placeholder="Email" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input placeholder="Phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <select value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={form.shop}
              onChange={(e) => setForm({ ...form, shop: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">No Shop</option>
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
            Create User
          </button>
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
                <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{u.username}</td>
                  <td className="px-6 py-4">{u.first_name} {u.last_name}</td>
                  <td className="px-6 py-4 capitalize">{u.role.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-gray-500">{u.shop_name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
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
