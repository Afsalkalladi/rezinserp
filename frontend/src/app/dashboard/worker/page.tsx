'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function WorkerDashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['worker']}>
      <PageHeader title={`Welcome, ${user?.first_name || 'Worker'}`} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="/dashboard/worker/shifts"
          className="bg-white border rounded-xl p-8 hover:border-brand-400 transition text-center">
          <div className="text-4xl mb-3">📅</div>
          <h2 className="text-lg font-semibold">My Shifts</h2>
          <p className="text-sm text-gray-500 mt-1">View your assigned shifts</p>
        </a>
        <a href="/dashboard/worker/attendance"
          className="bg-white border rounded-xl p-8 hover:border-brand-400 transition text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-semibold">My Attendance</h2>
          <p className="text-sm text-gray-500 mt-1">View your attendance records</p>
        </a>
        <a href="/dashboard/worker/salary"
          className="bg-white border rounded-xl p-8 hover:border-brand-400 transition text-center">
          <div className="text-4xl mb-3">💰</div>
          <h2 className="text-lg font-semibold">My Salary</h2>
          <p className="text-sm text-gray-500 mt-1">View your weekly salary records</p>
        </a>
      </div>
    </ProtectedRoute>
  );
}
