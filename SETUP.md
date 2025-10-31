# Financial Advisor — Setup Guide (Windows)

This guide walks you through setting up the full project end to end: database, local ML API, and the Expo app. Commands are tailored for Windows PowerShell.

## Contents

- Prerequisites
- Supabase (database + auth)
- ML Advisor API (FastAPI)
- Frontend app (Expo)
- Demo flow checklist
- Troubleshooting
- App ↔ DB mapping

---

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+ (with pip)
- A Supabase project (URL + anon key)
- Expo Go (optional) for device testing

---

## 1) Supabase (database + auth)

Create the ledger table and enable Row Level Security (RLS). In Supabase SQL editor:

```sql
-- Table (matches the columns used by the app)
create table if not exists public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  moment timestamptz not null default now(),
  currency text not null default 'MDL',
  net_amount numeric not null default 0,     -- signed; expense negative
  expense numeric not null default 0,
  income numeric not null default 0,
  merchant text null,
  note text null,
  category text null,
  meta jsonb null,
  created_at timestamptz not null default now()
);

alter table public.ledger enable row level security;

-- Policies: each user can only access their own rows
create policy if not exists "ledger_select_own" on public.ledger
  for select using (auth.uid() = user_id);
create policy if not exists "ledger_insert_own" on public.ledger
  for insert with check (auth.uid() = user_id);
create policy if not exists "ledger_update_own" on public.ledger
  for update using (auth.uid() = user_id);
create policy if not exists "ledger_delete_own" on public.ledger
  for delete using (auth.uid() = user_id);

create index if not exists idx_ledger_user_moment on public.ledger (user_id, moment desc);
```

In Auth settings, allow email signups or magic links for testing.

---

## 2) ML Advisor API (FastAPI)

Provides:
- POST `/analyze` — auto-category, risk flag, advice
- GET `/forecast` — 6-step predictions (with safe fallback values 50–300)
- GET `/health` — health check

Run it from the project root’s `Forecast` folder:

```powershell
cd .\Forecast
python -m venv .venv; .venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Use a port that isn't taken on your machine (8091 recommended)
$env:ML_API_PORT="8091"; $env:ML_API_CORS="*"; $env:ML_API_RELOAD="0"; python ml_api.py
```

Verify it’s up:

```powershell
curl.exe -i http://localhost:8091/health
curl.exe -i "http://localhost:8091/forecast?user_id=TEST&n=6"
```

You should see `HTTP/1.1 200 OK`, a JSON body, and `Access-Control-Allow-Origin`.

CORS for LAN origins: if you open the app at a LAN URL (e.g., `http://192.168.x.x:8081`), start the API with explicit origins:

```powershell
$env:ML_API_CORS="http://localhost:8081,http://127.0.0.1:8081,http://192.168.x.x:8081"; python ml_api.py
```

---

## 3) Frontend app (Expo)

From the `fintech-ui` folder:

```powershell
cd .\finance-assistant\fintech-ui
npm install

# Required Supabase env
$env:EXPO_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY="YOUR-ANON-KEY"

# Optional: market data
$env:EXPO_PUBLIC_FINNHUB_KEY="YOUR-FINNHUB-KEY"

# Point to ML API (must be in same line as start)
$env:EXPO_PUBLIC_ML_API_URL="http://localhost:8091"; npx expo start
```

Open the app on web (http://localhost:8081) or scan the QR.

---

## 4) Demo flow (what to click)

- Go to Transactions tab
- Press “+” → “Upload from gallery” (uses mock receipt data)
- Tap “Add to ledger”
  - Auto-categorization comes from ML API
  - Risky entries show “• ⚠️ Risk”, and you’ll see an “AI Advice” alert
- Forecast card (top) shows the next 6 predictions

Notes:
- Manual add (from the empty state) also calls the ML API
- Forecast always shows a series, even if the API is down (fallback 50–300)

---

## Troubleshooting

- Forecast card is empty
  - Ensure `EXPO_PUBLIC_ML_API_URL` is set when starting Expo
  - Make sure the fix in `components/CompactChart.tsx` (this repo) is present
  - The card should still show fallback values if the API is offline

- CORS errors
  - Run Expo start with the env var in the same command line
  - If using a LAN origin, include it in `ML_API_CORS`

- Port conflict on 8090
  - Run the ML API on 8091 (`ML_API_PORT=8091`)

- Supabase insert fails
  - Confirm you’re logged in; RLS requires `user_id = auth.uid()`
  - Ensure the `ledger` table and column names match the SQL above

---

## App ↔ DB mapping

The app writes to `public.ledger` using this mapping:

| App field     | Column      | Notes                                 |
| ------------- | ----------- | ------------------------------------- |
| id            | id          | uuid, default `gen_random_uuid()`     |
| user_id       | user_id     | uuid = `auth.uid()`                   |
| date          | moment      | timestamptz                           |
| currency      | currency    | text                                  |
| amount (net)  | net_amount  | signed; expense negative              |
| expense       | expense     | positive expense amount               |
| income        | income      | positive income amount                |
| merchant      | merchant    | text                                  |
| name          | note        | text                                  |
| category      | category    | text                                  |
| meta          | meta        | jsonb (ML response, receipt, etc.)    |

---

## Notes

- ML API endpoints live in `Forecast/ml_api.py`. Port is configurable via `ML_API_PORT` (defaults to 8091 in this guide).
- The frontend ML client is `fintech-ui/lib/mlApi.ts`.
- The forecast uses your local `Forecast/forecast.py` (with a safe fallback) and is capped to 50–300 for clean UI.
- The scan flow uses mock data by default; swap in a real OCR backend later if needed.