'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { InventoryRequest, InventoryItem } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ManagerInventoryPage() {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<{ item: string; quantity: string }[]>([
    { item: '', quantity: '' },
  ]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('');

  const fetchData = async () => {
    const params: any = {};
    if (filterDate) params.date = filterDate;
    const [reqRes, itemsRes] = await Promise.all([
      api.get('/inventory/requests/', { params }),
      api.get('/inventory/items/'),
    ]);
    setRequests(reqRes.data.results || reqRes.data);
    setItems(itemsRes.data.results || itemsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterDate]);

  const addLine = () => setLineItems([...lineItems, { item: '', quantity: '' }]);
  const removeLine = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, val: string) => {
    const updated = [...lineItems];
    (updated[idx] as any)[field] = val;
    setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory/requests/', {
        date,
        time,
        notes,
        items: lineItems
          .filter((l) => l.item && l.quantity)
          .map((l) => ({ item: Number(l.item), quantity: Number(l.quantity) })),
      });
      toast.success('Request submitted');
      setShowForm(false);
      setLineItems([{ item: '', quantity: '' }]);
      setNotes('');
      fetchData();
    } catch {
      toast.error('Failed to submit request');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader
        title="Inventory Requests"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            {showForm ? 'Cancel' : '+ New Request'}
          </button>
        }
      />

      {/* Date Filter */}
      <div className="flex gap-3 mb-4 items-center">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Filter by Date</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        {filterDate && (
          <button onClick={() => setFilterDate('')}
            className="text-xs text-red-500 hover:underline mt-5">Clear</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Optional notes" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Items</label>
            {lineItems.map((line, idx) => (
              <div key={idx} className="flex gap-2">
                <select value={line.item} onChange={(e) => updateLine(idx, 'item', e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" required>
                  <option value="">Select item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>
                  ))}
                </select>
                <input type="number" step="0.01" placeholder="Qty" value={line.quantity}
                  onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-28" required />
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)}
                    className="text-red-500 text-sm px-2">✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addLine}
              className="text-brand-600 text-sm hover:underline">+ Add item</button>
          </div>
          <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm">
            Submit Request
          </button>
        </form>
      )}

      {loading ? <div className="text-gray-400">Loading...</div> : requests.length === 0 ? (
        <EmptyState message="No inventory requests yet" />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-medium">Request #{req.id}</span>
                  <span className="text-gray-400 ml-3 text-sm">{req.date}</span>
                  {req.time && <span className="text-gray-400 ml-2 text-sm">{req.time}</span>}
                </div>
                <StatusBadge status={req.status} />
              </div>
              {req.notes && <p className="text-sm text-gray-500 mb-2">{req.notes}</p>}
              <div className="text-sm text-gray-600">
                {req.items.map((item) => (
                  <span key={item.id} className="inline-block bg-gray-100 rounded px-2 py-1 mr-2 mb-1">
                    {item.item_name}: {item.quantity} {item.item_unit}
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
