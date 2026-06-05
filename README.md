# SLN Logistics

This repo contains an Expo React Native mobile app plus a lightweight Express API server.

## Centralized MongoDB backend

The app now supports a centralized MongoDB backend through `artifacts/api-server`.

### Recommended free database

Use MongoDB Atlas free tier:
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster (Shared Cluster, M0)
3. Create a database user and whitelist your IP / enable access from anywhere if needed
4. Copy the connection string and set it to `MONGODB_URI`

Example connection string format:

```env
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority"
PORT=8080
```

## Run the API server

From the repo root:

```bash
cd artifacts/api-server
pnpm install
pnpm run dev
```

If you use PowerShell, you can instead run:

```powershell
$env:MONGODB_URI = "mongodb+srv://..."
$env:PORT = "8080"
pnpm run dev
```

Or create `artifacts/api-server/.env` with:

```env
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority"
PORT=8080
```

Then start the API server from `artifacts/api-server`:

```powershell
pnpm install
pnpm run dev
```

For the mobile app, the default API base URL is:
- `http://10.0.2.2:8080/api` on Android emulators
- `http://localhost:8080/api` on iOS simulators
- `/api` on web

If you need to use a physical device or a custom backend host, set `EXPO_PUBLIC_API_BASE_URL` in your Expo environment or set `expo.extra.apiBaseUrl` in `artifacts/mobile/app.json`.

> Important: the mobile app should only call the backend API server, not MongoDB Atlas directly.

## Available API endpoints

The server exposes JSON REST endpoints under `/api`:

- `GET /api/healthz` — health check
- `GET /api/locations`
- `POST /api/locations`
- `DELETE /api/locations/:id`
- `GET /api/vehicles`
- `POST /api/vehicles`
- `DELETE /api/vehicles/:id`
- `GET /api/trips`
- `POST /api/trips`
- `PUT /api/trips/:id`
- `DELETE /api/trips/:id`
- `GET /api/rates`
- `POST /api/rates`
- `PUT /api/rates/:id`
- `DELETE /api/rates/:id`
- `POST /api/invoices/next`

## Notes

- The mobile app now uses the centralized MongoDB-backed API in `artifacts/api-server`.
- The backend stores data in MongoDB and exposes REST endpoints under `/api`.
- Syncing the mobile app with the centralized API is already implemented; the next step is deployment and device testing.
