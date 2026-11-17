import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorldStore } from './store/useWorldStore';
import { computeSolarEnvironment } from './utils/solarAndTime';
import {
  supabase,
  isSupabaseConfigured,
  pullWorldStateFromSupabase,
  pushWorldStateToSupabase,
  subscribeToWorldRealtime,
} from './lib/supabaseClient';
import { OnboardingFlow } from './components/OnboardingFlow';
import { LoadingScreen } from './components/LoadingScreen';
import { Planet3DScene } from './components/Planet3DScene';
import { PlanetHUD } from './components/PlanetHUD';
import { SettingsModal } from './components/SettingsModal';
import { CasitaTamagotchi } from './components/buildings/CasitaTamagotchi';
import { BuzonDiario } from './components/buildings/BuzonDiario';
import { CineRetro } from './components/buildings/CineRetro';
import { FaroMapaViajes } from './components/buildings/FaroMapaViajes';
import { FuenteDeseos } from './components/buildings/FuenteDeseos';
import { EdificioCerdito } from './components/buildings/EdificioCerdito';
import { InvernaderoLunar } from './components/buildings/InvernaderoLunar';

export const App: React.FC = () => {
  const {
    onboardingCompleted,
    worldId,
    roomCode,
    planetName,
    theme,
    currency,
    lunarMode,
    lunarOwner,
    solarOverride,
    weatherOverride,
    anniversaryDate,
    totalKissesHistory,
    pendingKissBursts,
    petA,
    petB,
    petCare,
    activeUser,
    diaryPages,
    mediaItems,
    mapPins,
    cravings,
    expenses,
    savingsGoals,
    lunarA,
    lunarB,
    activeBuilding,
    setActiveBuilding,
    setAuthSession,
  } = useWorldStore();

  const [hapticVisualPulse, setHapticVisualPulse] = useState(false);
  const isApplyingRemoteRef = React.useRef(false);

  const solar = computeSolarEnvironment(
    solarOverride,
    weatherOverride,
    anniversaryDate,
    petA.birthday,
    petB.birthday
  );

  // Comprobación de Sesión Persistente de Supabase (Auto-Login)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user && !onboardingCompleted) {
        const u = data.session.user;
        setAuthSession(
          u.id,
          u.email || '',
          u.user_metadata?.full_name || u.email?.split('@')[0] || 'Cariño'
        );
      }
    });
  }, [onboardingCompleted, setAuthSession]);

  // Sincronización Bidireccional en Tiempo Real con Supabase (Aislamiento estricto por `worldId`)
  useEffect(() => {
    if (!onboardingCompleted || !worldId) return;

    const applySnapshot = (snap: Awaited<ReturnType<typeof pullWorldStateFromSupabase>>) => {
      if (!snap || (snap.worldId && snap.worldId !== worldId)) return;
      isApplyingRemoteRef.current = true;
      useWorldStore.setState((prev) => ({
        planetName: snap.planetName || prev.planetName,
        anniversaryDate: snap.anniversaryDate || prev.anniversaryDate,
        theme: (snap.theme as typeof prev.theme) || prev.theme,
        currency: (snap.currency as typeof prev.currency) || prev.currency,
        lunarMode: (snap.lunarMode as typeof prev.lunarMode) || prev.lunarMode,
        lunarOwner: (snap.lunarOwner as typeof prev.lunarOwner) || prev.lunarOwner,
        totalKissesHistory:
          typeof snap.totalKissesHistory === 'number'
            ? snap.totalKissesHistory
            : prev.totalKissesHistory,
        pendingKissBursts: Array.isArray(snap.pendingKissBursts)
          ? (snap.pendingKissBursts as typeof prev.pendingKissBursts)
          : prev.pendingKissBursts,
        petA:
          snap.petA && typeof snap.petA === 'object'
            ? { ...prev.petA, ...(snap.petA as Partial<typeof prev.petA>) }
            : prev.petA,
        petB:
          snap.petB && typeof snap.petB === 'object'
            ? { ...prev.petB, ...(snap.petB as Partial<typeof prev.petB>) }
            : prev.petB,
        petCare:
          snap.petCare && typeof snap.petCare === 'object'
            ? { ...prev.petCare, ...(snap.petCare as Partial<typeof prev.petCare>) }
            : prev.petCare,
        diaryPages: Array.isArray(snap.diaryPages)
          ? (snap.diaryPages as typeof prev.diaryPages).map((p) => ({
              ...p,
              photoDataUrl: p.photoDataUrl?.startsWith('data:image/svg+xml')
                ? undefined
                : p.photoDataUrl,
            }))
          : prev.diaryPages,
        mediaItems: Array.isArray(snap.mediaItems)
          ? (snap.mediaItems as typeof prev.mediaItems)
          : prev.mediaItems,
        mapPins: Array.isArray(snap.mapPins)
          ? (snap.mapPins as typeof prev.mapPins).map((p) => ({
              ...p,
              photoDataUrl: p.photoDataUrl?.startsWith('data:image/svg+xml')
                ? undefined
                : p.photoDataUrl,
            }))
          : prev.mapPins,
        cravings: Array.isArray(snap.cravings)
          ? (snap.cravings as typeof prev.cravings)
          : prev.cravings,
        expenses: Array.isArray(snap.expenses)
          ? (snap.expenses as typeof prev.expenses)
          : prev.expenses,
        savingsGoals: Array.isArray(snap.savingsGoals)
          ? (snap.savingsGoals as typeof prev.savingsGoals)
          : prev.savingsGoals,
        lunarA:
          snap.lunarA && typeof snap.lunarA === 'object'
            ? { ...prev.lunarA, ...(snap.lunarA as Partial<typeof prev.lunarA>) }
            : prev.lunarA,
        lunarB:
          snap.lunarB && typeof snap.lunarB === 'object'
            ? { ...prev.lunarB, ...(snap.lunarB as Partial<typeof prev.lunarB>) }
            : prev.lunarB,
      }));
      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 250);
    };

    pullWorldStateFromSupabase(worldId).then((snap) => {
      if (snap && (snap.diaryPages || snap.mediaItems || snap.petA)) {
        applySnapshot(snap);
      }
    });

    const unsubscribe = subscribeToWorldRealtime(worldId, (snap) => {
      applySnapshot(snap);
    });

    return () => unsubscribe();
  }, [onboardingCompleted, worldId]);

  // Push automático con debounce (650ms) a Supabase filtrado estrictamente por `worldId`
  useEffect(() => {
    if (!onboardingCompleted || !worldId || isApplyingRemoteRef.current) return;
    const timer = setTimeout(() => {
      pushWorldStateToSupabase(worldId, roomCode, {
        worldId,
        planetName,
        anniversaryDate,
        theme,
        currency,
        lunarMode,
        lunarOwner,
        totalKissesHistory,
        pendingKissBursts,
        petA,
        petB,
        petCare,
        diaryPages,
        mediaItems,
        mapPins,
        cravings,
        expenses,
        savingsGoals,
        lunarA,
        lunarB,
      });
    }, 650);
    return () => clearTimeout(timer);
  }, [
    onboardingCompleted,
    worldId,
    roomCode,
    planetName,
    anniversaryDate,
    theme,
    currency,
    lunarMode,
    lunarOwner,
    totalKissesHistory,
    pendingKissBursts,
    petA,
    petB,
    petCare,
    diaryPages,
    mediaItems,
    mapPins,
    cravings,
    expenses,
    savingsGoals,
    lunarA,
    lunarB,
  ]);

  // Sincronizar Tema Pastel, Modo Noche y colores de fondo/barra de estado en el DOM global (sin huecos detrás de la Isla Dinámica o Home Bar)
  const hasActiveLinkedSession = Boolean(onboardingCompleted && worldId);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-night', solar.isNightMode ? 'true' : 'false');

    const topColor = hasActiveLinkedSession ? solar.skyTopColor : '#FFF5EE';
    const bottomColor = hasActiveLinkedSession ? solar.skyBottomColor : '#FFF5EE';
    document.documentElement.style.backgroundColor = topColor;
    document.body.style.backgroundColor = bottomColor;

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', topColor);
    }
  }, [theme, solar.isNightMode, solar.skyTopColor, solar.skyBottomColor, hasActiveLinkedSession]);

  // Fallback visual de latido de corazón para iOS si Navigator.vibrate está restringido
  useEffect(() => {
    const handler = () => {
      setHapticVisualPulse(true);
      setTimeout(() => setHapticVisualPulse(false), 380);
    };
    window.addEventListener('myworld-haptic-pulse', handler);
    return () => window.removeEventListener('myworld-haptic-pulse', handler);
  }, []);

  // Comprobar si hay una Polaroid o dibujo nuevo sin leer en el Buzón para que asome físicamente en el 3D
  const hasUnreadDiary = diaryPages.some((p) =>
    activeUser === 'userA' ? !p.readByUserA : !p.readByUserB
  );

  // Si NO hay sesión guardada o aún no tiene Planeta vinculado (`worldId`) -> Mostrar Flujo de Login / Vinculación
  if (!hasActiveLinkedSession) {
    return <OnboardingFlow />;
  }

  return (
    <div
      className={`fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden overscroll-none select-none transition-[background,transform] duration-500 ${
        hapticVisualPulse ? 'scale-[1.008]' : ''
      }`}
      style={{
        background: `linear-gradient(180deg, ${solar.skyTopColor} 0%, ${solar.skyBottomColor} 100%)`,
      }}
    >
      {/* 1. Pantalla de Carga con saludo de las 2 mascotas y transición de aterrizaje */}
      <LoadingScreen />

      {/* 2 & 3. Estructura Flex Vertical en 3 Zonas (Header + Planeta 3D Centrado + Dock Compacto) */}
      <PlanetHUD solar={solar} hasUnreadDiary={hasUnreadDiary}>
        <Planet3DScene
          solar={solar}
          hasUnreadDiary={hasUnreadDiary}
          onBuildingSelect={(b) => setActiveBuilding(b)}
        />
      </PlanetHUD>

      {/* 4. Módulos Interiores de los 7 Edificios con Físicas Elásticas */}
      <AnimatePresence>
        {activeBuilding && (
          <motion.div
            key={activeBuilding}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="fixed inset-0 w-screen h-[100dvh] z-40 flex flex-col overflow-hidden overscroll-none"
          >
            {activeBuilding === 'casita' && (
              <CasitaTamagotchi solar={solar} onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'correos' && (
              <BuzonDiario onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'cine' && (
              <CineRetro onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'viajes' && (
              <FaroMapaViajes onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'deseos' && (
              <FuenteDeseos onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'hucha' && (
              <EdificioCerdito onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'luna' && (
              <InvernaderoLunar onClose={() => setActiveBuilding(null)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Modal de Ajustes, Temas Pastel, Código de 6 Caracteres, iOS Push, Álbum PDF y Cerrar Sesión */}
      <SettingsModal />
    </div>
  );
};

export default App;
