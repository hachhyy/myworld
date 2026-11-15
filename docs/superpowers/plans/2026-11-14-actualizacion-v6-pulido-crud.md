# Actualización V6 (Pulido Final y CRUD): Gestos, Permisos y Limpieza Visual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el control CRUD completo de borrado con micro-confirmación en todos los módulos y reseteo sincronizado de besos, notificaciones de besos deslizables (`swipe-to-dismiss`), limpieza de artefactos visuales en el HUD, La Casita y la Cabaña Postal (Modo Estricto Polaroid), permisos de edición exclusivos en el Invernadero Lunar con el Óvulo Cute como mensajero único para la pareja, y entrada directa sin modales bloqueantes al Mapa 2D.

**Architecture:** Se amplía `useWorldStore` con acciones de borrado (`deleteExpense`, `deleteDiaryPage`, `deleteMapPin`, `deleteMediaItem`, `resetKissCounter`) y el campo `lunarOwner` (`'userA' | 'userB'`), sincronizando valores exactos (incluidos borrados de arrays y reseteo a `0` de `totalKissesHistory`) con Supabase Realtime en `App.tsx`. Se limpian las vistas de `PlanetHUD`, `CasitaTamagotchi`, `BuzonDiario`, `InvernaderoLunar` y `FaroMapaViajes`.

**Tech Stack:** React 19, TypeScript, Zustand, Supabase Realtime, Framer Motion, TailwindCSS v4, Leaflet.

**Spec:** Solicitud de usuario «ACTUALIZACIÓN V6 (PULIDO FINAL Y CRUD): GESTOS, PERMISOS Y LIMPIEZA VISUAL».

## Global Constraints

- Todo botón de borrado usa icono de papelera (`Trash2`) discreto con micro-confirmación rápida de 2 toques (`¿Borrar?` / `Confirmar`) para evitar borrados accidentales.
- En Cabaña Postal (`BuzonDiario.tsx`), el creador y visor de páginas deben limitarse estrictamente a la imagen enmarcada en Polaroid con washi-tape y el pie de foto en tipografía `Caveat` (`font-hand`), sin cuadrados de colores ni lienzos extra debajo.
- En el Invernadero Lunar (`InvernaderoLunar.tsx`), solo la persona que menstrúa (`lunarOwner` en modo `single`, o cada usuaria en su propio calendario en modo `dual`) puede editar fechas o síntomas; su pareja ve el módulo en modo Solo-Lectura con el Óvulo Cute como mensajero único.

## Review Focus

- Al reiniciar `totalKissesHistory` a `0`, `App.tsx` no debe usar `Math.max(prev, snap)` sino aplicar el valor remoto exacto (`0`) para que ambos móviles queden en `0`.
- Al borrar la última página del diario en `BuzonDiario.tsx`, `pageIndex` debe ajustarse sin dejar la vista en `undefined` y mostrar un estado vacío amigable para crear una nueva Polaroid.
- Al entrar a `FaroMapaViajes.tsx`, `selectedPin` debe iniciarse en `null` para que ninguna tarjeta modal bloquee el mapa 2D al abrirlo.

---

### Task 1: Acciones CRUD, Reseteo de Besos y Propietaria Lunar en `useWorldStore.ts` y `App.tsx`

**Files:**
- Modify: `src/store/useWorldStore.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsModal.tsx`

- [x] **Step 1: Añadir acciones CRUD (`deleteExpense`, `deleteDiaryPage`, `deleteMapPin`, `deleteMediaItem`, `resetKissCounter`) y `lunarOwner` en `src/store/useWorldStore.ts`, limpiando placeholders SVG de `diaryPages` y `mapPins`.**
- [x] **Step 2: Actualizar `applySnapshot` e incluir `lunarOwner` en `src/App.tsx` para que el reseteo de `totalKissesHistory` a `0` y los borrados se sincronicen en ambos dispositivos.**
- [x] **Step 3: Añadir el botón con micro-confirmación «Reiniciar contador de besos a 0» y selector de propietaria del calendario lunar en `src/components/SettingsModal.tsx`.**

---

### Task 2: HUD de Besos Deslizables (Swipe-to-Dismiss) y Limpieza del Rincón Superior Derecho (`PlanetHUD.tsx`)

**Files:**
- Modify: `src/components/PlanetHUD.tsx`

- [x] **Step 1: Eliminar `<HandDrawnBox>` en la cabecera superior de `PlanetHUD.tsx` para suprimir el marco rectangular roto en la esquina superior derecha.**
- [x] **Step 2: Dotar a las tarjetas de notificación de lluvia de besos de `drag="x"`, `dragConstraints={{ left: 0, right: 0 }}` y `onDragEnd` elástico para deslizarlas fuera de la pantalla.**

---

### Task 3: La Casita — Sin Bocadillos Cortados, Capa Z-Index de «Zzz» y Dock Inferior Respirable (`CasitaTamagotchi.tsx`)

**Files:**
- Modify: `src/components/buildings/CasitaTamagotchi.tsx`

- [x] **Step 1: Eliminar los bocadillos blancos permanentes de texto cortado sobre las mascotas en la vista principal, mostrando únicamente un icono/reacción temporal al acariciarlas.**
- [x] **Step 2: Posicionar el indicador animado «Zzz... 💤» en una capa `z-40` independiente por encima de las cabezas/almohadas de las mascotas.**
- [x] **Step 3: Rediseñar el dock inferior en dos filas/bandejas con scroll suave y holgura para que todas las comidas, herramientas y pestañas sean 100% accesibles.**

---

### Task 4: Cabaña Postal en Modo Estricto Polaroid + Borrado de Páginas (`BuzonDiario.tsx`)

**Files:**
- Modify: `src/components/buildings/BuzonDiario.tsx`

- [x] **Step 1: Eliminar el lienzo inferior y cualquier cuadrado de color o elemento inventado debajo de la Polaroid, dejando exclusivamente la foto enmarcada en Polaroid con washi-tape y el pie de foto en `Caveat` (`font-hand`).**
- [x] **Step 2: Añadir botón de papelera con micro-confirmación para borrar páginas enteras.**

---

### Task 5: Invernadero Lunar — Permisos Estrictos de Edición y Modo Solo-Lectura con el Óvulo Mensajero (`InvernaderoLunar.tsx`)

**Files:**
- Modify: `src/components/buildings/InvernaderoLunar.tsx`

- [x] **Step 1: Calcular `canEdit` según `activeUser`, `lunarMode` y `lunarOwner` (`ella`/`ellas`).**
- [x] **Step 2: Bloquear la edición de días, sangrado y controles cuando la pareja (`!canEdit`) visita el edificio, destacando la tarjeta del Óvulo Cute como mensajero único del resumen.**

---

### Task 6: CRUD de Borrado en Tricount (`EdificioCerdito.tsx`), Cine (`CineRetro.tsx`) y Entrada Directa al Mapa (`FaroMapaViajes.tsx`)

**Files:**
- Modify: `src/components/buildings/EdificioCerdito.tsx`
- Modify: `src/components/buildings/CineRetro.tsx`
- Modify: `src/components/buildings/FaroMapaViajes.tsx`

- [x] **Step 1: Añadir papelera con micro-confirmación a los gastos de `EdificioCerdito.tsx` y a las películas vistas/pendientes de `CineRetro.tsx`.**
- [x] **Step 2: Eliminar el banner/tutorial inicial y el modal preabierto (`selectedPin = null` al montar) en `FaroMapaViajes.tsx`, añadiendo papelera con micro-confirmación al visor de chinchetas.**
