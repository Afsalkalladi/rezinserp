'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { TimesheetEntry, Shop } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

interface RosterWorker {
  id: number; name: string; role_in_shift: string; shift_start: string; shift_end: string;
}
interface ShopWorker { id: number; first_name: string; last_name: string; shop: number | null; }
interface AttendanceRow {
  worker_id: number; worker_name: string; role_in_shift: string;
  is_present: boolean; start_time: string; end_time: string;
  existing_id?: number; hours_worked?: string; is_extra?: boolean;
}
interface WorkerDateEntry { is_present: boolean; start_time: string; end_time: string; hours: number; }
interface WorkerHoursRow { id: number; name: string; dates: Record<string, WorkerDateEntry>; total_hours: number; }

function localDateStr(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

type TabKey = 'attendance' | 'hours';

export default function AdminTimesheetsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('attendance');

  // Attendance tab
  const [date, setDate] = useState(localDateStr(new Date()));
  const [rosterWorkers, setRosterWorkers] = useState<AttendanceRow[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shopWorkers, setShopWorkers] = useState<ShopWorker[]>([]);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ is_present: true, start_time: '', end_time: '' });

  // Hours tab
  const today = new Date();
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
  const [hoursStartDate, setHoursStartDate] = useState(localDateStr(weekAgo));
  const [hoursEndDate, setHoursEndDate] = useState(localDateStr(today));
  const [hoursDates, setHoursDates] = useState<string[]>([]);
  const [hoursWorkers, setHoursWorkers] = useState<WorkerHoursRow[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);

  // Load shops
  useEffect(() => {
    api.get('/shops/').then(res => {
      const data = res.data.results ?? res.data;
      setShops(Array.isArray(data) ? data : []);
      if (data.length > 0) setSelectedShop(String(data[0].id));
    }).catch(() => toast.error('Failed to load shops'));
  }, []);

  // Load workers
  useEffect(() => {
    api.get('/auth/users/', { params: { role: 'worker' } }).then(res => {
      const data = res.data.results ?? res.data;
      setShopWorkers(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  // Fetch roster for date + shop
  const fetchRosterForDate = async () => {
    if (!selectedShop) return;
    setLoadingRoster(true);
    try {
      const res = await api.get('/timesheets/roster_workers/', {
        params: { date, shop: selectedShop },
      });
      const workers: RosterWorker[] = res.data.workers || [];
      const existing: Record<string, any> = res.data.existing_entries || {};
      setRosterWorkers(workers.map(w => {
        const ex = existing[String(w.id)];
        return {
          worker_id: w.id, worker_name: w.name, role_in_shift: w.role_in_shift,
          is_present: ex ? ex.is_present : true,
          start_time: ex ? ex.start_time : w.shift_start,
          end_time: ex ? ex.end_time : w.shift_end,
          existing_id: ex?.id, hours_worked: ex?.hours_worked,
        };
      }));
    } catch { setRosterWorkers([]); }
    setLoadingRoster(false);
  };

  // Fetch entries for shop
  const fetchEntries = async () => {
    if (!selectedShop) return;
    setLoadingEntries(true);
    try {
      const res = await api.get('/timesheets/', { params: { shop: selectedShop } });
      const data = res.data.results ?? res.data;
      setEntries(Array.isArray(data) ? data : []);
    } catch { setEntries([]); }
    setLoadingEntries(false);
  };

  useEffect(() => { if (selectedShop) { fetchRosterForDate(); fetchEntries(); } }, [selectedShop, date]);

  const filteredShopWorkers = shopWorkers.filter(w => String(w.shop) === selectedShop);

  const addExtraWorker = (workerId: number) => {
    if (rosterWorkers.some(r => r.worker_id === workerId)) { toast.error('Already in list'); return; }
    const w = shopWorkers.find(sw => sw.id === workerId);
    if (!w) return;
    setRosterWorkers(prev => [...prev, {
      worker_id: w.id, worker_name: `${w.first_name} ${w.last_name}`,
      role_in_shift: 'extra', is_present: true, start_time: '09:00', end_time: '17:00', is_extra: true,
    }]);
    setShowAddWorker(false);
  };

  const updateRow = (idx: number, field: keyof AttendanceRow, value: any) => {
    setRosterWorkers(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const handleBulkSave = async () => {
    setSaving(true);
    try {
      const payload = rosterWorkers.map(r => ({
        worker: r.worker_id, date,
        is_present: r.is_present,
        start_time: r.is_present ? r.start_time : null,
        end_time: r.is_present ? r.end_time : null,
      }));
      await api.post('/timesheets/bulk_create/', { entries: payload, shop: Number(selectedShop) });
      toast.success('Attendance saved');
      fetchRosterForDate(); fetchEntries();
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const startEditEntry = (e: TimesheetEntry) => {
    setEditingEntry(e.id);
    setEditForm({ is_present: e.is_present, start_time: e.start_time || '', end_time: e.end_time || '' });
  };

  const saveEditEntry = async (id: number) => {
    try {
      await api.patch(`/timesheets/${id}/`, {
        is_present: editForm.is_present,
        start_time: editForm.is_present ? editForm.start_time : null,
        end_time: editForm.is_present ? editForm.end_time : null,
      });
      toast.success('Entry updated');
      setEditingEntry(null);
      fetchEntries(); fetchRosterForDate();
    } catch { toast.error('Failed to update'); }
  };

  const deleteEntry = async (id: number) => {
    if (!confirm('Delete this entry?')) return;
    try { await api.delete(`/timesheets/${id}/`); toast.success('Deleted'); fetchEntries(); }
    catch { toast.error('Failed to delete'); }
  };

  // Worker hours
  const fetchWorkerHours = async () => {
    if (!selectedShop) return;
    setLoadingHours(true);
    try {
      const res = await api.get('/timesheets/worker_hours/', {
        params: { start_date: hoursStartDate, end_date: hoursEndDate, shop: selectedShop },
      });
      setHoursDates(res.data.dates || []);
      setHoursWorkers(res.data.workers || []);
    } catch { toast.error('Failed to load hours'); }
    setLoadingHours(false);
  };

  useEffect(() => { if (activeTab === 'hours' && selectedShop) fetchWorkerHours(); }, [activeTab, hoursStartDate, hoursEndDate, selectedShop]);

  const handleDownloadReport = async () => {
    try {
      const res = await api.get('/timesheets/daily_report/', { params: { date, shop: selectedShop }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url;
      const shopName = shops.find(s => String(s.id) === selectedShop)?.name || 'shop';
      link.download = `daily_report_${shopName}_${date}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download report'); }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="Timesheets & Attendance" />

      {/* Shop selector */}
      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Shop</label>
            <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1 min-w-[200px]">
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {(['attendance', 'hours'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition capitalize ${
              activeTab === tab ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab === 'attendance' ? 'Mark Attendance' : 'Worker Hours'}
          </button>
        ))}
      </div>

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <>
          <div className="bg-white border rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
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

            {loadingRoster ? <div className="text-gray-400 text-sm">Loading roster...</div> : (
              <>
                <div className="mb-4">
                  {showAddWorker ? (
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                      <select className="border rounded-lg px-3 py-2 text-sm flex-1" defaultValue=""
                        onChange={(e) => { if (e.target.value) addExtraWorker(Number(e.target.value)); }}>
                        <option value="" disabled>Select a worker...</option>
                        {filteredShopWorkers.filter(sw => !rosterWorkers.some(r => r.worker_id === sw.id)).map(sw => (
                          <option key={sw.id} value={sw.id}>{sw.first_name} {sw.last_name}</option>
                        ))}
                      </select>
                      <button onClick={() => setShowAddWorker(false)} className="text-gray-500 text-sm">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddWorker(true)} className="text-brand-600 text-sm font-medium hover:underline">
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
                                {row.is_extra && <span className="ml-1 text-xs text-orange-500">(extra)</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs capitalize">{row.role_in_shift}</td>
                              <td className="px-4 py-3 text-center">
                                <input type="checkbox" checked={row.is_present}
                                  onChange={(e) => updateRow(idx, 'is_present', e.target.checked)}
                                  className="rounded border-gray-300 text-brand-600" />
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
                    <div className="mt-4">
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

          {/* Recent entries with edit */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Entries</h3>
            {loadingEntries ? <div className="text-gray-400">Loading...</div> : entries.length === 0 ? (
              <EmptyState message="No timesheet entries for this shop" />
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
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.slice(0, 50).map(e => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{e.worker_name}</td>
                        <td className="px-6 py-4">{e.date}</td>
                        {editingEntry === e.id ? (
                          <>
                            <td className="px-6 py-4 text-center">
                              <input type="checkbox" checked={editForm.is_present}
                                onChange={(ev) => setEditForm({...editForm, is_present: ev.target.checked})}
                                className="rounded" />
                            </td>
                            <td className="px-6 py-4">
                              <input type="time" value={editForm.start_time}
                                onChange={(ev) => setEditForm({...editForm, start_time: ev.target.value})}
                                className="border rounded px-2 py-1 text-sm w-28" />
                            </td>
                            <td className="px-6 py-4">
                              <input type="time" value={editForm.end_time}
                                onChange={(ev) => setEditForm({...editForm, end_time: ev.target.value})}
                                className="border rounded px-2 py-1 text-sm w-28" />
                            </td>
                            <td className="px-6 py-4">{e.hours_worked}h</td>
                            <td className="px-6 py-4 flex gap-1">
                              <button onClick={() => saveEditEntry(e.id)} className="text-green-600 text-xs hover:underline">Save</button>
                              <button onClick={() => setEditingEntry(null)} className="text-gray-400 text-xs hover:underline">Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                e.is_present ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {e.is_present ? 'Yes' : 'Absent'}
                              </span>
                            </td>
                            <td className="px-6 py-4">{e.start_time || '—'}</td>
                            <td className="px-6 py-4">{e.end_time || '—'}</td>
                            <td className="px-6 py-4 font-medium">{e.hours_worked}h</td>
                            <td className="px-6 py-4 flex gap-1">
                              <button onClick={() => startEditEntry(e)} className="text-brand-600 text-xs hover:underline">Edit</button>
                              <button onClick={() => deleteEntry(e.id)} className="text-red-600 text-xs hover:underline">Del</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* WORKER HOURS TAB */}
      {activeTab === 'hours' && (
        <div className="bg-white border rounded-xl p-6">
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-600">Start Date</label>
              <input type="date" value={hoursStartDate} onChange={(e) => setHoursStartDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">End Date</label>
              <input type="date" value={hoursEndDate} onChange={(e) => setHoursEndDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
            </div>
            <button onClick={fetchWorkerHours} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700">Refresh</button>
            <div className="flex gap-2">
              {[{ label: 'This Week', days: 6 }, { label: 'Last 14 Days', days: 13 }, { label: 'This Month', days: new Date().getDate() - 1 }].map(p => (
                <button key={p.label} onClick={() => {
                  const end = new Date(); const start = new Date(); start.setDate(end.getDate() - p.days);
                  setHoursStartDate(localDateStr(start)); setHoursEndDate(localDateStr(end));
                }} className="text-xs text-brand-600 border border-brand-200 rounded-full px-3 py-1 hover:bg-brand-50">{p.label}</button>
              ))}
            </div>
          </div>

          {loadingHours ? <div className="text-gray-400 text-sm">Loading...</div> : hoursWorkers.length === 0 ? (
            <EmptyState message="No timesheet data for this date range" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 sticky left-0 bg-gray-50 z-10 min-w-[140px]">Worker</th>
                    {hoursDates.map(d => {
                      const dt = new Date(d + 'T00:00:00');
                      return (
                        <th key={d} className="text-center px-2 py-3 font-medium text-gray-500 min-w-[70px]">
                          <div className="text-[10px] text-gray-400">{dt.toLocaleDateString('en-au', { weekday: 'short' })}</div>
                          <div className="text-xs">{dt.getDate()} {dt.toLocaleDateString('en-au', { month: 'short' })}</div>
                        </th>
                      );
                    })}
                    <th className="text-center px-3 py-3 font-semibold text-gray-700 min-w-[80px] bg-gray-100">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {hoursWorkers.map(worker => (
                    <tr key={worker.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium sticky left-0 bg-white z-10">{worker.name}</td>
                      {hoursDates.map(d => {
                        const entry = worker.dates[d];
                        if (!entry) return <td key={d} className="text-center px-2 py-3 text-gray-300">—</td>;
                        if (!entry.is_present) return (
                          <td key={d} className="text-center px-2 py-3">
                            <span className="text-[10px] font-medium text-red-500 bg-red-50 rounded px-1.5 py-0.5">Absent</span>
                          </td>
                        );
                        return (
                          <td key={d} className="text-center px-2 py-3">
                            <div className="text-sm font-medium text-gray-800">{entry.hours}h</div>
                            <div className="text-[10px] text-gray-400">{entry.start_time}–{entry.end_time}</div>
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-3 font-semibold text-brand-700 bg-gray-50">{worker.total_hours}h</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2">
                    <td className="px-3 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">Daily Total</td>
                    {hoursDates.map(d => {
                      const total = hoursWorkers.reduce((sum, w) => sum + ((w.dates[d]?.is_present ? w.dates[d].hours : 0) || 0), 0);
                      return <td key={d} className="text-center px-2 py-3 font-medium text-gray-600">{total > 0 ? `${Math.round(total * 100) / 100}h` : '—'}</td>;
                    })}
                    <td className="text-center px-3 py-3 font-bold text-brand-800 bg-gray-100">
                      {Math.round(hoursWorkers.reduce((s, w) => s + w.total_hours, 0) * 100) / 100}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
