'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { WeeklyRoster, User } from '@/lib/types';
import { PageHeader, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

// ── Shift template definitions ──
const SHIFT_TEMPLATES = [
  { type: 'opening' as const, label: 'Opening', start: '08:00', end: '13:00', color: 'bg-amber-100 border-amber-300 text-amber-800' },
  { type: 'afternoon' as const, label: 'Afternoon', start: '15:00', end: '20:00', color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { type: 'custom' as const, label: 'Custom', start: '09:00', end: '17:00', color: 'bg-blue-100 border-blue-300 text-blue-800' },
];

const SHIFT_COLORS: Record<string, string> = {
  opening: 'bg-amber-100 border-amber-300 text-amber-800',
  afternoon: 'bg-purple-100 border-purple-300 text-purple-800',
  custom: 'bg-blue-100 border-blue-300 text-blue-800',
};

interface CellShift {
  shift_type: 'opening' | 'afternoon' | 'custom';
  start_time: string;
  end_time: string;
}

type GridData = Record<string, Record<string, CellShift | null>>; // workerId -> date -> shift

function getMonday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return localDateStr(dt);
}

function localDateStr(dt: Date): string {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function getWeekDates(startStr: string): string[] {
  const [y, m, d] = startStr.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    return localDateStr(dt);
  });
}

function getDayLabel(dateStr: string): { day: string; date: string } {
  const dt = new Date(dateStr + 'T00:00:00');
  return {
    day: dt.toLocaleDateString('en-au', { weekday: 'short' }).toUpperCase(),
    date: `${dt.getDate()}/${dt.getMonth() + 1}`,
  };
}

