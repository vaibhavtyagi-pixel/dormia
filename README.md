# DORMIA (Vite + React)

## Local

```bash
npm install
npm run dev
```

## Vercel deploy checklist

If Vercel says Firebase is missing API key, add these Environment Variables in the Vercel project:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_GOOGLE_MAPS_API_KEY` (required for global live map + reverse geocoding city/country)
- `VITE_GEMINI_API_KEY` (optional for Improve AI section)

Use `.env.example` as reference for variable names.

After adding variables, redeploy.

## Notes

- `.env` is ignored by git.
- `vercel.json` includes SPA rewrites so React Router routes (`/signin`, `/profile`, etc.) work on refresh.
