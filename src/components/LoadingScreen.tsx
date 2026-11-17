import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldStore } from '../store/useWorldStore';
import { CutePetAvatar } from './characters/CutePetAvatar';
import { soundEngine } from '../utils/soundAndHaptics';

const TENDER_PHRASES = [
  '«¡Qué alegría veros de vuelta en nuestro pequeño rincón del universo!»',
  '«Hemos estado cuidando las flores del jardín mientras volvíais 💕»',
  '«¡El trenecito del ecuador ya está listo para dar otra vuelta juntos!»',
  '«Hoy hace un día precioso en nuestro planeta para darnos muchos mimos ✨»',
  '«¡Mirad! El mar pastel está en calma y las nubes huelen a algodón dulce ☁️»',
];

export const LoadingScreen: React.FC = () => {
  const {
    planetName,
    petA,
    petB,
    hasCompletedLanding,
    completeLanding,
  } = useWorldStore();

  const [progress, setProgress] = useState(0);
  const [phrase] = useState(
    () => TENDER_PHRASES[Math.floor(Math.random() * TENDER_PHRASES.length)]
  );

  useEffect(() => {
    if (hasCompletedLanding) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 65);
    return () => clearInterval(interval);
  }, [hasCompletedLanding]);

  useEffect(() => {
    if (progress === 100 && !hasCompletedLanding) {
      const timer = setTimeout(() => {
        soundEngine.speakAnimalese('Bienvenidos a nuestro mundo', 460);
        completeLanding();
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [progress, hasCompletedLanding, completeLanding]);

  return (
    <AnimatePresence>
      {!hasCompletedLanding && (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.18, filter: 'blur(6px)' }}
          transition={{ duration: 0.85, ease: 'easeInOut' }}
          className="fixed inset-0 w-screen h-[100dvh] z-50 flex flex-col justify-between px-4 safe-modal-inset watercolor-paper overflow-hidden overscroll-none select-none"
        >
          {/* Nubes decorativas superiores */}
          <div className="w-full max-w-md mx-auto flex justify-between items-center pt-1 opacity-85 shrink-0">
            <span className="text-2xl animate-float-slow">☁️✨</span>
            <span className="text-xs font-semibold px-3.5 py-1 hand-pill">
              Preparando el vuelo de regreso...
            </span>
            <span className="text-2xl animate-float-slow">🌸☁️</span>
          </div>

          {/* Centro: Las dos mascotas saludando a cámara */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex items-end justify-center gap-2 mb-4"
            >
              <div className="flex flex-col items-center">
                <span className="font-hand text-lg px-3 py-0.5 hand-pill bg-[var(--glass-bg-strong)] mb-1">
                  ¡Hola! Soy {petA.petName} 👋
                </span>
                <CutePetAvatar
                  species={petA.species}
                  hat={petA.hat}
                  glasses={petA.glasses}
                  neck={petA.neck}
                  isWaving={true}
                  size={126}
                />
              </div>

              <div className="text-2xl pb-12 animate-bounce">💕</div>

              <div className="flex flex-col items-center">
                <span className="font-hand text-lg px-3 py-0.5 hand-pill bg-[var(--glass-bg-strong)] mb-1">
                  ¡Y yo {petB.petName}! ✨
                </span>
                <CutePetAvatar
                  species={petB.species}
                  hat={petB.hat}
                  glasses={petB.glasses}
                  neck={petB.neck}
                  isWaving={true}
                  size={126}
                />
              </div>
            </motion.div>

            <h1 className="text-2xl font-bold tracking-tight mb-2">
              {planetName}
            </h1>

            <div className="hand-card p-4 mb-5 max-w-xs">
              <p className="font-hand text-xl leading-snug">{phrase}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {petA.ownerName} & {petB.ownerName}
              </p>
            </div>

            {/* Barra de carga pastel glossy */}
            <div className="w-64 h-5 hand-pill bg-[var(--glass-bg)] p-1 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#FFB7C5] via-[#FF9EBB] to-[#D5C6F0] shadow-[inset_0_1px_2px_rgba(255,255,255,0.85)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
              Aterrizando desde las nubes... {progress}%
            </p>
          </div>

          {/* Botón para entrar directamente con voz Animalese */}
          <motion.button
            whileTap={{ scale: 0.9, rotate: -2 }}
            transition={{ type: 'spring', stiffness: 420, damping: 15 }}
            onClick={() => {
              soundEngine.speakAnimalese('Bienvenidos a nuestro planeta', 460);
              completeLanding();
            }}
            className="hand-button glossy-pink-cta rounded-full mx-auto shrink-0 px-7 py-3 font-bold text-sm mb-1 cursor-pointer"
          >
            Aterrizar en nuestro mundo 🌍✨
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
