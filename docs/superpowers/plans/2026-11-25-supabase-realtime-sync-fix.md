# Multi-Device Supabase Realtime + iOS PWA Sync Fix Plan

> **For agentic workers:** Implementing natively with TDD and verification.

**Goal:** Eliminate complete multi-device desynchronization between paired phones by fixing silent Supabase/RLS failures, normalizing and auto-healing `world_id`/`room_code` linkage, implementing non-destructive ID-based merging, adding iOS PWA lifecycle reconnection + fallback polling, and exposing live sync diagnostics in Settings.

**Architecture:** Extract pure snapshot normalization and conflict-free ID-based merging into `src/utils/worldSyncMerge.ts`. Harden `src/lib/supabaseClient.ts` so every read/write returns explicit status (detecting 0-row RLS blocks) and supports auto-healing by normalized `room_code`. Coordinate pull/merge/push, Realtime health, `visibilitychange`/`focus`/`online` reconnection, and 18s visible polling in `src/App.tsx`, backed by ephemeral sync state and tombstone tracking in `src/store/useWorldStore.ts` and surfaced in `src/components/SettingsModal.tsx`.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, Zustand 5, Supabase JS v2, Node 22 built-in test runner (`node --test`).

## Global Constraints
- Read `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` cleanly without silent local-only fallbacks that pretend data saved.
- Always normalize `room_code` with `.trim().toUpperCase()` (alphanumeric, max 6 chars).
- Reconnect Realtime + fetch fresh data on `visibilitychange` (`visible`) and `focus`, plus 15-20s light polling while visible.
- Never overwrite partner's concurrent changes destructively; merge arrays by unique `id` with deletion tombstones; prevent Realtime-to-push echo loops.
- Keep `supabase_schema.sql` RLS + Realtime publication accurate and provide exact SQL block for Supabase SQL Editor.

## Review Focus
- 0-row PostgREST `UPDATE` blocked by RLS returns `{ error: null, data: [] }` -> must check returned row count with `.select('id')` and surface error.
- Initial mount push race condition: push effect must NOT fire on mount or on remote apply before initial pull completes.
- Partner deletes an item while other partner is offline -> tombstone `deletedIds` prevents deleted item from resurrecting on merge.
- Both partners review the same movie (`ratingA`/`reviewA` vs `ratingB`/`reviewB`) concurrently -> per-field merge preserves both reviews.
- Device stuck on a locally-generated `worldId` with matching `room_code` -> pull by `room_code` fallback auto-heals `worldId`.

---

### Task 1: Pure Room Code Normalization & Conflict-Free Snapshot Merge (`src/utils/worldSyncMerge.ts`)
- Create `src/utils/worldSyncMerge.ts` and unit tests `src/utils/worldSyncMerge.test.ts`.
- Verify tests fail first (TDD), implement merge + tombstone + normalization functions, verify tests pass.

### Task 2: Harden Supabase Client & Explicit Error Reporting (`src/lib/supabaseClient.ts`, `vite.config.ts`)
- Fix `vite.config.ts` `envDir` so root `.env` works alongside Vercel env vars.
- Update `supabaseClient.ts` to return structured `SyncResult`, detect 0-row RLS updates, auto-heal by `room_code`, persist `profiles.world_id` on re-link, persist room code changes, and report Realtime channel status.

### Task 3: Store Sync Metadata, Mutation Counter & Deletion Tombstones (`src/store/useWorldStore.ts`)
- Add non-persisted `syncStatus`, `syncError`, `lastSyncedAt`, `realtimeStatus`, `localChangeVersion`.
- Add persisted `deletedIds` and `kissesResetAt`.
- Increment `localChangeVersion` only on local user mutations; record `deletedIds` on deletes.

### Task 4: iOS PWA Reconnection Engine, Non-Destructive Push & Offline Banner (`src/App.tsx`)
- Replace blind mount push + blind remote overwrite with `fetchWorldData` + `mergeWorldSnapshots` + dirty-only read-merge-write push.
- Add `visibilitychange`, `focus`, `online`, 18s visible polling, and `'myworld-force-sync'` event listener.
- Render non-intrusive *"Sin conexión con la nube"* pill on sync errors/offline.

### Task 5: Settings Live Sync Panel & Re-Link Controls (`src/components/SettingsModal.tsx`)
- Display active 6-char code with Copy, live sync status (`🟢 Conectado a Supabase` vs `🔴 Modo Local / Error`) + last sync timestamp, **"🔄 Forzar sincronización ahora"** button, and **"🔗 Cambiar / Re-vincular código de 6 letras"** flow.

### Task 6: Supabase Schema RLS & Realtime Fix (`supabase_schema.sql`)
- Update `supabase_schema.sql` with `world_state` column safeguard, `REPLICA IDENTITY FULL`, non-blocking RLS policies for paired worlds (authenticated + room-code access), and idempotent `supabase_realtime` publication.

### Task 7: Verification (`tsc`, tests, `vite build`)
- Run unit tests, `npx tsc --noEmit`, and `npm run build` to guarantee clean compilation.
