import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Heart,
  Mail,
  Film,
  Sparkles,
  Bath,
  Sun,
  Sunset,
  Moon,
  Snowflake,
  PartyPopper,
  Play,
  X,
} from 'lucide-react';
import { useWorldStore } from '../store/useWorldStore';
import { soundEngine } from '../utils/soundAndHaptics';

export const TestSimulatorPanel: React.FC = () => {
  const {
    simulatePartnerKissBurst50,
    simulatePartnerNewPolaroid,
    simulatePartnerSecretMovieVote,
    simulateOvuloCuteAlert,
    simulateDirtyAndHungryPets,
    solarOverride,
    setSolarOverride,
    weatherOverride,
    setWeatherOverride,
    activeUser,
    setActiveUser,
    petA,
    petB,
  } = useWorldStore();

  const [isOpen, setIsOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const triggerBanner = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 3200);
  };

  return (
    <div className="fixed top-16 left-3 z-50 pointer-events-auto">
      {/* Botón Flotante Discreto y Desplegable "🛠️ Modo Test (Simulador)" */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => {
          soundEngine.playPop(1.15);
          setIsOpen(!isOpen);
        }}
        className="hand-pill px-3 py-1.5 bg-[var(--accent-highlight)] text-[#4A3F35] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
      >
        <Wrench className="w-3.5 h-3.5" />
        <span>🛠️ Modo Test (Simulador)</span>
      </motion.button>

      {/* Banner de confirmación de acción QA */}
      <AnimatePresence>
        {feedbackBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.92 }}
            className="mt-1.5 hand-card px-3 py-1.5 bg-emerald-100 text-emerald-950 text-xs font-bold max-w-xs shadow-lg"
          >
            {feedbackBanner}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel Desplegable de Simulación QA */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="mt-2 w-80 max-w-[92vw] hand-card watercolor-paper p-3.5 space-y-2.5 max-h-[75vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-ink)]/20 pb-1.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  🛠️ Panel de Simulación QA
                </h3>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Prueba acciones de tu pareja y del tiempo en 1 clic
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-black/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conmutador rápido de perspectiva */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-secondary)] text-[11px]">
              <span className="font-bold">Dispositivo activo:</span>
              <button
                onClick={() =>
                  setActiveUser(activeUser === 'userA' ? 'userB' : 'userA')
                }
                className="hand-pill px-2.5 py-0.5 bg-[var(--accent-primary)] font-bold cursor-pointer"
              >
                {activeUser === 'userA' ? petA.ownerName : petB.ownerName} ⇄
              </button>
            </div>

            {/* 1 a 5: Botones de Simulación de Pareja y Mascotas */}
            <div className="space-y-1.5 text-xs">
              {/* 1. Simular envío de 50 besos de mi pareja */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  simulatePartnerKissBurst50();
                  setIsOpen(false);
                  triggerBanner('💕 ¡Lluvia de 50 besos recibida con «¡Te echo de menos!» y latido háptico!');
                }}
                className="w-full hand-button p-2 bg-[var(--bg-card)] text-left font-bold flex items-center gap-2 cursor-pointer"
              >
                <Heart className="w-4 h-4 text-rose-500 fill-rose-400 shrink-0" />
                <span>1. Simular envío de 50 besos de mi pareja</span>
              </motion.button>

              {/* 2. Simular nueva Polaroid de mi pareja */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  simulatePartnerNewPolaroid();
                  setIsOpen(false);
                  triggerBanner('📮 ¡Nueva Polaroid en el Buzón 3D! Mira cómo asoma la esquinita en CORREOS.');
                }}
                className="w-full hand-button p-2 bg-[var(--bg-card)] text-left font-bold flex items-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                <span>2. Simular nueva Polaroid de mi pareja</span>
              </motion.button>

              {/* 3. Simular voto secreto de mi pareja en Cine */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  simulatePartnerSecretMovieVote();
                  setIsOpen(false);
                  triggerBanner('🍿 ¡Tu pareja ha votado en secreto! Pulsa «Votar ahora» para abrir el Sobre Sellado.');
                }}
                className="w-full hand-button p-2 bg-[var(--bg-card)] text-left font-bold flex items-center gap-2 cursor-pointer"
              >
                <Film className="w-4 h-4 text-purple-600 shrink-0" />
                <span>3. Simular voto secreto de mi pareja en Cine</span>
              </motion.button>

              {/* 4. Simular aviso del Óvulo Cute */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  simulateOvuloCuteAlert();
                  setIsOpen(false);
                  triggerBanner('🌸 ¡El Óvulo Cute se ha asomado con su mantita, bolsa de agua caliente y voz Animalese!');
                }}
                className="w-full hand-button p-2 bg-[var(--bg-card)] text-left font-bold flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
                <span>4. Simular aviso del Óvulo Cute</span>
              </motion.button>

              {/* 5. Ensuciar / Dar hambre a las mascotas */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  simulateDirtyAndHungryPets();
                  setIsOpen(false);
                  triggerBanner('🐾 ¡Mascotas con barro y hambre! Usa la Esponja con espuma o arrástrales comida.');
                }}
                className="w-full hand-button p-2 bg-[var(--bg-card)] text-left font-bold flex items-center gap-2 cursor-pointer"
              >
                <Bath className="w-4 h-4 text-sky-600 shrink-0" />
                <span>5. Ensuciar / Dar hambre a las mascotas</span>
              </motion.button>
            </div>

            {/* 6. Selector de Tiempo y Clima Forzado */}
            <div className="pt-1 border-t border-[var(--border-ink)]/20 space-y-1.5">
              <p className="text-[11px] font-bold uppercase text-[var(--text-muted)]">
                6. Tiempo y Clima Forzado (Planeta + Ventana Casita)
              </p>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  onClick={() => {
                    setSolarOverride('day');
                    setWeatherOverride('clear');
                    soundEngine.playPop();
                    triggerBanner('☀️ Forzado: Día Soleado');
                  }}
                  className={`hand-pill py-1 px-2 font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    solarOverride === 'day' && weatherOverride === 'clear'
                      ? 'bg-[var(--accent-primary)]'
                      : 'bg-[var(--bg-card)]'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  Día
                </button>
                <button
                  onClick={() => {
                    setSolarOverride('sunset');
                    soundEngine.playPop();
                    triggerBanner('🌅 Forzado: Atardecer Rosado');
                  }}
                  className={`hand-pill py-1 px-2 font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    solarOverride === 'sunset' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'
                  }`}
                >
                  <Sunset className="w-3 h-3" />
                  Atardecer
                </button>
                <button
                  onClick={() => {
                    setSolarOverride('night');
                    soundEngine.playPop();
                    triggerBanner('🌙 Forzado: Noche (Modo Azul Noche Pastel)');
                  }}
                  className={`hand-pill py-1 px-2 font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    solarOverride === 'night' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  Noche
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  onClick={() => {
                    setWeatherOverride('snow');
                    soundEngine.playPop();
                    triggerBanner('❄️ Forzado: Invierno con copos de nieve');
                  }}
                  className={`hand-pill py-1 px-2 font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    weatherOverride === 'snow' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'
                  }`}
                >
                  <Snowflake className="w-3 h-3" />
                  Invierno (Nieve)
                </button>
                <button
                  onClick={() => {
                    setWeatherOverride('fireworks');
                    soundEngine.playChime();
                    triggerBanner('🎆 Forzado: Aniversario (Fuegos artificiales pastel)');
                  }}
                  className={`hand-pill py-1 px-2 font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    weatherOverride === 'fireworks'
                      ? 'bg-[var(--accent-primary)]'
                      : 'bg-[var(--bg-card)]'
                  }`}
                >
                  <PartyPopper className="w-3 h-3" />
                  Aniversario 🎆
                </button>
              </div>

              {/* Botón extra para repetir la pantalla de carga con saludo de mascotas */}
              <button
                onClick={() => {
                  useWorldStore.setState({ hasCompletedLanding: false, activeBuilding: null });
                  setIsOpen(false);
                }}
                className="w-full hand-pill py-1 px-2 bg-[var(--bg-secondary)] text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer mt-1"
              >
                <Play className="w-3 h-3" />
                Ver Pantalla de Carga y Aterrizaje
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
