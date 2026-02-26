# Rezins ERP — Heroku Deployment Guide

> **Stack**: Django 5 backend (API + Admin) · Next.js 14 frontend · PostgreSQL

---

## Architecture

| Component | Hosting | Plan |
|-----------|---------|------|
| Backend (Django API + Admin panel) | **Heroku** | Basic / Eco dynos |
| Database (PostgreSQL) | **Supabase** | Free / Pro |
| Frontend (Next.js) | **Vercel** (unchanged) | Free / Pro |
| Media/Images | **Cloudinary** | Free tier |

Since the backend lives in the `backend/` subdirectory of a monorepo, we use the
**subdir buildpack** to tell Heroku where to find the code.

---

## Prerequisites

1. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
2. Logged in: `heroku login`
3. Git repo committed & pushed

---

## Step-by-Step Deployment

### 1. Create the Heroku App

```bash
heroku create rezinserp-backend
```

### 2. Set the Subdirectory Buildpack

Because the Django project is inside `backend/`, we need the **subdir buildpack**
to run *before* the Python buildpack:

```bash
heroku buildpacks:clear -a rezinserp-backend

# First: subdir buildpack (tells Heroku to cd into backend/)
heroku buildpacks:add -i 1 https://github.com/timanovsky/subdir-heroku-buildpack -a rezinserp-backend

# Second: official Python buildpack
heroku buildpacks:add -i 2 heroku/python -a rezinserp-backend
```

### 3. Set the Project Subdirectory

```bash
heroku config:set PROJECT_PATH=backend -a rezinserp-backend
```






```bash
heroku config:set \
  ALLOWED_HOSTS=".herokuapp.com,.onrender.com" \
  CLOUDINARY_API_KEY=484884532192248 \
  CLOUDINARY_API_SECRET=IOpHOtIDslmGs29dxVVaIEWt62o \
  CLOUDINARY_CLOUD_NAME=dya4czh4y \
  CORS_ALLOWED_ORIGINS="https://rezinserp.vercel.app" \
    DATABASE_URL="postgresql://postgres:6w+gEmVhks7WB6S@db.bghkfrjlolxsvcanlyvw.supabase.co:5432/postgres" \
  DEBUG=False \
  SECRET_KEY="django-insecure-mvp-dev-key-change-in-production-2024" \
  SUPERUSER_EMAIL=admin@gmail.com \
  SUPERUSER_PASSWORD=admin123 \
  SUPERUSER_USERNAME=admin \
  -a rezinserp-backend
```

> **Note**: These values match your current environment. Update as needed for production security.

*(Optional)* If you use Cloudinary for images:
```bash
heroku config:set \
  CLOUDINARY_CLOUD_NAME=your_cloud_name \
  CLOUDINARY_API_KEY=your_key \
  CLOUDINARY_API_SECRET=your_secret \
  -a rezinserp-backend
```

### 4. Deploy

```bash
git push heroku main
```

> If your default branch is `master`:
> `git push heroku master`

**What happens on deploy:**
1. Subdir buildpack sets `backend/` as the working directory
2. Python buildpack installs `requirements.txt`
3. Heroku auto-runs `collectstatic`
4. The **release** phase (from Procfile) runs:
  - `python manage.py migrate` — applies DB migrations (ensure your Supabase connection string is set in `DATABASE_URL`)
  - `python manage.py create_superuser_if_none` — creates admin user from env vars
5. The **web** dyno starts: `gunicorn config.wsgi`

### 7. Verify

```bash
# Check logs
heroku logs --tail -a rezinserp-backend

# Open admin panel
heroku open /admin/ -a rezinserp-backend
```

Login with the superuser credentials you set in Step 5.

---

## Accessing the Admin Panel

The Django admin is available at:
```
https://rezinserp-backend-XXXXX.herokuapp.com/admin/
```

Login with:
- **Username**: value of `DJANGO_SUPERUSER_USERNAME` (default: `admin`)
- **Password**: value of `DJANGO_SUPERUSER_PASSWORD`

---

## Superuser Management

### Auto-creation (recommended)
A superuser is created automatically on every deploy via the release phase.
It only creates one if no superuser exists. Configure via env vars:

| Env Var | Default | Description |
|---------|---------|-------------|
| `SUPERUSER_USERNAME` | `admin` | Superuser username |
| `SUPERUSER_EMAIL` | `admin@gmail.com` | Superuser email |
| `SUPERUSER_PASSWORD` | *(required)* | Superuser password |

### Manual creation
```bash
heroku run python manage.py createsuperuser -a rezinserp-backend
```

### Reset password
```bash
heroku run python manage.py changepassword admin -a rezinserp-backend
```

---

## Frontend — Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New → Project** and import your GitHub repo.
3. Set **Root Directory** to `frontend`.
4. Set **Framework Preset** to `Next.js`.
5. Add **Environment Variable**:
   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://rezinserp-backend-XXXXX.herokuapp.com/api` |

   (Replace with your actual Heroku app URL.)
6. Click **Deploy**.

---

## Common Operations

### Run Django shell
```bash
heroku run python manage.py shell -a rezinserp-backend
```

### Run migrations manually
```bash
heroku run python manage.py migrate -a rezinserp-backend
```

### Seed demo data
```bash
heroku run python manage.py seed_data -a rezinserp-backend
```

### View logs
```bash
heroku logs --tail -a rezinserp-backend
```

### Scale dynos
```bash
heroku ps:scale web=1 -a rezinserp-backend
```

---

## Post-Deployment Checklist

- [ ] Backend health: visit `https://YOUR-BACKEND.herokuapp.com/api/` — should return API root
- [ ] Admin panel: visit `https://YOUR-BACKEND.herokuapp.com/admin/` — login works
- [ ] Login works: frontend → login page → enter credentials
- [ ] CORS: no browser console errors about blocked requests
- [ ] Cloudinary: upload a bill image via manager → check it appears
- [ ] Database: verify migrations ran (check `heroku logs`). Ensure Supabase is connected and accessible.

---

## Cost Estimate (Heroku + Supabase)

| Resource | Plan | Cost/month |
|----------|------|------------|
| Dyno (web) | Eco | ~$5 |
| Dyno (web) | Basic | ~$7 |
| Supabase (PostgreSQL) | Free / Pro | $0+ |
| **Total** | | **~$5–12/mo + Supabase** |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `No module named 'config'` | Ensure `PROJECT_PATH=backend` is set |
| `relation does not exist` | Run `heroku run python manage.py migrate` |
| Static files 404 | Ensure whitenoise is in middleware & run `collectstatic` |
| CORS errors | Check `CORS_ALLOWED_ORIGINS` matches your Vercel URL exactly |
| Superuser not created | Check `DJANGO_SUPERUSER_PASSWORD` is set in config vars |
| H10 App crashed | Check `heroku logs --tail` for Python errors |
