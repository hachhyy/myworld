# Actualización V5 (Producción): Arquitectura Multi-Pareja, Rediseño Orgánico del Planeta y Físicas de Casita Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar MyWorld a estado de producción real eliminando todo el código de simulación/test, blindando el aislamiento multi-pareja por `world_id` en Supabase y Zustand, rediseñando el Planeta 3D con continentes e islas orgánicas sin franja azul artificial, rediseñando la Casita en perspectiva 2.5D con anclajes anti-solapamiento de mascotas y colcha `z-index` superior, y creando un dock flotante tipo pastilla iOS para el Kiss Sender.

**Architecture:**
1. **Multi-Pareja por `world_id` & Cero Modo Test:** Eliminar `TestSimulatorPanel.tsx`, todas las funciones `simulate*` y botones de prueba; aislar completamente `pullWorldStateFromSupabase`, `pushWorldStateToSupabase`, `subscribeToWorldRealtime` y `BroadcastChannel` por `worldId` real de la tabla `public.worlds`.
2. **Planeta 3D de Islas Orgánicas y Circuito Ferroviario:** Esfera base de océano (`R_OCEAN = 2.0`), continentes/islas orgánicos con función de elevación multicontinente suave (`R_SAND = 2.025`, `R_MEADOW = 2.05`) que forma mares y lagos naturales, edificios escalados un 15% menos y asentados sobre tierra firme, y vía férrea `TorusGeometry` en el hemisferio sur (`lat = -48°`) con balasto/raíles sobre tierra y puente de arcos de ladrillo/madera sobre los tramos de mar.
3. **La Casita 2.5D Anti-Solapamiento:** Escenario dividido en Pared Fondo (35% superior: azul noche/pastel, ventana centrada, librería a la derecha, cama en perspectiva a la izquierda) y Suelo Parqué (65% inferior: gran alfombra redonda rosa 100% visible en el centro y mesita de té encuadrada debajo), con dos zonas de anclaje separadas para las mascotas (`left: 36%` y `left: 64%`), máquina de estados limpia (`idle | eating | washing | sleeping`) sin parpadeos y colcha superior (`z-30`) cubriéndolas hasta el cuello al dormir.
4. **HUD Inferior Pastilla iOS (Emil Kowalski Spring):** Dock flotante con `backdrop-blur-md`, selector sutil de emoji a la izquierda, botón central elástico de Corazón (`whileTap={{ scale: 0.85 }}` + spring `stiffness: 400, damping: 18`) y contador integrado a la derecha sincronizado con los besos reales de la pareja.

**Tech Stack:** React 19, TypeScript, Three.js / React Three Fiber, Framer Motion, Zustand, Supabase (`@supabase/supabase-js`).

---

### Task 1: Eliminación Total del Modo Test y Aislamiento Multi-Pareja por `world_id`

**Files:**
- Delete / Empty: `src/components/TestSimulatorPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/store/useWorldStore.ts`
- Modify: `src/lib/supabaseClient.ts`
- Modify: `src/components/OnboardingFlow.tsx`
- Modify: `src/components/SettingsModal.tsx`

- [x] **Step 1:** Eliminar `<TestSimulatorPanel />` de `src/App.tsx`, borrar `src/components/TestSimulatorPanel.tsx` y eliminar todas las acciones `simulatePartnerKissBurst50`, `simulatePartnerNewPolaroid`, `simulatePartnerSecretMovieVote`, `simulateOvuloCuteAlert`, `simulateDirtyAndHungryPets` de `src/store/useWorldStore.ts` y el botón de prueba de barro en `CasitaTamagotchi.tsx`.
- [x] **Step 2:** Blindar `src/lib/supabaseClient.ts` y `src/store/useWorldStore.ts` para que todas las lecturas, escrituras y canales Realtime filtren estrictamente por `id = worldId` (y al vincular por código de 6 letras en Login o Ajustes se resuelva el `world.id` único de la pareja y se cargue exclusivamente el `world_state` de ese `world_id`).

### Task 2: Planeta 3D con Islas/Continentes Orgánicos, Edificios -15% y Tren con Puentes de Arcos sobre el Agua

**Files:**
- Modify: `src/components/Planet3DScene.tsx`

- [x] **Step 1:** Reemplazar la función ecuatorial de franja recta por un campo de continentes e islas orgánicas suaves (`evaluateOrganicIslandsSurface`) sobre la esfera de océano `R_OCEAN = 2.0`, sobresaliendo a `R_MEADOW = 2.05` con playas de arena crema (`#F9E4B7`) y pradera verde menta (`#7ED992`), formando mares y lagos naturales entre islas.
- [x] **Step 2:** Reducir un 15% la escala de los 7 edificios (`scale: ~0.96 - 0.99`) y ubicar sus coordenadas exactamente en el centro de los continentes orgánicos (nunca sobre el agua).
- [x] **Step 3:** Configurar el circuito del tren como un anillo `TorusGeometry` paralelo al ecuador en el hemisferio sur (`lat = -48°`), evaluando matemáticamente en cada tramo si pasa sobre tierra (renderizando balasto de grava y traviesas) o sobre agua (renderizando puente de arcos de ladrillo/madera con pilares hasta el fondo marino), con la locomotora y vagones siguiendo el anillo exacto.

### Task 3: La Casita con Perspectiva 2.5D, Anclajes Anti-Solapamiento, Estado de Animación Limpio y Colcha Z-Index Superior

**Files:**
- Modify: `src/components/buildings/CasitaTamagotchi.tsx`

- [x] **Step 1:** Estructurar el escenario 2.5D con el 35% superior de pared azul noche/cálida (ventana centrada, librería a la derecha y cabecero de la cama en perspectiva a la izquierda) y el 65% inferior de suelo de parqué con la gran alfombra redonda rosa 100% visible en el centro y la mesita de té perfectamente encuadrada debajo.
- [x] **Step 2:** Implementar las dos zonas de anclaje invisibles sobre la alfombra (`ANCHOR_LEFT` para Mochi/Mascota A en `left: 35%, top: 56%` y `ANCHOR_RIGHT` para la mascota de la pareja en `left: 65%, top: 56%`) con `framer-motion` y restricción de distancia mínima para que jamás se pisen ni se superpongan.
- [x] **Step 3:** Unificar el estado de animación (`petAnimState: 'idle' | 'eating' | 'washing' | 'sleeping'`) para eliminar parpadeos al arrastrar comida o bañar, y posicionar las mascotas en la cama cuando `petAnimState === 'sleeping'` con el SVG de la colcha en `z-30` tapándolas hasta el cuello.

### Task 4: HUD Inferior de Besos en Pastilla Flotante iOS con Física Elástica y Sincronización Real

**Files:**
- Modify: `src/components/PlanetHUD.tsx`

- [x] **Step 1:** Rediseñar el módulo inferior de besos en un dock flotante tipo pastilla iOS (`rounded-full backdrop-blur-md bg-[var(--bg-card)]/90 border-2 border-[var(--border-ink)] shadow-xl`) con 3 zonas integradas: selector desplegable sutil de emoji a la izquierda, gran botón central de Corazón con física elástica de Emil Kowalski (`whileTap={{ scale: 0.85 }}`, `transition={{ type: 'spring', stiffness: 400, damping: 17 }}`), y contador numérico de besos recibidos/enviados integrado limpiamente a la derecha.
- [x] **Step 2:** Conectar la recepción en vivo de `pendingKissBursts` desde Supabase Realtime para que cuando la pareja envíe besos desde su dispositivo, llueva automáticamente en pantalla y se sume al contador real.
