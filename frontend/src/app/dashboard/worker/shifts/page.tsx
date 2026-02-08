'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Shift } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';

export default function WorkerShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/scheduling/shifts/').then((res) => {
      setShifts(res.data.results || res.data);
      setLoading(false);
    });
  }, []);

  return (
    <ProtectedRoute allowedRoles={['worker']}>
      <PageHeader title="My Shifts" />

      {loading ? <div className="text-gray-400">Loading...</div> : shifts.length === 0 ? (
        <EmptyState message="No shifts assigned to you" />
      ) : (
        <div className="space-y-4">
          {shifts.map((shift) => (
            <div key={shift.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-lg">{shift.date}</span>
                <span className="text-gray-500">{shift.start_time} — {shift.end_time}</span>
              </div>
              <p className="text-sm text-gray-500">{shift.shop_name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {shift.assignments.map((a) => (
                  <span key={a.id} className="bg-brand-50 text-brand-700 rounded px-2 py-1 text-sm">
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
