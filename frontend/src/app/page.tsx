'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Redirect to role-specific dashboard
    const dashboardMap: Record<string, string> = {
      admin: '/dashboard/admin',
      shop_manager: '/dashboard/manager',
      warehouse_manager: '/dashboard/warehouse',
      procurement_officer: '/dashboard/procurement',
      payroll_manager: '/dashboard/payrollmgr',
      worker: '/dashboard/worker',
    };
    router.replace(dashboardMap[user.role] || '/login');
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-xl text-gray-500">Loading...</div>
    </div>
  );
}
