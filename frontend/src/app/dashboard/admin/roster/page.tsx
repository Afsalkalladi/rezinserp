'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { WeeklyRoster, User, Shop } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminRosterPage() {
  const [rosters, setRosters] = useState<WeeklyRoster[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Emergency add form state
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [addForm, setAddForm] = useState({
    date: '', worker: '', role_in_shift: 'general', start_time: '09:00', end_time: '17:00',
  });

  const fetchData = async () => {
    try {
      const [rosterRes, usersRes] = await Promise.all([
        api.get('/scheduling/rosters/'),
        api.get('/auth/users/', { params: { role: 'worker' } }),
      ]);
      const rosterData = rosterRes.data.results ?? rosterRes.data;
      setRosters(Array.isArray(rosterData) ? rosterData : []);
      const allUsers = usersRes.data.results ?? usersRes.data;
      setWorkers(Array.isArray(allUsers) ? allUsers.filter((u: User) => u.role === 'worker') : []);
    } catch {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddWorker = async (rosterId: number) => {
    if (!addForm.date || !addForm.worker) {
      toast.error('Select a date and worker');
      return;
    }
    try {
      await api.post(`/scheduling/rosters/${rosterId}/add_worker/`, {
        date: addForm.date,
        worker: Number(addForm.worker),
        role_in_shift: addForm.role_in_shift,
        start_time: addForm.start_time,
        end_time: addForm.end_time,
      });
      toast.success('Emergency worker added');
      setAddingTo(null);
      setAddForm({ date: '', worker: '', role_in_shift: 'general', start_time: '09:00', end_time: '17:00' });
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to add worker';
      toast.error(msg);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="All Rosters" />

      {loading ? <div className="text-gray-400">Loading...</div> : rosters.length === 0 ? (
        <EmptyState message="No weekly rosters yet" />
      ) : (
        <div className="space-y-6">
          {rosters.map((roster) => (
            <div key={roster.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">
                    {roster.shop_name} — Week of {roster.week_start_date}
                  </h3>
                  <p className="text-xs text-gray-400">Created by {roster.created_by_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {roster.notes && <p className="text-sm text-gray-500 italic">{roster.notes}</p>}
                  <button
                    onClick={() => {
                      setAddingTo(addingTo === roster.id ? null : roster.id);
                      if (roster.shifts.length > 0) {
                        setAddForm(f => ({ ...f, date: roster.shifts[0].date }));
                      }
                    }}
                    className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-orange-200">
                    + Emergency Worker
                  </button>
                </div>
              </div>

              {addingTo === roster.id && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-orange-800 mb-3">Add Emergency Worker</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <select value={addForm.date}
                      onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                      className="border rounded px-2 py-1 text-sm">
                      <option value="">Select day</option>
                      {roster.shifts.map(s => (
                        <option key={s.id} value={s.date}>{s.date}</option>
                      ))}
                    </select>
                    <select value={addForm.worker}
                      onChange={(e) => setAddForm({ ...addForm, worker: e.target.value })}
                      className="border rounded px-2 py-1 text-sm">
                      <option value="">Select worker</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
                      ))}
                    </select>
                    <input placeholder="Role" value={addForm.role_in_shift}
                      onChange={(e) => setAddForm({ ...addForm, role_in_shift: e.target.value })}
                      className="border rounded px-2 py-1 text-sm" />
                    <input type="time" value={addForm.start_time}
                      onChange={(e) => setAddForm({ ...addForm, start_time: e.target.value })}
                      className="border rounded px-2 py-1 text-sm" />
                    <input type="time" value={addForm.end_time}
                      onChange={(e) => setAddForm({ ...addForm, end_time: e.target.value })}
                      className="border rounded px-2 py-1 text-sm" />
                  </div>
                  <button onClick={() => handleAddWorker(roster.id)}
                    className="mt-3 bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-orange-700">
                    Add Worker
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {roster.shifts.map((shift) => (
                  <div key={shift.id} className="border rounded-lg p-3 text-center">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {new Date(shift.date + 'T00:00:00').toLocaleDateString('en-au', { weekday: 'short' })}
                    </div>
                    <div className="text-xs text-gray-400">{shift.date}</div>
                    <div className="text-xs text-brand-600 mt-1">
                      {shift.start_time?.slice(0,5)} - {shift.end_time?.slice(0,5)}
                    </div>
                    <div className="mt-2 space-y-1">
                      {shift.assignments.map((a) => (
                        <span key={a.id} className="block text-xs bg-brand-50 text-brand-700 rounded px-1 py-0.5">
                          {a.worker_name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
