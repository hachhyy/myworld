import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import {
  PetMood,
  PetSpecies,
  useWorldStore,
} from '../../store/useWorldStore';
import { CutePetAvatar, PET_CATALOG } from '../characters/CutePetAvatar';
import { SolarEnvironment } from '../../utils/solarAndTime';
import { soundEngine, triggerHeartbeatHaptic } from '../../utils/soundAndHaptics';

interface CasitaTamagotchiProps {
  solar: SolarEnvironment;
  onClose: () => void;
}

const MOODS: { id: PetMood; emoji: string; label: string }[] = [
  { id: 'Feliz', emoji: '😊', label: 'Feliz' },
  { id: 'Mimoso', emoji: '🥰', label: 'Mimoso' },
  { id: 'Cansado', emoji: '😴', label: 'Cansado' },
  { id: 'Con hambre', emoji: '🍕', label: 'Con hambre' },
  { id: 'Estresado', emoji: '😵‍💫', label: 'Estresado' },
  { id: 'Triste', emoji: '🥺', label: 'Triste' },
  { id: 'Estudiando/Trabajando', emoji: '💻', label: 'Concentrado' },
];

const FOODS = [
  { id: 'pizza', emoji: '🍕', name: 'Pizza' },
  { id: 'sushi', emoji: '🍣', name: 'Sushi' },
  { id: 'fruta', emoji: '🍓', name: 'Fresita' },
  { id: 'dulce', emoji: '🧁', name: 'Cupcake' },
];

interface FoamBubble {
  id: number;
  x: number;
  y: number;
  r: number;
}

interface CrumbParticle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  char: string;
}

