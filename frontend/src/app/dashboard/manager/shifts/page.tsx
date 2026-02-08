'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Shift, User } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ManagerShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [assignments, setAssignments] = useState<{ worker: string; role_in_shift: string }[]>([
    { worker: '', role_in_shift: '' },
  ]);

  const fetchData = async () => {
    const [shiftsRes, usersRes] = await Promise.all([
      api.get('/scheduling/shifts/'),
      api.get('/auth/users/', { params: { role: 'worker' } }),
    ]);
    setShifts(shiftsRes.data.results || shiftsRes.data);
    const allUsers = usersRes.data.results || usersRes.data;
    setWorkers(allUsers.filter((u: User) => u.role === 'worker'));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addAssignment = () => setAssignments([...assignments, { worker: '', role_in_shift: '' }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/scheduling/shifts/', {
        date,
        start_time: startTime,
        end_time: endTime,
        assignments: assignments
          .filter((a) => a.worker && a.role_in_shift)
          .map((a) => ({ worker: Number(a.worker), role_in_shift: a.role_in_shift })),
      });
      toast.success('Shift created');
      setShowForm(false);
      fetchData();
    } catch {
      toast.error('Failed to create shift');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader
        title="Shift Scheduling"
        action={
          <button onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700">
            {showForm ? 'Cancel' : '+ New Shift'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Assign Workers</label>
            {assignments.map((a, idx) => (
              <div key={idx} className="flex gap-2">
                <select value={a.worker}
                  onChange={(e) => {
                    const u = [...assignments]; u[idx].worker = e.target.value; setAssignments(u);
                  }}
                  className="border rounded-lg px-3 py-2 text-sm flex-1">
                  <option value="">Select worker</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
                  ))}
                </select>
                <input placeholder="Role (e.g. Cashier)" value={a.role_in_shift}
                  onChange={(e) => {
                    const u = [...assignments]; u[idx].role_in_shift = e.target.value; setAssignments(u);
                  }}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" />
              </div>
            ))}
            <button type="button" onClick={addAssignment}
              className="text-brand-600 text-sm hover:underline">+ Add worker</button>
          </div>
          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
            Create Shift
          </button>
        </form>
      )}

      {loading ? <div className="text-gray-400">Loading...</div> : shifts.length === 0 ? (
        <EmptyState message="No shifts yet" />
      ) : (
        <div className="space-y-4">
          {shifts.map((shift) => (
            <div key={shift.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{shift.date}</span>
                <span className="text-sm text-gray-500">{shift.start_time} — {shift.end_time}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {shift.assignments.map((a) => (
                  <span key={a.id} className="bg-brand-50 text-brand-700 rounded-lg px-3 py-1 text-sm">
                    {a.worker_name} — {a.role_in_shift}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
