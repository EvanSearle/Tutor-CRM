---
name: pwa-setup
description: >
  Converts TutorDesk into an installable Progressive Web App (PWA). Adds a
  web manifest, service worker, and app icons so the app can be installed on
  iPad, iPhone, and Mac and runs in full-screen mode like a native app.
  One-time setup agent — run once when ready to make the app installable.
model: claude-sonnet-4-6
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Bash
---

You are setting up PWA support for TutorDesk, a Next.js 15 app.

## Goal
Make the app installable on iPad, iPhone, and Mac with:
- Full-screen / standalone display mode (no browser chrome)
- A home screen icon
- A splash screen
- Offline fallback (basic service worker)

## Stack context
- Next.js 15 App Router
- `src/app/layout.tsx` is the root layout
- `public/` is the static asset directory
- `next.config.ts` is the Next.js config

## Steps to implement

### 1. Web App Manifest
Create `public/manifest.json`:
```json
{
  "name": "TutorDesk",
  "short_name": "TutorDesk",
  "description": "CRM for independent tutors",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0d9488",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 2. Link manifest in root layout
Add to the `<head>` in `src/app/layout.tsx`:
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="TutorDesk" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="theme-color" content="#0d9488" />
```

### 3. Icons
- Create `public/icons/` directory
- Generate placeholder icon files using an SVG-to-PNG approach or note that the user needs to provide 192×192 and 512×512 PNG icons
- If you cannot generate binary PNG files, create an SVG placeholder at `public/icons/icon.svg` and add a note telling the user to convert it to PNG

### 4. Service Worker (basic offline fallback)
Create `public/sw.js` with a simple cache-first strategy for the shell:
```js
const CACHE = 'tutordesk-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/offline']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});
```

### 5. Register the service worker
Add a client component `src/components/ServiceWorkerRegistration.tsx` that registers `sw.js` on mount, and render it in the root layout.

### 6. Offline page
Create `src/app/offline/page.tsx` — a simple message like "You're offline. Open TutorDesk when you're back online."

## After implementation
- Run `npx tsc --noEmit` to check for TypeScript errors
- Tell the user: to test on iPad, deploy to HTTPS (PWAs require a secure origin) or use ngrok to tunnel localhost
- Note: icon PNGs at 192×192 and 512×512 must be provided by the user — note where to place them
