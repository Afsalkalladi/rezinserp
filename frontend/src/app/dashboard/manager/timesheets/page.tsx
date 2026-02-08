'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { TimesheetEntry, User } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ManagerTimesheetsPage() {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    worker: '', date: new Date().toISOString().split('T')[0],
    start_time: '09:00', end_time: '17:00',
  });

  const fetchData = async () => {
    const [tsRes, usersRes] = await Promise.all([
      api.get('/timesheets/'),
      api.get('/auth/users/', { params: { role: 'worker' } }),
    ]);
    setEntries(tsRes.data.results || tsRes.data);
    const allUsers = usersRes.data.results || usersRes.data;
    setWorkers(allUsers.filter((u: User) => u.role === 'worker'));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/timesheets/', {
        ...form,
        worker: Number(form.worker),
      });
      toast.success('Timesheet recorded');
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.non_field_errors?.[0] || 'Failed');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader
        title="Timesheets"
        action={
          <button onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700">
            {showForm ? 'Cancel' : '+ Record Entry'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <select value={form.worker}
              onChange={(e) => setForm({ ...form, worker: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Select worker</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
              ))}
            </select>
            <input type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required />
            <input type="time" value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required />
            <input type="time" value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" required />
          </div>
          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
            Save Entry
          </button>
        </form>
      )}

      {loading ? <div className="text-gray-400">Loading...</div> : entries.length === 0 ? (
        <EmptyState message="No timesheet entries yet" />
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Worker</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Start</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">End</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{e.worker_name}</td>
                  <td className="px-6 py-4">{e.date}</td>
                  <td className="px-6 py-4">{e.start_time}</td>
                  <td className="px-6 py-4">{e.end_time}</td>
                  <td className="px-6 py-4 font-medium">{e.hours_worked}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedRoute>
  );
}