export const CasitaTamagotchi: React.FC<CasitaTamagotchiProps> = ({ solar, onClose }) => {
  const {
    activeUser,
    petA,
    petB,
    petCare,
    updatePetProfile,
    careForPets,
    updateRoomDecor,
  } = useWorldStore();

  const myPet = activeUser === 'userA' ? petA : petB;
  const partnerPet = activeUser === 'userA' ? petB : petA;

  // Catálogo visual de muebles con tarjetas dibujadas
  const [bedModel, setBedModel] = useState<'rustica' | 'dosel' | 'futon'>(() => {
    return (localStorage.getItem('mw_v4_bed') as 'rustica' | 'dosel' | 'futon') || 'rustica';
  });
  const [tableModel, setTableModel] = useState<'kotatsu' | 'cafe' | 'picnic'>(() => {
    return (localStorage.getItem('mw_v4_table') as 'kotatsu' | 'cafe' | 'picnic') || 'kotatsu';
  });
  const [wallStyle, setWallStyle] = useState<'melocoton' | 'rayas' | 'estrellas' | 'madera'>(() => {
    return (
      (localStorage.getItem('mw_room_wall') as 'melocoton' | 'rayas' | 'estrellas' | 'madera') ||
      'melocoton'
    );
  });
  const [garlandStyle, setGarlandStyle] = useState<'calida' | 'estrellas' | 'corazones'>(() => {
    return (
      (localStorage.getItem('mw_v4_garland') as 'calida' | 'estrellas' | 'corazones') || 'calida'
    );
  });
  const [decorTab, setDecorTab] = useState<
    'cama' | 'alfombra' | 'mesa' | 'paredes' | 'guirnaldas' | 'mascotas'
  >('cama');

  // Cajón desplegable inferior
  const [openDrawer, setOpenDrawer] = useState<'none' | 'decor' | 'armario' | 'estado'>('none');

  // Máquina de estados de animación limpia y sin parpadeos: 'idle' | 'eating' | 'sleeping'
  const [petAnimState, setPetAnimState] = useState<'idle' | 'eating' | 'sleeping'>('idle');
  const inBedSleeping = petAnimState === 'sleeping';

  const [mushroomLampOn, setMushroomLampOn] = useState(true);
  const [vinylPlaying, setVinylPlaying] = useState(false);
  const [playingWithYarn, setPlayingWithYarn] = useState(false);
  const [tableSnack, setTableSnack] = useState<string>('🍵');
  const [floatingFeedback, setFloatingFeedback] = useState<string | null>(null);

  // Zonas de Anclaje Anti-Solapamiento sobre la alfombra (Izquierda para Mochi/A, Derecha para Pareja/B)
  // Desplazamientos acotados estrictamente para que jamás crucen el eje central ni se pisen
  const [roamA, setRoamA] = useState<{ dx: number; dy: number; hop: boolean }>({
    dx: 0,
    dy: 0,
    hop: false,
  });
  const [roamB, setRoamB] = useState<{ dx: number; dy: number; hop: boolean }>({
    dx: 0,
    dy: 0,
    hop: false,
  });
  const [pawHighFive, setPawHighFive] = useState(false);
  const [pettingPet, setPettingPet] = useState<'A' | 'B' | null>(null);
  const [isSquishingA, setIsSquishingA] = useState(false);
  const [isSquishingB, setIsSquishingB] = useState(false);

  // Drag & Drop de Comida
  const [draggingFood, setDraggingFood] = useState<{
    id: string;
    emoji: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredPetForFood, setHoveredPetForFood] = useState<'A' | 'B' | null>(null);
  const [chewingPet, setChewingPet] = useState<'A' | 'B' | 'both' | null>(null);
  const [crumbs, setCrumbs] = useState<CrumbParticle[]>([]);

  // Esponja y Baño de Espuma
  const [spongeActive, setSpongeActive] = useState(false);
  const [spongePos, setSpongePos] = useState<{ x: number; y: number } | null>(null);
  const [foamBubbles, setFoamBubbles] = useState<FoamBubble[]>([]);
  const [scrubProgress, setScrubProgress] = useState(0);
  const [scrubbingPet, setScrubbingPet] = useState<'A' | 'B' | null>(null);
  const [shakingClean, setShakingClean] = useState(false);

  const roomRef = useRef<HTMLDivElement | null>(null);
  const petARef = useRef<HTMLDivElement | null>(null);
  const petBRef = useRef<HTMLDivElement | null>(null);
  const lastScrubSoundRef = useRef<number>(0);
  const lastPetRubRef = useRef<number>(0);

  const isDirty = petCare.hygiene < 65 && scrubProgress < 100;
  const mudOpacity = isDirty ? Math.max(0, 1 - scrubProgress / 100) : 0;
  const isInteracting = Boolean(draggingFood || spongeActive || petAnimState !== 'idle');
  const isCelebrating =
    !isInteracting &&
    (petCare.celebrationBounceUntil > Date.now() || playingWithYarn || pawHighFive);

  // Lógica Anti-Solapamiento: cuando están en 'idle' sobre la alfombra, se mueven suavemente alrededor de su propio anclaje
  // y vuelven a (0,0) en reposo. Durante comida, baño o sueño se quedan quietas en su anclaje sin parpadear.
  useEffect(() => {
    if (petAnimState !== 'idle' || draggingFood || spongeActive) {
      setRoamA({ dx: 0, dy: 0, hop: false });
      setRoamB({ dx: 0, dy: 0, hop: false });
      setPawHighFive(false);
      return;
    }

    const interval = setInterval(() => {
      const returnToAnchor = Math.random() < 0.45;
      if (returnToAnchor) {
        // Vuelven limpiamente a sus zonas de anclaje en reposo
        setPawHighFive(false);
        setRoamA({ dx: 0, dy: 0, hop: false });
        setRoamB({ dx: 0, dy: 0, hop: false });
      } else {
        // Pequeño pasito dentro de su propia mitad de la alfombra (jamás cruzan el centro: dxA <= 8, dxB >= -8)
        const dxA = Math.round((Math.random() - 0.6) * 14);
        const dxB = Math.round((Math.random() - 0.4) * 14);
        setRoamA({
          dx: Math.min(8, Math.max(-12, dxA)),
          dy: Math.round((Math.random() - 0.5) * 8),
          hop: true,
        });
        setRoamB({
          dx: Math.max(-8, Math.min(12, dxB)),
          dy: Math.round((Math.random() - 0.5) * 8),
          hop: true,
        });
        setTimeout(() => {
          setRoamA((prev) => ({ ...prev, hop: false }));
          setRoamB((prev) => ({ ...prev, hop: false }));
        }, 420);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [petAnimState, draggingFood, spongeActive]);

  // Melodía lo-fi suave cuando el Tocadiscos Vintage está girando
  useEffect(() => {
    if (!vinylPlaying) return;
    let step = 0;
    soundEngine.playCozyMelodyStep(step++);
    const timer = setInterval(() => {
      soundEngine.playCozyMelodyStep(step++);
    }, 650);
    return () => clearInterval(timer);
  }, [vinylPlaying]);

  const showToast = (msg: string) => {
    setFloatingFeedback(msg);
    setTimeout(() => setFloatingFeedback(null), 2400);
  };

  const spawnParticlesAtPet = (target: 'A' | 'B', chars: string[]) => {
    const petEl = target === 'A' ? petARef.current : petBRef.current;
    const roomEl = roomRef.current;
    if (!petEl || !roomEl) return;
    const pRect = petEl.getBoundingClientRect();
    const rRect = roomEl.getBoundingClientRect();
    const baseX = pRect.left - rRect.left + pRect.width / 2;
    const baseY = pRect.top - rRect.top + pRect.height * 0.38;

    const newCrumbs: CrumbParticle[] = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      x: baseX,
      y: baseY,
      dx: (Math.random() - 0.5) * 95,
      dy: -30 - Math.random() * 55,
      char: chars[i % chars.length],
    }));
    setCrumbs((prev) => [...prev.slice(-18), ...newCrumbs]);
    setTimeout(() => {
      setCrumbs((prev) => prev.filter((c) => !newCrumbs.some((nc) => nc.id === c.id)));
    }, 1200);
  };

  // Acariciar con el dedo / ratón sobre la barriga o cabeza de la mascota + rebote squishy tipo mochi
  const handlePetBellyRub = (target: 'A' | 'B') => {
    if (spongeActive || draggingFood || petAnimState !== 'idle') return;
    const now = Date.now();
    if (now - lastPetRubRef.current < 380) return;
    lastPetRubRef.current = now;

    if (target === 'A') {
      setIsSquishingA(true);
      setTimeout(() => setIsSquishingA(false), 480);
    } else {
      setIsSquishingB(true);
      setTimeout(() => setIsSquishingB(false), 480);
    }

    setPettingPet(target);
    careForPets('pamper_partner');
    soundEngine.playPop(1.25);
    spawnParticlesAtPet(target, ['💖', '💕', '✨', '🥰']);
    setTimeout(() => setPettingPet(null), 900);
  };

  const getClosestPet = (clientX: number, clientY: number, threshold = 130): 'A' | 'B' | null => {
    let closest: 'A' | 'B' | null = null;
    let minDist = threshold;

    if (petARef.current) {
      const rA = petARef.current.getBoundingClientRect();
      const dA = Math.hypot(clientX - (rA.left + rA.width / 2), clientY - (rA.top + rA.height / 2));
      if (dA < minDist) {
        minDist = dA;
        closest = 'A';
      }
    }
    if (petBRef.current) {
      const rB = petBRef.current.getBoundingClientRect();
      const dB = Math.hypot(clientX - (rB.left + rB.width / 2), clientY - (rB.top + rB.height / 2));
      if (dB < minDist) {
        minDist = dB;
        closest = 'B';
      }
    }
    return closest;
  };

  const startFoodDrag = (
    food: { id: string; emoji: string; name: string },
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSpongeActive(false);
    setPetAnimState('idle');
    setRoamA({ dx: 0, dy: 0, hop: false });
    setRoamB({ dx: 0, dy: 0, hop: false });
    setDraggingFood({
      ...food,
      x: e.clientX,
      y: e.clientY,
    });
    setHoveredPetForFood(getClosestPet(e.clientX, e.clientY));
  };

  const moveFoodDrag = (e: React.PointerEvent) => {
    if (!draggingFood) return;
    const near = getClosestPet(e.clientX, e.clientY);
    setDraggingFood((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
    setHoveredPetForFood(near);
  };

  const endFoodDrag = (e: React.PointerEvent) => {
    if (!draggingFood) return;
    const targetPet = getClosestPet(e.clientX, e.clientY, 145);
    const droppedFood = draggingFood;
    setDraggingFood(null);
    setHoveredPetForFood(null);

    const fedTarget: 'A' | 'B' = targetPet || (activeUser === 'userA' ? 'A' : 'B');
    setTableSnack(droppedFood.emoji);
    setPetAnimState('eating');
    setChewingPet(fedTarget);
    careForPets('feed');
    soundEngine.speakAnimalese('Ñam ñam qué rico', 490);
    triggerHeartbeatHaptic();
    spawnParticlesAtPet(fedTarget, [droppedFood.emoji, '💕', '✨', '😋']);

    setTimeout(() => {
      setChewingPet(null);
      setPetAnimState((prev) => (prev === 'eating' ? 'idle' : prev));
    }, 1800);
  };

  const handleRoomPointerMove = (e: React.PointerEvent) => {
    if (!spongeActive || !roomRef.current) return;
    const rRect = roomRef.current.getBoundingClientRect();
    const relX = e.clientX - rRect.left;
    const relY = e.clientY - rRect.top;
    setSpongePos({ x: relX, y: relY });

    const nearPet = getClosestPet(e.clientX, e.clientY, 120);
    setScrubbingPet((prev) => (prev === nearPet ? prev : nearPet));

    if (nearPet && (e.buttons > 0 || e.pointerType === 'touch' || e.pointerType === 'mouse')) {
      const now = Date.now();
      if (now - lastScrubSoundRef.current > 180) {
        soundEngine.playBrushNoise();
        lastScrubSoundRef.current = now;
      }

      const newBubbles: FoamBubble[] = [
        {
          id: now + Math.random(),
          x: relX + (Math.random() - 0.5) * 34,
          y: relY + (Math.random() - 0.5) * 34,
          r: 8 + Math.random() * 12,
        },
      ];
      setFoamBubbles((prev) => [...prev.slice(-30), ...newBubbles]);

      setScrubProgress((prev) => {
        const next = Math.min(100, prev + 3.5);
        if (next >= 100 && prev < 100) {
          careForPets('wash');
          setShakingClean(true);
          triggerHeartbeatHaptic();
          showToast('¡Limpitos y relucientes entre pompas de jabón! ✨🫧');
          setTimeout(() => {
            setFoamBubbles([]);
            setSpongeActive(false);
            setSpongePos(null);
            setScrubbingPet(null);
            setShakingClean(false);
            setScrubProgress(0);
          }, 1200);
        }
        return next;
      });
    }
  };

  const skyColors =
    solar.timeOfDay === 'night'
      ? { top: '#13192B', bottom: '#253152' }
      : solar.timeOfDay === 'sunset'
        ? { top: '#F7A8B8', bottom: '#FFE5C4' }
        : { top: '#8CC5E3', bottom: '#D6EFFF' };

  const quiltColor =
    bedModel === 'dosel' ? '#F4ACB7' : bedModel === 'futon' ? '#74C69D' : '#F4845F';

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] z-40 flex flex-col justify-between watercolor-paper overflow-hidden overscroll-none select-none">
      {/* Cabecera compacta con Safe Area superior de iOS */}
      <div className="safe-top-header px-3 pb-2 shrink-0 flex items-center justify-between gap-1.5 border-b border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-xl shadow-[0_6px_18px_rgba(255,158,187,0.16)] z-30">
        <motion.button
          whileTap={{ scale: 0.9, rotate: -2 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16 }}
          onClick={onClose}
          className="hand-pill px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Planeta
        </motion.button>

        {/* Barras de cuidados de las mascotas */}
        <div className="flex items-center justify-center gap-2 bg-white/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/80 shadow-xs min-w-0">
          {[
            { icon: '🍕', val: petCare.hunger, color: '#F4A261' },
            {
              icon: '🫧',
              val: isDirty ? Math.round(100 - mudOpacity * 65) : petCare.hygiene,
              color: '#6CE3F3',
            },
            { icon: '💤', val: petCare.energy, color: '#C3AFEA' },
            { icon: '💕', val: petCare.affection, color: '#FF9EBB' },
          ].map((stat, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="text-xs leading-none">{stat.icon}</span>
              <div className="w-7 sm:w-9 h-2 rounded-full bg-[#4A3F35]/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${stat.val}%`, backgroundColor: stat.color }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden sm:block hand-pill px-3 py-1 text-[11px] font-bold shrink-0">
          🏡 Salón 2.5D
        </div>
      </div>

      {/* ESCENARIO 2.5D ESTRUCTURADO:
          - 35% SUPERIOR: Pared Azul Noche con ventana centrada, librería a la derecha y cabecero de la cama en perspectiva a la izquierda.
          - 65% INFERIOR: Suelo de parqué cálido, gran alfombra redonda rosa 100% visible en el centro y mesita de té perfectamente encuadrada debajo. */}
      <div
        ref={roomRef}
        onPointerMove={handleRoomPointerMove}
        onPointerDown={handleRoomPointerMove}
        className={`relative flex-1 min-h-0 w-full flex flex-col overflow-hidden ${
          spongeActive ? 'cursor-none' : ''
        }`}
      >
        {/* ESTRUCTURA BASE EN CSS GRID / FLEX (35% Pared Fondo / 65% Suelo Parqué) */}
        <div className="w-full h-[35%] shrink-0 relative" />
        <div className="w-full h-[65%] shrink-0 relative" />

        {/* ESCENARIO VECTORIAL 2.5D ALINEADO EXACTAMENTE AL 35% (y=182 de 520) Y 65% INFERIOR */}
        <svg
          viewBox="0 0 460 520"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <linearGradient id="winSkyV5" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={skyColors.top} />
              <stop offset="100%" stopColor={skyColors.bottom} />
            </linearGradient>

            <linearGradient id="nightBlueWallGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E2742" />
              <stop offset="100%" stopColor="#2B3758" />
            </linearGradient>

            <radialGradient id="mushroomWarmGlowV5" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFD166" stopOpacity={mushroomLampOn ? '0.52' : '0'} />
              <stop offset="100%" stopColor="#FFD166" stopOpacity="0" />
            </radialGradient>

            {/* Parqué de madera cálida en perspectiva horizontal */}
            <pattern id="warmParquetPlanksV5" width="140" height="30" patternUnits="userSpaceOnUse">
              <rect width="140" height="15" fill={solar.isNightMode ? '#B07D52' : '#E2AD72'} />
              <rect y="15" width="140" height="15" fill={solar.isNightMode ? '#A37046' : '#D69F63'} />
              <path
                d="M 8 6 Q 42 3 78 7 T 132 6"
                stroke="#9C6644"
                strokeWidth="1.1"
                fill="none"
                opacity="0.42"
              />
              <path
                d="M 14 22 Q 58 19 96 23 T 134 21"
                stroke="#9C6644"
                strokeWidth="1.1"
                fill="none"
                opacity="0.42"
              />
              <line x1="0" y1="15" x2="140" y2="15" stroke="#7F4F24" strokeWidth="1.3" opacity="0.4" />
              <line x1="0" y1="30" x2="140" y2="30" stroke="#7F4F24" strokeWidth="1.3" opacity="0.4" />
              <line x1="68" y1="0" x2="68" y2="15" stroke="#7F4F24" strokeWidth="1.2" opacity="0.35" />
              <line x1="118" y1="15" x2="118" y2="30" stroke="#7F4F24" strokeWidth="1.2" opacity="0.35" />
            </pattern>

            <pattern id="wallStripesV5" width="28" height="28" patternUnits="userSpaceOnUse">
              <rect width="28" height="28" fill="#26334D" />
              <rect width="13" height="28" fill="#2F3E5C" />
            </pattern>

            <pattern id="wallStarsV5" width="42" height="42" patternUnits="userSpaceOnUse">
              <rect width="42" height="42" fill="#232B47" />
              <circle cx="12" cy="14" r="1.8" fill="#FFE066" opacity="0.7" />
              <circle cx="32" cy="30" r="2.1" fill="#FFCAD4" opacity="0.6" />
            </pattern>

            <pattern id="wallWoodV5" width="56" height="24" patternUnits="userSpaceOnUse">
              <rect width="56" height="24" fill="#3B4259" />
              <line x1="0" y1="24" x2="56" y2="24" stroke="#282E42" strokeWidth="2" />
            </pattern>
          </defs>

          {/* =========================================================================
              1. FONDO (35% SUPERIOR: y = 0 a 182): PARED AZUL NOCHE CON PERSPECTIVA 2.5D
             ========================================================================= */}
          {(() => {
            const wallFill =
              wallStyle === 'rayas'
                ? 'url(#wallStripesV5)'
                : wallStyle === 'estrellas'
                  ? 'url(#wallStarsV5)'
                  : wallStyle === 'madera'
                    ? 'url(#wallWoodV5)'
                    : 'url(#nightBlueWallGrad)';
            return (
              <g>
                {/* Pared de fondo azul noche */}
                <rect x="0" y="0" width="460" height="182" fill={wallFill} />
                {/* Líneas laterales de esquina 2.5D que dan profundidad de habitación isométrica */}
                <polygon
                  points="0,0 24,18 24,182 0,196"
                  fill="#192138"
                  opacity="0.45"
                />
                <polygon
                  points="460,0 436,18 436,182 460,196"
                  fill="#192138"
                  opacity="0.45"
                />
                {/* Zócalo de madera cálida en la unión del 35% superior con el 65% inferior */}
                <rect
                  x="0"
                  y="174"
                  width="460"
                  height="10"
                  fill="#C68B59"
                  stroke="#3D312A"
                  strokeWidth="2.2"
                />
              </g>
            );
          })()}

          {/* =========================================================================
              2. SUELO (65% INFERIOR: y = 184 a 520): PARQUÉ DE MADERA CÁLIDA
             ========================================================================= */}
          <rect
            x="0"
            y="184"
            width="460"
            height="336"
            fill="url(#warmParquetPlanksV5)"
            stroke="#3D312A"
            strokeWidth="2.2"
          />
          {/* Sombra proyectada por la pared sobre el parqué para profundidad 2.5D */}
          <rect x="0" y="184" width="460" height="12" fill="#3D312A" opacity="0.16" />

          {/* =========================================================================
              3. PARED IZQUIERDA: GUIRNALDA CÁLIDA + 2 POLAROIDS + MESITA HONGO
             ========================================================================= */}
          <g>
            <path
              d="M 12 18 Q 56 36 100 22 Q 140 36 172 16"
              stroke="#FFFDF9"
              strokeWidth="1.6"
              fill="none"
              opacity="0.7"
            />
            {[26, 52, 78, 104, 130, 156].map((lx, idx) => {
              const ly = idx % 2 === 0 ? 25 : 30;
              const bulbColor =
                garlandStyle === 'corazones'
                  ? '#FF8FA3'
                  : garlandStyle === 'estrellas'
                    ? '#A8DADC'
                    : '#FFE066';
              return (
                <g key={idx}>
                  <circle cx={lx} cy={ly} r="8" fill={bulbColor} opacity="0.38" />
                  <circle cx={lx} cy={ly} r="4" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.3" />
                  <circle cx={lx} cy={ly} r="2.5" fill={bulbColor} />
                </g>
              );
            })}

            {/* 2 Polaroids enmarcadas en la pared azul noche */}
            <g transform="translate(24, 38) rotate(-4)">
              <rect x="0" y="0" width="36" height="42" rx="3" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.8" />
              <rect x="4" y="4" width="28" height="25" rx="2" fill="#FFE5D9" stroke="#3D312A" strokeWidth="1.2" />
              <circle cx="18" cy="16" r="5.5" fill="#FF8FA3" />
            </g>
            <g transform="translate(72, 36) rotate(4)">
              <rect x="0" y="0" width="36" height="42" rx="3" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.8" />
              <rect x="4" y="4" width="28" height="25" rx="2" fill="#D8F3DC" stroke="#3D312A" strokeWidth="1.2" />
              <polygon points="7,27 17,12 27,27" fill="#74C69D" />
              <circle cx="23" cy="11" r="3.2" fill="#FFD166" />
            </g>
          </g>

          {/* =========================================================================
              4. VENTANA CENTRADA EN LA PARED AZUL NOCHE (x=176..284, centrada en x=230)
             ========================================================================= */}
          <g transform="translate(176, 22)">
            <rect
              x="0"
              y="0"
              width="108"
              height="118"
              rx="14"
              fill="#FFFDF9"
              stroke="#3D312A"
              strokeWidth="2.6"
            />
            <rect
              x="7"
              y="7"
              width="94"
              height="104"
              rx="9"
              fill="url(#winSkyV5)"
              stroke="#3D312A"
              strokeWidth="1.8"
            />

            {/* Sol / Luna y estrellas vistas a través de la ventana centrada */}
            {solar.isNightMode ? (
              <g>
                <circle cx="74" cy="30" r="11" fill="#FFF3B0" />
                <circle cx="79" cy="26" r="9" fill={skyColors.top} />
                <circle cx="24" cy="24" r="1.6" fill="#FFF" />
                <circle cx="46" cy="38" r="1.4" fill="#FFF" />
                <circle cx="30" cy="58" r="1.4" fill="#FFF" />
              </g>
            ) : (
              <g>
                <circle cx="74" cy="30" r="12" fill="#FFD166" stroke="#F4A261" strokeWidth="1.8" />
                <path
                  d="M 18 44 Q 18 37 25 37 Q 29 31 37 33 Q 44 33 46 40 Q 51 41 50 46 Q 50 50 44 50 L 22 50 Q 16 50 18 44 Z"
                  fill="#FFFFFF"
                  opacity="0.92"
                />
              </g>
            )}

            {/* Colinas suaves del planeta al fondo */}
            <path d="M 7 88 Q 42 74 72 86 T 101 82 L 101 111 L 7 111 Z" fill="#7ED992" />
            <path d="M 7 98 Q 54 88 101 96 L 101 111 L 7 111 Z" fill="#52B788" />

            {/* Cruceta de la ventana y cortinas recogidas */}
            <line x1="54" y1="7" x2="54" y2="111" stroke="#FFFDF9" strokeWidth="3.5" />
            <line x1="54" y1="7" x2="54" y2="111" stroke="#3D312A" strokeWidth="1.5" />
            <line x1="7" y1="59" x2="101" y2="59" stroke="#FFFDF9" strokeWidth="3.5" />
            <line x1="7" y1="59" x2="101" y2="59" stroke="#3D312A" strokeWidth="1.5" />

            <path
              d="M -5 2 Q 16 30 7 64 Q 14 92 4 116 L -5 116 Z"
              fill="#FFB5A7"
              stroke="#3D312A"
              strokeWidth="2"
            />
            <path
              d="M 113 2 Q 92 30 101 64 Q 94 92 104 116 L 113 116 Z"
              fill="#FFB5A7"
              stroke="#3D312A"
              strokeWidth="2"
            />
            <rect
              x="-8"
              y="113"
              width="124"
              height="9"
              rx="4"
              fill="#D4A373"
              stroke="#3D312A"
              strokeWidth="2.2"
            />
          </g>

          {/* =========================================================================
              5. LIBRERÍA A LA DERECHA EN LA PARED SUPERIOR + TOCADISCOS INTERACTIVO
             ========================================================================= */}
          <g transform="translate(336, 18)">
            {/* Sombra lateral 2.5D de la librería */}
            <polygon points="-8,8 0,0 0,164 -8,170" fill="#6F4518" stroke="#3D312A" strokeWidth="1.8" />
            <rect
              x="0"
              y="0"
              width="98"
              height="164"
              rx="6"
              fill="#B07D52"
              stroke="#3D312A"
              strokeWidth="2.4"
            />
            <rect
              x="7"
              y="7"
              width="84"
              height="150"
              rx="4"
              fill="#7F4F24"
              stroke="#3D312A"
              strokeWidth="1.8"
            />
            {[44, 86, 128].map((sy, idx) => (
              <rect
                key={idx}
                x="6"
                y={sy}
                width="86"
                height="6"
                fill="#B07D52"
                stroke="#3D312A"
                strokeWidth="1.6"
              />
            ))}

            {/* Libros de colores, globo terráqueo y poto colgante */}
            <rect x="12" y="18" width="10" height="26" rx="1.5" fill="#E76F51" stroke="#3D312A" strokeWidth="1.4" />
            <rect x="23" y="22" width="9" height="22" rx="1.5" fill="#2A9D8F" stroke="#3D312A" strokeWidth="1.4" />
            <rect x="33" y="16" width="10" height="28" rx="1.5" fill="#E9C46A" stroke="#3D312A" strokeWidth="1.4" />
            <rect x="54" y="20" width="22" height="24" rx="3" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.6" />
            <circle cx="65" cy="32" r="4.5" fill="#FF758F" />

            <circle cx="26" cy="68" r="10" fill="#8ECAE6" stroke="#3D312A" strokeWidth="1.6" />
            <rect x="46" y="60" width="10" height="26" fill="#F4A261" stroke="#3D312A" strokeWidth="1.4" />
            <rect x="57" y="63" width="10" height="23" fill="#95D5B2" stroke="#3D312A" strokeWidth="1.4" />
            <rect x="68" y="58" width="10" height="28" fill="#FFB5A7" stroke="#3D312A" strokeWidth="1.4" />

            {/* Planta colgante */}
            <path d="M 72 10 L 75 22 L 86 22 L 89 10 Z" fill="#E07A5F" stroke="#3D312A" strokeWidth="1.5" />
            <path d="M 81 20 Q 90 44 82 68 Q 76 86 84 104" stroke="#52B788" strokeWidth="2.4" fill="none" />
            <ellipse cx="85" cy="42" rx="5" ry="3.5" fill="#74C69D" stroke="#3D312A" strokeWidth="1.2" />
            <ellipse cx="81" cy="64" rx="5" ry="3.5" fill="#52B788" stroke="#3D312A" strokeWidth="1.2" />
          </g>

          {/* Mesita de noche y Lámpara Hongo interactiva junto a la cama */}
          <g
            transform="translate(134, 134)"
            onClick={() => {
              const next = !mushroomLampOn;
              setMushroomLampOn(next);
              soundEngine.playPop();
              showToast(next ? '🍄 Lámpara hongo encendida' : '🌙 Lámpara hongo apagada');
            }}
            className="cursor-pointer pointer-events-auto"
          >
            {mushroomLampOn && <circle cx="18" cy="16" r="58" fill="url(#mushroomWarmGlowV5)" />}
            <rect x="2" y="32" width="34" height="38" rx="5" fill="#C68B59" stroke="#3D312A" strokeWidth="2" />
            <rect x="6" y="38" width="26" height="12" rx="3" fill="#DDA15E" stroke="#3D312A" strokeWidth="1.5" />
            <circle cx="19" cy="44" r="2" fill="#3D312A" />
            <path d="M 14 32 L 16 18 L 22 18 L 24 32 Z" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.8" />
            <path
              d="M 4 20 C 4 5, 34 5, 34 20 Z"
              fill={mushroomLampOn ? '#FF6B6B' : '#C85A53'}
              stroke="#3D312A"
              strokeWidth="2"
            />
            <circle cx="13" cy="13" r="2.4" fill="#FFFDF9" />
            <circle cx="21" cy="11" r="2.8" fill="#FFFDF9" />
            <circle cx="26" cy="15" r="2" fill="#FFFDF9" />
          </g>

          {/* =========================================================================
              6. CAMA EN PERSPECTIVA 2.5D A LA IZQUIERDA (Cabecero en pared superior y colchón proyectado hacia el suelo)
             ========================================================================= */}
          <g
            transform="translate(12, 96)"
            onClick={() => {
              const nextSleeping = petAnimState !== 'sleeping';
              setPetAnimState(nextSleeping ? 'sleeping' : 'idle');
              if (nextSleeping) {
                careForPets('sleep');
                showToast('¡A dormir bajo la colcha calentita! 🛏️💤');
              } else {
                showToast('¡De vuelta a sus zonas de la alfombra rosa! 🐾');
              }
            }}
            className="cursor-pointer pointer-events-auto"
          >
            {bedModel === 'dosel' && (
              <path
                d="M 4 -14 Q 58 -28 114 -14 L 120 48 L -2 48 Z"
                fill="#FFD6E0"
                opacity="0.55"
                stroke="#3D312A"
                strokeWidth="2"
              />
            )}

            {/* Cabecero de madera en la pared del 35% superior */}
            <path
              d="M 4 46 L 4 12 Q 59 -6 114 12 L 114 46 Z"
              fill={bedModel === 'futon' ? '#DDA15E' : '#9C6644'}
              stroke="#3D312A"
              strokeWidth="2.4"
            />

            {/* Sombra proyectada de la cama en el parqué */}
            <ellipse cx="62" cy="128" rx="64" ry="12" fill="#3D312A" opacity="0.22" />

            {/* Estructura / Colchón en perspectiva 2.5D */}
            <rect
              x="2"
              y="38"
              width="116"
              height="86"
              rx="12"
              fill="#FFFDF9"
              stroke="#3D312A"
              strokeWidth="2.4"
            />

            {/* Dos almohadas mullidas donde apoyan la cabecita al dormir */}
            <rect x="9" y="26" width="45" height="24" rx="8" fill="#FFFFFF" stroke="#3D312A" strokeWidth="2" />
            <rect x="64" y="26" width="45" height="24" rx="8" fill="#FFFFFF" stroke="#3D312A" strokeWidth="2" />

            {/* Cuando están despiertas en la alfombra, la colcha se muestra siempre visible sobre la cama */}
            {!inBedSleeping && (
              <g>
                {/* Embozo blanco doblado */}
                <rect
                  x="4"
                  y="52"
                  width="112"
                  height="13"
                  rx="5"
                  fill="#FFFDF9"
                  stroke="#3D312A"
                  strokeWidth="2"
                />
                {/* Colcha mullida visible */}
                <rect
                  x="4"
                  y="60"
                  width="112"
                  height="58"
                  rx="10"
                  fill={quiltColor}
                  stroke="#3D312A"
                  strokeWidth="2.3"
                />
                <line x1="40" y1="62" x2="40" y2="116" stroke="#3D312A" strokeWidth="1.6" opacity="0.28" />
                <line x1="78" y1="62" x2="78" y2="116" stroke="#3D312A" strokeWidth="1.6" opacity="0.28" />
              </g>
            )}

            {/* Pie de cama de madera en perspectiva */}
            <rect
              x="0"
              y="114"
              width="120"
              height="11"
              rx="4"
              fill="#7F4F24"
              stroke="#3D312A"
              strokeWidth="2.4"
            />
          </g>

          {/* TOCADISCOS INTERACTIVO A LA DERECHA */}
          <g
            transform="translate(366, 196)"
            onClick={() => {
              const next = !vinylPlaying;
              setVinylPlaying(next);
              showToast(next ? '🎶 Tocadiscos girando · Melodía Lo-Fi' : '🔇 Tocadiscos en pausa');
            }}
            className="cursor-pointer pointer-events-auto"
          >
            <rect x="0" y="22" width="72" height="46" rx="6" fill="#C68B59" stroke="#3D312A" strokeWidth="2.2" />
            <rect x="6" y="28" width="60" height="32" rx="4" fill="#9C6644" stroke="#3D312A" strokeWidth="1.6" />
            <rect x="6" y="6" width="60" height="18" rx="5" fill="#E76F51" stroke="#3D312A" strokeWidth="2" />
            <ellipse cx="32" cy="8" rx="18" ry="6.5" fill="#222222" stroke="#3D312A" strokeWidth="1.6" />
            <ellipse cx="32" cy="8" rx="6" ry="2.4" fill="#FFD166" />
            <line x1="52" y1="4" x2="40" y2="9" stroke="#FFFDF9" strokeWidth="1.8" strokeLinecap="round" />
            {vinylPlaying && (
              <g className="animate-bounce">
                <text x="8" y="-6" fontSize="16" fill="#FFFDF9" stroke="#3D312A" strokeWidth="0.6" fontWeight="bold">
                  ♪
                </text>
                <text x="42" y="-12" fontSize="18" fill="#FFD166" stroke="#3D312A" strokeWidth="0.6" fontWeight="bold">
                  ♫
                </text>
              </g>
            )}
          </g>

          {/* =========================================================================
              7. GRAN ALFOMBRA REDONDA ROSA EN EL CENTRO EXACTO DEL SUELO (100% VISIBLE, NO CORTADA)
             ========================================================================= */}
          <g transform="translate(230, 304)">
            {/* Sombra suave bajo la alfombra */}
            <ellipse cx="0" cy="5" rx="146" ry="62" fill="#3D312A" opacity="0.18" />
            {petCare.roomRug === 'flores' && (
              <g>
                <ellipse
                  cx="0"
                  cy="0"
                  rx="144"
                  ry="60"
                  fill="#FFC8DD"
                  stroke="#3D312A"
                  strokeWidth="2.6"
                />
                <ellipse
                  cx="0"
                  cy="0"
                  rx="124"
                  ry="48"
                  fill="#FFAFCC"
                  stroke="#FFFDF9"
                  strokeWidth="2.2"
                  strokeDasharray="8 5"
                />
              </g>
            )}
            {petCare.roomRug === 'vichy' && (
              <rect
                x="-140"
                y="-56"
                width="280"
                height="112"
                rx="38"
                fill="#FFE5D9"
                stroke="#3D312A"
                strokeWidth="2.6"
              />
            )}
            {petCare.roomRug === 'nube' && (
              <ellipse
                cx="0"
                cy="0"
                rx="144"
                ry="60"
                fill="#FFFDF9"
                stroke="#3D312A"
                strokeWidth="2.6"
              />
            )}
          </g>

          {/* =========================================================================
              8. DEBAJO DE LA ALFOMBRA: MESITA DE TÉ PERFECTAMENTE ENCUADRADA (100% VISIBLE)
             ========================================================================= */}
          <g transform="translate(230, 434)">
            {/* Sombra ovalada bajo la mesita */}
            <ellipse cx="0" cy="22" rx="92" ry="16" fill="#3D312A" opacity="0.2" />

            {/* Cojines mullidos a izquierda y derecha */}
            <ellipse cx="-84" cy="8" rx="26" ry="12" fill="#FFB5A7" stroke="#3D312A" strokeWidth="2.2" />
            <ellipse cx="84" cy="8" rx="26" ry="12" fill="#A8DADC" stroke="#3D312A" strokeWidth="2.2" />

            {/* Patas de madera de la mesita de té (completamente encuadradas dentro de y <= 462) */}
            <rect x="-46" y="4" width="11" height="22" rx="4" fill="#7F4F24" stroke="#3D312A" strokeWidth="2" />
            <rect x="35" y="4" width="11" height="22" rx="4" fill="#7F4F24" stroke="#3D312A" strokeWidth="2" />

            {/* Tablero redondo de madera en perspectiva */}
            <ellipse
              cx="0"
              cy="-2"
              rx="66"
              ry="22"
              fill={
                tableModel === 'kotatsu'
                  ? '#D4A373'
                  : tableModel === 'picnic'
                    ? '#95D5B2'
                    : '#E76F51'
              }
              stroke="#3D312A"
              strokeWidth="2.6"
            />
            {/* Mantelito central y dos tacitas de té */}
            <ellipse cx="0" cy="-4" rx="23" ry="9.5" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.8" />
            <circle cx="-34" cy="-2" r="6.5" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.6" />
            <circle cx="34" cy="-2" r="6.5" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.6" />
            <text x="0" y="2" fontSize="18" textAnchor="middle">
              {tableSnack}
            </text>
          </g>

          {/* Ovillo de lana interactivo a la izquierda de la mesita */}
          <g
            transform="translate(86, 434)"
            onClick={() => {
              setPetAnimState('idle');
              setPlayingWithYarn(true);
              soundEngine.playPop(1.3);
              showToast('🧶 ¡Jugando alegres desde sus zonas en la alfombra!');
              setTimeout(() => setPlayingWithYarn(false), 2400);
            }}
            className="cursor-pointer pointer-events-auto"
          >
            <circle cx="0" cy="0" r="15" fill="#FF8FA3" stroke="#3D312A" strokeWidth="2.2" />
            <path d="M -8 -5 Q 0 4 8 -5" stroke="#3D312A" strokeWidth="1.5" fill="none" />
            <path d="M -7 5 Q 0 -4 7 5" stroke="#3D312A" strokeWidth="1.5" fill="none" />
            <path d="M 11 9 Q 24 15 32 7" stroke="#FF8FA3" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          </g>
        </svg>

        {/* =========================================================================
            ZONA DE ANCLAJE INVISIBLE 1 (IZQUIERDA DE LA ALFOMBRA: left 34%, top 54%)
            MASCOTA A (Mochi) — NUNCA SE SOLAPA CON LA MASCOTA B
           ========================================================================= */}
        <motion.div
          animate={
            inBedSleeping
              ? {
                  left: '10.5%',
                  top: '27.5%',
                  x: '-50%',
                  y: '-50%',
                  scale: 0.68,
                }
              : {
                  left: '34%',
                  top: '54%',
                  x: `calc(-50% + ${roamA.dx}px)`,
                  y: `calc(-50% + ${roamA.dy + (roamA.hop ? -8 : 0)}px)`,
                  scale: 1,
                }
          }
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          style={{ position: 'absolute' }}
          className="z-20 flex flex-col items-center pointer-events-auto"
        >
          {/* Sombra ovalada suave en el anclaje izquierdo de la alfombra */}
          {!inBedSleeping && (
            <div className="absolute bottom-1.5 w-24 h-5 rounded-full bg-[#3D312A]/22 blur-[1px] pointer-events-none" />
          )}

          <div
            ref={petARef}
            onPointerDown={() => handlePetBellyRub('A')}
            onPointerEnter={(e) => {
              if (e.buttons > 0) handlePetBellyRub('A');
            }}
            className="relative cursor-pointer"
          >
            <motion.div
              style={{ transformOrigin: '50% 92%' }}
              animate={
                isSquishingA
                  ? {
                      scaleX: [1, 1.24, 0.88, 1.07, 1],
                      scaleY: [1, 0.76, 1.16, 0.94, 1],
                    }
                  : {
                      scaleX: [1, 0.98, 1],
                      scaleY: [1, 1.04, 1],
                    }
              }
              transition={
                isSquishingA
                  ? { duration: 0.48, ease: [0.34, 1.56, 0.64, 1] }
                  : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <CutePetAvatar
                species={petA.species}
                hat={petA.hat}
                glasses={petA.glasses}
                neck={petA.neck}
                isDirty={isDirty}
                mudOpacity={mudOpacity}
                isSleepy={inBedSleeping}
                isBouncing={isCelebrating || roamA.hop}
                mouthState={
                  chewingPet === 'A' || chewingPet === 'both'
                    ? 'chewing'
                    : hoveredPetForFood === 'A'
                      ? 'open'
                      : 'normal'
                }
                eyesSparkle={hoveredPetForFood === 'A' || pettingPet === 'A' || pawHighFive}
                isHappyClosedEyes={
                  inBedSleeping || scrubbingPet === 'A' || chewingPet === 'A' || pettingPet === 'A'
                }
                isShakingClean={shakingClean}
                size={132}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* =========================================================================
            ZONA DE ANCLAJE INVISIBLE 2 (DERECHA DE LA ALFOMBRA: left 66%, top 54%)
            MASCOTA B (Pareja) — NUNCA SE SOLAPA CON LA MASCOTA A
           ========================================================================= */}
        <motion.div
          animate={
            inBedSleeping
              ? {
                  left: '22.5%',
                  top: '27.5%',
                  x: '-50%',
                  y: '-50%',
                  scale: 0.68,
                }
              : {
                  left: '66%',
                  top: '54%',
                  x: `calc(-50% + ${roamB.dx}px)`,
                  y: `calc(-50% + ${roamB.dy + (roamB.hop ? -8 : 0)}px)`,
                  scale: 1,
                }
          }
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          style={{ position: 'absolute' }}
          className="z-20 flex flex-col items-center pointer-events-auto"
        >
          {/* Sombra ovalada suave en el anclaje derecho de la alfombra */}
          {!inBedSleeping && (
            <div className="absolute bottom-1.5 w-24 h-5 rounded-full bg-[#3D312A]/22 blur-[1px] pointer-events-none" />
          )}

          <div
            ref={petBRef}
            onPointerDown={() => handlePetBellyRub('B')}
            onPointerEnter={(e) => {
              if (e.buttons > 0) handlePetBellyRub('B');
            }}
            className="relative cursor-pointer"
          >
            <motion.div
              style={{ transformOrigin: '50% 92%' }}
              animate={
                isSquishingB
                  ? {
                      scaleX: [1, 1.24, 0.88, 1.07, 1],
                      scaleY: [1, 0.76, 1.16, 0.94, 1],
                    }
                  : {
                      scaleX: [1, 0.98, 1],
                      scaleY: [1, 1.04, 1],
                    }
              }
              transition={
                isSquishingB
                  ? { duration: 0.48, ease: [0.34, 1.56, 0.64, 1] }
                  : { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }
              }
            >
              <CutePetAvatar
                species={petB.species}
                hat={petB.hat}
                glasses={petB.glasses}
                neck={petB.neck}
                isDirty={isDirty}
                mudOpacity={mudOpacity}
                isSleepy={inBedSleeping}
                isBouncing={isCelebrating || roamB.hop}
                mouthState={
                  chewingPet === 'B' || chewingPet === 'both'
                    ? 'chewing'
                    : hoveredPetForFood === 'B'
                      ? 'open'
                      : 'normal'
                }
                eyesSparkle={hoveredPetForFood === 'B' || pettingPet === 'B' || pawHighFive}
                isHappyClosedEyes={
                  inBedSleeping || scrubbingPet === 'B' || chewingPet === 'B' || pettingPet === 'B'
                }
                isShakingClean={shakingClean}
                size={132}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* CORAZÓN ENTRE LAS DOS ZONAS DE ANCLAJE CUANDO SE MIMAN */}
        <AnimatePresence>
          {pawHighFive && !inBedSleeping && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1.25, y: -12 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ left: '50%', top: '48%', transform: 'translate(-50%, -50%)' }}
              className="absolute z-30 pointer-events-none text-3xl drop-shadow"
            >
              💞
            </motion.div>
          )}
        </AnimatePresence>

        {/* CAPA SUPERIOR (z-index: 30): SVG DE LA COLCHA DE LA CAMA SUPERPUESTO TAPÁNDOLAS HASTA EL CUELLO AL DORMIR */}
        <AnimatePresence>
          {inBedSleeping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={() => setPetAnimState('idle')}
              style={{
                left: '3.2%',
                top: '28.2%',
                width: '24.8%',
                height: '14%',
              }}
              className="absolute z-30 cursor-pointer pointer-events-auto"
            >
              <svg
                viewBox="0 0 116 70"
                preserveAspectRatio="none"
                className="w-full h-full drop-shadow-md"
              >
                {/* Embozo de sábana blanca a la altura del cuello */}
                <rect
                  x="2"
                  y="2"
                  width="112"
                  height="14"
                  rx="5"
                  fill="#FFFDF9"
                  stroke="#3D312A"
                  strokeWidth="2.5"
                />
                {/* Colcha mullida cubriendo a las mascotas hasta los pies */}
                <rect
                  x="2"
                  y="12"
                  width="112"
                  height="54"
                  rx="10"
                  fill={quiltColor}
                  stroke="#3D312A"
                  strokeWidth="2.8"
                />
                <line x1="40" y1="14" x2="40" y2="64" stroke="#3D312A" strokeWidth="1.8" opacity="0.3" />
                <line x1="76" y1="14" x2="76" y2="64" stroke="#3D312A" strokeWidth="1.8" opacity="0.3" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CAPA Z-INDEX 40: "Zzz... 💤" FLOTANDO LIMPIAMENTE SOBRE SUS CABEZAS AL DORMIR */}
        <AnimatePresence>
          {inBedSleeping && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.85 }}
              transition={{
                y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.25 },
              }}
              style={{
                left: '16.5%',
                top: '13.5%',
                transform: 'translate(-50%, -50%)',
              }}
              className="hand-pill absolute z-40 pointer-events-none text-xs font-extrabold text-[#4A3F35] bg-white/85 px-3 py-1 whitespace-nowrap"
            >
              Zzz... 💤
            </motion.div>
          )}
        </AnimatePresence>

        {/* POMPAS DE ESPUMA BLANCAS Y BRILLANTES BAJO EL PUNTERO */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
          {foamBubbles.map((b) => (
            <g key={b.id} transform={`translate(${b.x}, ${b.y})`}>
              <circle
                cx="0"
                cy="0"
                r={b.r}
                fill="#FFFFFF"
                fillOpacity="0.94"
                stroke="#8ECAE6"
                strokeWidth="2"
              />
              <circle cx={-b.r * 0.3} cy={-b.r * 0.3} r={b.r * 0.28} fill="#E0FBFC" />
            </g>
          ))}
        </svg>

        {/* PARTÍCULAS DE COMIDA, MIGUITAS Y CORAZONES */}
        <AnimatePresence>
          {crumbs.map((c) => (
            <motion.div
              key={c.id}
              initial={{ x: c.x, y: c.y, scale: 0.6, opacity: 1 }}
              animate={{ x: c.x + c.dx, y: c.y + c.dy, scale: 1.3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="absolute top-0 left-0 z-40 text-xl pointer-events-none"
            >
              {c.char}
            </motion.div>
          ))}
        </AnimatePresence>

        {spongeActive && spongePos && (
          <div
            style={{ transform: `translate(${spongePos.x - 28}px, ${spongePos.y - 28}px)` }}
            className="absolute top-0 left-0 z-40 pointer-events-none text-5xl drop-shadow-md"
          >
            🧽
          </div>
        )}

        <AnimatePresence>
          {floatingFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 360, damping: 22 }}
              className="glossy-pink-cta absolute top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap"
            >
              {floatingFeedback}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* COMIDA ARRASTRÁNDOSE */}
      {draggingFood && (
        <div
          style={{
            position: 'fixed',
            left: draggingFood.x - 32,
            top: draggingFood.y - 42,
            zIndex: 80,
          }}
          className="pointer-events-none text-5xl drop-shadow-xl animate-bounce"
        >
          {draggingFood.emoji}
        </div>
      )}

      {/* CATÁLOGO VISUAL DE MUEBLES CON TARJETAS DIBUJADAS (Botón inferior derecho 🎨) */}
      <AnimatePresence>
        {openDrawer !== 'none' && (
          <motion.div
            initial={{ y: 240, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 240, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="bg-[var(--glass-bg-strong)] backdrop-blur-xl border-t border-[var(--glass-border)] rounded-t-3xl px-3 pt-3 pb-3 max-h-[42vh] overflow-y-auto z-30 shadow-[0_-10px_30px_rgba(255,158,187,0.22)]"
          >
            {openDrawer === 'decor' && (
              <div className="space-y-2.5">
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: 'cama', icon: '🛏️', label: 'Cama' },
                    { id: 'alfombra', icon: '🌸', label: 'Alfombra' },
                    { id: 'mesa', icon: '🍵', label: 'Mesa Central' },
                    { id: 'paredes', icon: '🎨', label: 'Paredes' },
                    { id: 'guirnaldas', icon: '✨', label: 'Guirnaldas' },
                    { id: 'mascotas', icon: '🎀', label: 'Accesorios' },
                  ].map((t) => (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                      key={t.id}
                      onClick={() => {
                        setDecorTab(t.id as typeof decorTab);
                        soundEngine.playPop();
                      }}
                      className={`px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-all ${
                        decorTab === t.id
                          ? 'glossy-pink-cta shadow-xs'
                          : 'bg-white/65 border-white/75 opacity-85'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </motion.button>
                  ))}
                </div>

                {decorTab === 'cama' && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'rustica', name: 'Colcha Naranja', c: '#F4845F' },
                      { id: 'dosel', name: 'Dosel Pastel', c: '#F4ACB7' },
                      { id: 'futon', name: 'Futón Menta', c: '#74C69D' },
                    ].map((opt) => (
                      <motion.button
                        whileTap={{ scale: 0.92, rotate: -1 }}
                        key={opt.id}
                        onClick={() => {
                          setBedModel(opt.id as typeof bedModel);
                          localStorage.setItem('mw_v4_bed', opt.id);
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-2xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          bedModel === opt.id
                            ? 'bg-[#FFEAF0]/90 ring-2 ring-[#FF9EBB] border-white shadow-xs'
                            : 'bg-white/65 border-white/80'
                        }`}
                      >
                        <div className="w-12 h-7 rounded-lg border border-white/85 shadow-xs relative overflow-hidden" style={{ backgroundColor: opt.c }}>
                          <div className="w-full h-2 bg-white/95 border-b border-black/10" />
                        </div>
                        <span className="text-[11px] font-bold">{opt.name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {decorTab === 'alfombra' && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'flores', name: 'Rosa Mullida', c: '#FFC8DD' },
                      { id: 'vichy', name: 'Melocotón Vichy', c: '#FFE5D9' },
                      { id: 'nube', name: 'Nube Crema', c: '#FFFDF9' },
                    ].map((opt) => (
                      <motion.button
                        whileTap={{ scale: 0.92, rotate: -1 }}
                        key={opt.id}
                        onClick={() => {
                          updateRoomDecor(opt.id as 'flores' | 'vichy' | 'nube', petCare.roomLamp);
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-2xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          petCare.roomRug === opt.id
                            ? 'bg-[#FFEAF0]/90 ring-2 ring-[#FF9EBB] border-white shadow-xs'
                            : 'bg-white/65 border-white/80'
                        }`}
                      >
                        <div className="w-12 h-6 rounded-full border border-white/85 shadow-xs" style={{ backgroundColor: opt.c }} />
                        <span className="text-[11px] font-bold">{opt.name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {decorTab === 'mesa' && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'kotatsu', name: 'Kotatsu Roble', c: '#D4A373' },
                      { id: 'cafe', name: 'Mesa Terracota', c: '#E76F51' },
                      { id: 'picnic', name: 'Mesa Menta', c: '#95D5B2' },
                    ].map((opt) => (
                      <motion.button
                        whileTap={{ scale: 0.92, rotate: -1 }}
                        key={opt.id}
                        onClick={() => {
                          setTableModel(opt.id as typeof tableModel);
                          localStorage.setItem('mw_v4_table', opt.id);
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-2xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          tableModel === opt.id
                            ? 'bg-[#FFEAF0]/90 ring-2 ring-[#FF9EBB] border-white shadow-xs'
                            : 'bg-white/65 border-white/80'
                        }`}
                      >
                        <div className="w-12 h-5 rounded-full border border-white/85 shadow-xs" style={{ backgroundColor: opt.c }} />
                        <span className="text-[11px] font-bold">{opt.name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {decorTab === 'paredes' && (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'melocoton', name: 'Crema', bg: '#FFF3E6' },
                      { id: 'rayas', name: 'Salvia', bg: '#E1ECD8' },
                      { id: 'estrellas', name: 'Lavanda', bg: '#F3EFFA' },
                      { id: 'madera', name: 'Cabaña', bg: '#EAD5C3' },
                    ].map((w) => (
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        key={w.id}
                        onClick={() => {
                          setWallStyle(w.id as typeof wallStyle);
                          localStorage.setItem('mw_room_wall', w.id);
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-2xl border flex flex-col items-center gap-1 cursor-pointer transition-all text-[#4A3F35] ${
                          wallStyle === w.id
                            ? 'ring-2 ring-[#FF9EBB] border-white scale-105 shadow-xs'
                            : 'border-white/80'
                        }`}
                        style={{ backgroundColor: w.bg }}
                      >
                        <span className="text-[11px] font-bold">{w.name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {decorTab === 'guirnaldas' && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'calida', name: 'Bombillas Oro', c: '#FFE066' },
                      { id: 'estrellas', name: 'Luz Celeste', c: '#A8DADC' },
                      { id: 'corazones', name: 'Luz Rosada', c: '#FF8FA3' },
                    ].map((g) => (
                      <motion.button
                        whileTap={{ scale: 0.92, rotate: -1 }}
                        key={g.id}
                        onClick={() => {
                          setGarlandStyle(g.id as typeof garlandStyle);
                          localStorage.setItem('mw_v4_garland', g.id);
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-2xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          garlandStyle === g.id
                            ? 'bg-[#FFEAF0]/90 ring-2 ring-[#FF9EBB] border-white shadow-xs'
                            : 'bg-white/65 border-white/80'
                        }`}
                      >
                        <div className="flex gap-1">
                          <span className="w-3.5 h-3.5 rounded-full border border-white/85 shadow-xs" style={{ backgroundColor: g.c }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-white/85 shadow-xs" style={{ backgroundColor: g.c }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-white/85 shadow-xs" style={{ backgroundColor: g.c }} />
                        </div>
                        <span className="text-[11px] font-bold">{g.name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {decorTab === 'mascotas' && (
                  <div className="flex items-center justify-between gap-1.5 bg-white/55 backdrop-blur-md p-2 rounded-2xl border border-white/75 overflow-x-auto no-scrollbar">
                    {[
                      { type: 'hat', val: 'ninguno', icon: '🚫' },
                      { type: 'hat', val: 'corona', icon: '👑' },
                      { type: 'hat', val: 'boina', icon: '🎨' },
                      { type: 'hat', val: 'seta', icon: '🍄' },
                      { type: 'hat', val: 'flor', icon: '🌸' },
                      { type: 'glasses', val: 'corazon', icon: '🕶️' },
                      { type: 'glasses', val: 'redondas', icon: '🤓' },
                      { type: 'neck', val: 'bufanda', icon: '🧣' },
                      { type: 'neck', val: 'pajarita', icon: '🎀' },
                    ].map((acc, i) => (
                      <motion.button
                        whileTap={{ scale: 0.88, rotate: -3 }}
                        key={i}
                        onClick={() => {
                          if (acc.val === 'ninguno') {
                            updatePetProfile(activeUser, { hat: 'ninguno', glasses: 'ninguno', neck: 'ninguno' });
                          } else {
                            updatePetProfile(activeUser, { [acc.type]: acc.val });
                          }
                          soundEngine.playPop();
                        }}
                        className="w-9 h-9 shrink-0 rounded-2xl border border-white/85 bg-white/85 shadow-xs flex items-center justify-center text-lg cursor-pointer"
                      >
                        {acc.icon}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {openDrawer === 'armario' && (
              <div className="space-y-2.5">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {PET_CATALOG.map((spec) => (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      key={spec.id}
                      onClick={() => {
                        updatePetProfile(activeUser, { species: spec.id as PetSpecies });
                        soundEngine.playPop();
                      }}
                      className={`shrink-0 p-1.5 rounded-2xl border flex flex-col items-center cursor-pointer transition-all ${
                        myPet.species === spec.id
                          ? 'bg-[#FFEAF0]/90 ring-2 ring-[#FF9EBB] border-white scale-105 shadow-xs'
                          : 'bg-white/65 border-white/80'
                      }`}
                    >
                      <CutePetAvatar species={spec.id} size={46} />
                    </motion.button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-1.5 bg-white/55 backdrop-blur-md p-2 rounded-2xl border border-white/75 overflow-x-auto no-scrollbar">
                  {[
                    { type: 'hat', val: 'ninguno', icon: '🚫' },
                    { type: 'hat', val: 'corona', icon: '👑' },
                    { type: 'hat', val: 'boina', icon: '🎨' },
                    { type: 'hat', val: 'seta', icon: '🍄' },
                    { type: 'hat', val: 'flor', icon: '🌸' },
                    { type: 'glasses', val: 'corazon', icon: '🕶️' },
                    { type: 'glasses', val: 'redondas', icon: '🤓' },
                    { type: 'neck', val: 'bufanda', icon: '🧣' },
                    { type: 'neck', val: 'pajarita', icon: '🎀' },
                  ].map((acc, i) => (
                    <motion.button
                      whileTap={{ scale: 0.88, rotate: -3 }}
                      key={i}
                      onClick={() => {
                        if (acc.val === 'ninguno') {
                          updatePetProfile(activeUser, { hat: 'ninguno', glasses: 'ninguno', neck: 'ninguno' });
                        } else {
                          updatePetProfile(activeUser, { [acc.type]: acc.val });
                        }
                        soundEngine.playPop();
                      }}
                      className="w-9 h-9 shrink-0 rounded-2xl border border-white/85 bg-white/85 shadow-xs flex items-center justify-center text-lg cursor-pointer"
                    >
                      {acc.icon}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {openDrawer === 'estado' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  {MOODS.map((m) => (
                    <motion.button
                      whileTap={{ scale: 0.9, rotate: -3 }}
                      key={m.id}
                      onClick={() => {
                        updatePetProfile(activeUser, { mood: m.id });
                        soundEngine.playPop();
                      }}
                      title={m.label}
                      className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-xl cursor-pointer transition-all ${
                        myPet.mood === m.id
                          ? 'glossy-pink-cta scale-110 shadow-xs'
                          : 'bg-white/70 border-white/80'
                      }`}
                    >
                      {m.emoji}
                    </motion.button>
                  ))}
                </div>
                <input
                  type="text"
                  maxLength={70}
                  value={myPet.speechBubble}
                  onChange={(e) => updatePetProfile(activeUser, { speechBubble: e.target.value })}
                  placeholder="Escribe qué piensa tu mascota (se verá al tocarla)..."
                  className="w-full px-3.5 py-2 rounded-2xl border border-[#FFB7C5]/55 bg-[#FFF5EE]/85 handwritten text-base focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DOCK INFERIOR DE INTERACCIÓN FÍSICA DIRECTA (Todos los iconos caben visibles en 390px sin recortes) */}
      <div className="px-2.5 pt-2 safe-bottom-dock bg-[var(--glass-bg-strong)] backdrop-blur-xl border-t border-[var(--glass-border)] shadow-[0_-8px_24px_rgba(255,158,187,0.18)] z-30 overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between gap-1.5 w-full max-w-md mx-auto">
          <div className="flex items-center gap-1 bg-white/65 backdrop-blur-md px-1.5 py-1 rounded-full border border-white/80 shadow-xs shrink-0">
            {FOODS.map((food) => (
              <motion.button
                key={food.id}
                whileTap={{ scale: 1.18, rotate: -4 }}
                transition={{ type: 'spring', stiffness: 450, damping: 14 }}
                onPointerDown={(e) => startFoodDrag(food, e)}
                onPointerMove={moveFoodDrag}
                onPointerUp={endFoodDrag}
                onPointerCancel={endFoodDrag}
                title={`Arrastra ${food.name} a la boca de tu mascota`}
                className="w-8 h-8 shrink-0 rounded-full bg-white/90 border border-white/90 shadow-xs flex items-center justify-center text-lg cursor-grab active:cursor-grabbing touch-none"
              >
                {food.emoji}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <motion.button
              whileTap={{ scale: 0.9, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
              onClick={() => {
                const next = !spongeActive;
                setSpongeActive(next);
                setPetAnimState('idle');
                if (next) {
                  showToast('Frota la esponja 🧽 sobre las mascotas en la alfombra 🫧');
                } else {
                  setFoamBubbles([]);
                  setSpongePos(null);
                }
              }}
              title="Bañar con esponja"
              className={`hand-button w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-lg cursor-pointer ${
                spongeActive
                  ? 'bg-[#BDE8F6] scale-105 ring-2 ring-[#7AC9EC]'
                  : 'bg-white/80'
              }`}
            >
              🧽
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
              onClick={() => {
                const next = !inBedSleeping;
                setPetAnimState(next ? 'sleeping' : 'idle');
                if (next) {
                  careForPets('sleep');
                  showToast('¡A dormir en las almohadas bajo la manta! 🛏️💤');
                } else {
                  showToast('¡De vuelta a jugar en la alfombra rosa! 🐾');
                }
              }}
              title="Arropar en la cama"
              className={`hand-button w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-lg cursor-pointer ${
                inBedSleeping
                  ? 'bg-[#E5D5F5] scale-105 ring-2 ring-[#C3AFEA]'
                  : 'bg-white/80'
              }`}
            >
              🛏️
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
              onClick={() => {
                setPetAnimState('idle');
                careForPets('pamper_partner');
                setPawHighFive(true);
                spawnParticlesAtPet('A', ['💖', '💕']);
                spawnParticlesAtPet('B', ['💖', '💕']);
                soundEngine.speakAnimalese('Mimitos ricos', 520);
                showToast(`¡Abrazos y mimos entre ${petA.petName} y ${petB.petName}! 💕`);
                setTimeout(() => setPawHighFive(false), 1800);
              }}
              title="Dar mimos juntos"
              className="hand-button glossy-pink-cta w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-lg cursor-pointer"
            >
              💕
            </motion.button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: 'decor', icon: '🎨', title: 'Muebles y decoración' },
              { id: 'armario', icon: '👑', title: 'Especie y accesorios' },
              { id: 'estado', icon: '💭', title: 'Estado y pensamiento' },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.9, rotate: -2 }}
                transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                title={tab.title}
                onClick={() =>
                  setOpenDrawer((prev) => (prev === tab.id ? 'none' : (tab.id as 'decor' | 'armario' | 'estado')))
                }
                className={`hand-button w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-base cursor-pointer ${
                  openDrawer === tab.id ? 'glossy-pink-cta' : 'bg-white/80'
                }`}
              >
                {tab.icon}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
