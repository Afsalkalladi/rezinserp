'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { TimesheetEntry } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';

export default function WorkerAttendancePage() {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/timesheets/').then((res) => {
      setEntries(res.data.results || res.data);
      setLoading(false);
    });
  }, []);

  const presentCount = entries.filter((e) => e.is_present).length;
  const absentCount = entries.filter((e) => !e.is_present).length;
  const totalHours = entries.reduce((sum, e) => sum + e.hours_worked, 0);

  return (
    <ProtectedRoute allowedRoles={['worker']}>
      <PageHeader title="My Attendance" />

      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 rounded-xl p-4 border text-center">
            <p className="text-sm text-gray-500">Present</p>
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border text-center">
            <p className="text-sm text-gray-500">Absent</p>
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border text-center">
            <p className="text-sm text-gray-500">Total Hours</p>
            <p className="text-2xl font-bold text-blue-600">{totalHours.toFixed(1)}h</p>
          </div>
        </div>
      )}

      {loading ? <div className="text-gray-400">Loading...</div> : entries.length === 0 ? (
        <EmptyState message="No attendance records yet" />
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Start</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">End</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{e.date}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      e.is_present ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {e.is_present ? 'Present' : 'Absent'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{e.start_time || '—'}</td>
                  <td className="px-6 py-4">{e.end_time || '—'}</td>
                  <td className="px-6 py-4 text-right font-medium">{e.hours_worked}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedRoute>
  );
}
