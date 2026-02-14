'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Shop } from '@/lib/types';
import { PageHeader, StatusBadge } from '@/components/ui';
import toast from 'react-hot-toast';

interface ReportData {
  shop_name: string;
  date: string;
  timesheets: { worker_name: string; is_present: boolean; start_time: string | null; end_time: string | null; hours_worked: number }[];
  procurement_orders: { item_name: string; quantity: string; status: string; vendor_name: string; estimated_unit_price: number }[];
  warehouse_orders: { id: number; status: string; requested_by_name: string; notes: string; items: { item_name: string; quantity: number; item_unit: string }[] }[];
  closing_report: { cash_sales: number; digital_sales: number; online_orders: number; expenses: number; expense_notes: string; total_sales: number; net_revenue: number; submitted_by_name: string } | null;
}

export default function AdminDailyReportsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    api.get('/shops/').then((res) => {
      const data = res.data.results ?? res.data;
      setShops(Array.isArray(data) ? data : []);
      if (data.length > 0) setSelectedShop(String(data[0].id));
    }).catch(() => toast.error('Failed to load shops'))
      .finally(() => setLoading(false));
  }, []);

  const fetchReportData = async () => {
    if (!selectedShop) return;
    setLoadingData(true);
    try {
      const res = await api.get('/timesheets/daily_report_data/', { params: { date, shop: selectedShop } });
      setReportData(res.data);
    } catch { toast.error('Failed to load report data'); setReportData(null); }
    setLoadingData(false);
  };

  useEffect(() => {
    if (selectedShop) fetchReportData();
  }, [selectedShop, date]);

  const handleDownload = async () => {
    if (!selectedShop) { toast.error('Select a shop'); return; }
    setDownloading(true);
    try {
      const res = await api.get('/timesheets/daily_report/', {
        params: { date, shop: selectedShop }, responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const shopName = shops.find(s => String(s.id) === selectedShop)?.name || 'shop';
      link.download = `daily_report_${shopName}_${date}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch { toast.error('Failed to generate report'); }
    finally { setDownloading(false); }
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    let count = 0;
    for (const shop of shops) {
      try {
        const res = await api.get('/timesheets/daily_report/', {
          params: { date, shop: shop.id }, responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `daily_report_${shop.name}_${date}.pdf`;
        document.body.appendChild(link); link.click(); link.remove();
        window.URL.revokeObjectURL(url);
        count++;
      } catch { /* skip */ }
    }
    toast.success(`Downloaded ${count} report(s)`);
    setDownloading(false);
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <PageHeader title="Daily Shop Reports" />

      <div className="bg-white border rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-sm font-medium text-gray-600">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Shop</label>
            <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1">
              {loading && <option>Loading...</option>}
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDownload} disabled={downloading || !selectedShop}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
              {downloading ? 'Generating...' : 'Download PDF'}
            </button>
            <button onClick={handleDownloadAll} disabled={downloading}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">
              All Shops PDF
            </button>
          </div>
        </div>
      </div>

      {/* Inline Report Data */}
      {loadingData ? <div className="text-gray-400">Loading report...</div> : reportData && (
        <div className="space-y-6">
          {/* Employee Attendance */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Employee Attendance</h3>
            {reportData.timesheets.length === 0 ? (
              <p className="text-sm text-gray-400">No timesheet entries for this date</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Worker</th>
                      <th className="text-center px-4 py-2 font-medium text-gray-500">Present</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Start</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">End</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.timesheets.map((t, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-medium">{t.worker_name}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`inline-block w-3 h-3 rounded-full ${t.is_present ? 'bg-green-500' : 'bg-red-400'}`} />
                        </td>
                        <td className="px-4 py-2 text-gray-500">{t.start_time?.slice(0, 5) || '—'}</td>
                        <td className="px-4 py-2 text-gray-500">{t.end_time?.slice(0, 5) || '—'}</td>
                        <td className="px-4 py-2 text-right">{t.hours_worked}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Warehouse Orders */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Warehouse Orders</h3>
            {reportData.warehouse_orders.length === 0 ? (
              <p className="text-sm text-gray-400">No warehouse orders for this date</p>
            ) : (
              <div className="space-y-3">
                {reportData.warehouse_orders.map((o) => (
                  <div key={o.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusBadge status={o.status} />
                      <span className="text-xs text-gray-400">by {o.requested_by_name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {o.items.map((it, i) => (
                        <span key={i} className="bg-gray-100 text-xs rounded px-2 py-1">
                          {it.item_name}: {it.quantity} {it.item_unit}
                        </span>
                      ))}
                    </div>
                    {o.notes && <p className="text-xs text-gray-400 mt-1">{o.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Procurement Orders */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Procurement Orders</h3>
            {reportData.procurement_orders.length === 0 ? (
              <p className="text-sm text-gray-400">No procurement orders for this date</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Item</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Qty</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500">Price</th>
                      <th className="text-center px-4 py-2 font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Vendor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.procurement_orders.map((p, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-medium">{p.item_name}</td>
                        <td className="px-4 py-2">{p.quantity}</td>
                        <td className="px-4 py-2 text-right">{p.estimated_unit_price ? `A$${p.estimated_unit_price}` : '—'}</td>
                        <td className="px-4 py-2 text-center"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-2 text-gray-500">{p.vendor_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Daily Closing */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Daily Closing Report</h3>
            {!reportData.closing_report ? (
              <p className="text-sm text-gray-400">No closing report submitted for this date</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-400">Cash Sales</span><p className="font-semibold text-lg">A${reportData.closing_report.cash_sales}</p></div>
                <div><span className="text-gray-400">Digital Sales</span><p className="font-semibold text-lg">A${reportData.closing_report.digital_sales}</p></div>
                <div><span className="text-gray-400">Online Orders</span><p className="font-semibold text-lg">A${reportData.closing_report.online_orders}</p></div>
                <div><span className="text-gray-400">Expenses</span><p className="font-semibold text-lg text-red-600">A${reportData.closing_report.expenses}</p></div>
                <div><span className="text-gray-400">Total Sales</span><p className="font-bold text-lg text-green-600">A${reportData.closing_report.total_sales}</p></div>
                <div><span className="text-gray-400">Net Revenue</span><p className="font-bold text-lg text-brand-600">A${reportData.closing_report.net_revenue}</p></div>
                <div><span className="text-gray-400">Submitted by</span><p className="font-medium">{reportData.closing_report.submitted_by_name}</p></div>
                {reportData.closing_report.expense_notes && (
                  <div><span className="text-gray-400">Expense Notes</span><p className="font-medium">{reportData.closing_report.expense_notes}</p></div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
