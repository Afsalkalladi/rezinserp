# RezinsERP Deployment Guide

## Architecture
- **Frontend**: Next.js on **Vercel**
- **Backend**: Django REST on **Render** (free tier for testing)
- **Database**: PostgreSQL on Render
- **Media/Images**: Cloudinary

---

## 1. Backend — Deploy to Render

### Option A: Blueprint (Recommended)
1. Push your code to a GitHub repo.
2. Go to [Render Dashboard](https://dashboard.render.com/).
3. Click **New → Blueprint** and connect your repo.
4. Render will read `render.yaml` from the repo root and create:
   - A **Web Service** (`rezinserp-backend`)
   - A **PostgreSQL Database** (`rezinserp-db`)
5. After creation, go to the web service **Environment** tab and set these values manually:
   - `CORS_ALLOWED_ORIGINS` → `https://YOUR-APP.vercel.app` (your Vercel URL)
   - `CLOUDINARY_CLOUD_NAME` → your Cloudinary cloud name
   - `CLOUDINARY_API_KEY` → your Cloudinary API key
   - `CLOUDINARY_API_SECRET` → your Cloudinary API secret

### Option B: Manual Setup
1. Create a **PostgreSQL** database on Render (free tier).
2. Create a **Web Service** → connect your repo → set root directory to `backend`.
3. **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
4. **Start Command**: `gunicorn config.wsgi --bind 0.0.0.0:$PORT`
5. Set environment variables:
   | Variable | Value |
   |----------|-------|
   | `SECRET_KEY` | Generate a random string |
   | `DEBUG` | `False` |
   | `DATABASE_URL` | Copy Internal Database URL from your Render PostgreSQL |
   | `ALLOWED_HOSTS` | `.onrender.com` |
   | `CORS_ALLOWED_ORIGINS` | `https://YOUR-APP.vercel.app` |
   | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | Your Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

### After deploying, seed initial data:
```bash
# From Render Shell (or local with DATABASE_URL pointing to Render DB)
python manage.py createsuperuser
python manage.py seed_data  # if you have the seed command
```

---

## 2. Frontend — Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New → Project** and import your GitHub repo.
3. Set **Root Directory** to `frontend`.
4. Set **Framework Preset** to `Next.js`.
5. Add **Environment Variable**:
   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://rezinserp-backend.onrender.com/api` |
   
   (Replace with your actual Render service URL.)
6. Click **Deploy**.

---

## 3. Post-Deployment Checklist

- [ ] Backend health: visit `https://YOUR-BACKEND.onrender.com/api/` — should return API root
- [ ] Login works: frontend → login page → enter credentials
- [ ] CORS: no browser console errors about blocked requests
- [ ] Cloudinary: upload a bill image via manager → check it appears
- [ ] Database: verify migrations ran (check Render deploy logs)

---

## 4. Auto-Save Daily Reports (Cron)

The management command `save_daily_reports` generates PDFs and uploads to Cloudinary.

### On Render (Cron Job):
1. Go to Render → **New → Cron Job**.
2. Connect your repo, root directory: `backend`.
3. **Command**: `python manage.py save_daily_reports`
4. **Schedule**: `0 22 * * *` (runs daily at 10 PM UTC — adjust for your timezone).
5. Set the same environment variables as the web service.

### Local testing:
```bash
cd backend
python manage.py save_daily_reports              # yesterday's report
python manage.py save_daily_reports --date 2025-01-15  # specific date
```

---

## 5. Switching to Heroku Later

The `Procfile` and `runtime.txt` are already configured for Heroku.

```bash
heroku create rezinserp-backend
heroku addons:create heroku-postgresql:essential-0
heroku config:set SECRET_KEY=... DEBUG=False ALLOWED_HOSTS=.herokuapp.com
heroku config:set CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
heroku config:set CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
git subtree push --prefix backend heroku main
```

Update `NEXT_PUBLIC_API_URL` in Vercel to the Heroku URL.
