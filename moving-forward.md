# Moving Forward — Platform Strategy

## Current Stack

You have a **Next.js 15 web app** — React components, Tailwind CSS, client-side state, a mock data layer. No backend, no database yet.

---

## Option 1: React Native (iOS/iPad/Mac)

**Effort: High rewrite**

React Native shares React concepts but uses completely different primitives — no `<div>`, no Tailwind, no HTML. Every single component would need to be rebuilt using `<View>`, `<Text>`, `<FlatList>`, etc. The business logic (mock layer, utils, types) could be reused, but the UI is ~80% of your codebase and none of it transfers.

- Drag-and-drop (your Kanban) is especially painful on RN — `@dnd-kit` doesn't exist there
- You'd use **Expo** to target iOS/iPadOS/macOS from one codebase
- Timeline: essentially rebuilding the UI from scratch

## Option 2: PWA (Progressive Web App)

**Effort: Very low — almost free**

Your existing Next.js app can be made installable on iPad, iPhone, and Mac with a `manifest.json` and service worker. It runs in a full-screen browser shell, feels app-like, and works offline. This is the **fastest path**.

- Looks and works like a native app on iPad
- No App Store (unless you wrap it)
- Some native gestures won't feel perfectly native

## Option 3: Capacitor or Tauri

**Effort: Low-to-medium**

- **Capacitor** wraps your existing web app in a native iOS/Mac shell — gives you App Store distribution and access to native APIs, keeps all your existing code
- **Tauri** is the same concept but for Mac/Windows desktop only — extremely lightweight

These are the best middle ground if you want App Store distribution without a full rewrite.

---

## Recommendation

**Short term:** Make it a PWA now — it's a few hours of work and your iPad users get a great experience immediately.

**Long term:** If you want App Store distribution, Capacitor is the lowest-effort path. It wraps exactly what you have, and you can migrate to a real database (Supabase, SQLite via Capacitor plugin) at the same time.

A full React Native rewrite only makes sense if you need deep native integration (camera, push notifications, etc.) — which a tutor CRM probably doesn't.

---

## Key Dependency: Data Layer

**The biggest factor in all of this is the data layer, not the UI.** Right now you have in-memory mock data that resets on refresh. Before any of the above is practical, you'll want persistent storage — either local (SQLite) or cloud (Supabase/Firebase). That decision will shape which path makes the most sense.
