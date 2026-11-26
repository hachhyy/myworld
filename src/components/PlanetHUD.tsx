import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Settings, Sparkles, Heart, Send, RotateCcw, Pencil } from 'lucide-react';
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
  corazones: '💋',
  pintalabios: '💋',
  gatitos: '🐱',
  estrellas: '🌟',
  abrazos: '🫂',
};

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
    kissCooldownUntil,
    pendingKissBursts,
    sendKissBurst,
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

  const duration = calculateRelationshipDuration(anniversaryDate);

  // Estado del botón único de beso
  const [spamCount, setSpamCount] = useState(0);
  const [miniNote, setMiniNote] = useState('¡Te echo de menos!');
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState(0);
  const [activeRainBursts, setActiveRainBursts] = useState<PendingKissBurst[]>([]);
  const [ovuloBubbleOpen, setOvuloBubbleOpen] = useState(true);
  const [tapFloatingHearts, setTapFloatingHearts] = useState<
    { id: number; dx: number; dy: number; rot: number; emoji: string }[]
  >([]);

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

  // Reloj de enfriamiento (5 minutos)
  useEffect(() => {
    const tick = () => {
      const rem = Math.max(0, Math.ceil((kissCooldownUntil - Date.now()) / 1000));
      setCooldownRemainingSec(rem);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [kissCooldownUntil]);

  // Al abrir la app, alternar usuario o recibir besos en tiempo real desde el móvil de la pareja
  useEffect(() => {
    const pending = consumePendingKissesForActiveUser();
    if (pending.length > 0) {
      triggerHeartbeatHaptic('kiss-rain-received');
      soundEngine.playChime();
      setActiveRainBursts(pending);
      const t = setTimeout(() => setActiveRainBursts([]), 7000);
      return () => clearTimeout(t);
    }
  }, [activeUser, pendingKissBursts.length, consumePendingKissesForActiveUser]);

  const handleTapKissButton = () => {
    if (cooldownRemainingSec > 0) {
      soundEngine.playPop(0.75);
      return;
    }
    const next = Math.min(50, spamCount + 1);
    setSpamCount(next);
    soundEngine.playPop(0.95 + next * 0.015);
    triggerHeartbeatHaptic('kiss-tap');

    // Lanzar besos y corazoncitos flotando desde el botón hacia el planeta
    const now = Date.now();
    const spawned = [
      { id: now + Math.random(), dx: -26 + Math.random() * 14, dy: -75 - Math.random() * 25, rot: -18, emoji: '💋' },
      { id: now + Math.random() + 1, dx: -6 + Math.random() * 12, dy: -95 - Math.random() * 30, rot: 8, emoji: '💖' },
      { id: now + Math.random() + 2, dx: 14 + Math.random() * 16, dy: -70 - Math.random() * 25, rot: 22, emoji: '💋' },
    ];
    setTapFloatingHearts((prev) => [...prev.slice(-15), ...spawned]);
    setTimeout(() => {
      setTapFloatingHearts((prev) => prev.filter((p) => !spawned.some((s) => s.id === p.id)));
    }, 950);

    if (next === 50) {
      setNoteComposerOpen(true);
    }
  };

  const handleConfirmSendKisses = () => {
    const countToSend = Math.max(1, spamCount);
    const words = miniNote.trim().split(/\s+/).slice(0, 3).join(' ');
    sendKissBurst(countToSend, 'corazones', words || '¡Te echo de menos!');
    setActiveRainBursts([
      {
        id: `local-${Date.now()}`,
        from: activeUser,
        count: countToSend,
        iconType: 'corazones',
        miniNote: words || '¡Te echo de menos!',
        timestamp: Date.now(),
      },
    ]);
    setTimeout(() => setActiveRainBursts([]), 6500);
    setSpamCount(0);
    setNoteComposerOpen(false);
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
      {/* 1. ESCENARIO 3D EDGE-TO-EDGE REAL (100vw x 100dvh por detrás de la Isla Dinámica y la barra Home) */}
      <div className="fixed inset-0 w-screen h-[100dvh] z-0 overflow-hidden">
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

      {/* 3. BLOQUE INFERIOR ANCLADO AL BORDE REAL DE iOS: 2 FILAS DE UBICACIONES + BOTÓN ÚNICO DE BESO */}
      <footer
        className="fixed z-30 left-3 right-3 max-w-md mx-auto flex flex-col items-center gap-3 pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
      >
        {/* Modal flotante de Mini Nota de hasta 3 palabras al pulsar ráfaga */}
        <AnimatePresence>
          {(spamCount > 0 || noteComposerOpen) && (
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 22 }}
              className="pointer-events-auto hand-card p-3 w-full max-w-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold tabular-nums">
                  💋 Ráfaga: {spamCount} / 50
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">Máx. 3 palabras</span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={miniNote}
                  onChange={(e) => setMiniNote(e.target.value)}
                  placeholder="¡Te echo de menos!"
                  className="flex-1 px-3 py-1.5 rounded-2xl border border-[var(--border-ink)] bg-[var(--input-bg)] font-hand text-lg focus:outline-none focus:ring-2 focus:ring-[#FFB7C5]"
                />
                <motion.button
                  whileTap={{ scale: 0.9, rotate: -2 }}
                  onClick={handleConfirmSendKisses}
                  className="hand-button glossy-pink-cta px-3.5 py-1.5 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* Botón único circular flotante de beso (70x70px, SOLO símbolo 💋, SIN texto) */}
        {(() => {
          const isCoolingDown = cooldownRemainingSec > 0;
          const progressRatio = isCoolingDown
            ? Math.max(0.03, Math.min(1, 1 - cooldownRemainingSec / 300))
            : 1;
          const ringRadius = 32;
          const ringCircumference = 2 * Math.PI * ringRadius;
          const ringOffset = ringCircumference * (1 - progressRatio);

          return (
            <div className="pointer-events-auto relative flex items-center justify-center w-[70px] h-[70px] shrink-0">
              {/* Besos y corazones flotando al pulsar */}
              <AnimatePresence>
                {tapFloatingHearts.map((h) => (
                  <motion.span
                    key={h.id}
                    initial={{ opacity: 1, x: 0, y: -6, scale: 0.65, rotate: 0 }}
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
                whileTap={{ scale: 0.86, rotate: -6 }}
                animate={
                  isCoolingDown
                    ? { scale: 1 }
                    : spamCount > 0
                      ? { scale: 1.06 + Math.min(0.12, spamCount * 0.003) }
                      : { scale: 1 }
                }
                transition={{ type: 'spring', stiffness: 460, damping: 16 }}
                onClick={handleTapKissButton}
                aria-label={isCoolingDown ? 'Botón de beso recargando' : 'Enviar beso'}
                className={`w-[70px] h-[70px] rounded-full border-2 border-white/85 flex items-center justify-center cursor-pointer relative select-none overflow-hidden transition-[background,opacity] duration-200 shadow-[0_8px_24px_rgba(255,93,115,0.4)] ${
                  isCoolingDown
                    ? 'bg-gradient-to-b from-[#FFE6EE] via-[#FFC5D4] to-[#FFB7C5] opacity-90'
                    : 'bg-gradient-to-b from-[#FFD2DF] via-[#FF9EBB] to-[#FF78A1]'
                }`}
              >
                {/* Anillo circular de progreso durante la recarga */}
                {isCoolingDown && (
                  <svg
                    viewBox="0 0 70 70"
                    className="pointer-events-none absolute inset-0 w-full h-full -rotate-90 z-10"
                  >
                    <circle
                      cx="35"
                      cy="35"
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(255,255,255,0.55)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="35"
                      cy="35"
                      r={ringRadius}
                      fill="none"
                      stroke="#FF5D73"
                      strokeWidth="4.2"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                      style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                    />
                  </svg>
                )}

                {/* Brillo superior sutil glossy */}
                <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 w-10 h-3.5 rounded-full bg-gradient-to-b from-white/75 to-white/5" />

                {/* Únicamente el símbolo de beso bien centrado, sin texto */}
                <span
                  aria-hidden="true"
                  className="text-[32px] leading-none select-none drop-shadow-[0_2px_4px_rgba(195,55,95,0.35)] relative z-10"
                >
                  💋
                </span>
              </motion.button>

              {/* Micro botón discreto de recarga instantánea durante enfriamiento */}
              {isCoolingDown && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.85, rotate: -90 }}
                  onClick={() => {
                    useWorldStore.setState({ kissCooldownUntil: 0 });
                    soundEngine.playPop(1.3);
                  }}
                  title="Recargar al instante"
                  aria-label="Recargar besos al instante"
                  className="absolute -top-0.5 -right-1 z-20 w-6 h-6 rounded-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] shadow-[0_4px_10px_rgba(255,158,187,0.35)] flex items-center justify-center text-[var(--text-ink)] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </motion.button>
              )}
            </div>
          );
        })()}
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

                  {/* Iconos cayendo físicamente sobre el planeta */}
                  {drops.map((_, idx) => {
                    const leftPct = (idx * 19 + (idx % 5) * 7) % 92;
                    const delay = (idx % 12) * 0.12;
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
                        {iconEmoji}
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
