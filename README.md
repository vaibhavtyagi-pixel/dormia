# DORMIA (Vite + React)

Competitive sleep app with:
- Live leaderboard + league flows
- World map (built-in, no Google Maps dependency)
- Lost Streaks obituary feed with Gemini integration
- Improve tab with AI night plan
- Android app prompt in web when user has no APK

## Local

```bash
npm install
npm run dev
```

## Vercel deploy checklist

If Vercel says config is missing, add these Environment Variables in the Vercel project:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_GEMINI_API_KEY` (optional for Improve AI section)

Use `.env.example` as reference for variable names.

After adding variables, redeploy.

## Notes

- `.env` is ignored by git.
- `vercel.json` includes SPA rewrites so React Router routes (`/signin`, `/profile`, etc.) work on refresh.
- Android APK download link currently used in-app: `https://i.apponthego.com/fb14b`
