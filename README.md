# 🍔 RezinsERP — Burger Chain Operations Management System

A role-based web platform for managing daily operations of a multi-branch burger restaurant chain.

## Tech Stack
- **Backend:** Django 5 + Django REST Framework + JWT Auth
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Database:** SQLite (dev) / PostgreSQL (prod)

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data     # Creates demo users & data
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

## Demo Accounts

| Username       | Password          | Role                 |
|----------------|-------------------|----------------------|
| admin          | admin123          | Admin                |
| manager1       | manager123        | Shop Manager (Downtown) |
| manager2       | manager123        | Shop Manager (Mall)  |
| warehouse      | warehouse123      | Warehouse Manager    |
| procurement    | procurement123    | Procurement Officer  |
| worker1        | worker123         | Worker (Downtown)    |
| worker2        | worker123         | Worker (Downtown)    |
| worker3        | worker123         | Worker (Mall)        |
| worker4        | worker123         | Worker (Mall)        |

## API Endpoints

| Prefix                | Module              |
|-----------------------|---------------------|
| `/api/auth/`          | Login, users, me    |
| `/api/shops/`         | Shop CRUD           |
| `/api/inventory/`     | Items & requests    |
| `/api/scheduling/`    | Shifts              |
| `/api/timesheets/`    | Attendance          |
| `/api/sales/`         | Daily closing reports |
| `/api/procurement/`   | Third-party orders  |
| `/api/payroll/`       | Payroll records     |

## Modules

1. **Shop & User Management** — Admin creates shops, users, assigns roles
2. **Inventory Requirements** — Shop → Warehouse stock requests
3. **Shift Scheduling** — Next-day shift planning with worker assignments
4. **Timesheets** — Record actual work hours per worker per day
5. **Daily Closing Reports** — End-of-day sales + expenses (one per shop per day)
6. **Third-Party Procurement** — External vendor purchase flow
7. **Payroll** — Monthly salary calculation from timesheet data

## Access Control

| Role                 | Access Scope             |
|----------------------|--------------------------|
| Admin                | Everything               |
| Shop Manager         | Own shop data only       |
| Warehouse Manager    | Inventory requests only  |
| Procurement Officer  | Third-party orders only  |
| Worker               | Own shifts & salary only |
