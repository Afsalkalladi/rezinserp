'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { InventoryRequest, InventoryItem } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

interface ItemRow {
  item_id: number;
  name: string;
  unit: string;
  price: number;
  quantity: string;
}

export default function ManagerInventoryPage() {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [notes, setNotes] = useState('');
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRequests = useCallback(async () => {
    const params: any = {};
    if (filterDate) params.date = filterDate;
    try {
      const res = await api.get('/inventory/requests/', { params });
      setRequests(res.data.results || res.data);
    } catch {
      toast.error('Failed to load requests');
    }
    setLoading(false);
  }, [filterDate]);

  const loadItems = useCallback(async () => {
    try {
      const res = await api.get('/inventory/items/', { params: { category: 'warehouse', is_active: 'true' } });
      const items: InventoryItem[] = res.data.results || res.data;
      setItemRows(
        items.map((it) => ({
          item_id: it.id,
          name: it.name,
          unit: it.unit,
          price: Number(it.price),
          quantity: '',
        }))
      );
    } catch {
      toast.error('Failed to load items');
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    if (showForm && itemRows.length === 0) loadItems();
  }, [showForm, loadItems]);

  const updateQty = (idx: number, val: string) => {
    setItemRows((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r)));
  };

  const filledCount = itemRows.filter((r) => Number(r.quantity) > 0).length;
  const estimatedTotal = itemRows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * r.price, 0);

  const filteredRows = searchTerm
    ? itemRows.filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : itemRows;

  const handleSubmit = async () => {
    const filled = itemRows.filter((r) => Number(r.quantity) > 0);
    if (filled.length === 0) {
      toast.error('Enter quantity for at least one item');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inventory/requests/', {
        date,
        time,
        notes,
        items: filled.map((r) => ({ item: r.item_id, quantity: Number(r.quantity) })),
      });
      toast.success(`Request submitted — ${filled.length} items`);
      setShowForm(false);
      setItemRows((prev) => prev.map((r) => ({ ...r, quantity: '' })));
      setNotes('');
      fetchRequests();
    } catch {
      toast.error('Failed to submit request');
    }
    setSubmitting(false);
  };

  return (
    <ProtectedRoute allowedRoles={['shop_manager']}>
      <PageHeader
        title="Warehouse Orders"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            {showForm ? 'Cancel' : '+ New Order'}
          </button>
        }
      />

      {showForm && (
        <div className="bg-white border rounded-xl p-6 mb-6">
          {/* Header controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Optional notes" />
            </div>
          </div>

          {/* Summary bar */}
          <div className="flex justify-between items-center mb-3 bg-gray-50 rounded-lg px-4 py-2 text-sm">
            <div className="flex gap-4">
              <span className="text-gray-500">Total items: <strong>{itemRows.length}</strong></span>
              <span className="text-brand-600">Filled: <strong>{filledCount}</strong></span>
            </div>
            <div className="font-semibold text-brand-700">
              Est. Total: A${estimatedTotal.toFixed(2)}
            </div>
          </div>

          {/* Search */}
          <div className="mb-3">
            <input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full md:w-72"
            />
          </div>

          {/* Items table */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">#</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Item</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Unit</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Price (A$)</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-500 w-32">Quantity</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRows.map((row, idx) => {
                  const realIdx = itemRows.findIndex((r) => r.item_id === row.item_id);
                  const qty = Number(row.quantity) || 0;
                  const isFilled = qty > 0;
                  return (
                    <tr key={row.item_id} className={isFilled ? 'bg-brand-50' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2 text-gray-500">{row.unit}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{row.price.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => updateQty(realIdx, e.target.value)}
                          placeholder="0"
                          className={`border rounded px-2 py-1 w-24 text-center text-sm ${isFilled ? 'border-brand-500 bg-white font-semibold' : ''}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {isFilled ? `$${(qty * row.price).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Submit */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmit}
              disabled={submitting || filledCount === 0}
              className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : `Submit Order (${filledCount} items)`}
            </button>
          </div>
        </div>
      )}

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

      {loading ? <div className="text-gray-400">Loading...</div> : requests.length === 0 && !showForm ? (
        <EmptyState message="No warehouse orders yet. Click '+ New Order' to create one." />
      ) : !showForm && (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-medium">Order #{req.id}</span>
                  <span className="text-gray-400 ml-3 text-sm">{req.date}</span>
                  {req.time && <span className="text-gray-400 ml-2 text-sm">{req.time}</span>}
                </div>
                <StatusBadge status={req.status} />
              </div>
              {req.notes && <p className="text-sm text-gray-500 mb-2">{req.notes}</p>}
              <div className="text-sm text-gray-600 flex flex-wrap gap-1">
                {req.items.map((item) => (
                  <span key={item.id} className="inline-block bg-gray-100 rounded px-2 py-1">
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
