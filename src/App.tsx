import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useWorldStore } from './store/useWorldStore';
import { computeSolarEnvironment } from './utils/solarAndTime';
import {
  supabase,
  isSupabaseConfigured,
  pullWorldStateFromSupabase,
  pushWorldStateToSupabase,
  subscribeToWorldRealtime,
  type RealtimeSubscriptionHandle,
  type SyncedWorldSnapshot,
} from './lib/supabaseClient';
import { mergeWorldSnapshots, normalizeRoomCode } from './utils/worldSyncMerge';
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

function extractLocalSnapshot(): SyncedWorldSnapshot {
  const st = useWorldStore.getState();
  return {
    worldId: st.worldId || undefined,
    roomCode: normalizeRoomCode(st.roomCode),
    planetName: st.planetName,
    anniversaryDate: st.anniversaryDate,
    theme: st.theme,
    currency: st.currency,
    lunarMode: st.lunarMode,
    lunarOwner: st.lunarOwner,
    totalKissesHistory: st.totalKissesHistory,
    kissesResetAt: st.kissesResetAt,
    pendingKissBursts: st.pendingKissBursts as unknown as SyncedWorldSnapshot['pendingKissBursts'],
    petA: st.petA as unknown as Record<string, unknown>,
    petB: st.petB as unknown as Record<string, unknown>,
    petCare: st.petCare as unknown as SyncedWorldSnapshot['petCare'],
    diaryPages: st.diaryPages as unknown as SyncedWorldSnapshot['diaryPages'],
    mediaItems: st.mediaItems as unknown as SyncedWorldSnapshot['mediaItems'],
    mapPins: st.mapPins as unknown as SyncedWorldSnapshot['mapPins'],
    cravings: st.cravings as unknown as SyncedWorldSnapshot['cravings'],
    expenses: st.expenses as unknown as SyncedWorldSnapshot['expenses'],
    savingsGoals: st.savingsGoals as unknown as SyncedWorldSnapshot['savingsGoals'],
    lunarA: st.lunarA as unknown as Record<string, unknown>,
    lunarB: st.lunarB as unknown as Record<string, unknown>,
    deletedIds: st.deletedIds,
  };
}

function applyMergedSnapshotToStore(
  remoteSnap: SyncedWorldSnapshot,
  expectedWorldId: string,
  authoritativeReplace = false
) {
  if (!remoteSnap || (remoteSnap.worldId && remoteSnap.worldId !== expectedWorldId)) return;
  try {
    const source = authoritativeReplace
      ? remoteSnap
      : mergeWorldSnapshots(extractLocalSnapshot(), remoteSnap);

    // Actualización directa con setState (NO incrementa localChangeVersion -> cero bucles Realtime -> push)
    useWorldStore.setState((prev) => ({
      lastSyncedWorldId: expectedWorldId,
      planetName: source.planetName || prev.planetName,
      roomCode: source.roomCode ? normalizeRoomCode(source.roomCode) : prev.roomCode,
      anniversaryDate: source.anniversaryDate || prev.anniversaryDate,
      theme: (source.theme as typeof prev.theme) || prev.theme,
      currency: (source.currency as typeof prev.currency) || prev.currency,
      lunarMode: (source.lunarMode as typeof prev.lunarMode) || prev.lunarMode,
      lunarOwner: (source.lunarOwner as typeof prev.lunarOwner) || prev.lunarOwner,
      totalKissesHistory:
        typeof source.totalKissesHistory === 'number'
          ? source.totalKissesHistory
          : prev.totalKissesHistory,
      kissesResetAt:
        typeof source.kissesResetAt === 'number' ? source.kissesResetAt : prev.kissesResetAt,
      pendingKissBursts: Array.isArray(source.pendingKissBursts)
        ? (source.pendingKissBursts as unknown as typeof prev.pendingKissBursts)
        : prev.pendingKissBursts,
      petA:
        source.petA && typeof source.petA === 'object'
          ? { ...prev.petA, ...(source.petA as Partial<typeof prev.petA>) }
          : prev.petA,
      petB:
        source.petB && typeof source.petB === 'object'
          ? { ...prev.petB, ...(source.petB as Partial<typeof prev.petB>) }
          : prev.petB,
      petCare:
        source.petCare && typeof source.petCare === 'object'
          ? { ...prev.petCare, ...(source.petCare as Partial<typeof prev.petCare>) }
          : prev.petCare,
      diaryPages: Array.isArray(source.diaryPages)
        ? (source.diaryPages as unknown as typeof prev.diaryPages)
        : prev.diaryPages,
      mediaItems: Array.isArray(source.mediaItems)
        ? (source.mediaItems as unknown as typeof prev.mediaItems)
        : prev.mediaItems,
      mapPins: Array.isArray(source.mapPins)
        ? (source.mapPins as unknown as typeof prev.mapPins)
        : prev.mapPins,
      cravings: Array.isArray(source.cravings)
        ? (source.cravings as unknown as typeof prev.cravings)
        : prev.cravings,
      expenses: Array.isArray(source.expenses)
        ? (source.expenses as unknown as typeof prev.expenses)
        : prev.expenses,
      savingsGoals: Array.isArray(source.savingsGoals)
        ? (source.savingsGoals as unknown as typeof prev.savingsGoals)
        : prev.savingsGoals,
      lunarA:
        source.lunarA && typeof source.lunarA === 'object'
          ? { ...prev.lunarA, ...(source.lunarA as Partial<typeof prev.lunarA>) }
          : prev.lunarA,
      lunarB:
        source.lunarB && typeof source.lunarB === 'object'
          ? { ...prev.lunarB, ...(source.lunarB as Partial<typeof prev.lunarB>) }
          : prev.lunarB,
      deletedIds: Array.isArray(source.deletedIds) ? source.deletedIds : prev.deletedIds,
    }));
  } catch (err) {
    console.error('[MyWorld Sync] Error aplicando snapshot remoto:', err);
  }
}

