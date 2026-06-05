# SLN Logistics — Project Handover

## 1. Project Overview

SLN Logistics is a hybrid logistics application consisting of:
- `artifacts/api-server`: an Express + MongoDB backend API server
- `artifacts/mobile`: an Expo React Native mobile app
- `lib/db`, `lib/api-zod`, `lib/api-client-react`: supporting packages for database schema and API client generation

The mobile app is intended to operate with a centralized MongoDB Atlas backend via the API server.

## 2. Architecture

- Backend: `artifacts/api-server`
  - Uses `express` for REST endpoints
  - Uses `mongodb` native driver to connect to MongoDB Atlas
  - Loads configuration from `.env` using `dotenv`
  - Exposes API routes under `/api`

- Mobile app: `artifacts/mobile`
  - Expo Router based app
  - Uses `expo`, `react-native`, and `expo-router`
  - Calls backend API via `apiBaseUrl` configured in `app.json` or through `EXPO_PUBLIC_API_BASE_URL`

- Shared packages:
  - `lib/db`: Drizzle ORM database schema helpers
  - `lib/api-zod`: API schema definitions
  - `lib/api-client-react`: generated client utilities for the front-end

## 3. Key Files

- `artifacts/api-server/src/index.ts` — backend startup entrypoint
- `artifacts/api-server/src/app.ts` — Express app configuration and middleware
- `artifacts/api-server/src/lib/mongo.ts` — MongoDB connection logic
- `artifacts/mobile/app.json` — Expo config and API base URL settings
- `artifacts/mobile/contexts/DatabaseContext.tsx` — mobile API request manager

## 4. Environment & Setup

### Backend

1. Create `artifacts/api-server/.env`
2. Add Atlas connection variables:

```env
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority"
PORT=8080
```

3. Install packages and start:

```powershell
cd artifacts/api-server
pnpm install
pnpm run dev
```

4. Verify backend health:

- `GET http://localhost:8080/api/healthz`
- `GET http://localhost:8080/api/locations`

### Mobile

1. Install mobile dependencies:

```powershell
cd artifacts/mobile
pnpm install
```

2. Start the Expo development server:

```powershell
pnpm run dev
```

3. Mobile API base URL defaults:
- Android emulator: `http://10.0.2.2:8080/api`
- iOS simulator: `http://localhost:8080/api`
- Web: `/api`

If using a real device, set `EXPO_PUBLIC_API_BASE_URL` or update `expo.extra.apiBaseUrl` in `artifacts/mobile/app.json`.

## 5. Current Status

### Backend
- Backend API server is implemented and configured to connect to MongoDB Atlas.
- The API exposes standard logistics endpoints for locations, vehicles, trips, rates, invoices, and health checks.
- A successful health check endpoint exists at `/api/healthz`.

### Mobile
- Mobile app source is present and wired to the API backend.
- Current build effort is in progress: `expo export --output-dir dist --clear` is failing due to missing runtime dependencies.
- Recent missing packages identified during build:
  - `@ungap/structured-clone`
  - `shallowequal`
  - `fast-deep-equal`
  - `@unimodules/core`

## 6. Known Issues / Blockers

- Expo mobile export is currently blocked by Metro bundler resolving missing packages from `expo-router` and Expo modules.
- The mobile workspace has a non-standard `react`/`react-dom` dependency entry (`"catalog:"`) which may require review or lockfile regeneration.
- Full APK generation is not yet complete.

## 7. Recommended Next Steps

1. Finish dependency stabilization in `artifacts/mobile/package.json`.
2. Run a clean install and rebuild from the mobile workspace:

```powershell
cd artifacts/mobile
pnpm install
pnpm exec expo export --output-dir dist --clear
```

3. If export succeeds, build the APK using Expo Application Services (`eas build`) or `expo run:android`.
4. Confirm the mobile app can connect to the backend API via the configured base URL.
5. Review `artifacts/api-server` for any environment-specific logging or Atlas authentication issues.

## 8. Helpful Notes

- The mobile app should never call MongoDB Atlas directly; it should always use the backend API.
- If the backend is deployed on a separate host, update `EXPO_PUBLIC_API_BASE_URL` accordingly.
- Watch `pnpm` workspace behavior carefully: root and nested workspace dependency resolution can sometimes differ from single-package installs.

## 9. Contacts / Ownership

- Current handover covers the backend + mobile app state as of June 4, 2026.
- For further changes, focus on backend Atlas connectivity, Expo dependency stabilization, and mobile APK build completion.
