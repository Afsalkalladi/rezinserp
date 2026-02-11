'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { WeeklyRoster, User } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

interface WorkerAssignment {
  worker_id: string;
  worker_name: string;
  start_time: string;
  end_time: string;
  role_in_shift: string;
}

interface ShiftRow {
  date: string;
  start_time: string;
  end_time: string;
  assignments: WorkerAssignment[];
}

function getWeekDates(startStr: string): string[] {
  const dates: string[] = [];
  // Parse as local date parts to avoid UTC timezone shift
  const [y, m, d] = startStr.split('-').map(Number);
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m - 1, d + i);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function getDayName(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-au', { weekday: 'short' });
}

export default function ManagerRosterPage() {
  const [rosters, setRosters] = useState<WeeklyRoster[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Default to tomorrow
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStart = tomorrow.toISOString().split('T')[0];

  const [weekStart, setWeekStart] = useState(defaultStart);
  const [notes, setNotes] = useState('');
  const [shifts, setShifts] = useState<ShiftRow[]>([]);

  useEffect(() => {
    const dates = getWeekDates(weekStart);
    setShifts(dates.map((d) => ({
      date: d,
      start_time: '09:00',
      end_time: '17:00',
      assignments: [],
    })));
  }, [weekStart]);

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

  const updateShift = (idx: number, field: keyof ShiftRow, value: any) => {
    const updated = [...shifts];
    (updated[idx] as any)[field] = value;
    setShifts(updated);
  };

  const toggleWorker = (shiftIdx: number, workerId: string) => {
    const updated = [...shifts];
    const assign = updated[shiftIdx].assignments;
    const existing = assign.findIndex(a => a.worker_id === workerId);
    if (existing >= 0) {
      updated[shiftIdx].assignments = assign.filter((_, i) => i !== existing);
    } else {
      const w = workers.find(w => String(w.id) === workerId);
      updated[shiftIdx].assignments = [...assign, {
        worker_id: workerId,
        worker_name: w ? `${w.first_name} ${w.last_name}` : '',
        start_time: updated[shiftIdx].start_time,
        end_time: updated[shiftIdx].end_time,
        role_in_shift: 'general',
      }];
    }
    setShifts(updated);
  };

  const updateAssignment = (shiftIdx: number, assignIdx: number, field: keyof WorkerAssignment, value: string) => {
    const updated = [...shifts];
    updated[shiftIdx].assignments = updated[shiftIdx].assignments.map((a, i) =>
      i === assignIdx ? { ...a, [field]: value } : a
    );
    setShifts(updated);
  };

  const startEdit = (roster: WeeklyRoster) => {
    setEditingId(roster.id);
    setWeekStart(roster.week_start_date);
    setNotes(roster.notes || '');

    const dates = getWeekDates(roster.week_start_date);
    const shiftRows: ShiftRow[] = dates.map((d) => {
      const existing = roster.shifts.find((s) => s.date === d);
      return {
        date: d,
        start_time: existing ? existing.start_time.slice(0, 5) : '09:00',
        end_time: existing ? existing.end_time.slice(0, 5) : '17:00',
        assignments: existing
          ? existing.assignments.map((a) => ({
              worker_id: String(a.worker),
              worker_name: a.worker_name || '',
              start_time: a.start_time ? a.start_time.slice(0, 5) : (existing.start_time?.slice(0, 5) || '09:00'),
              end_time: a.end_time ? a.end_time.slice(0, 5) : (existing.end_time?.slice(0, 5) || '17:00'),
              role_in_shift: a.role_in_shift || 'general',
            }))
          : [],
      };
    });
    setShifts(shiftRows);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setNotes('');
    setWeekStart(defaultStart);
  };

  const buildPayload = () => {
    return shifts
      .filter((s) => s.assignments.length > 0)
      .map((s) => ({
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        assignments: s.assignments.map((a) => ({
          worker: Number(a.worker_id),
          role_in_shift: a.role_in_shift || 'general',
          start_time: a.start_time,
          end_time: a.end_time,
        })),
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const shiftsPayload = buildPayload();
    if (shiftsPayload.length === 0) {
      toast.error('Assign at least one worker to a shift');
      return;
    }

    try {
      if (editingId) {
        // Update existing roster
        await api.put(`/scheduling/rosters/${editingId}/`, {
          notes,
          shifts: shiftsPayload,
        });
        toast.success('Roster updated');
      } else {
        // Create new roster
        await api.post('/scheduling/rosters/', {
          week_start_date: weekStart,
          notes,
          shifts: shiftsPayload,
        });
        toast.success('Weekly roster created');
      }
      cancelForm();
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data;
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this roster and all its shifts?')) return;
    try {
      await api.delete(`/scheduling/rosters/${id}/`);
      toast.success('Roster deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader
        title="Weekly Roster"
        action={
          <button onClick={() => { if (showForm) cancelForm(); else setShowForm(true); }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700">
            {showForm ? 'Cancel' : '+ Create Roster'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Week Starting Date</label>
              <input type="date" value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full mt-1"
                disabled={!!editingId}
                required />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-600">Notes</label>
              <input placeholder="Optional notes..." value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Shift Schedule</h3>
            {shifts.map((shift, idx) => (
              <div key={shift.date} className="border rounded-lg p-4">
                <div className="flex items-center gap-4 mb-3">
                  <span className="font-medium text-sm w-28">
                    {getDayName(shift.date)} — {shift.date}
                  </span>
                  <label className="text-xs text-gray-400">Default time:</label>
                  <input type="time" value={shift.start_time}
                    onChange={(e) => updateShift(idx, 'start_time', e.target.value)}
                    className="border rounded px-2 py-1 text-sm" />
                  <span className="text-gray-400">to</span>
                  <input type="time" value={shift.end_time}
                    onChange={(e) => updateShift(idx, 'end_time', e.target.value)}
                    className="border rounded px-2 py-1 text-sm" />
                </div>
                {/* Worker toggle buttons */}
                <div className="flex gap-2 flex-wrap mb-3">
                  {workers.map((w) => (
                    <button key={w.id} type="button"
                      onClick={() => toggleWorker(idx, String(w.id))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        shift.assignments.some(a => a.worker_id === String(w.id))
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {w.first_name} {w.last_name}
                    </button>
                  ))}
                  {workers.length === 0 && (
                    <span className="text-xs text-gray-400">No workers available</span>
                  )}
                </div>
                {/* Per-worker individual time assignments */}
                {shift.assignments.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Individual Hours</p>
                    {shift.assignments.map((a, aIdx) => {
                      const w = workers.find(w => String(w.id) === a.worker_id);
                      return (
                        <div key={a.worker_id} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-36 truncate">
                            {w ? `${w.first_name} ${w.last_name}` : a.worker_name}
                          </span>
                          <input type="time" value={a.start_time}
                            onChange={(e) => updateAssignment(idx, aIdx, 'start_time', e.target.value)}
                            className="border rounded px-2 py-1 text-sm w-28" />
                          <span className="text-gray-400 text-xs">to</span>
                          <input type="time" value={a.end_time}
                            onChange={(e) => updateAssignment(idx, aIdx, 'end_time', e.target.value)}
                            className="border rounded px-2 py-1 text-sm w-28" />
                          <select value={a.role_in_shift}
                            onChange={(e) => updateAssignment(idx, aIdx, 'role_in_shift', e.target.value)}
                            className="border rounded px-2 py-1 text-xs w-28">
                            <option value="general">General</option>
                            <option value="cashier">Cashier</option>
                            <option value="cook">Cook</option>
                            <option value="counter">Counter</option>
                            <option value="cleaner">Cleaner</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
            {editingId ? 'Update Roster' : 'Create Roster'}
          </button>
        </form>
      )}

      {loading ? <div className="text-gray-400">Loading...</div> : rosters.length === 0 ? (
        <EmptyState message="No weekly rosters yet" />
      ) : (
        <div className="space-y-6">
          {rosters.map((roster) => (
            <div key={roster.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Week of {roster.week_start_date}</h3>
                  <p className="text-xs text-gray-400">Created by {roster.created_by_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {roster.notes && <p className="text-sm text-gray-500 italic">{roster.notes}</p>}
                  <button onClick={() => startEdit(roster)}
                    className="text-brand-600 text-xs font-medium hover:underline">Edit</button>
                  <button onClick={() => handleDelete(roster.id)}
                    className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {roster.shifts.map((shift) => (
                  <div key={shift.id} className="border rounded-lg p-3 text-center">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {new Date(shift.date + 'T00:00:00').toLocaleDateString('en-au', { weekday: 'short' })}
                    </div>
                    <div className="text-xs text-gray-400">{shift.date}</div>
                    <div className="mt-2 space-y-1">
                      {shift.assignments.map((a) => (
                        <div key={a.id} className="text-xs bg-brand-50 text-brand-700 rounded px-1 py-1">
                          <span className="font-medium">{a.worker_name}</span>
                          <div className="text-brand-500 text-[10px]">
                            {a.start_time?.slice(0,5) || shift.start_time?.slice(0,5)} - {a.end_time?.slice(0,5) || shift.end_time?.slice(0,5)}
                          </div>
                        </div>
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
