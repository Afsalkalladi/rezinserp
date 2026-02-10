export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'shop_manager' | 'warehouse_manager' | 'procurement_officer' | 'payroll_manager' | 'worker';
  phone: string;
  tfn_number: string;
  mobile_number: string;
  home_address: string;
  shop: number | null;
  shop_name: string | null;
  is_active: boolean;
}

export interface Shop {
  id: number;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  staff_count: number;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  price: number;
  is_active: boolean;
}

export interface InventoryRequestItem {
  id: number;
  item: number;
  item_name: string;
  item_unit: string;
  quantity: number;
}

export interface InventoryRequest {
  id: number;
  shop: number;
  shop_name: string;
  requested_by: number;
  requested_by_name: string;
  date: string;
  time: string | null;
  status: 'pending' | 'approved' | 'dispatched' | 'rejected';
  notes: string;
  invoice_image: string | null;
  items: InventoryRequestItem[];
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: number;
  worker: number;
  worker_name: string;
  role_in_shift: string;
  start_time: string | null;
  end_time: string | null;
}

export interface Shift {
  id: number;
  shop: number;
  shop_name: string;
  roster: number | null;
  date: string;
  start_time: string;
  end_time: string;
  assignments: ShiftAssignment[];
  created_by: number;
  created_at: string;
}

export interface WeeklyRoster {
  id: number;
  shop: number;
  shop_name: string;
  week_start_date: string;
  notes: string;
  shifts: Shift[];
  created_by: number;
  created_by_name: string;
  created_at: string;
}

export interface TimesheetEntry {
  id: number;
  shop: number;
  shop_name: string;
  worker: number;
  worker_name: string;
  date: string;
  is_present: boolean;
  start_time: string | null;
  end_time: string | null;
  hours_worked: number;
  recorded_by: number;
  created_at: string;
}

export interface DailyClosingReport {
  id: number;
  shop: number;
  shop_name: string;
  date: string;
  cash_sales: number;
  digital_sales: number;
  online_orders: number;
  expenses: number;
  expense_notes: string;
  bill_image: string | null;
  total_sales: number;
  net_revenue: number;
  submitted_by: number;
  submitted_by_name: string;
  created_at: string;
}

export interface ProcurementRequest {
  id: number;
  shop: number;
  shop_name: string;
  requested_by: number;
  requested_by_name: string;
  item_name: string;
  quantity: string;
  estimated_unit_price: number;
  notes: string;
  status: 'pending' | 'ordered' | 'delivered' | 'cancelled';
  vendor_name: string;
  order_date: string | null;
  invoice_image: string | null;
  delivery_date: string | null;
  handled_by: number | null;
  handled_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface Payroll {
  id: number;
  worker: number;
  worker_name: string;
  shop: number;
  shop_name: string;
  week_start_date: string;
  week_end_date: string;
  hourly_rate: number;
  total_hours: number;
  total_days: number;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  status: 'pending' | 'paid';
  notes: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
