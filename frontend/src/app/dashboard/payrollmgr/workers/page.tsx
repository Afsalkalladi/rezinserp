'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User, Shop } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';

export default function PayrollMgrWorkersPage() {
  const [workers, setWorkers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopFilter, setShopFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      const [usersRes, shopsRes] = await Promise.all([
        api.get('/auth/users/', { params: { role: 'worker' } }),
        api.get('/shops/'),
      ]);
      const allUsers = usersRes.data.results || usersRes.data;
      setWorkers(allUsers.filter((u: User) => u.role === 'worker'));
      setShops(shopsRes.data.results || shopsRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = shopFilter === 'all'
    ? workers
    : workers.filter((w) => String(w.shop) === shopFilter);

  return (
    <ProtectedRoute allowedRoles={['payroll_manager']}>
      <PageHeader title="All Workers" />

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setShopFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            shopFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}>
          All Shops ({workers.length})
        </button>
        {shops.map((s) => (
          <button key={s.id} onClick={() => setShopFilter(String(s.id))}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              shopFilter === String(s.id) ? 'bg-brand-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {s.name} ({workers.filter((w) => w.shop === s.id).length})
          </button>
        ))}
      </div>

      {loading ? <div className="text-gray-400">Loading...</div> : filtered.length === 0 ? (
        <EmptyState message="No workers found" />
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Username</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Shop</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Mobile</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">TFN</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{w.first_name} {w.last_name}</td>
                  <td className="px-6 py-4 text-gray-500">{w.username}</td>
                  <td className="px-6 py-4">{w.shop_name || '—'}</td>
                  <td className="px-6 py-4">{w.mobile_number || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{w.email || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{w.tfn_number || '—'}</td>
                  <td className="px-6 py-4 text-gray-400 max-w-xs truncate">{w.home_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedRoute>
  );
}