export const App: React.FC = () => {
  const {
    onboardingCompleted,
    worldId,
    roomCode,
    theme,
    solarOverride,
    weatherOverride,
    anniversaryDate,
    petA,
    petB,
    activeUser,
    diaryPages,
    activeBuilding,
    setActiveBuilding,
    setAuthSession,
    setSyncMeta,
    syncStatus,
    syncError,
    localChangeVersion,
  } = useWorldStore();

  const [hapticVisualPulse, setHapticVisualPulse] = useState(false);

  const realtimeHandleRef = useRef<RealtimeSubscriptionHandle | null>(null);
  const lastPushedVersionRef = useRef<number>(localChangeVersion);
  const isPushingRef = useRef<boolean>(false);
  const isPullingRef = useRef<boolean>(false);
  const lastReconnectAtRef = useRef<number>(0);

  const solar = computeSolarEnvironment(
    solarOverride,
    weatherOverride,
    anniversaryDate || '2024-06-30',
    petA?.birthday || '1999-04-18',
    petB?.birthday || '1998-11-24'
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

  // Descarga fresca desde Supabase con auto-sanación de world_id y merge no destructivo
  const fetchWorldData = useCallback(
    async (targetWorldId: string, targetRoomCode: string, silent = false) => {
      if (!targetWorldId || isPullingRef.current) return false;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSyncMeta({
          syncStatus: 'offline',
          syncError: 'Sin conexión a internet en este dispositivo.',
        });
        return false;
      }

      isPullingRef.current = true;
      if (!silent) {
        setSyncMeta({ syncStatus: 'syncing' });
      }

      try {
        const res = await pullWorldStateFromSupabase(targetWorldId, targetRoomCode);
        if (!res.ok || !res.data) {
          setSyncMeta({
            syncStatus: 'error',
            syncError: res.error || 'No se pudo leer el planeta desde Supabase.',
          });
          return false;
        }

        const { snapshot, resolvedWorldId, resolvedRoomCode } = res.data;

        // Auto-sanación si el dispositivo tenía un worldId local antiguo distinto al UUID real de la nube
        if (resolvedWorldId && resolvedWorldId !== targetWorldId) {
          useWorldStore.setState({
            worldId: resolvedWorldId,
            roomCode: resolvedRoomCode || normalizeRoomCode(targetRoomCode),
          });
        }

        const hasRemoteContent = Boolean(
          snapshot.diaryPages ||
            snapshot.mediaItems ||
            snapshot.mapPins ||
            snapshot.cravings ||
            snapshot.expenses ||
            snapshot.petA
        );

        if (hasRemoteContent) {
          const stNow = useWorldStore.getState();
          const isFirstSyncForWorld = stNow.lastSyncedWorldId !== resolvedWorldId;
          const hasNoPendingLocalEdits =
            stNow.localChangeVersion <= lastPushedVersionRef.current;
          // Si es la primera vez que este móvil sincroniza este worldId (o al re-vincular código)
          // o no hay ediciones locales pendientes, la nube manda al 100% sin mezclar datos viejos/demo locales.
          applyMergedSnapshotToStore(
            snapshot,
            resolvedWorldId,
            isFirstSyncForWorld || hasNoPendingLocalEdits
          );
        } else {
          // Planeta recién creado en Supabase sin world_state aún -> inicializar nube con estado local
          const initPush = await pushWorldStateToSupabase(
            resolvedWorldId,
            resolvedRoomCode || targetRoomCode,
            extractLocalSnapshot()
          );
          if (!initPush.ok) {
            setSyncMeta({
              syncStatus: 'error',
              syncError: initPush.error || 'Error inicializando estado en Supabase.',
            });
            return false;
          }
          useWorldStore.setState({ lastSyncedWorldId: resolvedWorldId });
        }

        setSyncMeta({
          syncStatus: 'connected',
          syncError: null,
          lastSyncedAt: Date.now(),
        });
        return true;
      } finally {
        isPullingRef.current = false;
      }
    },
    [setSyncMeta]
  );

  // Push seguro con read-merge-write para evitar sobrescrituras destructivas entre móviles
  const pushLocalChanges = useCallback(
    async (targetWorldId: string, targetRoomCode: string) => {
      if (!targetWorldId || isPushingRef.current) return false;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSyncMeta({
          syncStatus: 'offline',
          syncError: 'Sin conexión a internet. Los cambios se enviarán al volver la red.',
        });
        return false;
      }

      isPushingRef.current = true;
      setSyncMeta({ syncStatus: 'syncing' });

      try {
        const localSnap = extractLocalSnapshot();
        // Leer estado remoto más reciente antes de escribir para hacer merge por ID y no machacar cambios de la pareja
        const latestRemote = await pullWorldStateFromSupabase(targetWorldId, targetRoomCode);
        const effectiveWorldId = latestRemote.data?.resolvedWorldId || targetWorldId;
        const effectiveRoomCode =
          latestRemote.data?.resolvedRoomCode || normalizeRoomCode(targetRoomCode);

        const mergedToPush =
          latestRemote.ok && latestRemote.data
            ? mergeWorldSnapshots(latestRemote.data.snapshot, localSnap)
            : localSnap;

        const pushRes = await pushWorldStateToSupabase(
          effectiveWorldId,
          effectiveRoomCode,
          mergedToPush
        );

        if (!pushRes.ok) {
          setSyncMeta({
            syncStatus: 'error',
            syncError: pushRes.error || 'Error guardando cambios en Supabase.',
          });
          return false;
        }

        // Aplicar también cualquier elemento nuevo que la pareja haya añadido mientras tanto
        if (latestRemote.ok && latestRemote.data) {
          applyMergedSnapshotToStore(mergedToPush, effectiveWorldId, true);
        }

        lastPushedVersionRef.current = useWorldStore.getState().localChangeVersion;
        setSyncMeta({
          syncStatus: 'connected',
          syncError: null,
          lastSyncedAt: Date.now(),
        });
        return true;
      } finally {
        isPushingRef.current = false;
      }
    },
    [setSyncMeta]
  );

  // Suscripción Realtime + Reconexión automática iOS PWA (visibilitychange / focus / online) + Polling 18s
  useEffect(() => {
    if (!onboardingCompleted || !worldId) return;

    const setupRealtimeChannel = (wid: string) => {
      realtimeHandleRef.current?.unsubscribe();
      realtimeHandleRef.current = subscribeToWorldRealtime(
        wid,
        (remoteSnap) => {
          const stNow = useWorldStore.getState();
          const hasNoPendingLocalEdits =
            stNow.localChangeVersion <= lastPushedVersionRef.current;
          applyMergedSnapshotToStore(remoteSnap, wid, hasNoPendingLocalEdits);
          setSyncMeta({
            syncStatus: 'connected',
            syncError: null,
            lastSyncedAt: Date.now(),
          });
        },
        (rtStatus, detail) => {
          setSyncMeta({ realtimeStatus: rtStatus });
          if (rtStatus === 'SUBSCRIBED') {
            setSyncMeta({ syncStatus: 'connected', syncError: null });
          } else if (rtStatus === 'ERROR') {
            setSyncMeta({
              syncError: detail ? `Realtime: ${detail}` : 'Canal Realtime desconectado',
            });
          }
        }
      );
    };

    // 1. Descarga inicial fresca + suscripción Realtime
    fetchWorldData(worldId, roomCode);
    setupRealtimeChannel(worldId);

    // 2. Reconexión al volver a primer plano en iOS PWA / cambio de pestaña / recuperar red
    const handleResumeSync = (forceResubscribe = false) => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (!forceResubscribe && now - lastReconnectAtRef.current < 1500) return;
      lastReconnectAtRef.current = now;

      const currentState = useWorldStore.getState();
      const wid = currentState.worldId;
      if (!wid) return;

      fetchWorldData(wid, currentState.roomCode, true);

      const rtStatus = realtimeHandleRef.current?.getStatus();
      if (forceResubscribe || rtStatus !== 'SUBSCRIBED') {
        setupRealtimeChannel(wid);
      }

      // Si quedaron cambios locales pendientes sin subir, empujarlos ahora
      if (currentState.localChangeVersion > lastPushedVersionRef.current) {
        pushLocalChanges(wid, currentState.roomCode);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResumeSync(false);
      }
    };
    const onWindowFocus = () => handleResumeSync(false);
    const onOnline = () => handleResumeSync(true);
    const onOffline = () => {
      setSyncMeta({
        syncStatus: 'offline',
        realtimeStatus: 'DISCONNECTED',
        syncError: 'Sin conexión a internet.',
      });
    };
    const onForceManualSync = () => {
      const st = useWorldStore.getState();
      if (!st.worldId) return;
      setupRealtimeChannel(st.worldId);
      fetchWorldData(st.worldId, st.roomCode, false).then((ok) => {
        if (ok && st.localChangeVersion > lastPushedVersionRef.current) {
          pushLocalChanges(st.worldId!, st.roomCode);
        }
      });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('myworld-force-sync', onForceManualSync);

    // 3. Respaldo ligero cada 18 segundos solo mientras la pestaña/PWA está visible (redes 4G/5G iOS)
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const st = useWorldStore.getState();
      if (!st.worldId) return;
      fetchWorldData(st.worldId, st.roomCode, true);
      if (realtimeHandleRef.current?.getStatus() !== 'SUBSCRIBED') {
        setupRealtimeChannel(st.worldId);
      }
    }, 18000);

    return () => {
      window.clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('myworld-force-sync', onForceManualSync);
      realtimeHandleRef.current?.unsubscribe();
      realtimeHandleRef.current = null;
    };
  }, [onboardingCompleted, worldId, roomCode, fetchWorldData, pushLocalChanges, setSyncMeta]);

  // Push automático con debounce (650ms) SOLO cuando hay mutaciones locales reales (`localChangeVersion`)
  useEffect(() => {
    if (!onboardingCompleted || !worldId) return;
    if (localChangeVersion <= lastPushedVersionRef.current) return;

    const timer = window.setTimeout(() => {
      pushLocalChanges(worldId, roomCode);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [onboardingCompleted, worldId, roomCode, localChangeVersion, pushLocalChanges]);

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
  const hasUnreadDiary = Array.isArray(diaryPages)
    ? diaryPages.some((p) => p && (activeUser === 'userA' ? !p.readByUserA : !p.readByUserB))
    : false;

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
      {/* Aviso no intrusivo cuando falla la conexión o escritura en Supabase */}
      <AnimatePresence>
        {(syncStatus === 'error' || syncStatus === 'offline') && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={() => window.dispatchEvent(new CustomEvent('myworld-force-sync'))}
            title={syncError || 'Sin conexión con la nube'}
            className="fixed top-[max(env(safe-area-inset-top),8px)] left-1/2 -translate-x-1/2 z-[60] px-3.5 py-1.5 rounded-full bg-[#FFEAF0]/95 backdrop-blur-md border border-[#FF9EBB] shadow-md text-[#6B3B4B] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer max-w-[92vw]"
          >
            <CloudOff className="w-3.5 h-3.5 shrink-0 text-[#E0527B]" />
            <span className="truncate">Sin conexión con la nube</span>
            <RefreshCw className="w-3 h-3 shrink-0 opacity-80" />
          </motion.button>
        )}
      </AnimatePresence>

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
