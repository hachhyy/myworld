# Graph Report - myworld_graph  (2026-11-17)

## Corpus Check
- 37 files · ~52,652 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 310 nodes · 642 edges · 27 communities (17 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e418e83b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- App.tsx
- useWorldStore.ts
- supabaseClient.ts
- Planet3DScene.tsx
- compilerOptions
- dependencies
- devDependencies
- InvernaderoLunar.tsx
- manifest.json
- Review Focus
- Multi-iPhone Viewport, Clean Onboarding/Casita & Hero Kiss Sender Plan
- package.json
- CozySoundEngine
- @tailwindcss/vite
- vercel.json
- 🪐 MyWorld — Nuestro Planeta Privado (Cozy Couple PWA)
- RootErrorBoundary
- scripts
- brain.md
- howler@^2.2.4
- jspdf
- leaflet
- three
- zustand

## God Nodes (most connected - your core abstractions)
1. `useWorldStore` - 31 edges
2. `react` - 20 edges
3. `App()` - 19 edges
4. `PlanetWorldGroup()` - 16 edges
5. `compilerOptions` - 16 edges
6. `soundEngine` - 15 edges
7. `framer-motion` - 14 edges
8. `lucide-react` - 13 edges
9. `triggerHeartbeatHaptic()` - 11 edges
10. `OnboardingFlow()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Task 2: Remove Bugged RoughJS Boxes in Login / Onboarding` --references--> `HandDrawnBox()`  [INFERRED]
  docs/superpowers/plans/2026-11-16-viewport-login-casita-kiss-hero.md → src/components/ui/HandDrawnBox.tsx
- `Actualización V5 (Producción): Arquitectura Multi-Pareja, Rediseño Orgánico del Planeta y Físicas de Casita Implementation Plan` --references--> `pullWorldStateFromSupabase()`  [INFERRED]
  docs/superpowers/plans/2026-11-14-actualizacion-v5-produccion.md → src/lib/supabaseClient.ts
- `Actualización V5 (Producción): Arquitectura Multi-Pareja, Rediseño Orgánico del Planeta y Físicas de Casita Implementation Plan` --references--> `pushWorldStateToSupabase()`  [INFERRED]
  docs/superpowers/plans/2026-11-14-actualizacion-v5-produccion.md → src/lib/supabaseClient.ts
- `Actualización V5 (Producción): Arquitectura Multi-Pareja, Rediseño Orgánico del Planeta y Físicas de Casita Implementation Plan` --references--> `subscribeToWorldRealtime()`  [INFERRED]
  docs/superpowers/plans/2026-11-14-actualizacion-v5-produccion.md → src/lib/supabaseClient.ts
- `App()` --calls--> `InvernaderoLunar()`  [EXTRACTED]
  src/App.tsx → src/components/buildings/InvernaderoLunar.tsx

## Import Cycles
- 2-file cycle: `src/lib/supabaseClient.ts -> src/store/useWorldStore.ts -> src/lib/supabaseClient.ts`

## Communities (27 total, 10 thin omitted)

### Community 0 - "react"
Cohesion: 0.07
Nodes (36): canvas-confetti@^1.9.3, framer-motion@^11.18.2, lucide-react@^0.475.0, react@^18.3.1, canvas-confetti, framer-motion, lucide-react, react (+28 more)

### Community 1 - "App.tsx"
Cohesion: 0.14
Nodes (27): Actualización V5 (Producción): Arquitectura Multi-Pareja, Rediseño Orgánico del Planeta y Físicas de Casita Implementation Plan, Task 1: Eliminación Total del Modo Test y Aislamiento Multi-Pareja por `world_id`, Task 2: Planeta 3D con Islas/Continentes Orgánicos, Edificios -15% y Tren con Puentes de Arcos sobre el Agua, Task 3: La Casita con Perspectiva 2.5D, Anclajes Anti-Solapamiento, Estado de Animación Limpio y Colcha Z-Index Superior, Task 4: HUD Inferior de Besos en Pastilla Flotante iOS con Física Elástica y Sincronización Real, App(), BuzonDiario(), CasitaTamagotchi() (+19 more)

### Community 2 - "useWorldStore.ts"
Cohesion: 0.09
Nodes (26): CasitaTamagotchiProps, CrumbParticle, FoamBubble, FOODS, MOODS, Planet3DSceneProps, KISS_ICONS, PlanetHUDProps (+18 more)

### Community 3 - "supabaseClient.ts"
Cohesion: 0.17
Nodes (23): CutePetAvatarProps, PET_CATALOG, OnboardingFlow(), CLIENT_INSTANCE_ID, createWorldInTable(), generateSixCharCode(), generateUUID(), getLocalProfiles() (+15 more)

### Community 4 - "Planet3DScene.tsx"
Cohesion: 0.19
Nodes (24): BUILDING_COORDS, CasitaBuilding(), CineBuilding(), ContinuousRailwayAndTrain(), CorreosBuilding(), CreamPebblePathsAndBridge(), DeseosBuilding(), DiscreetStonePlinth() (+16 more)

### Community 5 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 6 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, browser-image-compression@^2.0.2, perfect-freehand@^1.2.2, react-dom@^18.3.1, @react-three/drei@^9.121.4, @react-three/fiber@^8.17.12, roughjs@^4.6.6, tailwindcss@^4.0.6 (+7 more)

### Community 7 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @types/canvas-confetti@^1.9.0, @types/howler@^2.2.12, @types/leaflet@^1.9.16, @types/react@^18.3.18, @types/react-dom@^18.3.5, @types/three@^0.170.0, typescript@^5.7.3 (+7 more)

### Community 8 - "InvernaderoLunar.tsx"
Cohesion: 0.27
Nodes (10): diffDays(), InvernaderoLunar(), InvernaderoLunarProps, parseDateStr(), PHASE_META, toDateStr(), CuteOvuloAvatar(), CuteOvuloAvatarProps (+2 more)

### Community 9 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, lang, name, orientation, short_name (+2 more)

### Community 10 - "Review Focus"
Cohesion: 0.20
Nodes (9): Actualización V6 (Pulido Final y CRUD): Gestos, Permisos y Limpieza Visual — Implementation Plan, Global Constraints, Review Focus, Task 1: Acciones CRUD, Reseteo de Besos y Propietaria Lunar en `useWorldStore.ts` y `App.tsx`, Task 2: HUD de Besos Deslizables (Swipe-to-Dismiss) y Limpieza del Rincón Superior Derecho (`PlanetHUD.tsx`), Task 3: La Casita — Sin Bocadillos Cortados, Capa Z-Index de «Zzz» y Dock Inferior Respirable (`CasitaTamagotchi.tsx`), Task 4: Cabaña Postal en Modo Estricto Polaroid + Borrado de Páginas (`BuzonDiario.tsx`), Task 5: Invernadero Lunar — Permisos Estrictos de Edición y Modo Solo-Lectura con el Óvulo Mensajero (`InvernaderoLunar.tsx`) (+1 more)

### Community 11 - "Multi-iPhone Viewport, Clean Onboarding/Casita & Hero Kiss Sender Plan"
Cohesion: 0.22
Nodes (7): Multi-iPhone Viewport, Clean Onboarding/Casita & Hero Kiss Sender Plan, Task 1: Multi-iPhone Fullscreen & Dynamic Safe Areas, Task 2: Remove Bugged RoughJS Boxes in Login / Onboarding, Task 3: Remove Pet Name Pills & Speech Bubbles in Casita, Task 4: Hero Kiss Sender Button Redesign (`76x76px`), HandDrawnBox(), HandDrawnBoxProps

### Community 12 - "package.json"
Cohesion: 0.22
Nodes (8): react-leaflet@^4.2.1, @supabase/supabase-js@^2.48.1, name, private, type, version, react-leaflet, @supabase/supabase-js

### Community 14 - "@tailwindcss/vite"
Cohesion: 0.29
Nodes (6): @tailwindcss/vite@^4.0.6, vite@^6.1.0, @vitejs/plugin-react@^4.3.4, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 15 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 16 - "🪐 MyWorld — Nuestro Planeta Privado (Cozy Couple PWA)"
Cohesion: 0.40
Nodes (4): 🚀 Despliegue en Vercel, 🪐 MyWorld — Nuestro Planeta Privado (Cozy Couple PWA), ✨ Módulos Incluidos (Actualización Maestra V4), Variables de Entorno Opcionales en Vercel (`Settings -> Environment Variables`):

### Community 18 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

## Knowledge Gaps
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `App.tsx`, `useWorldStore.ts`, `supabaseClient.ts`, `Planet3DScene.tsx`, `InvernaderoLunar.tsx`, `Multi-iPhone Viewport, Clean Onboarding/Casita & Hero Kiss Sender Plan`, `package.json`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.07171717171717172 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `react`, `package.json`, `@tailwindcss/vite`, `howler@^2.2.4`, `jspdf`, `leaflet`, `three`, `zustand`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13825757575757575 - nodes in this community are weakly interconnected._
- **Why does `framer-motion` connect `react` to `App.tsx`, `useWorldStore.ts`, `supabaseClient.ts`, `InvernaderoLunar.tsx`, `package.json`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `useWorldStore.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09462365591397849 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._