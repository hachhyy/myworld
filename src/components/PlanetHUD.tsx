import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX, Settings, Sparkles, Pencil } from 'lucide-react';
import {
  BuildingId,
  KissIconType,
  PendingKissBurst,
  useWorldStore,
} from '../store/useWorldStore';
import {
  calculateRelationshipDuration,
  daysUntilNextDate,
  SolarEnvironment,
} from '../utils/solarAndTime';
import { soundEngine, triggerHeartbeatHaptic } from '../utils/soundAndHaptics';
import { CuteOvuloAvatar } from './characters/CuteOvuloAvatar';

const RAIN_EMOJIS: Record<KissIconType, string> = {
  corazones: '❤️',
  pintalabios: '💋',
  gatitos: '🐱',
  estrellas: '🌟',
  abrazos: '🫂',
};

function rollNextRainThreshold(): number {
  // Umbral variado entre 5 y 15 besos para que la lluvia de corazones sorprenda en distintos números
  return 5 + Math.floor(Math.random() * 11);
}

interface PlanetHUDProps {
  solar: SolarEnvironment;
  hasUnreadDiary: boolean;
  children?: React.ReactNode;
}

export const PlanetHUD: React.FC<PlanetHUDProps> = ({ solar, hasUnreadDiary, children }) => {
  const {
    planetName,
    anniversaryDate,
    setAnniversaryDate,
    activeUser,
    isMuted,
    toggleMute,
    setSettingsOpen,
    anniversaryModalOpen,
    setAnniversaryModalOpen,
    totalKissesHistory,
    pendingKissBursts,
    incrementKissLocal,
    flushKissBatch,
    consumePendingKissesForActiveUser,
    petA,
    petB,
    setCoupleNames,
    updatePetProfile,
    setActiveUser,
    mediaItems,
    lunarMode,
    lunarOwner,
    lunarA,
    lunarB,
    setActiveBuilding,
  } = useWorldStore();

  const prefersReducedMotion = useReducedMotion();
  const duration = calculateRelationshipDuration(anniversaryDate);

  // Estado del sistema instantáneo de labios + combo hacia lluvia automática en umbrales variados
  const [comboCount, setComboCount] = useState(0);
  const [rainThreshold, setRainThreshold] = useState<number>(() => rollNextRainThreshold());
  const [lipTiltDir, setLipTiltDir] = useState<-6 | 6>(-6);
  const [activeRainBursts, setActiveRainBursts] = useState<PendingKissBurst[]>([]);
  const [ovuloBubbleOpen, setOvuloBubbleOpen] = useState(true);
  const [tapFloatingHearts, setTapFloatingHearts] = useState<
    { id: number; dx: number; dy: number; rot: number; emoji: string }[]
  >([]);

  const pendingBatchCountRef = useRef(0);
  const batchTimerRef = useRef<number | null>(null);
  const comboResetTimerRef = useRef<number | null>(null);

  // Modal rápido de Motes de la Pareja, Mascotas y ¿Quién soy yo?
  const [motesModalOpen, setMotesModalOpen] = useState(false);
  const [draftNameA, setDraftNameA] = useState(petA.ownerName);
  const [draftNameB, setDraftNameB] = useState(petB.ownerName);
  const [draftPetA, setDraftPetA] = useState(petA.petName);
  const [draftPetB, setDraftPetB] = useState(petB.petName);
  const [hasDynamicIsland, setHasDynamicIsland] = useState(false);

  // Detectar Isla Dinámica mediante geometría real de safe-area-inset-top (iPhone 14 Pro / 15 / 16 Pro: >= 54px)
  useEffect(() => {
    const checkIsland = () => {
      const sat = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'
      );
      setHasDynamicIsland(sat >= 54);
    };
    checkIsland();
    window.addEventListener('resize', checkIsland);
    return () => window.removeEventListener('resize', checkIsland);
  }, []);

  // Vaciar cualquier lote de besos pendiente al desmontar
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) window.clearTimeout(batchTimerRef.current);
      if (comboResetTimerRef.current) window.clearTimeout(comboResetTimerRef.current);
      if (pendingBatchCountRef.current > 0) {
        flushKissBatch(false);
        pendingBatchCountRef.current = 0;
      }
    };
  }, [flushKissBatch]);

  // Al abrir la app, alternar usuario o recibir lluvia de corazones y besos en tiempo real desde el móvil de la pareja
  useEffect(() => {
    const pending = consumePendingKissesForActiveUser();
    if (pending.length > 0) {
      triggerHeartbeatHaptic('kiss-rain-received');
      soundEngine.playChime();
      setActiveRainBursts(pending);
      const t = window.setTimeout(() => setActiveRainBursts([]), 6000);
      return () => window.clearTimeout(t);
    }
  }, [activeUser, pendingKissBursts.length, consumePendingKissesForActiveUser]);

  const handleTapLips = () => {
    // 1. +1 inmediato al contador global acumulado del planeta (nunca se reinicia)
    incrementKissLocal();
    setLipTiltDir((prev) => (prev === -6 ? 6 : -6));

    const nextCombo = comboCount + 1;
    const progress = Math.min(1, nextCombo / Math.max(1, rainThreshold));
    soundEngine.playPop(0.96 + progress * 0.45);
    triggerHeartbeatHaptic('kiss-tap');

    // 2. Partículas de corazones y besos saliendo directamente de los labios hacia el planeta
    const now = Date.now();
    const spawned = [
      { id: now + Math.random(), dx: -28 + Math.random() * 14, dy: -78 - Math.random() * 26, rot: -18, emoji: '💋' },
      { id: now + Math.random() + 1, dx: -6 + Math.random() * 12, dy: -98 - Math.random() * 30, rot: 8, emoji: '💖' },
      { id: now + Math.random() + 2, dx: 14 + Math.random() * 18, dy: -72 - Math.random() * 24, rot: 20, emoji: '❤️' },
    ];
    setTapFloatingHearts((prev) => [...prev.slice(-15), ...spawned]);
    window.setTimeout(() => {
      setTapFloatingHearts((prev) => prev.filter((p) => !spawned.some((s) => s.id === p.id)));
    }, 900);

    // Reiniciar temporizador de decaimiento visual del combo tras 4.5s sin pulsar
    if (comboResetTimerRef.current) window.clearTimeout(comboResetTimerRef.current);

    // 3. Umbral automático variado de Lluvia de Corazones y Besos (sin reiniciar el contador global)
    if (nextCombo >= rainThreshold) {
      const triggeredCount = nextCombo;
      setComboCount(0);
      setRainThreshold(rollNextRainThreshold());
      pendingBatchCountRef.current = 0;
      if (batchTimerRef.current) {
        window.clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }

      flushKissBatch(true, triggeredCount);

      // Celebración inmediata de lluvia de corazones en este móvil
      setActiveRainBursts([
        {
          id: `local-rain-${Date.now()}`,
          from: activeUser,
          count: triggeredCount,
          iconType: 'corazones',
          miniNote: '¡Lluvia de corazones!',
          timestamp: Date.now(),
        },
      ]);
      window.setTimeout(() => setActiveRainBursts([]), 5500);
      return;
    }

    setComboCount(nextCombo);
    comboResetTimerRef.current = window.setTimeout(() => {
      setComboCount(0);
    }, 4500);

    // 4. Sincronización inteligente por lotes (cada 5 toques o tras 600ms de pausa)
    pendingBatchCountRef.current += 1;
    if (pendingBatchCountRef.current >= 5) {
      pendingBatchCountRef.current = 0;
      if (batchTimerRef.current) {
        window.clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
      flushKissBatch(false);
    } else {
      if (batchTimerRef.current) window.clearTimeout(batchTimerRef.current);
      batchTimerRef.current = window.setTimeout(() => {
        if (pendingBatchCountRef.current > 0) {
          pendingBatchCountRef.current = 0;
          flushKissBatch(false);
        }
        batchTimerRef.current = null;
      }, 600);
    }
  };

  // Horas de cine calculadas
  const watchedHours = Math.round(
    mediaItems
      .filter((m) => m.status === 'watched')
      .reduce((acc, m) => acc + m.durationMin * Math.max(1, m.episode), 0) / 60
  );

  // Perfil lunar principal para el Óvulo Cute Mensajero
  const primaryLunar = lunarOwner === 'userB' ? lunarB : lunarA;

  // Mensaje empático del Óvulo Cute
  const ovuloMessage =
    primaryLunar.phase === 'menstruacion' || primaryLunar.cramps !== 'Sin dolor'
      ? `¡Hola! Hoy ${primaryLunar.ownerName} está en días de regla (día ${primaryLunar.dayOfCycle}) con ${primaryLunar.cramps.toLowerCase()}. Ideal llevarle ${primaryLunar.craving.toLowerCase()} y darle muchos mimos 💕`
      : `¡Hola! Hoy ${primaryLunar.ownerName} está en fase ${primaryLunar.phase} con humor ${primaryLunar.mood.toLowerCase()} y antojo de ${primaryLunar.craving.toLowerCase()} ✨`;

  return (
    <>
      {/* 1. ESCENARIO 3D EDGE-TO-EDGE REAL (por detrás de la Isla Dinámica y la barra Home) */}
      <div className="fixed inset-0 w-full h-full z-0 overflow-hidden">
        {children}
      </div>

      {/* 2. BLOQUE SUPERIOR ANCLADO AL BORDE REAL DE iOS */}
      <header
        className="fixed z-30 left-3 right-3 max-w-md mx-auto flex flex-col gap-1.5 pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 6px)' }}
      >
        {hasDynamicIsland && (
          <div className="flex justify-center -mt-1 mb-0.5">
            <span className="px-3 py-0.5 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-[10px] font-bold tracking-wide text-white/90 flex items-center gap-1 shadow-xs">
              <span>🪐</span>
              <span className="truncate max-w-[180px]">MyWorld · {planetName}</span>
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 w-full pointer-events-auto">
          {/* Botón de Silencio Rápido */}
          <motion.button
            whileTap={{ scale: 0.9, rotate: -2 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
            onClick={toggleMute}
            aria-label="Silenciar o activar sonido"
            className="hand-button w-9 h-9 flex items-center justify-center bg-[var(--glass-bg)] cursor-pointer shrink-0"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </motion.button>

          {/* Contador de Tiempo de Relación y Nombre del Planeta */}
          <motion.button
            whileTap={{ scale: 0.94, rotate: -0.5 }}
            transition={{ type: 'spring', stiffness: 360, damping: 18 }}
            onClick={() => setAnniversaryModalOpen(true)}
            className="flex-1 min-w-0 hand-card px-3 py-1 text-center cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-center gap-1.5 leading-tight">
              <span className="text-xs shrink-0">🪐</span>
              <span className="font-bold text-xs truncate">{planetName}</span>
            </div>
            <p className="text-[10px] font-medium text-[var(--text-muted)] truncate leading-tight">
              {duration.years} años, {duration.months} meses, {duration.days} días 💕
            </p>
          </motion.button>

          {/* Botón de Ajustes */}
          <motion.button
            whileTap={{ scale: 0.9, rotate: 2 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
            onClick={() => setSettingsOpen(true)}
            aria-label="Abrir ajustes del planeta"
            className="hand-button w-9 h-9 flex items-center justify-center bg-[var(--glass-bg)] cursor-pointer shrink-0"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Fila 2: Izquierda = Motes de Pareja | Derecha = Momento del día + Contador de besos debajo + Óvulo */}
        <div className="flex items-start justify-between gap-2 w-full">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              setDraftNameA(petA.ownerName);
              setDraftNameB(petB.ownerName);
              setDraftPetA(petA.petName);
              setDraftPetB(petB.petName);
              setMotesModalOpen(true);
              soundEngine.playPop();
            }}
            className="pointer-events-auto hand-pill px-3 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer min-w-0 truncate"
          >
            <span className="truncate">💑 {petA.ownerName} & {petB.ownerName}</span>
            <span className="opacity-75 shrink-0">· Soy {activeUser === 'userA' ? petA.ownerName : petB.ownerName} ✏️</span>
          </motion.button>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {/* Píldora del momento del día */}
            <span className="pointer-events-auto hand-pill backdrop-blur-md px-3 py-1 text-xs font-semibold shrink-0 leading-tight">
              {solar.label} {solar.weather === 'snow' ? '· ❄️ Nieve' : solar.weather === 'fireworks' ? '· 🎆 Fuegos' : ''}
            </span>

            {/* Contador de besos justo debajo del momento del día, alineado a la derecha */}
            <div
              className="pointer-events-auto hand-pill backdrop-blur-md text-xs px-3 py-1 font-bold tabular-nums flex items-center gap-1.5 leading-tight"
              title="Total de besos enviados y recibidos en vuestro planeta"
            >
              <span aria-hidden="true">💋</span>
              <span>{totalKissesHistory.toLocaleString('es-ES')}</span>
            </div>

            {/* Asomo discreto del Óvulo Cute justo debajo del contador */}
            {(primaryLunar.sensitiveAlertActive || primaryLunar.phase === 'menstruacion') &&
              lunarMode !== 'hidden' && (
                <motion.div
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                  className="pointer-events-auto flex items-center max-w-[235px] mt-0.5"
                >
                  <AnimatePresence>
                    {ovuloBubbleOpen && (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          soundEngine.speakAnimalese(ovuloMessage, 510);
                          setActiveBuilding('luna');
                        }}
                        className="hand-card px-3 py-2 mr-1.5 cursor-pointer text-left"
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFD2DE] text-[#4A3F35]">
                            Óvulo Cute 💕
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOvuloBubbleOpen(false);
                            }}
                            className="text-xs opacity-60 hover:opacity-100 px-1"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="font-hand text-[14px] leading-tight">{ovuloMessage}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    whileTap={{ scale: 0.88, rotate: -3 }}
                    onClick={() => {
                      setOvuloBubbleOpen(!ovuloBubbleOpen);
                      soundEngine.speakAnimalese('Hola parejita linda', 520);
                    }}
                    className="w-11 h-11 flex items-center justify-center cursor-pointer shrink-0"
                    title="Toca al Óvulo Cute"
                  >
                    <CuteOvuloAvatar phase={primaryLunar.phase} size={44} />
                  </motion.div>
                </motion.div>
              )}
          </div>
        </div>
      </header>

      {/* 3. BLOQUE INFERIOR ANCLADO PEGADO AL BORDE REAL DE iOS: 2 FILAS DE UBICACIONES + LABIOS 💋 */}
      <footer
        className="fixed z-30 left-3 right-3 max-w-md mx-auto flex flex-col items-center gap-2 pointer-events-none"
        style={{ bottom: 'max(8px, calc(env(safe-area-inset-bottom, 0px) * 0.45))' }}
      >
        {/* Todas las ubicaciones visibles en 2 filas compactas y centradas (sin scroll horizontal) */}
        <div className="pointer-events-auto w-full flex flex-wrap justify-center gap-2">
          {[
            { id: 'casita', label: '🏡 Casita', badge: false },
            { id: 'correos', label: '📮 Correos', badge: hasUnreadDiary },
            { id: 'cine', label: '🍿 Cine', badge: false },
            { id: 'viajes', label: '🎈 Viajes', badge: false },
            { id: 'deseos', label: '🧁 Deseos', badge: false },
            { id: 'hucha', label: '🐷 Hucha', badge: false },
            ...(lunarMode !== 'hidden' ? [{ id: 'luna', label: '🌙 Luna', badge: false }] : []),
          ].map((b) => (
            <motion.button
              key={b.id}
              whileTap={{ scale: 0.92, rotate: -1.5 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              onClick={() => setActiveBuilding(b.id as BuildingId)}
              className="relative hand-pill backdrop-blur-md text-xs px-3 py-1.5 font-semibold shrink-0 cursor-pointer flex items-center gap-1"
            >
              <span>{b.label}</span>
              {b.badge && (
                <span
                  className="w-2 h-2 rounded-full bg-[#FF6B8B] animate-ping"
                  title="¡Polaroid nueva asomando en el buzón!"
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* Labios directos estilo emoji 💋 (marca de beso glossy inclinada, sin botón circular ni texto) */}
        <div className="pointer-events-auto relative flex items-center justify-center shrink-0">
          {/* Halo de brillo orgánico ultra sutil que crece según el combo hacia la lluvia */}
          {comboCount > 0 && (
            <motion.span
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{
                opacity: 0.18 + Math.min(1, comboCount / Math.max(1, rainThreshold)) * 0.44,
                scale: 0.95 + Math.min(1, comboCount / Math.max(1, rainThreshold)) * 0.25,
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="pointer-events-none absolute w-[86px] h-[54px] rounded-full blur-xl bg-[#FF3B6B]"
            />
          )}

          {/* Partículas de corazones y besos saliendo directamente desde los labios hacia el planeta */}
          <AnimatePresence>
            {tapFloatingHearts.map((h) => (
              <motion.span
                key={h.id}
                initial={{ opacity: 1, x: 0, y: -4, scale: 0.65, rotate: 0 }}
                animate={{
                  opacity: [1, 1, 0],
                  x: h.dx,
                  y: h.dy,
                  scale: [0.75, 1.25, 0.95],
                  rotate: h.rot,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
                className="pointer-events-none absolute -top-2 z-40 text-lg select-none drop-shadow-sm"
              >
                {h.emoji}
              </motion.span>
            ))}
          </AnimatePresence>

          <motion.button
            type="button"
            whileTap={{ scale: 0.82, rotate: lipTiltDir }}
            animate={
              prefersReducedMotion
                ? { scale: 1 }
                : comboCount > 0
                  ? { scale: 1.03 + Math.min(1, comboCount / Math.max(1, rainThreshold)) * 0.08 }
                  : { scale: [1, 1.035, 1] }
            }
            transition={
              comboCount > 0 || prefersReducedMotion
                ? { type: 'spring', stiffness: 520, damping: 14 }
                : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
            }
            onClick={handleTapLips}
            aria-label="Enviar beso"
            className="relative z-10 bg-transparent border-0 p-0 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3] rounded-full"
            style={{
              filter: `drop-shadow(0 6px 16px rgba(255, 59, 107, ${
                0.45 + Math.min(1, comboCount / Math.max(1, rainThreshold)) * 0.3
              }))`,
            }}
          >
            {/* Marca de beso 💋 fiel al emoji: labios separados con arco de Cupido marcado e inclinación natural */}
            <svg
              viewBox="0 0 100 72"
              width={76}
              className="block w-[76px] h-auto overflow-visible -rotate-6"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="kissMarkUpper" x1="15%" y1="0%" x2="85%" y2="100%">
                  <stop offset="0%" stopColor="#FF5C7C" />
                  <stop offset="48%" stopColor="#F22952" />
                  <stop offset="100%" stopColor="#C81038" />
                </linearGradient>
                <linearGradient id="kissMarkLower" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#FF4D73" />
                  <stop offset="55%" stopColor="#E61C47" />
                  <stop offset="100%" stopColor="#B50D32" />
                </linearGradient>
                <linearGradient id="kissMarkSheen" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.82" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Labio superior estilo 💋 con arco de Cupido pronunciado y comisuras afiladas */}
              <path
                d="M7 33 C14 24, 24 10, 37 11 C43 11.5, 47 16.5, 50 20 C53 16.5, 57 11.5, 63 11 C76 10, 86 24, 93 33 C84 34, 72 30.5, 50 29.5 C28 30.5, 16 34, 7 33 Z"
                fill="url(#kissMarkUpper)"
              />

              {/* Labio inferior separado (abertura central natural de la marca de beso 💋) */}
              <path
                d="M11 38.5 C24 41.5, 38 42.5, 50 42.5 C62 42.5, 76 41.5, 89 38.5 C83 55, 69 65, 50 65 C31 65, 17 55, 11 38.5 Z"
                fill="url(#kissMarkLower)"
              />

              {/* Pequeñas marcas sutiles de textura labial como el emoji 💋 */}
              <path
                d="M35 16 C35.5 21, 35 25, 34 28 M65 16 C64.5 21, 65 25, 66 28 M42 45 C42 52, 41 58, 40 62 M58 45 C58 52, 59 58, 60 62"
                fill="none"
                stroke="#960B2A"
                strokeOpacity="0.28"
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              {/* Brillo glossy suave en el arco superior */}
              <ellipse
                cx="34"
                cy="18.5"
                rx="7.5"
                ry="2.8"
                transform="rotate(-16 34 18.5)"
                fill="url(#kissMarkSheen)"
              />
              <ellipse
                cx="66"
                cy="18.5"
                rx="6.2"
                ry="2.4"
                transform="rotate(16 66 18.5)"
                fill="url(#kissMarkSheen)"
                opacity="0.72"
              />

              {/* Brillo jugoso curvo en el labio inferior */}
              <path
                d="M32 52.5 C41 57.5, 59 57.5, 68 52"
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity="0.78"
                strokeWidth="3.8"
                strokeLinecap="round"
              />
              <circle cx="24" cy="49" r="2.1" fill="#FFFFFF" fillOpacity="0.72" />
            </svg>
          </motion.button>
        </div>
      </footer>

      {/* 4. LLUVIA FÍSICA DE BESOS Y NOTA FLOTANTE DESLIZABLE (SWIPE-TO-DISMISS) */}
      <AnimatePresence>
        {activeRainBursts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none overflow-hidden"
          >
            {activeRainBursts.map((burst) => {
              const iconEmoji = RAIN_EMOJIS[burst.iconType] || '💋';
              const drops = Array.from({ length: Math.min(45, Math.max(14, burst.count)) });
              return (
                <React.Fragment key={burst.id}>
                  {/* Nota flotante deslizable (Swipe-to-dismiss con físicas spring) */}
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.85}
                    onDragEnd={(_, info) => {
                      if (Math.abs(info.offset.x) > 55 || Math.abs(info.velocity.x) > 260) {
                        soundEngine.playPop(0.9);
                        setActiveRainBursts((prev) => prev.filter((b) => b.id !== burst.id));
                      }
                    }}
                    initial={{ y: -40, scale: 0.8, opacity: 0 }}
                    animate={{ y: 102, scale: 1, opacity: 1 }}
                    exit={{ x: 260, opacity: 0, scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="mx-auto w-fit max-w-[90vw] hand-card px-5 py-3 text-center pointer-events-auto cursor-grab active:cursor-grabbing relative"
                  >
                    <button
                      onClick={() => {
                        soundEngine.playPop(0.9);
                        setActiveRainBursts((prev) => prev.filter((b) => b.id !== burst.id));
                      }}
                      className="absolute top-2 right-2.5 text-[11px] opacity-55 hover:opacity-100 px-1 cursor-pointer"
                      aria-label="Cerrar aviso de besos"
                    >
                      ✕
                    </button>
                    <p className="text-xs font-bold text-[var(--text-muted)] pr-3">
                      ¡Lluvia de {burst.count} besos!
                    </p>
                    <p className="font-hand text-2xl font-bold mt-0.5">
                      «{burst.miniNote}» {iconEmoji}
                    </p>
                    <p className="text-[9px] font-semibold text-[var(--text-muted)] opacity-70 mt-0.5">
                      ↔ Desliza hacia un lado para descartar
                    </p>
                  </motion.div>

                  {/* Corazones y besos cayendo físicamente sobre el planeta */}
                  {drops.map((_, idx) => {
                    const leftPct = (idx * 19 + (idx % 5) * 7) % 92;
                    const delay = (idx % 12) * 0.12;
                    const dropSymbols = ['❤️', '💖', '💋', '💕'];
                    const dropEmoji =
                      burst.iconType === 'corazones'
                        ? dropSymbols[idx % dropSymbols.length]
                        : iconEmoji;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ y: -40, x: `${leftPct}vw`, rotate: -15, opacity: 1 }}
                        animate={{
                          y: '102vh',
                          rotate: idx % 2 === 0 ? 25 : -25,
                          opacity: [1, 1, 0.85, 0],
                        }}
                        transition={{ duration: 2.8 + (idx % 4) * 0.35, delay, ease: 'easeIn' }}
                        className="fixed top-0 text-3xl select-none"
                      >
                        {dropEmoji}
                      </motion.div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. MODAL DE ANIVERSARIO, CUMPLEAÑOS E HITOS AUTOMÁTICOS */}
      <AnimatePresence>
        {anniversaryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAnniversaryModalOpen(false)}
            className="fixed inset-0 z-50 bg-[#4A3F35]/25 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.88, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="hand-card watercolor-paper w-full max-w-sm p-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Nuestra Historia Juntos
                </h2>
                <button
                  onClick={() => setAnniversaryModalOpen(false)}
                  className="hand-pill px-2.5 py-0.5 text-xs font-bold cursor-pointer"
                >
                  Cerrar ✕
                </button>
              </div>

              <div className="hand-card p-3.5 mb-4 text-center bg-[var(--bg-secondary)]">
                <label className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] cursor-pointer relative">
                  <span>
                    Desde el{' '}
                    {new Date(`${anniversaryDate}T12:00:00`).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <Pencil className="w-3 h-3 text-[#FF7A9E] shrink-0" />
                  <input
                    type="date"
                    aria-label="Editar fecha de inicio de la relación"
                    value={anniversaryDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setAnniversaryDate(e.target.value);
                        soundEngine.playPop(1.1);
                      }
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
                <p className="text-2xl font-bold mt-1">
                  {duration.years} años · {duration.months} meses · {duration.days} días
                </p>
                <p className="font-hand text-xl text-[var(--accent-secondary)] mt-0.5">
                  ({duration.totalDays.toLocaleString('es-ES')} amaneceres compartidos)
                </p>
              </div>

              {/* Cuenta atrás para cumpleaños (editables al instante con un toque) */}
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                🎂 Cuenta atrás de Cumpleaños
              </h3>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {(
                  [
                    { key: 'userA' as const, pet: petA },
                    { key: 'userB' as const, pet: petB },
                  ] as const
                ).map(({ key, pet }) => {
                  const daysLeft = daysUntilNextDate(pet.birthday);
                  return (
                    <label
                      key={key}
                      className="hand-card p-2.5 text-center relative cursor-pointer hover:ring-2 hover:ring-[#FFB7C5]/80 transition-all block"
                    >
                      <p className="text-xs font-bold flex items-center justify-center gap-1">
                        <span>{pet.ownerName}</span>
                        <Pencil className="w-3 h-3 text-[#FF7A9E] shrink-0" />
                      </p>
                      <p className="text-lg font-bold text-[var(--accent-secondary)] leading-tight mt-0.5">
                        {daysLeft === 0
                          ? '¡Es hoy! 🎂'
                          : daysLeft === 1
                            ? 'Falta 1 día'
                            : `Faltan ${daysLeft} días`}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {pet.birthday}
                      </p>
                      <input
                        type="date"
                        aria-label={`Editar cumpleaños de ${pet.ownerName}`}
                        value={pet.birthday}
                        onChange={(e) => {
                          if (e.target.value) {
                            updatePetProfile(key, { birthday: e.target.value });
                            soundEngine.playPop(1.15);
                          }
                        }}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>

              {/* Hitos Automáticos Calculados */}
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                🏆 Hitos de Nuestro Mundo
              </h3>
              <div className="space-y-2">
                <div className="hand-card p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🗓️</span>
                    <div>
                      <p className="text-xs font-bold">1.000 días juntos</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Lleváis {duration.totalDays} días de aventuras
                      </p>
                    </div>
                  </div>
                  <span className="hand-pill px-2 py-0.5 text-[10px] font-bold bg-emerald-200/80 text-emerald-900">
                    {duration.totalDays >= 1000
                      ? '¡Conseguido! ✨'
                      : `${Math.round((duration.totalDays / 1000) * 100)}%`}
                  </span>
                </div>

                <div className="hand-card p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🍿</span>
                    <div>
                      <p className="text-xs font-bold">500 horas de cine y series</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {watchedHours} h registradas en vuestro Cine Retro
                      </p>
                    </div>
                  </div>
                  <span className="hand-pill px-2 py-0.5 text-[10px] font-bold bg-amber-200/80 text-amber-900">
                    {watchedHours} / 500 h
                  </span>
                </div>

                <div className="hand-card p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">💋</span>
                    <div>
                      <p className="text-xs font-bold">10.000 besos enviados</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {totalKissesHistory.toLocaleString('es-ES')} besos llovidos en el planeta
                      </p>
                    </div>
                  </div>
                  <span className="hand-pill px-2 py-0.5 text-[10px] font-bold bg-rose-200/80 text-rose-900">
                    {Math.min(100, Math.round((totalKissesHistory / 10000) * 100))}%
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. MODAL RÁPIDO DE MOTES CARIÑOSOS DE LA PAREJA Y ¿QUIÉN SOY YO? */}
      <AnimatePresence>
        {motesModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMotesModalOpen(false)}
            className="fixed inset-0 z-50 bg-[#4A3F35]/25 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="hand-card w-full max-w-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">💑 Nuestros Motes Cariñosos</h2>
                <motion.button
                  whileTap={{ scale: 0.9, rotate: -2 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 16 }}
                  onClick={() => setMotesModalOpen(false)}
                  className="hand-pill px-3 py-1 text-xs font-bold cursor-pointer"
                >
                  Cerrar
                </motion.button>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Estos motes aparecerán en la Casita, el Cine, la Hucha, el Diario y el Invernadero Lunar.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Mote Persona 1:</label>
                  <input
                    type="text"
                    value={draftNameA}
                    onChange={(e) => setDraftNameA(e.target.value)}
                    placeholder="Ej. Alex, Bichito..."
                    className="w-full px-3 py-2 rounded-2xl border border-[#FFB7C5]/55 bg-[var(--input-bg)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Mote Persona 2:</label>
                  <input
                    type="text"
                    value={draftNameB}
                    onChange={(e) => setDraftNameB(e.target.value)}
                    placeholder="Ej. Cris, Cielo..."
                    className="w-full px-3 py-2 rounded-2xl border border-[#FFB7C5]/55 bg-[var(--input-bg)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">🐾 Mascota 1:</label>
                  <input
                    type="text"
                    value={draftPetA}
                    onChange={(e) => setDraftPetA(e.target.value)}
                    placeholder="Ej. Mochi"
                    className="w-full px-3 py-2 rounded-2xl border border-[#FFB7C5]/55 bg-[var(--input-bg)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">🐾 Mascota 2:</label>
                  <input
                    type="text"
                    value={draftPetB}
                    onChange={(e) => setDraftPetB(e.target.value)}
                    placeholder="Ej. Kumo / DinoBoli"
                    className="w-full px-3 py-2 rounded-2xl border border-[#FFB7C5]/55 bg-[var(--input-bg)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5">
                  📱 ¿Quién soy yo en este móvil?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.92, rotate: -1.5 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                    onClick={() => setActiveUser('userA')}
                    className={`hand-button rounded-2xl py-2 text-xs font-bold cursor-pointer ${
                      activeUser === 'userA'
                        ? 'glossy-pink-cta font-extrabold'
                        : 'bg-[var(--glass-bg)] opacity-85'
                    }`}
                  >
                    Soy {draftNameA || 'Alex'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.92, rotate: -1.5 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                    onClick={() => setActiveUser('userB')}
                    className={`hand-button rounded-2xl py-2 text-xs font-bold cursor-pointer ${
                      activeUser === 'userB'
                        ? 'glossy-pink-cta font-extrabold'
                        : 'bg-[var(--glass-bg)] opacity-85'
                    }`}
                  >
                    Soy {draftNameB || 'Cris'}
                  </motion.button>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.92, rotate: -1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 15 }}
                onClick={() => {
                  setCoupleNames(draftNameA, draftNameB);
                  if (draftPetA.trim()) {
                    updatePetProfile('userA', { petName: draftPetA.trim() });
                  }
                  if (draftPetB.trim()) {
                    updatePetProfile('userB', { petName: draftPetB.trim() });
                  }
                  soundEngine.playChime();
                  setMotesModalOpen(false);
                }}
                className="hand-button glossy-pink-cta w-full py-2.5 rounded-full font-bold text-sm cursor-pointer"
              >
                Guardar motes en todo el planeta ✨
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
