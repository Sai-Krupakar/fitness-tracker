# Gemini Quote API — Setup and Deployment Guide

This app can generate motivational quotes using Google's Gemini API. Because the
Gemini API key is a secret, it must never be placed in the browser/APK code
directly. Instead, a small serverless function (deployed to Vercel, free tier)
holds the key and the app calls that function instead of calling Gemini
directly.

Fallback order if a step fails: **Gemini proxy → quotable.io → local quote
list.** The app always shows a quote, even if you skip this setup entirely or
have no internet connection.

## 1. Get a free Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with a Google account.
3. Click **Create API key**.
4. Copy the key — you will paste it into Vercel in step 3, not into this
   project's source code.

Gemini's free tier has generous daily request limits, more than enough for
personal use of this app.

## 2. Install the Vercel CLI

```powershell
npm install -g vercel
```

Sign in once:

```powershell
vercel login
```

## 3. Deploy the project to Vercel

From the project root (`fitness/`):

```powershell
vercel
```

- Answer the prompts (link to a new project, accept defaults).
- Vercel auto-detects this as a Vite project and will also detect the
  `api/quote.ts` file as a serverless function automatically — no extra
  configuration file is needed.
- After the first deploy finishes, note the URL it prints, for example:
  `https://fitness-yourname.vercel.app`

## 4. Add the Gemini API key to the Vercel project

1. Go to the [Vercel dashboard](https://vercel.com/dashboard) → your project →
   **Settings → Environment Variables**.
2. Add a new variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** the key you copied in step 1.
   - **Environment:** Production (and Preview if you want preview deploys to
     work too).
3. Redeploy so the function picks up the new variable:

```powershell
vercel --prod
```

## 5. Point the app at your deployed proxy

Create a `.env` file in the project root (this file is git-ignored, so your
values stay local):

```
VITE_API_BASE_URL=https://fitness-yourname.vercel.app
```

Use the exact URL Vercel gave you in step 3 (no trailing slash).

This variable matters most for the **Android APK**, since the packaged app
loads its HTML/JS from local files, not from your Vercel domain. Without an
absolute URL here, the app's relative `/api/quote` request would have nowhere
to go once it's inside the APK.

## 6. Rebuild the web app and/or Android APK

Web app (picks up `VITE_API_BASE_URL` automatically at build time):

```powershell
npm run build
```

Android APK:

```powershell
npm run android:apk
```

## 7. Test it

- **Browser (`npm run dev` or the deployed Vercel URL):** open the Home tab,
  press **Generate Quote**, and confirm a new quote appears.
- **Phone (APK installed):** with the phone connected to the internet, press
  **Generate Quote** and confirm it works the same way.
- If the Gemini proxy is unreachable (e.g. `GEMINI_API_KEY` missing, Vercel
  function error, or no internet), the app silently falls back to
  `quotable.io`, then to its local quote list — you will still see a quote,
  just not necessarily an AI-generated one.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Quotes never look AI-generated (always short famous quotes with an author name) | `VITE_API_BASE_URL` not set, or app rebuilt before setting it | Confirm `.env` has the correct URL, then rerun `npm run build` / `npm run android:apk` |
| `500` error mentioning `GEMINI_API_KEY` | Environment variable not set in Vercel, or you forgot to redeploy after adding it | Recheck Settings → Environment Variables, then `vercel --prod` |
| Works in browser but not in the APK | Missing CORS or wrong base URL | `api/quote.ts` already sends `Access-Control-Allow-Origin: *`; double-check `VITE_API_BASE_URL` matches your live Vercel URL exactly |
| Nothing changes after editing `.env` | Vite only reads `.env` at build time | Stop `npm run dev` and restart it, or rerun `npm run build` |

## Cost

Vercel's free (Hobby) tier and Gemini's free tier are both sufficient for
personal use of this app. Nothing in this setup requires a paid plan.
