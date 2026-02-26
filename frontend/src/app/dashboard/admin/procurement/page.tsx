'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ProcurementOrder, Supplier, Shop } from '@/lib/types';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminProcurementPage() {
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterShop, setFilterShop] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Supplier management
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '' });
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const params: any = {};
      if (filterShop !== 'all') params.shop = filterShop;
      if (filterDate) params.date = filterDate;
      if (filterStatus !== 'all') params.status = filterStatus;
      const [ordersRes, suppliersRes, shopRes] = await Promise.all([
        api.get('/procurement/orders/', { params }),
        api.get('/procurement/suppliers/'),
        api.get('/shops/'),
      ]);
      setOrders(ordersRes.data.results || ordersRes.data);
      setSuppliers(suppliersRes.data.results || suppliersRes.data);
      setShops((shopRes.data.results ?? shopRes.data) || []);
    } catch {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterShop, filterDate, filterStatus]);

  const handleStatusAction = async (orderId: number, action: string) => {
    try {
      await api.post(`/procurement/orders/${orderId}/${action}/`);
      toast.success(`Order ${action.replace('mark_', '')}`);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this order?')) return;
    try {
      await api.delete(`/procurement/orders/${id}/`);
      toast.success('Order deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  // Supplier CRUD
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplierId) {
        await api.patch(`/procurement/suppliers/${editingSupplierId}/`, supplierForm);
        toast.success('Supplier updated');
      } else {
        await api.post('/procurement/suppliers/', supplierForm);
        toast.success('Supplier created');
      }
      setShowSupplierForm(false);
      setEditingSupplierId(null);
      setSupplierForm({ name: '', phone: '', email: '' });
      fetchData();
    } catch {
      toast.error('Failed to save supplier');
    }
  };

  const editSupplier = (s: Supplier) => {
    setEditingSupplierId(s.id);
    setSupplierForm({ name: s.name, phone: s.phone || '', email: s.email || '' });
    setShowSupplierForm(true);
  };

  const toggleSupplierActive = async (s: Supplier) => {
    try {
      await api.patch(`/procurement/suppliers/${s.id}/`, { is_active: !s.is_active });
      toast.success(s.is_active ? 'Supplier deactivated' : 'Supplier activated');
      fetchData();
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="All Procurement Orders" />

      {/* ── Suppliers Section ── */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700">Suppliers</h3>
          <button
            onClick={() => {
              setShowSupplierForm(!showSupplierForm);
              setEditingSupplierId(null);
              setSupplierForm({ name: '', phone: '', email: '' });
            }}
            className="text-brand-600 text-xs font-medium hover:underline"
          >
            {showSupplierForm ? 'Cancel' : '+ Add Supplier'}
          </button>
        </div>

        {showSupplierForm && (
          <form onSubmit={handleSupplierSubmit} className="bg-gray-50 p-4 rounded-lg mb-3 flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                className="border rounded px-3 py-1.5 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Phone</label>
              <input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                className="border rounded px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                className="border rounded px-3 py-1.5 text-sm" />
            </div>
            <button type="submit" className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm">
              {editingSupplierId ? 'Update' : 'Add'}
            </button>
          </form>
        )}

        <div className="flex gap-2 flex-wrap">
          {suppliers.map((s) => (
            <div key={s.id} className={`border rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${!s.is_active ? 'opacity-50' : ''}`}>
              <span className="font-medium">{s.name}</span>
              {s.phone && <span className="text-gray-400 text-xs">{s.phone}</span>}
              <button onClick={() => editSupplier(s)} className="text-brand-600 text-xs hover:underline">Edit</button>
              <button onClick={() => toggleSupplierActive(s)} className="text-xs hover:underline text-gray-500">
                {s.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Shop</label>
          <select value={filterShop} onChange={(e) => setFilterShop(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-w-[180px]">
            <option value="all">All Shops</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-w-[140px]">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="ordered">Ordered</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {(filterShop !== 'all' || filterDate || filterStatus !== 'all') && (
          <button onClick={() => { setFilterShop('all'); setFilterDate(''); setFilterStatus('all'); }}
            className="text-xs text-red-500 hover:underline mt-5">Clear Filters</button>
        )}
      </div>

      {/* ── Orders List ── */}
      {loading ? <div className="text-gray-400">Loading...</div> : orders.length === 0 ? (
        <EmptyState message="No procurement orders yet" />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">Order #{order.id}</span>
                  <StatusBadge status={order.status} />
                  <span className="text-xs text-gray-400">
                    {order.shop_name} — {order.requested_by_name} — {order.date}
                  </span>
                </div>
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button onClick={() => handleStatusAction(order.id, 'mark_ordered')}
                      className="text-blue-600 text-xs font-medium hover:underline">Mark Ordered</button>
                  )}
                  {order.status === 'ordered' && (
                    <button onClick={() => handleStatusAction(order.id, 'mark_delivered')}
                      className="text-green-600 text-xs font-medium hover:underline">Mark Delivered</button>
                  )}
                  {(order.status === 'pending' || order.status === 'ordered') && (
                    <button onClick={() => handleStatusAction(order.id, 'cancel')}
                      className="text-orange-600 text-xs font-medium hover:underline">Cancel</button>
                  )}
                  <button onClick={() => handleDelete(order.id)}
                    className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-2 text-sm">
                <span className="text-gray-500">Supplier: <strong>{order.supplier_name}</strong></span>
                {order.total && <span className="text-brand-600 font-medium">Total: A${Number(order.total).toFixed(2)}</span>}
              </div>

              {order.notes && <p className="text-sm text-gray-400 mb-2">{order.notes}</p>}

              <div className="text-sm text-gray-600 flex flex-wrap gap-1">
                {order.items.map((item) => (
                  <span key={item.id} className="inline-block bg-gray-100 rounded px-2 py-1">
                    {item.item_name}: {item.quantity} {item.item_unit}
                    {item.price > 0 && <span className="text-gray-400 ml-1">(A${Number(item.price).toFixed(2)})</span>}
                  </span>
                ))}
              </div>

              {order.invoice_image && (
                <a href={order.invoice_image} target="_blank" className="text-brand-600 text-xs mt-2 inline-block hover:underline">
                  View Invoice →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}
