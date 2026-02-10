'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { TimesheetEntry } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

interface RosterWorker {
  id: number;
  name: string;
  role_in_shift: string;
  shift_start: string;
  shift_end: string;
}

interface ShopWorker {
  id: number;
  first_name: string;
  last_name: string;
}

interface AttendanceRow {
  worker_id: number;
  worker_name: string;
  role_in_shift: string;
  is_present: boolean;
  start_time: string;
  end_time: string;
  existing_id?: number;
  hours_worked?: string;
  is_extra?: boolean;
}

export default function ManagerTimesheetsPage() {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rosterWorkers, setRosterWorkers] = useState<AttendanceRow[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shopWorkers, setShopWorkers] = useState<ShopWorker[]>([]);
  const [showAddWorker, setShowAddWorker] = useState(false);

  const fetchEntries = async () => {
    try {
      const res = await api.get('/timesheets/');
      const data = res.data.results ?? res.data;
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  const fetchRosterForDate = async (selectedDate: string) => {
    setLoadingRoster(true);
    try {
      const res = await api.get('/timesheets/roster_workers/', {
        params: { date: selectedDate },
      });
      const workers: RosterWorker[] = res.data.workers || [];
      const existing: Record<string, any> = res.data.existing_entries || {};

      const rows: AttendanceRow[] = workers.map((w) => {
        const ex = existing[String(w.id)];
        return {
          worker_id: w.id,
          worker_name: w.name,
          role_in_shift: w.role_in_shift,
          is_present: ex ? ex.is_present : true,
          start_time: ex ? ex.start_time : w.shift_start,
          end_time: ex ? ex.end_time : w.shift_end,
          existing_id: ex?.id,
          hours_worked: ex?.hours_worked,
        };
      });
      setRosterWorkers(rows);
    } catch {
      toast.error('Failed to load roster data');
      setRosterWorkers([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => { fetchEntries(); }, []);
  useEffect(() => { fetchRosterForDate(date); }, [date]);

  // Fetch all shop workers for the "Add Worker" dropdown
  useEffect(() => {
    api.get('/auth/users/', { params: { role: 'worker' } })
      .then(res => {
        const data = res.data.results ?? res.data;
        setShopWorkers(Array.isArray(data) ? data : []);
      }).catch(() => {});
  }, []);

  const addExtraWorker = (workerId: number) => {
    if (rosterWorkers.some(r => r.worker_id === workerId)) {
      toast.error('Worker already in list');
      return;
    }
    const w = shopWorkers.find(sw => sw.id === workerId);
    if (!w) return;
    setRosterWorkers(prev => [...prev, {
      worker_id: w.id,
      worker_name: `${w.first_name} ${w.last_name}`,
      role_in_shift: 'extra',
      is_present: true,
      start_time: '09:00',
      end_time: '17:00',
      is_extra: true,
    }]);
    setShowAddWorker(false);
  };

  const updateRow = (idx: number, field: keyof AttendanceRow, value: any) => {
    setRosterWorkers(prev => prev.map((row, i) =>
      i === idx ? { ...row, [field]: value } : row
    ));
  };

  const handleBulkSave = async () => {
    setSaving(true);
    try {
      const payload = rosterWorkers.map((r) => ({
        worker: r.worker_id,
        date,
        is_present: r.is_present,
        start_time: r.is_present ? r.start_time : null,
        end_time: r.is_present ? r.end_time : null,
      }));
      await api.post('/timesheets/bulk_create/', { entries: payload });
      toast.success('Attendance saved');
      fetchRosterForDate(date);
      fetchEntries();
    } catch {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const res = await api.get('/timesheets/daily_report/', {
        params: { date },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily_report_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download report');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader title="Attendance & Timesheets" />

      {/* Date selector + roster-based attendance form */}
      <div className="bg-white border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-600">Select Date</label>
            <input type="date" value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </div>
          <div className="mt-5">
            <span className="text-sm text-gray-500">
              {rosterWorkers.length} worker{rosterWorkers.length !== 1 ? 's' : ''} rostered
            </span>
          </div>
          <div className="mt-5">
            <button onClick={handleDownloadReport}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
              Download Daily Report
            </button>
          </div>
        </div>

        {loadingRoster ? (
          <div className="text-gray-400 text-sm">Loading roster...</div>
        ) : (
          <>
            {rosterWorkers.length === 0 && (
              <div className="text-gray-400 text-sm py-4">
                No workers rostered for this date. Create a roster first, or add workers manually below.
              </div>
            )}

            {/* Add extra worker section */}
            <div className="mb-4">
              {showAddWorker ? (
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <select
                className="border rounded-lg px-3 py-2 text-sm flex-1"
                defaultValue=""
                onChange={(e) => { if (e.target.value) addExtraWorker(Number(e.target.value)); }}
              >
                <option value="" disabled>Select a worker to add...</option>
                {shopWorkers.filter(sw => !rosterWorkers.some(r => r.worker_id === sw.id)).map(sw => (
                  <option key={sw.id} value={sw.id}>{sw.first_name} {sw.last_name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowAddWorker(false)}
                className="text-gray-500 text-sm hover:text-gray-700">Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAddWorker(true)}
              className="text-brand-600 text-sm font-medium hover:underline">
              + Add Worker (outside roster)
            </button>
          )}
        </div>

        {rosterWorkers.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Worker</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Present</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Start</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">End</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rosterWorkers.map((row, idx) => (
                    <tr key={row.worker_id} className={`hover:bg-gray-50 ${!row.is_present ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3 font-medium">
                        {row.worker_name}
                        {row.is_extra && <span className="ml-1 text-xs text-orange-500 font-normal">(extra)</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs capitalize">{row.role_in_shift}</td>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={row.is_present}
                          onChange={(e) => updateRow(idx, 'is_present', e.target.checked)}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                      </td>
                      <td className="px-4 py-3">
                        {row.is_present ? (
                          <input type="time" value={row.start_time}
                            onChange={(e) => updateRow(idx, 'start_time', e.target.value)}
                            className="border rounded px-2 py-1 text-sm w-28" />
                        ) : <span className="text-gray-400">--:--</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.is_present ? (
                          <input type="time" value={row.end_time}
                            onChange={(e) => updateRow(idx, 'end_time', e.target.value)}
                            className="border rounded px-2 py-1 text-sm w-28" />
                        ) : <span className="text-gray-400">--:--</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {row.existing_id ? `${row.hours_worked}h` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={handleBulkSave} disabled={saving}
                className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </>
        )}
          </>
        )}
      </div>

      {/* Recent entries table */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Entries</h3>
        {loading ? <div className="text-gray-400">Loading...</div> : entries.length === 0 ? (
          <EmptyState message="No timesheet entries yet" />
        ) : (
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Worker</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-center px-6 py-3 font-medium text-gray-500">Present</th>
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
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        e.is_present ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {e.is_present ? 'Yes' : 'Absent'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{e.start_time || '—'}</td>
                    <td className="px-6 py-4">{e.end_time || '—'}</td>
                    <td className="px-6 py-4 font-medium">{e.hours_worked}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
