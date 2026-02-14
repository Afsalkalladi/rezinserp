'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { WeeklyRoster, User, Shop } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

interface EditShiftData {
  date: string; start_time: string; end_time: string;
  assignments: { worker: number; role_in_shift: string; start_time?: string; end_time?: string }[];
}

export default function AdminRosterPage() {
  const [rosters, setRosters] = useState<WeeklyRoster[]>([]);
  const [allWorkers, setAllWorkers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterShop, setFilterShop] = useState<string>('all');

  // Emergency add
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [addForm, setAddForm] = useState({ date: '', worker: '', role_in_shift: 'general', start_time: '09:00', end_time: '17:00' });

  // Edit roster
  const [editingRoster, setEditingRoster] = useState<number | null>(null);
  const [editShifts, setEditShifts] = useState<EditShiftData[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = async () => {
    try {
      const [rosterRes, usersRes, shopsRes] = await Promise.all([
        api.get('/scheduling/rosters/'),
        api.get('/auth/users/', { params: { role: 'worker' } }),
        api.get('/shops/'),
      ]);
      setRosters((rosterRes.data.results ?? rosterRes.data) || []);
      const users = usersRes.data.results ?? usersRes.data;
      setAllWorkers(Array.isArray(users) ? users.filter((u: User) => u.role === 'worker') : []);
      setShops((shopsRes.data.results ?? shopsRes.data) || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddWorker = async (rosterId: number) => {
    if (!addForm.date || !addForm.worker) { toast.error('Select date and worker'); return; }
    try {
      await api.post(`/scheduling/rosters/${rosterId}/add_worker/`, {
        date: addForm.date, worker: Number(addForm.worker),
        role_in_shift: addForm.role_in_shift, start_time: addForm.start_time, end_time: addForm.end_time,
      });
      toast.success('Worker added');
      setAddingTo(null);
      setAddForm({ date: '', worker: '', role_in_shift: 'general', start_time: '09:00', end_time: '17:00' });
      fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
  };

  const startEditRoster = (roster: WeeklyRoster) => {
    setEditingRoster(roster.id);
    setEditNotes(roster.notes || '');
    setEditShifts(roster.shifts.map(s => ({
      date: s.date, start_time: s.start_time?.slice(0, 5) || '09:00', end_time: s.end_time?.slice(0, 5) || '17:00',
      assignments: s.assignments.map(a => ({
        worker: a.worker, role_in_shift: a.role_in_shift,
        start_time: a.start_time?.slice(0, 5), end_time: a.end_time?.slice(0, 5),
      })),
    })));
  };

  const saveEditRoster = async (rosterId: number) => {
    setSavingEdit(true);
    try {
      await api.put(`/scheduling/rosters/${rosterId}/`, {
        notes: editNotes,
        shifts: editShifts.map(s => ({
          date: s.date, start_time: s.start_time, end_time: s.end_time,
          assignments: s.assignments.map(a => ({
            worker: a.worker, role_in_shift: a.role_in_shift,
            start_time: a.start_time || s.start_time, end_time: a.end_time || s.end_time,
          })),
        })),
      });
      toast.success('Roster updated');
      setEditingRoster(null);
      fetchData();
    } catch { toast.error('Failed to update roster'); }
    setSavingEdit(false);
  };

  const deleteRoster = async (id: number) => {
    if (!confirm('Delete this roster?')) return;
    try { await api.delete(`/scheduling/rosters/${id}/`); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const addAssignment = (shiftIdx: number) => {
    setEditShifts(prev => prev.map((s, i) => i === shiftIdx ? {
      ...s, assignments: [...s.assignments, { worker: 0, role_in_shift: 'general' }]
    } : s));
  };

  const removeAssignment = (shiftIdx: number, aIdx: number) => {
    setEditShifts(prev => prev.map((s, i) => i === shiftIdx ? {
      ...s, assignments: s.assignments.filter((_, j) => j !== aIdx)
    } : s));
  };

  const updateAssignment = (shiftIdx: number, aIdx: number, field: string, value: any) => {
    setEditShifts(prev => prev.map((s, i) => i === shiftIdx ? {
      ...s, assignments: s.assignments.map((a, j) => j === aIdx ? { ...a, [field]: value } : a)
    } : s));
  };

  const filtered = filterShop === 'all' ? rosters : rosters.filter(r => String(r.shop) === filterShop);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="All Rosters" />

      <div className="flex gap-3 mb-6 items-center">
        <label className="text-sm font-medium text-gray-600">Filter by Shop:</label>
        <select value={filterShop} onChange={(e) => setFilterShop(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm min-w-[200px]">
          <option value="all">All Shops</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <div className="text-gray-400">Loading...</div> : filtered.length === 0 ? (
        <EmptyState message="No weekly rosters found" />
      ) : (
        <div className="space-y-6">
          {filtered.map(roster => (
            <div key={roster.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{roster.shop_name} — Week of {roster.week_start_date}</h3>
                  <p className="text-xs text-gray-400">Created by {roster.created_by_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {roster.notes && <p className="text-sm text-gray-500 italic">{roster.notes}</p>}
                  {editingRoster !== roster.id && (
                    <>
                      <button onClick={() => startEditRoster(roster)}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-200">Edit Roster</button>
                      <button onClick={() => {
                        setAddingTo(addingTo === roster.id ? null : roster.id);
                        if (roster.shifts.length > 0) setAddForm(f => ({ ...f, date: roster.shifts[0].date }));
                      }} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-orange-200">+ Emergency Worker</button>
                      <button onClick={() => deleteRoster(roster.id)}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-200">Delete</button>
                    </>
                  )}
                </div>
              </div>

              {/* Emergency add form */}
              {addingTo === roster.id && editingRoster !== roster.id && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-orange-800 mb-3">Add Emergency Worker</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <select value={addForm.date} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} className="border rounded px-2 py-1 text-sm">
                      <option value="">Select day</option>
                      {roster.shifts.map(s => <option key={s.id} value={s.date}>{s.date}</option>)}
                    </select>
                    <select value={addForm.worker} onChange={(e) => setAddForm({ ...addForm, worker: e.target.value })} className="border rounded px-2 py-1 text-sm">
                      <option value="">Select worker</option>
                      {allWorkers.map(w => <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>)}
                    </select>
                    <input placeholder="Role" value={addForm.role_in_shift} onChange={(e) => setAddForm({ ...addForm, role_in_shift: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                    <input type="time" value={addForm.start_time} onChange={(e) => setAddForm({ ...addForm, start_time: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                    <input type="time" value={addForm.end_time} onChange={(e) => setAddForm({ ...addForm, end_time: e.target.value })} className="border rounded px-2 py-1 text-sm" />
                  </div>
                  <button onClick={() => handleAddWorker(roster.id)} className="mt-3 bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-orange-700">Add Worker</button>
                </div>
              )}

              {/* Edit roster form */}
              {editingRoster === roster.id ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-3">Edit Roster</h4>
                  <div className="mb-3">
                    <label className="text-xs text-gray-600">Notes</label>
                    <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Roster notes..." />
                  </div>
                  {editShifts.map((shift, si) => (
                    <div key={si} className="bg-white rounded-lg p-3 mb-3 border">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium">{shift.date}</span>
                        <input type="time" value={shift.start_time} onChange={(e) => setEditShifts(prev => prev.map((s, i) => i === si ? { ...s, start_time: e.target.value } : s))} className="border rounded px-2 py-1 text-xs" />
                        <span className="text-xs text-gray-400">to</span>
                        <input type="time" value={shift.end_time} onChange={(e) => setEditShifts(prev => prev.map((s, i) => i === si ? { ...s, end_time: e.target.value } : s))} className="border rounded px-2 py-1 text-xs" />
                      </div>
                      <div className="space-y-1">
                        {shift.assignments.map((a, ai) => (
                          <div key={ai} className="flex items-center gap-2">
                            <select value={a.worker} onChange={(e) => updateAssignment(si, ai, 'worker', Number(e.target.value))} className="border rounded px-2 py-1 text-xs flex-1">
                              <option value={0}>Select worker</option>
                              {allWorkers.map(w => <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>)}
                            </select>
                            <input value={a.role_in_shift} onChange={(e) => updateAssignment(si, ai, 'role_in_shift', e.target.value)} placeholder="Role" className="border rounded px-2 py-1 text-xs w-24" />
                            <button onClick={() => removeAssignment(si, ai)} className="text-red-500 text-xs hover:underline">Remove</button>
                          </div>
                        ))}
                        <button onClick={() => addAssignment(si)} className="text-brand-600 text-xs hover:underline">+ Add Worker</button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => saveEditRoster(roster.id)} disabled={savingEdit}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => setEditingRoster(null)} className="text-gray-500 text-sm hover:underline">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                  {roster.shifts.map(shift => (
                    <div key={shift.id} className="border rounded-lg p-3 text-center">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        {new Date(shift.date + 'T00:00:00').toLocaleDateString('en-au', { weekday: 'short' })}
                      </div>
                      <div className="text-xs text-gray-400">{shift.date}</div>
                      <div className="text-xs text-brand-600 mt-1">{shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}</div>
                      <div className="mt-2 space-y-1">
                        {shift.assignments.map(a => (
                          <span key={a.id} className="block text-xs bg-brand-50 text-brand-700 rounded px-1 py-0.5">
                            {a.worker_name} <span className="text-gray-400">({a.role_in_shift})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