export default function ManagerRosterPage() {
  const [rosters, setRosters] = useState<WeeklyRoster[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>('draft');

  // Week navigation
  const today = new Date();
  const mondayStr = getMonday(localDateStr(today));
  const [weekStart, setWeekStart] = useState(mondayStr);
  const [notes, setNotes] = useState('');
  const weekDates = getWeekDates(weekStart);

  // Grid: workerId -> date -> shift
  const [grid, setGrid] = useState<GridData>({});

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);

  // Inline edit
  const [editCell, setEditCell] = useState<{ workerId: string; date: string } | null>(null);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Initialize empty grid when workers change or editor opens
  useEffect(() => {
    if (!showEditor) return;
    const newGrid: GridData = {};
    workers.forEach((w) => {
      newGrid[String(w.id)] = {};
      weekDates.forEach((d) => {
        newGrid[String(w.id)][d] = null;
      });
    });
    setGrid(newGrid);
  }, [workers, weekStart, showEditor]);

  const navigateWeek = (offset: number) => {
    const [y, m, d] = weekStart.split('-').map(Number);
    const dt = new Date(y, m - 1, d + offset * 7);
    setWeekStart(localDateStr(dt));
  };

  const startNewRoster = () => {
    setEditingId(null);
    setEditingStatus('draft');
    setNotes('');
    setShowEditor(true);
  };

  const startEdit = (roster: WeeklyRoster) => {
    setEditingId(roster.id);
    setEditingStatus(roster.status);
    setWeekStart(roster.week_start_date);
    setNotes(roster.notes || '');
    setShowEditor(true);

    // Populate grid from roster data
    setTimeout(() => {
      const dates = getWeekDates(roster.week_start_date);
      const newGrid: GridData = {};
      workers.forEach((w) => {
        newGrid[String(w.id)] = {};
        dates.forEach((d) => {
          newGrid[String(w.id)][d] = null;
        });
      });

      roster.shifts.forEach((shift) => {
        shift.assignments.forEach((a) => {
          const wId = String(a.worker);
          if (!newGrid[wId]) {
            newGrid[wId] = {};
            dates.forEach((d) => { newGrid[wId][d] = null; });
          }
          newGrid[wId][shift.date] = {
            shift_type: shift.shift_type || 'custom',
            start_time: (a.start_time || shift.start_time || '09:00').slice(0, 5),
            end_time: (a.end_time || shift.end_time || '17:00').slice(0, 5),
          };
        });
      });
      setGrid(newGrid);
    }, 100);
  };

  // ── Drag & Drop handlers ──
  const handleDragStart = (e: React.DragEvent, shiftType: string) => {
    setDragging(shiftType);
    e.dataTransfer.setData('text/plain', shiftType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, workerId: string, date: string) => {
    e.preventDefault();
    const shiftType = e.dataTransfer.getData('text/plain');
    const template = SHIFT_TEMPLATES.find((t) => t.type === shiftType);
    if (!template) return;

    setGrid((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [date]: {
          shift_type: template.type,
          start_time: template.start,
          end_time: template.end,
        },
      },
    }));
    setDragging(null);
  };

  const removeShift = (workerId: string, date: string) => {
    setGrid((prev) => ({
      ...prev,
      [workerId]: { ...prev[workerId], [date]: null },
    }));
    setEditCell(null);
  };

  const updateCellTime = (workerId: string, date: string, field: 'start_time' | 'end_time', value: string) => {
    setGrid((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [date]: prev[workerId]?.[date] ? { ...prev[workerId][date]!, [field]: value } : null,
      },
    }));
  };

  // Build payload from grid
  const buildPayload = () => {
    const shiftsMap: Record<string, { date: string; shift_type: string; start_time: string; end_time: string; assignments: any[] }> = {};

    Object.entries(grid).forEach(([workerId, dates]) => {
      Object.entries(dates).forEach(([date, cell]) => {
        if (!cell) return;
        const key = `${date}_${cell.shift_type}`;
        if (!shiftsMap[key]) {
          shiftsMap[key] = {
            date,
            shift_type: cell.shift_type,
            start_time: cell.start_time,
            end_time: cell.end_time,
            assignments: [],
          };
        }
        shiftsMap[key].assignments.push({
          worker: Number(workerId),
          role_in_shift: 'general',
          start_time: cell.start_time,
          end_time: cell.end_time,
        });
      });
    });

    return Object.values(shiftsMap);
  };

  const handleSave = async () => {
    const shiftsPayload = buildPayload();
    if (shiftsPayload.length === 0) {
      toast.error('Add at least one shift before saving');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/scheduling/rosters/${editingId}/`, {
          notes,
          shifts: shiftsPayload,
        });
        toast.success('Roster updated');
      } else {
        await api.post('/scheduling/rosters/', {
          week_start_date: weekStart,
          notes,
          shifts: shiftsPayload,
        });
        toast.success('Roster created');
      }
      setShowEditor(false);
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data;
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Failed');
    }
  };

  const handlePublish = async (rosterId: number) => {
    try {
      await api.post(`/scheduling/rosters/${rosterId}/publish/`);
      toast.success('Roster published! Attendance entries auto-created.');
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to publish');
    }
  };

  const handleUnpublish = async (rosterId: number) => {
    try {
      await api.post(`/scheduling/rosters/${rosterId}/unpublish/`);
      toast.success('Roster unpublished');
      fetchData();
    } catch {
      toast.error('Failed to unpublish');
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

  // ── Coverage summary ──
  const getCoverage = (date: string) => {
    let opening = 0, afternoon = 0, custom = 0;
    Object.values(grid).forEach((dates) => {
      const cell = dates[date];
      if (cell?.shift_type === 'opening') opening++;
      else if (cell?.shift_type === 'afternoon') afternoon++;
      else if (cell?.shift_type === 'custom') custom++;
    });
    return { opening, afternoon, custom, total: opening + afternoon + custom };
  };

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader
        title="Weekly Roster"
        action={
          <button
            onClick={() => { if (showEditor) { setShowEditor(false); setEditingId(null); } else startNewRoster(); }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            {showEditor ? 'Cancel' : '+ Create Roster'}
          </button>
        }
      />

      {showEditor && (
        <div className="bg-white border rounded-xl p-6 mb-6">
          {/* Header: week nav + notes */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-gray-100 rounded-lg" disabled={!!editingId}>&lt;</button>
              <div className="text-center">
                <div className="text-sm font-semibold">
                  {new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('en-au', { month: 'long', year: 'numeric' })}
                </div>
                <div className="text-xs text-gray-500">
                  {weekDates[0]} — {weekDates[6]}
                </div>
              </div>
              <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-gray-100 rounded-lg" disabled={!!editingId}>&gt;</button>
            </div>
            <input
              placeholder="Notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
            />
            {editingStatus === 'published' && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">PUBLISHED</span>
            )}
          </div>

          {/* Draggable shift templates */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium text-gray-500">Drag to assign:</span>
            {SHIFT_TEMPLATES.map((tpl) => (
              <div
                key={tpl.type}
                draggable
                onDragStart={(e) => handleDragStart(e, tpl.type)}
                className={`px-4 py-2 rounded-lg border-2 border-dashed cursor-grab text-xs font-semibold ${tpl.color} hover:shadow-md transition select-none`}
              >
                {tpl.label}
                <div className="text-[10px] font-normal opacity-70">{tpl.start} – {tpl.end}</div>
              </div>
            ))}
          </div>

          {/* Weekly grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-3 font-medium text-gray-500 min-w-[160px] sticky left-0 bg-gray-50 z-10">
                    Employee
                  </th>
                  {weekDates.map((d) => {
                    const label = getDayLabel(d);
                    const coverage = getCoverage(d);
                    return (
                      <th key={d} className="text-center px-2 py-2 font-medium text-gray-500 min-w-[130px]">
                        <div className="text-xs">{label.day}</div>
                        <div className="text-[10px] text-gray-400">{label.date}</div>
                        {coverage.total > 0 && (
                          <div className="text-[9px] text-gray-400 mt-1">
                            {coverage.total} staff
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-3 font-medium sticky left-0 bg-white z-10 border-r">
                      <div className="text-sm">{w.first_name} {w.last_name}</div>
                    </td>
                    {weekDates.map((d) => {
                      const cell = grid[String(w.id)]?.[d];
                      const isEditing = editCell?.workerId === String(w.id) && editCell?.date === d;

                      return (
                        <td
                          key={d}
                          className={`px-1 py-1 text-center border ${dragging ? 'bg-gray-50 border-dashed border-gray-300' : ''}`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, String(w.id), d)}
                        >
                          {cell ? (
                            <div
                              className={`rounded-lg p-2 border ${SHIFT_COLORS[cell.shift_type] || 'bg-gray-100'} cursor-pointer relative group`}
                              onClick={() => setEditCell({ workerId: String(w.id), date: d })}
                            >
                              <div className="text-[10px] font-bold uppercase">
                                {cell.shift_type === 'opening' ? 'Opening' : cell.shift_type === 'afternoon' ? 'Afternoon' : 'Custom'}
                              </div>
                              {isEditing ? (
                                <div className="mt-1 space-y-1" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="time"
                                    value={cell.start_time}
                                    onChange={(e) => updateCellTime(String(w.id), d, 'start_time', e.target.value)}
                                    className="w-full text-[10px] border rounded px-1 py-0.5"
                                  />
                                  <input
                                    type="time"
                                    value={cell.end_time}
                                    onChange={(e) => updateCellTime(String(w.id), d, 'end_time', e.target.value)}
                                    className="w-full text-[10px] border rounded px-1 py-0.5"
                                  />
                                  <button
                                    onClick={() => removeShift(String(w.id), d)}
                                    className="text-red-500 text-[9px] hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[10px] mt-0.5 opacity-80">
                                  {cell.start_time} – {cell.end_time}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                              <span className="text-[10px] text-gray-300">Drop here</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {workers.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No workers found for this shop. Add workers first.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700">
              {editingId ? 'Update Roster' : 'Save as Draft'}
            </button>
            {editingId && editingStatus === 'draft' && (
              <button
                onClick={() => handlePublish(editingId)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-2"
              >
                Publish Schedule
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Roster list ── */}
      {loading ? <div className="text-gray-400">Loading...</div> : rosters.length === 0 && !showEditor ? (
        <EmptyState message="No weekly rosters yet. Create one to start scheduling." />
      ) : !showEditor && (
        <div className="space-y-6">
          {rosters.map((roster) => (
            <div key={roster.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-semibold">Week of {roster.week_start_date}</h3>
                    <p className="text-xs text-gray-400">Created by {roster.created_by_name}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    roster.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {roster.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {roster.notes && <p className="text-sm text-gray-500 italic">{roster.notes}</p>}
                  {roster.status === 'draft' && (
                    <>
                      <button onClick={() => startEdit(roster)} className="text-brand-600 text-xs font-medium hover:underline">Edit</button>
                      <button onClick={() => handlePublish(roster.id)} className="text-green-600 text-xs font-medium hover:underline">Publish</button>
                    </>
                  )}
                  {roster.status === 'published' && (
                    <button onClick={() => handleUnpublish(roster.id)} className="text-orange-600 text-xs font-medium hover:underline">Unpublish</button>
                  )}
                  <button onClick={() => handleDelete(roster.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {getWeekDates(roster.week_start_date).map((date) => {
                  const dayShifts = roster.shifts.filter((s) => s.date === date);
                  const label = getDayLabel(date);
                  return (
                    <div key={date} className="border rounded-lg p-3 text-center min-h-[80px]">
                      <div className="text-xs font-medium text-gray-500">{label.day}</div>
                      <div className="text-[10px] text-gray-400">{label.date}</div>
                      <div className="mt-2 space-y-1">
                        {dayShifts.flatMap((shift) =>
                          shift.assignments.map((a) => (
                            <div key={`${shift.id}-${a.id}`} className={`text-[10px] rounded px-1 py-1 ${SHIFT_COLORS[shift.shift_type || 'custom'] || 'bg-gray-100'}`}>
                              <span className="font-medium">{a.worker_name}</span>
                              <div className="opacity-70">
                                {(a.start_time || shift.start_time)?.slice(0, 5)} – {(a.end_time || shift.end_time)?.slice(0, 5)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
