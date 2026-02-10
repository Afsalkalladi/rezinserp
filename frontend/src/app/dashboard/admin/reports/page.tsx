'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Shop } from '@/lib/types';
import { PageHeader } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminDailyReportsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get('/shops/').then((res) => {
      const data = res.data.results ?? res.data;
      setShops(Array.isArray(data) ? data : []);
      if (data.length > 0) setSelectedShop(String(data[0].id));
    }).catch(() => toast.error('Failed to load shops'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async () => {
    if (!selectedShop) { toast.error('Select a shop'); return; }
    setDownloading(true);
    try {
      const res = await api.get('/timesheets/daily_report/', {
        params: { date, shop: selectedShop },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const shopName = shops.find(s => String(s.id) === selectedShop)?.name || 'shop';
      link.download = `daily_report_${shopName}_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    let count = 0;
    for (const shop of shops) {
      try {
        const res = await api.get('/timesheets/daily_report/', {
          params: { date, shop: shop.id },
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `daily_report_${shop.name}_${date}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        count++;
      } catch {
        // Skip shops with no data
      }
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
            <input type="date" value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Shop</label>
            <select value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1">
              {loading && <option>Loading...</option>}
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDownload} disabled={downloading || !selectedShop}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
              {downloading ? 'Generating...' : 'Download Report'}
            </button>
            <button onClick={handleDownloadAll} disabled={downloading}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">
              All Shops
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Reports are generated as PDF documents showing each employee&apos;s attendance, start/end times, and total hours/minutes for the selected date.
        </p>
      </div>
    </ProtectedRoute>
  );
}
