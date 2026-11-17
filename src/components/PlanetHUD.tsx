import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Settings, Sparkles, Heart, Send, RotateCcw } from 'lucide-react';
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

const KISS_ICONS: Record<KissIconType, { emoji: string; label: string }> = {
  corazones: { emoji: '❤️', label: 'Corazones clásicos' },
  pintalabios: { emoji: '💋', label: 'Marcas de pintalabios' },
  gatitos: { emoji: '🐱', label: 'Gatitos tiernos' },
  estrellas: { emoji: '🌟', label: 'Estrellitas mágicas' },
  abrazos: { emoji: '🫂', label: 'Abrazos calentitos' },
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

  // Estado del Kiss Sender
  const [selectedIcon, setSelectedIcon] = useState<KissIconType>('corazones');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
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

    // Lanzar corazoncitos flotando desde el propio botón hacia el planeta
    const now = Date.now();
    const emoji = KISS_ICONS[selectedIcon].emoji;
    const spawned = [
      { id: now + Math.random(), dx: -26 + Math.random() * 14, dy: -75 - Math.random() * 25, rot: -18, emoji },
      { id: now + Math.random() + 1, dx: -6 + Math.random() * 12, dy: -95 - Math.random() * 30, rot: 8, emoji: '💖' },
      { id: now + Math.random() + 2, dx: 14 + Math.random() * 16, dy: -70 - Math.random() * 25, rot: 22, emoji },
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
    sendKissBurst(countToSend, selectedIcon, words || '¡Te echo de menos!');
    setActiveRainBursts([
      {
        id: `local-${Date.now()}`,
        from: activeUser,
        count: countToSend,
        iconType: selectedIcon,
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
      {/* ESTRUCTURA FLEX VERTICAL EN 3 ZONAS ANCLADA AL 100% FÍSICO DE LA PANTALLA */}
      <div className="w-full h-full flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
        {/* ZONA 1 (SUPERIOR): HEADER PEGADO A LA SAFE AREA REAL (px-3) */}
        <header className="shrink-0 z-30 safe-top-header px-3 flex flex-col gap-1.5 max-w-md mx-auto w-full box-border">
          <div className="flex items-center justify-between gap-2 w-full">
            {/* Botón de Silencio Rápido */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              aria-label="Silenciar o activar sonido"
              className="hand-button w-9 h-9 flex items-center justify-center bg-[var(--bg-card)] cursor-pointer shrink-0"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </motion.button>

            {/* Contador de Tiempo de Relación y Nombre del Planeta (Compacto py-1) */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setAnniversaryModalOpen(true)}
              className="flex-1 min-w-0 hand-card bg-[var(--bg-card)] px-3 py-1 text-center cursor-pointer overflow-hidden"
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
              whileTap={{ scale: 0.9 }}
              onClick={() => setSettingsOpen(true)}
              aria-label="Abrir ajustes del planeta"
              className="hand-button w-9 h-9 flex items-center justify-center bg-[var(--bg-card)] cursor-pointer shrink-0"
            >
              <Settings className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Indicador de Motes de Pareja + Clima/Cielo Actual */}
          <div className="flex items-center justify-between gap-2 w-full">
            <button
              onClick={() => {
                setDraftNameA(petA.ownerName);
                setDraftNameB(petB.ownerName);
                setDraftPetA(petA.petName);
                setDraftPetB(petB.petName);
                setMotesModalOpen(true);
                soundEngine.playPop();
              }}
              className="hand-pill bg-[var(--bg-card)] px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs min-w-0 truncate"
            >
              <span className="truncate">💑 {petA.ownerName} & {petB.ownerName}</span>
              <span className="opacity-75 shrink-0">· Soy {activeUser === 'userA' ? petA.ownerName : petB.ownerName} ✏️</span>
            </button>

            <span className="hand-pill bg-[var(--bg-card)] px-2.5 py-0.5 text-[11px] font-semibold shrink-0">
              {solar.label} {solar.weather === 'snow' ? '· ❄️ Nieve' : solar.weather === 'fireworks' ? '· 🎆 Fuegos' : ''}
            </span>
          </div>
        </header>

        {/* ZONA 2 (CENTRAL): ESCENARIO DEL PLANETA 3D CENTRADO + ÓVULO CUTE COMPACTO */}
        <main className="flex-1 min-h-0 w-full relative">
          {children}

          {/* ASOMO DEL ÓVULO CUTE (44x44px, anclado limpio en la esquina superior derecha del cielo) */}
          {(primaryLunar.sensitiveAlertActive || primaryLunar.phase === 'menstruacion') &&
            lunarMode !== 'hidden' && (
              <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="absolute right-3 top-1.5 z-30 flex items-center pointer-events-auto max-w-[235px]"
              >
                <AnimatePresence>
                  {ovuloBubbleOpen && (
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={() => {
                        soundEngine.speakAnimalese(ovuloMessage, 510);
                        setActiveBuilding('luna');
                      }}
                      className="hand-card px-2.5 py-1.5 mr-1.5 cursor-pointer bg-[var(--bg-card)] text-left shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-pink-200/80 text-pink-950">
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
                      <p className="font-hand text-[13px] leading-tight">{ovuloMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  onClick={() => {
                    setOvuloBubbleOpen(!ovuloBubbleOpen);
                    soundEngine.speakAnimalese('Hola parejita linda', 520);
                  }}
                  className="w-11 h-11 flex items-center justify-center cursor-pointer shrink-0"
                  title="Toca al Óvulo Cute"
                >
                  <CuteOvuloAvatar phase={primaryLunar.phase} size={44} />
                </div>
              </motion.div>
            )}
        </main>

        {/* ZONA 3 (INFERIOR): 1 SOLA FILA DESLIZABLE DE EDIFICIOS + DOCK ANCLADO AL BORDE INFERIOR */}
        <footer className="shrink-0 z-30 safe-bottom-dock px-3 flex flex-col items-center gap-1.5 max-w-md mx-auto w-full box-border">
          {/* 1 única fila horizontal con scroll táctil suave */}
          <div className="w-full flex overflow-x-auto no-scrollbar items-center gap-2 py-0.5">
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
                whileTap={{ scale: 0.92 }}
                onClick={() => setActiveBuilding(b.id as BuildingId)}
                className="relative hand-pill bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
              >
                <span>{b.label}</span>
                {b.badge && (
                  <span
                    className="w-2 h-2 rounded-full bg-rose-500 animate-ping"
                    title="¡Polaroid nueva asomando en el buzón!"
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Modal flotante de Mini Nota de hasta 3 palabras cuando pulsas en ráfaga */}
          <AnimatePresence>
            {(spamCount > 0 || noteComposerOpen) && (
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.9 }}
                className="hand-card p-2.5 w-full max-w-xs bg-[var(--bg-card)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">
                    ¡Ráfaga: {spamCount} / 50 {KISS_ICONS[selectedIcon].emoji}!
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">Máx. 3 palabras</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={miniNote}
                    onChange={(e) => setMiniNote(e.target.value)}
                    placeholder="¡Te echo de menos!"
                    className="flex-1 px-2.5 py-1 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-hand text-lg focus:outline-none"
                  />
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleConfirmSendKisses}
                    className="hand-button px-3 py-1 bg-[var(--accent-primary)] font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DOCK FLOTANTE COMPACTO TIPO PASTILLA iOS */}
          <div className="w-full flex justify-center">
            <div className="w-full rounded-full bg-[var(--bg-card)]/92 backdrop-blur-md border-2 border-[var(--border-ink)] shadow-[0_8px_20px_rgba(61,49,42,0.16)] px-3 py-1.5 flex items-center justify-between gap-2 relative">
              {/* Izquierda: Selector de emoji de la lluvia */}
              <div className="relative">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    soundEngine.playPop();
                    setIconPickerOpen(!iconPickerOpen);
                  }}
                  className="px-2.5 py-1 rounded-full bg-[var(--bg-paper)]/90 border border-[var(--border-ink)]/30 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-[var(--bg-paper)] transition-colors"
                  title="Elegir icono de lluvia"
                >
                  <span className="text-sm leading-none">{KISS_ICONS[selectedIcon].emoji}</span>
                  <span className="text-[11px] text-[var(--text-main)]">Lluvia ▾</span>
                </motion.button>

                <AnimatePresence>
                  {iconPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                      className="absolute bottom-12 left-0 w-48 hand-card p-1.5 bg-[var(--bg-card)]/95 backdrop-blur-md flex flex-col gap-1 z-50 shadow-xl"
                    >
                      {(Object.keys(KISS_ICONS) as KissIconType[]).map((k) => (
                        <button
                          key={k}
                          onClick={() => {
                            setSelectedIcon(k);
                            setIconPickerOpen(false);
                            soundEngine.playPop(1.2);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left cursor-pointer ${
                            selectedIcon === k ? 'bg-[var(--accent-primary)] font-bold' : 'hover:bg-black/5'
                          }`}
                        >
                          <span className="text-base">{KISS_ICONS[k].emoji}</span>
                          <span>{KISS_ICONS[k].label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Centro: Hero Button de Corazón (76x76px, sobresale hacia arriba -mt-5, SIEMPRE visible incluso durante recarga con anillo circular) */}
              {(() => {
                const isCoolingDown = cooldownRemainingSec > 0;
                const progressRatio = isCoolingDown
                  ? Math.max(0.03, Math.min(1, 1 - cooldownRemainingSec / 300))
                  : 1;
                const ringRadius = 35;
                const ringCircumference = 2 * Math.PI * ringRadius;
                const ringOffset = ringCircumference * (1 - progressRatio);
                const cooldownFormatted = `${Math.floor(cooldownRemainingSec / 60)}:${String(
                  cooldownRemainingSec % 60
                ).padStart(2, '0')}`;

                return (
                  <div className="relative flex items-center justify-center -mt-5 w-[76px] h-[76px] shrink-0">
                    {/* Corazoncitos flotando desde el propio botón hacia el planeta al pulsar */}
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
                      whileTap={{ scale: isCoolingDown ? 0.93 : 0.86, rotate: isCoolingDown ? 0 : -4 }}
                      animate={
                        isCoolingDown
                          ? { scale: 1 }
                          : spamCount > 0
                            ? { scale: 1.08 + Math.min(0.14, spamCount * 0.003) }
                            : { scale: [1, 1.04, 1] }
                      }
                      transition={
                        isCoolingDown
                          ? { duration: 0.25 }
                          : spamCount > 0
                            ? { type: 'spring', stiffness: 420, damping: 16 }
                            : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
                      }
                      onClick={handleTapKissButton}
                      aria-label={
                        isCoolingDown
                          ? `Corazón recargando (${cooldownFormatted})`
                          : 'Enviar lluvia de besos'
                      }
                      className={`w-[76px] h-[76px] rounded-full text-white border-[3px] border-[#FFF3D6] ring-2 ring-[#4A3F35]/85 flex flex-col items-center justify-center cursor-pointer relative select-none overflow-hidden transition-colors duration-300 ${
                        isCoolingDown
                          ? 'bg-gradient-to-b from-[#FFC4D0] to-[#F28FA4] shadow-[0_4px_14px_rgba(242,143,164,0.35)]'
                          : 'bg-gradient-to-b from-[#FF8FA3] to-[#FF5D73] shadow-[0_6px_20px_rgba(255,93,115,0.45)]'
                      }`}
                    >
                      {/* Anillo de progreso circular integrado durante la recarga */}
                      {isCoolingDown && (
                        <svg
                          viewBox="0 0 76 76"
                          className="pointer-events-none absolute inset-0 w-full h-full -rotate-90 z-10"
                        >
                          <circle
                            cx="38"
                            cy="38"
                            r={ringRadius}
                            fill="none"
                            stroke="rgba(255,255,255,0.45)"
                            strokeWidth="4"
                          />
                          <circle
                            cx="38"
                            cy="38"
                            r={ringRadius}
                            fill="none"
                            stroke="#FF3B66"
                            strokeWidth="4.2"
                            strokeLinecap="round"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                          />
                        </svg>
                      )}

                      {/* Reflejo superior tipo burbuja glossy */}
                      <span className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 w-11 h-4 rounded-full bg-gradient-to-b from-white/60 to-white/5 blur-[0.3px]" />

                      {/* Icono de corazón 3D/SVG expresivo en el centro */}
                      <div className={`relative flex items-center justify-center mt-0.5 ${isCoolingDown ? 'opacity-90' : ''}`}>
                        <svg
                          viewBox="0 0 36 34"
                          className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(164,19,60,0.45)]"
                        >
                          <defs>
                            <radialGradient id="heroHeartGrad" cx="35%" cy="28%" r="70%">
                              <stop offset="0%" stopColor="#FFF0F3" />
                              <stop offset="45%" stopColor="#FFCCD5" />
                              <stop offset="100%" stopColor="#FFFFFF" />
                            </radialGradient>
                          </defs>
                          <path
                            d="M18 31.5C18 31.5 3.5 22.2 3.5 11.4C3.5 5.9 7.8 2 12.8 2C15.6 2 17.3 3.4 18 4.9C18.7 3.4 20.4 2 23.2 2C28.2 2 32.5 5.9 32.5 11.4C32.5 22.2 18 31.5 18 31.5Z"
                            fill="url(#heroHeartGrad)"
                            stroke="#800F2F"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          <ellipse
                            cx="11.5"
                            cy="9.2"
                            rx="3.2"
                            ry="1.8"
                            transform="rotate(-24 11.5 9.2)"
                            fill="#FFFFFF"
                            opacity="0.85"
                          />
                        </svg>
                        {selectedIcon !== 'corazones' && (
                          <span className="absolute -right-2 -bottom-1 text-xs drop-shadow">
                            {KISS_ICONS[selectedIcon].emoji}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-extrabold tracking-tight text-white tabular-nums drop-shadow-[0_1px_2px_rgba(128,15,47,0.75)] leading-none mt-0.5 z-10">
                        {isCoolingDown
                          ? cooldownFormatted
                          : spamCount > 0
                            ? `x${spamCount}`
                            : '¡Besos!'}
                      </span>
                    </motion.button>

                    {/* Micro botón discreto de recarga instantánea en esquina superior derecha */}
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
                        className="absolute -top-0.5 -right-1 z-20 w-6 h-6 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border-ink)] shadow-sm flex items-center justify-center text-[var(--text-ink)] cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </motion.button>
                    )}
                  </div>
                );
              })()}

              {/* Derecha: Contador numérico limpio e integrado en la pastilla */}
              <div
                className="px-2.5 py-1 rounded-full bg-[var(--bg-paper)]/80 border border-[var(--border-ink)]/20 flex items-center gap-1.5"
                title="Total de besos enviados y recibidos en vuestro planeta"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                <div className="flex flex-col leading-none text-right">
                  <span className="text-xs font-extrabold text-[var(--text-main)] tabular-nums">
                    {totalKissesHistory.toLocaleString('es-ES')}
                  </span>
                  <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    besos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* 3. LLUVIA FÍSICA DE BESOS Y NOTA FLOTANTE DESLIZABLE (SWIPE-TO-DISMISS) */}
      <AnimatePresence>
        {activeRainBursts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none overflow-hidden"
          >
            {activeRainBursts.map((burst) => {
              const iconEmoji = KISS_ICONS[burst.iconType]?.emoji || '❤️';
              const drops = Array.from({ length: Math.min(45, Math.max(14, burst.count)) });
              return (
                <React.Fragment key={burst.id}>
                  {/* Nota flotante deslizable (Swipe-to-dismiss con físicas spring Emil Kowalski) */}
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
                    className="mx-auto w-fit max-w-[90vw] hand-card px-5 py-3 bg-[var(--bg-card)] text-center shadow-xl pointer-events-auto cursor-grab active:cursor-grabbing relative"
                  >
                    <button
                      onClick={() => {
                        soundEngine.playPop(0.9);
                        setActiveRainBursts((prev) => prev.filter((b) => b.id !== burst.id));
                      }}
                      className="absolute top-1.5 right-2 text-[11px] opacity-55 hover:opacity-100 px-1 cursor-pointer"
                      aria-label="Cerrar aviso de besos"
                    >
                      ✕
                    </button>
                    <p className="text-xs font-bold text-[var(--text-muted)] pr-3">
                      ¡Lluvia de {burst.count} {KISS_ICONS[burst.iconType].label.toLowerCase()}!
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
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.88, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  Desde el{' '}
                  {new Date(anniversaryDate).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {duration.years} años · {duration.months} meses · {duration.days} días
                </p>
                <p className="font-hand text-xl text-[var(--accent-secondary)] mt-0.5">
                  ({duration.totalDays.toLocaleString('es-ES')} amaneceres compartidos)
                </p>
              </div>

              {/* Cuenta atrás para cumpleaños */}
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                🎂 Cuenta atrás de Cumpleaños
              </h3>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="hand-card p-2.5 text-center">
                  <p className="text-xs font-bold">{petA.ownerName}</p>
                  <p className="text-lg font-bold text-[var(--accent-secondary)]">
                    Faltan {daysUntilNextDate(petA.birthday)} días
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">{petA.birthday}</p>
                </div>
                <div className="hand-card p-2.5 text-center">
                  <p className="text-xs font-bold">{petB.ownerName}</p>
                  <p className="text-lg font-bold text-[var(--accent-secondary)]">
                    Faltan {daysUntilNextDate(petB.birthday)} días
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">{petB.birthday}</p>
                </div>
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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="hand-card w-full max-w-sm p-5 bg-[var(--bg-paper)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">💑 Nuestros Motes Cariñosos</h2>
                <button
                  onClick={() => setMotesModalOpen(false)}
                  className="hand-button px-2.5 py-1 text-xs font-bold bg-[var(--bg-card)] cursor-pointer"
                >
                  Cerrar
                </button>
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
                    className="w-full px-3 py-2 rounded-xl border-2 border-[var(--border-ink)] bg-[var(--bg-card)] text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Mote Persona 2:</label>
                  <input
                    type="text"
                    value={draftNameB}
                    onChange={(e) => setDraftNameB(e.target.value)}
                    placeholder="Ej. Cris, Cielo..."
                    className="w-full px-3 py-2 rounded-xl border-2 border-[var(--border-ink)] bg-[var(--bg-card)] text-sm font-bold"
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
                    className="w-full px-3 py-2 rounded-xl border-2 border-[var(--border-ink)] bg-[var(--bg-card)] text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">🐾 Mascota 2:</label>
                  <input
                    type="text"
                    value={draftPetB}
                    onChange={(e) => setDraftPetB(e.target.value)}
                    placeholder="Ej. Kumo / DinoBoli"
                    className="w-full px-3 py-2 rounded-xl border-2 border-[var(--border-ink)] bg-[var(--bg-card)] text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5">
                  📱 ¿Quién soy yo en este móvil?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveUser('userA')}
                    className={`hand-button py-2 text-xs font-bold cursor-pointer ${
                      activeUser === 'userA'
                        ? 'bg-[var(--accent-primary)] font-extrabold'
                        : 'bg-[var(--bg-card)] opacity-75'
                    }`}
                  >
                    Soy {draftNameA || 'Alex'}
                  </button>
                  <button
                    onClick={() => setActiveUser('userB')}
                    className={`hand-button py-2 text-xs font-bold cursor-pointer ${
                      activeUser === 'userB'
                        ? 'bg-[var(--accent-primary)] font-extrabold'
                        : 'bg-[var(--bg-card)] opacity-75'
                    }`}
                  >
                    Soy {draftNameB || 'Cris'}
                  </button>
                </div>
              </div>

              <button
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
                className="hand-button w-full py-2.5 bg-[var(--accent-secondary)] text-white font-bold text-sm cursor-pointer"
              >
                Guardar motes en todo el planeta ✨
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
