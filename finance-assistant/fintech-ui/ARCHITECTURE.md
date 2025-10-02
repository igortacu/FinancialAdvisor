# Fintech UI Architecture Overview

## Purpose
- Expo-driven financial assistant delivering balances, spending history, analytics, and investment snapshots across the tab navigator (`app/(tabs)/index.tsx`)
- Secure onboarding and profile enrichment powered by Supabase auth flows (`app/auth/index.tsx`, `store/auth.tsx`, `api.ts`)
- Receipt capture and categorisation pipeline to accelerate expense tracking (`app/scan-receipt.tsx`, `lib/receipt-parser-advanced.ts`, `state/transactions.tsx`)
- Guided budgeting experience via a multi-step financial questionnaire (`app/cont.tsx`, `constants/mock.ts`)

## High-Level Architecture

### Navigation Shell
- Root stack switches between auth screens and the authenticated tab suite while applying light/dark theming (`app/_layout.tsx`, `hooks/use-color-scheme.ts`)
- Tab navigator injects a custom dock and floating scan shortcut for quick transaction entry (`app/(tabs)/_layout.tsx`, `components/CompactDock.tsx`, `components/ScanFab.tsx`)

### Data & State Management
- Supabase client centralises authentication and persistence, with profile upserts and session listeners keeping context current (`api.ts`, `store/auth.tsx`, `lib/profile.ts`)
- Ledger and investment screens scaffold Supabase queries, pagination, and realtime updates while falling back to mock data when needed (`app/(tabs)/transactions.tsx`, `app/(tabs)/investments.tsx`)
- Local transaction cache uses Zustand for instant UI updates post-scan or manual additions (`state/transactions.tsx`)

### Financial Insights & Analytics
- Market data retrieved through a Finnhub abstraction that can proxy via Supabase Edge Functions to avoid direct token exposure (`lib/finnhub.ts`, `supabase/functions/finnhub-proxy/index.ts`)
- Charting layer wraps Victory for native/web parity and degrades gracefully when dependencies are absent (`lib/charts.ts`, `app/(tabs)/analytics.tsx`)
- Insights tab blends Supabase-sourced holdings with Finnhub quotes, computed metrics, and curated headlines (`app/(tabs)/insights.tsx`)

### Receipt Capture Pipeline
- Scan screen orchestrates image selection, optional OCR, category guessing, and transaction injection (`app/scan-receipt.tsx`)
- Advanced parser normalises OCR text into structured items, merchants, and totals while exposing debug metadata (`lib/receipt-parser-advanced.ts`)
- Supabase Edge Function and local Express/Tesseract service offer alternative OCR backends for production or high-fidelity scenarios (`supabase/functions/scan-receipt/index.ts`, `ocr-api/index.js`)

### UI Foundation
- Shared UI primitives (cards, charts, lists) shape a consistent look and feel across screens (`components/Card.tsx`, `components/CompactChart.tsx`, `components/ListItem.tsx`)
- Theme utilities respect system color schemes and provide cross-platform font guidance (`constants/theme.ts`, `hooks/use-theme-color.ts`)
- Mock data and configuration constants support development and demo modes without live services (`constants/mock.ts`, `lib/receipt-mock.ts`)

## Supporting Scripts & Configuration
- Supabase Edge Functions directory encapsulates server-side helpers for data enrichment and third-party integrations (`supabase/functions`)
- OCR API folder hosts the optional standalone service with its own dependencies, ready for deployment or local experimentation (`ocr-api`)
- Expo configuration, linting, and TypeScript settings tune the project for multi-platform builds (`app.json`, `next.config.js`, `tsconfig.json`, `eslint.config.js`)
