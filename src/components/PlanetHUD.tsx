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
import { HandDrawnBox } from './ui/HandDrawnBox';

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
}

export const PlanetHUD: React.FC<PlanetHUDProps> = ({ solar, hasUnreadDiary }) => {
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
    lunarA,
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

  // Mensaje empático del Óvulo Cute
  const ovuloMessage =
    lunarA.phase === 'menstruacion' || lunarA.cramps !== 'Sin dolor'
      ? `¡Hola! Hoy estamos en días de regla con ${lunarA.cramps.toLowerCase()}. Es el momento ideal para traernos algo calentito (${lunarA.craving.toLowerCase()}), dar muchos mimos y no hacer planes pesados 💕`
      : `¡Hola! Hoy estamos con humor ${lunarA.mood.toLowerCase()} y antojo de ${lunarA.craving.toLowerCase()} ✨`;

  return (
    <>
      {/* 1. CABECERA FIJA DEL PLANETA */}
      <div className="fixed top-0 left-0 right-0 z-30 p-3 pointer-events-none flex flex-col gap-2 max-w-md mx-auto">
        <div className="flex items-center justify-between gap-2 pointer-events-auto">
          {/* Botón de Silencio Rápido */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            aria-label="Silenciar o activar sonido"
            className="hand-button w-10 h-10 flex items-center justify-center bg-[var(--bg-card)] cursor-pointer shrink-0"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </motion.button>

          {/* Contador de Tiempo de Relación y Nombre del Planeta con Borde Rough.js */}
          <div className="flex-1">
            <HandDrawnBox
              onClick={() => setAnniversaryModalOpen(true)}
              className="bg-[var(--bg-card)] px-3 py-1.5 text-center cursor-pointer"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xs">🪐</span>
                <span className="font-bold text-sm truncate">{planetName}</span>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-muted)]">
                {duration.years} años, {duration.months} meses, {duration.days} días 💕
              </p>
            </HandDrawnBox>
          </div>

          {/* Botón de Ajustes */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSettingsOpen(true)}
            aria-label="Abrir ajustes del planeta"
            className="hand-button w-10 h-10 flex items-center justify-center bg-[var(--bg-card)] cursor-pointer shrink-0"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Indicador de Motes de Pareja + Clima/Cielo Actual */}
        <div className="flex items-center justify-between gap-2 pointer-events-auto">
          <button
            onClick={() => {
              setDraftNameA(petA.ownerName);
              setDraftNameB(petB.ownerName);
              setDraftPetA(petA.petName);
              setDraftPetB(petB.petName);
              setMotesModalOpen(true);
              soundEngine.playPop();
            }}
            className="hand-pill bg-[var(--bg-card)] px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <span>💑 {petA.ownerName} & {petB.ownerName}</span>
            <span className="opacity-75">· Soy {activeUser === 'userA' ? petA.ownerName : petB.ownerName} ✏️</span>
          </button>

          <span className="hand-pill bg-[var(--bg-card)] px-2.5 py-0.5 text-[11px] font-semibold">
            {solar.label} {solar.weather === 'snow' ? '· ❄️ Nieve' : solar.weather === 'fireworks' ? '· 🎆 Fuegos' : ''}
          </span>
        </div>
      </div>

      {/* 2. ASOMO DEL ÓVULO CUTE (ESQUINA DEL HUD) */}
      {(lunarA.sensitiveAlertActive || lunarA.phase === 'menstruacion') &&
        lunarMode !== 'hidden' && (
          <motion.div
            initial={{ x: 90, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed right-0 top-28 z-30 flex items-center pointer-events-auto max-w-[295px]"
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
                  className="hand-card p-2.5 mr-1 cursor-pointer bg-[var(--bg-card)] text-left shadow-lg"
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-pink-200/80 text-pink-950">
                      Óvulo Cute · Consejo 💕
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
                  <p className="font-hand text-base leading-tight">{ovuloMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              onClick={() => {
                setOvuloBubbleOpen(!ovuloBubbleOpen);
                soundEngine.speakAnimalese('Hola parejita linda', 520);
              }}
              className="-mr-4 cursor-pointer"
              title="Toca al Óvulo Cute"
            >
              <CuteOvuloAvatar phase={lunarA.phase} size={74} />
            </div>
          </motion.div>
        )}

      {/* 3. LLUVIA FÍSICA DE BESOS Y NOTA FLOTANTE SOBRE EL PLANETA 3D */}
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
                  {/* Nota flotante en el centro superior */}
                  <motion.div
                    initial={{ y: -50, scale: 0.8, opacity: 0 }}
                    animate={{ y: 115, scale: 1, opacity: 1 }}
                    exit={{ y: 60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="mx-auto w-fit hand-card px-5 py-3 bg-[var(--bg-card)] text-center shadow-xl"
                  >
                    <p className="text-xs font-bold text-[var(--text-muted)]">
                      ¡Lluvia de {burst.count} {KISS_ICONS[burst.iconType].label.toLowerCase()}!
                    </p>
                    <p className="font-hand text-2xl font-bold mt-0.5">
                      «{burst.miniNote}» {iconEmoji}
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

      {/* 4. PIE DE PANTALLA: BARRA RÁPIDA DE LOS 7 EDIFICIOS + KISS SENDER CON RÁFAGA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-3 pointer-events-none flex flex-col items-center gap-2 max-w-md mx-auto">
        {/* Acceso táctil directo a los 7 Edificios (además de tocar los edificios 3D en la esfera) */}
        <div className="w-full overflow-x-auto pointer-events-auto flex items-center gap-1.5 py-1 px-1">
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
                  className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"
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
              className="hand-card p-3 w-full max-w-xs pointer-events-auto bg-[var(--bg-card)]"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold">
                  ¡Ráfaga acumulada: {spamCount} / 50 {KISS_ICONS[selectedIcon].emoji}!
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">Máx. 3 palabras</span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={miniNote}
                  onChange={(e) => setMiniNote(e.target.value)}
                  placeholder="¡Te echo de menos!"
                  className="flex-1 px-2.5 py-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-hand text-lg focus:outline-none"
                />
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleConfirmSendKisses}
                  className="hand-button px-3 py-1.5 bg-[var(--accent-primary)] font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DOCK FLOTANTE TIPO PASTILLA iOS: Selector + Corazón Elástico + Contador Integrado */}
        <div className="pointer-events-auto pb-1">
          <div className="rounded-full bg-[var(--bg-card)]/92 backdrop-blur-md border-2 border-[var(--border-ink)] shadow-[0_8px_24px_rgba(61,49,42,0.18)] px-3.5 py-1.5 flex items-center justify-between gap-3 relative">
            {/* Izquierda: Botón sutil para desplegar y elegir el emoji de la lluvia */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  soundEngine.playPop();
                  setIconPickerOpen(!iconPickerOpen);
                }}
                className="px-2.5 py-1.5 rounded-full bg-[var(--bg-paper)]/90 border border-[var(--border-ink)]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[var(--bg-paper)] transition-colors"
                title="Elegir icono de lluvia"
              >
                <span className="text-base leading-none">{KISS_ICONS[selectedIcon].emoji}</span>
                <span className="text-[11px] text-[var(--text-main)]">Lluvia ▾</span>
              </motion.button>

              <AnimatePresence>
                {iconPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                    className="absolute bottom-13 left-0 w-48 hand-card p-1.5 bg-[var(--bg-card)]/95 backdrop-blur-md flex flex-col gap-1 z-50 shadow-xl"
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

            {/* Centro: Botón grande de Corazón (Kiss Sender) con físicas elásticas Emil Kowalski */}
            {cooldownRemainingSec > 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5">
                <div className="w-24">
                  <div className="flex justify-between text-[9px] font-bold mb-0.5">
                    <span>Recargando</span>
                    <span>
                      {Math.floor(cooldownRemainingSec / 60)}:
                      {String(cooldownRemainingSec % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-ink)]">
                    <div
                      className="h-full bg-[var(--accent-primary)] transition-all"
                      style={{ width: `${Math.max(5, 100 - (cooldownRemainingSec / 300) * 100)}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    useWorldStore.setState({ kissCooldownUntil: 0 });
                    soundEngine.playPop(1.3);
                  }}
                  title="Recargar al instante"
                  className="p-1 rounded-full hover:bg-black/5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.85 }}
                animate={{
                  scale: spamCount > 0 ? 1.06 + Math.min(0.14, spamCount * 0.003) : 1,
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                onClick={handleTapKissButton}
                aria-label="Enviar lluvia de besos"
                className="-my-3.5 w-15 h-15 rounded-full bg-gradient-to-br from-[#FF758F] to-[#FF4D6D] text-white border-2 border-[var(--border-ink)] shadow-[0_6px_16px_rgba(255,77,109,0.45)] flex flex-col items-center justify-center cursor-pointer relative select-none"
              >
                <span className="text-2xl leading-none drop-shadow-xs">
                  {KISS_ICONS[selectedIcon].emoji}
                </span>
                <span className="text-[10px] font-extrabold mt-0.5 tracking-tight text-white">
                  {spamCount > 0 ? `x${spamCount}` : '¡Besos!'}
                </span>
              </motion.button>
            )}

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
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  besos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
