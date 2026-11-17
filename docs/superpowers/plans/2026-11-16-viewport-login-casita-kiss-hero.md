# Multi-iPhone Viewport, Clean Onboarding/Casita & Hero Kiss Sender Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify full-screen `100dvh` viewport and dynamic `env(safe-area-inset-*)` spacing across all iPhone models (Safari and standalone PWA), remove displaced `roughjs` `<HandDrawnBox>` borders in Login/Onboarding, remove pet name pills/bubbles in Casita, and redesign the central Kiss Sender as a `76x76px` tactile Hero Button with floating heart particles.

**Architecture:**
1. Anchor `html, body, #root` with `position: fixed; inset: 0; width: 100%; height: 100dvh; overflow: hidden; overscroll-behavior: none;` and use dynamic safe-area padding (`calc(env(safe-area-inset-top, 0px) + 12px)` and `calc(env(safe-area-inset-bottom, 0px) + 12px)`) with an elastic `flex-1 min-h-0 relative` middle stage.
2. Replace all `<HandDrawnBox>` (`roughjs` SVG overlays) in `OnboardingFlow.tsx` with clean native rounded cards (`bg-white/95 rounded-3xl shadow-sm p-5 border border-black/5`) inside a scrollable safe container.
3. Strip the name/owner pills and floating speech bubbles from Pet A and Pet B in `CasitaTamagotchi.tsx`, leaving only the pets and their soft oval floor shadow.
4. Upgrade the central Kiss Sender in `PlanetHUD.tsx` to a `w-[76px] h-[76px] -mt-5` 3D glossy coral-pink hero button with idle heartbeat and tap-burst floating hearts.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion.

---

### Task 1: Multi-iPhone Fullscreen & Dynamic Safe Areas
- [x] Verify `index.html` viewport and Apple PWA meta tags.
- [ ] Update `src/index.css` root rules (`position: fixed; inset: 0; height: 100dvh`) and `.safe-top-header` / `.safe-bottom-dock` / `.safe-modal-inset` to `calc(env(safe-area-inset-*, 0px) + 12px)`.
- [ ] Ensure `CasitaTamagotchi.tsx` middle stage uses `flex-1 min-h-0 relative`.

### Task 2: Remove Bugged RoughJS Boxes in Login / Onboarding
- [ ] Remove `HandDrawnBox` from `src/components/OnboardingFlow.tsx` and neutralize `src/components/ui/HandDrawnBox.tsx`.
- [ ] Style Login/Onboarding cards and inputs with clean native classes and vertical scroll (`overflow-y-auto`).

### Task 3: Remove Pet Name Pills & Speech Bubbles in Casita
- [ ] Remove the bottom name/mood pills (`piolin · violett`, `Hachy · alex`) and speech bubbles above Pet A and Pet B in `src/components/buildings/CasitaTamagotchi.tsx`.

### Task 4: Hero Kiss Sender Button Redesign (`76x76px`)
- [ ] Redesign the central kiss button in `src/components/PlanetHUD.tsx` (`w-[76px] h-[76px] -mt-5`, `bg-gradient-to-b from-[#FF8FA3] to-[#FF5D73]`, `border-[3px] border-[#FFF3D6]`, glossy highlight, 3D/SVG heart icon, idle pulse, and floating heart burst on tap).
