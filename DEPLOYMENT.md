# Deployment Guide

This project is split across two deployments:

- Backend: Railway
- Frontend: Vercel

## Railway environment variables

Set these on the Railway backend service:

- `DATABASE_URL`: Railway Postgres connection string
- `SECRET_KEY`: a strong production secret
- `DEBUG`: `False`
- `ALLOWED_HOSTS`: your Railway domain, for example `your-app.up.railway.app`
- `CORS_ALLOW_ALL_ORIGINS`: `False`
- `CORS_ALLOWED_ORIGINS`: `https://bizionary-erp.vercel.app`

Optional but recommended if you use them in production:

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `EMAIL_BACKEND`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USE_TLS`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `DEFAULT_FROM_EMAIL`

Do not enable the restore flag for normal production boot.

- `RUN_DB_RESTORE_ON_STARTUP`: leave unset or `false`

## Vercel environment variables

Set these on the Vercel frontend project:

- `VITE_API_URL`: your Railway backend base URL, for example `https://your-app.up.railway.app`

The frontend API client uses this value in production. If it is missing, the app falls back to `/api/`, which only works when the frontend and backend share the same origin or proxy.

## Why live data can look wrong

If the frontend points at the wrong API host, it will query the wrong backend.
If the backend falls back to SQLite, it will read a different database from Railway Postgres.
If the restore script runs on every boot, it can overwrite the live database with the bundled snapshot.

## What to verify

1. Confirm Railway has a real Postgres database attached.
2. Confirm Railway exposes `DATABASE_URL` to the Django app.
3. Confirm Vercel is sending requests to the Railway backend URL.
4. Confirm the production backend is not booting with the restore flag enabled.
