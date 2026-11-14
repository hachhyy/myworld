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
    return (localStorage.getItem('mw_room_wall') as 'melocoton' | 'rayas' | 'estrellas' | 'madera') || 'melocoton';
  });
  const [garlandStyle, setGarlandStyle] = useState<'calida' | 'estrellas' | 'corazones'>(() => {
    return (localStorage.getItem('mw_v4_garland') as 'calida' | 'estrellas' | 'corazones') || 'calida';
  });
  const [decorTab, setDecorTab] = useState<'cama' | 'alfombra' | 'mesa' | 'paredes' | 'guirnaldas' | 'mascotas'>('cama');

  // Cajón desplegable inferior
  const [openDrawer, setOpenDrawer] = useState<'none' | 'decor' | 'armario' | 'estado'>('none');

  // Estados interactivos del Salón Tamagotchi Vivo
  // Por defecto: SIEMPRE despiertas en el centro de la gran alfombra rosa (top: 62%, left: 42% y 58%).
  // SOLO van a la cama cuando el usuario activa el botón 🛏️.
  const [inBedSleeping, setInBedSleeping] = useState(false);
  const [mushroomLampOn, setMushroomLampOn] = useState(true);
  const [vinylPlaying, setVinylPlaying] = useState(false);
  const [playingWithYarn, setPlayingWithYarn] = useState(false);
  const [tableSnack, setTableSnack] = useState<string>('🍵');
  const [floatingFeedback, setFloatingFeedback] = useState<string | null>(null);

  // IA de Movimiento Autónomo en la Alfombra (pasitos cada 4s + chocarse patitas / abrazarse)
  const [roamA, setRoamA] = useState<{ dx: number; dy: number; hop: boolean }>({ dx: 0, dy: 0, hop: false });
  const [roamB, setRoamB] = useState<{ dx: number; dy: number; hop: boolean }>({ dx: 0, dy: 0, hop: false });
  const [pawHighFive, setPawHighFive] = useState(false);
  const [pettingPet, setPettingPet] = useState<'A' | 'B' | null>(null);

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
  const isCelebrating = petCare.celebrationBounceUntil > Date.now() || playingWithYarn || pawHighFive;

  // IA de Movimiento Suave: cada 4.2 segundos dan pequeños pasitos o saltitos por la alfombra y a veces se acercan a chocarse las patitas o abrazarse
  useEffect(() => {
    if (inBedSleeping) {
      setRoamA({ dx: 0, dy: 0, hop: false });
      setRoamB({ dx: 0, dy: 0, hop: false });
      setPawHighFive(false);
      return;
    }

    const interval = setInterval(() => {
      const doHug = Math.random() < 0.34;
      if (doHug) {
        // Se acercan al centro de la alfombra para chocarse las patitas / abrazarse
        setRoamA({ dx: 18, dy: -4, hop: true });
        setRoamB({ dx: -18, dy: -4, hop: true });
        setPawHighFive(true);
        setTimeout(() => setPawHighFive(false), 1800);
      } else {
        setPawHighFive(false);
        setRoamA({
          dx: Math.round((Math.random() - 0.5) * 26),
          dy: Math.round((Math.random() - 0.5) * 14),
          hop: true,
        });
        setRoamB({
          dx: Math.round((Math.random() - 0.5) * 26),
          dy: Math.round((Math.random() - 0.5) * 14),
          hop: true,
        });
      }
      setTimeout(() => {
        setRoamA((prev) => ({ ...prev, hop: false }));
        setRoamB((prev) => ({ ...prev, hop: false }));
      }, 500);
    }, 4200);

    return () => clearInterval(interval);
  }, [inBedSleeping]);

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

  // Acariciar con el dedo / ratón sobre la barriga o cabeza de la mascota
  const handlePetBellyRub = (target: 'A' | 'B') => {
    if (spongeActive || draggingFood) return;
    const now = Date.now();
    if (now - lastPetRubRef.current < 380) return;
    lastPetRubRef.current = now;

    setPettingPet(target);
    careForPets('pamper_partner');
    soundEngine.playPop(1.25);
    spawnParticlesAtPet(target, ['💖', '💕', '✨', '🥰']);
    setTimeout(() => setPettingPet(null), 900);
  };

  const getClosestPet = (clientX: number, clientY: number, threshold = 125): 'A' | 'B' | null => {
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
    setInBedSleeping(false);
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
    const targetPet = getClosestPet(e.clientX, e.clientY, 140);
    const droppedFood = draggingFood;
    setDraggingFood(null);
    setHoveredPetForFood(null);

    const fedTarget: 'A' | 'B' = targetPet || (activeUser === 'userA' ? 'A' : 'B');
    setTableSnack(droppedFood.emoji);
    setChewingPet(fedTarget);
    careForPets('feed');
    soundEngine.speakAnimalese('Ñam ñam qué rico', 490);
    triggerHeartbeatHaptic();
    spawnParticlesAtPet(fedTarget, [droppedFood.emoji, '💕', '✨', '😋']);

    setTimeout(() => {
      setChewingPet(null);
    }, 1850);
  };

  const handleRoomPointerMove = (e: React.PointerEvent) => {
    if (!spongeActive || !roomRef.current) return;
    const rRect = roomRef.current.getBoundingClientRect();
    const relX = e.clientX - rRect.left;
    const relY = e.clientY - rRect.top;
    setSpongePos({ x: relX, y: relY });

    const nearPet = getClosestPet(e.clientX, e.clientY, 115);
    setScrubbingPet(nearPet);

    if (nearPet && (e.buttons > 0 || e.pointerType === 'touch' || e.pointerType === 'mouse')) {
      const now = Date.now();
      if (now - lastScrubSoundRef.current > 170) {
        soundEngine.playBrushNoise();
        lastScrubSoundRef.current = now;
      }

      // Generar decenas de pompas de espuma blancas y brillantes bajo el puntero
      const newBubbles: FoamBubble[] = [
        {
          id: now + Math.random(),
          x: relX + (Math.random() - 0.5) * 38,
          y: relY + (Math.random() - 0.5) * 38,
          r: 8 + Math.random() * 14,
        },
        {
          id: now + Math.random() + 1,
          x: relX + (Math.random() - 0.5) * 44,
          y: relY + (Math.random() - 0.5) * 44,
          r: 6 + Math.random() * 11,
        },
      ];
      setFoamBubbles((prev) => [...prev.slice(-38), ...newBubbles]);

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
          }, 1300);
        }
        return next;
      });
    }
  };

  const skyColors =
    solar.timeOfDay === 'night'
      ? { top: '#1B2238', bottom: '#2F3B5C' }
      : solar.timeOfDay === 'sunset'
        ? { top: '#F7A8B8', bottom: '#FFE5C4' }
        : { top: '#8CC5E3', bottom: '#D6EFFF' };

  const quiltColor =
    bedModel === 'dosel' ? '#F4ACB7' : bedModel === 'futon' ? '#74C69D' : '#F4845F';

  return (
    <div className="fixed inset-0 z-40 flex flex-col watercolor-paper overflow-hidden select-none">
      {/* Cabecera compacta */}
      <div className="px-3 py-2 flex items-center justify-between border-b-2 border-[var(--border-ink)] bg-[var(--bg-card)] z-30">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          className="hand-button px-3 py-1.5 bg-[var(--bg-paper)] text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Planeta
        </motion.button>

        {/* Barras de cuidados de las mascotas */}
        <div className="flex items-center gap-2 bg-[var(--bg-paper)] px-3 py-1 rounded-full border-2 border-[var(--border-ink)]">
          {[
            { icon: '🍕', val: petCare.hunger, color: '#F4A261' },
            { icon: '🫧', val: isDirty ? Math.round(100 - mudOpacity * 65) : petCare.hygiene, color: '#4EA8DE' },
            { icon: '💤', val: petCare.energy, color: '#9B89B3' },
            { icon: '💕', val: petCare.affection, color: '#E07A5F' },
          ].map((stat, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="text-xs">{stat.icon}</span>
              <div className="w-9 h-2 rounded-full bg-black/10 overflow-hidden border border-[var(--border-ink)]">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${stat.val}%`, backgroundColor: stat.color }}
                />
              </div>
            </div>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            useWorldStore.setState((s) => ({
              petCare: {
                ...s.petCare,
                hygiene: 25,
                hunger: 35,
                energy: 35,
              },
            }));
            setScrubProgress(0);
            showToast('¡Manchitas de barro! Frota con 🧽 o arrastra 🍕 a su boca');
          }}
          title="Simular hambre y barro"
          className="w-8 h-8 rounded-full border-2 border-[var(--border-ink)] bg-[#FFE5D9] flex items-center justify-center text-sm shadow-xs cursor-pointer"
        >
          🐾
        </motion.button>
      </div>

      {/* SALÓN TAMAGOTCHI VIVO: Parqué horizontal cálido, Guirnalda + 2 Polaroids + Lámpara Hongo, Gran Alfombra Central con Mascotas Protagonistas */}
      <div
        ref={roomRef}
        onPointerMove={handleRoomPointerMove}
        onPointerDown={handleRoomPointerMove}
        className={`relative flex-1 w-full overflow-hidden ${spongeActive ? 'cursor-none' : ''}`}
      >
        <svg
          viewBox="0 0 460 520"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id="winSkyV4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={skyColors.top} />
              <stop offset="100%" stopColor={skyColors.bottom} />
            </linearGradient>

            <radialGradient id="mushroomWarmGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFD166" stopOpacity={mushroomLampOn ? '0.48' : '0'} />
              <stop offset="100%" stopColor="#FFD166" stopOpacity="0" />
            </radialGradient>

            {/* Patrón de tablones cálidos de parqué de madera horizontal con vetas suaves (Cero cuadrícula) */}
            <pattern id="warmParquetPlanks" width="140" height="32" patternUnits="userSpaceOnUse">
              <rect width="140" height="16" fill={solar.isNightMode ? '#A47148' : '#E0A96D'} />
              <rect y="16" width="140" height="16" fill={solar.isNightMode ? '#9C6644' : '#D69F63'} />
              {/* Vetas suaves horizontales */}
              <path d="M 8 6 Q 42 3 78 7 T 132 6" stroke="#B87D4B" strokeWidth="1.1" fill="none" opacity="0.45" />
              <path d="M 14 23 Q 58 20 96 24 T 134 22" stroke="#B87D4B" strokeWidth="1.1" fill="none" opacity="0.45" />
              {/* Juntas de los tablones de madera */}
              <line x1="0" y1="16" x2="140" y2="16" stroke="#8D5B4C" strokeWidth="1.4" opacity="0.45" />
              <line x1="0" y1="32" x2="140" y2="32" stroke="#8D5B4C" strokeWidth="1.4" opacity="0.45" />
              <line x1="68" y1="0" x2="68" y2="16" stroke="#8D5B4C" strokeWidth="1.3" opacity="0.4" />
              <line x1="118" y1="16" x2="118" y2="32" stroke="#8D5B4C" strokeWidth="1.3" opacity="0.4" />
            </pattern>

            <pattern id="wallStripesV4" width="28" height="28" patternUnits="userSpaceOnUse">
              <rect width="28" height="28" fill="#F4F7F0" />
              <rect width="13" height="28" fill="#E1ECD8" />
            </pattern>

            <pattern id="wallStarsV4" width="42" height="42" patternUnits="userSpaceOnUse">
              <rect width="42" height="42" fill="#F3EFFA" />
              <circle cx="12" cy="14" r="2" fill="#D5C6E8" />
              <circle cx="32" cy="30" r="2.2" fill="#F6BD60" opacity="0.6" />
            </pattern>

            <pattern id="wallWoodV4" width="56" height="24" patternUnits="userSpaceOnUse">
              <rect width="56" height="24" fill="#EAD5C3" />
              <line x1="0" y1="24" x2="56" y2="24" stroke="#C8A98E" strokeWidth="2" />
            </pattern>
          </defs>

          {/* 1. PARED DEL FONDO Y LATERALES ACOGEDORES */}
          {(() => {
            const wallFill =
              wallStyle === 'rayas'
                ? 'url(#wallStripesV4)'
                : wallStyle === 'estrellas'
                  ? 'url(#wallStarsV4)'
                  : wallStyle === 'madera'
                    ? 'url(#wallWoodV4)'
                    : solar.isNightMode
                      ? '#343D5B'
                      : '#FFF3E6';
            return (
              <g>
                <rect x="0" y="0" width="460" height="246" fill={wallFill} />
                {/* Friso / Zócalo de madera cálida */}
                <rect x="0" y="236" width="460" height="12" fill="#C68B59" stroke="#3D312A" strokeWidth="2.2" />
              </g>
            );
          })()}

          {/* 2. SUELO DE TABLONES CÁLIDOS DE PARQUÉ DE MADERA HORIZONTAL (Cero cuadrícula vacía) */}
          <rect
            x="0"
            y="248"
            width="460"
            height="272"
            fill="url(#warmParquetPlanks)"
            stroke="#3D312A"
            strokeWidth="2.2"
          />

          {/* 3. PARED IZQUIERDA (SOBRE LA CAMA): GUIRNALDA DE LUCECITAS CÁLIDAS ENCENDIDAS + 2 CUADRITOS POLAROID ENMARCADOS */}
          <g>
            {/* Cable curvo de la guirnalda */}
            <path
              d="M 10 26 Q 55 48 100 30 Q 145 48 184 24"
              stroke="#3D312A"
              strokeWidth="2"
              fill="none"
            />
            {[24, 48, 74, 100, 126, 152, 174].map((lx, idx) => {
              const ly = idx % 2 === 0 ? 36 : 41;
              const bulbColor =
                garlandStyle === 'corazones'
                  ? '#FF8FA3'
                  : garlandStyle === 'estrellas'
                    ? '#A8DADC'
                    : '#FFE066';
              return (
                <g key={idx}>
                  <circle cx={lx} cy={ly} r="9" fill={bulbColor} opacity="0.35" />
                  <circle
                    cx={lx}
                    cy={ly}
                    r="4.8"
                    fill="#FFFDF9"
                    stroke="#3D312A"
                    strokeWidth="1.5"
                  />
                  <circle cx={lx} cy={ly} r="3" fill={bulbColor} />
                </g>
              );
            })}

            {/* 2 Cuadritos / Fotos Polaroid Enmarcadas en la pared sobre la cama */}
            <g transform="translate(26, 56) rotate(-5)">
              <rect x="0" y="0" width="44" height="52" rx="4" fill="#FFFDF9" stroke="#3D312A" strokeWidth="2" />
              <rect x="5" y="5" width="34" height="32" rx="2" fill="#FFE5D9" stroke="#3D312A" strokeWidth="1.4" />
              {/* Dibujo de corazón y sol dentro de la Polaroid 1 */}
              <circle cx="22" cy="19" r="7" fill="#FF8FA3" />
              <rect x="14" y="-4" width="16" height="6" rx="1.5" fill="#FFD166" opacity="0.85" />
            </g>

            <g transform="translate(84, 54) rotate(4)">
              <rect x="0" y="0" width="44" height="52" rx="4" fill="#FFFDF9" stroke="#3D312A" strokeWidth="2" />
              <rect x="5" y="5" width="34" height="32" rx="2" fill="#D8F3DC" stroke="#3D312A" strokeWidth="1.4" />
              {/* Dibujo de montañita y estrella dentro de la Polaroid 2 */}
              <polygon points="8,35 20,16 32,35" fill="#74C69D" />
              <circle cx="29" cy="14" r="4" fill="#FFD166" />
              <rect x="14" y="-4" width="16" height="6" rx="1.5" fill="#FF8FA3" opacity="0.85" />
            </g>
          </g>

          {/* 4. CENTRO-FONDO: GRAN VENTANAL CONECTADO AL CIELO DEL PLANETA */}
          <g transform="translate(194, 34)">
            <rect x="0" y="0" width="122" height="122" rx="14" fill="#FFFDF9" stroke="#3D312A" strokeWidth="2.8" />
            <rect x="8" y="8" width="106" height="106" rx="9" fill="url(#winSkyV4)" stroke="#3D312A" strokeWidth="2" />

            {/* Sol / Luna según la hora del planeta */}
            {solar.isNightMode ? (
              <g>
                <circle cx="84" cy="34" r="12" fill="#FFF3B0" />
                <circle cx="89" cy="30" r="10" fill={skyColors.top} />
                <circle cx="28" cy="28" r="1.8" fill="#FFF" />
                <circle cx="52" cy="42" r="1.5" fill="#FFF" />
                <circle cx="34" cy="64" r="1.5" fill="#FFF" />
              </g>
            ) : (
              <g>
                <circle cx="84" cy="34" r="14" fill="#FFD166" stroke="#F4A261" strokeWidth="2" />
                <path
                  d="M 20 48 Q 20 40 28 40 Q 32 33 41 35 Q 49 35 51 43 Q 57 44 56 50 Q 56 55 49 55 L 24 55 Q 18 55 20 48 Z"
                  fill="#FFFFFF"
                  opacity="0.92"
                />
              </g>
            )}

            {/* Colinas verdes del planeta vistas por la ventana */}
            <path d="M 8 92 Q 45 76 80 90 T 114 86 L 114 114 L 8 114 Z" fill="#7ED992" />
            <path d="M 8 102 Q 62 90 114 100 L 114 114 L 8 114 Z" fill="#52B788" />

            {/* Cruceta de madera y cortinas pastel */}
            <line x1="61" y1="8" x2="61" y2="114" stroke="#FFFDF9" strokeWidth="4" />
            <line x1="61" y1="8" x2="61" y2="114" stroke="#3D312A" strokeWidth="1.6" />
            <line x1="8" y1="62" x2="114" y2="62" stroke="#FFFDF9" strokeWidth="4" />
            <line x1="8" y1="62" x2="114" y2="62" stroke="#3D312A" strokeWidth="1.6" />

            <path
              d="M -6 2 Q 18 32 8 68 Q 16 96 4 120 L -6 120 Z"
              fill="#FFB5A7"
              stroke="#3D312A"
              strokeWidth="2"
            />
            <path
              d="M 128 2 Q 104 32 114 68 Q 106 96 118 120 L 128 120 Z"
              fill="#FFB5A7"
              stroke="#3D312A"
              strokeWidth="2"
            />
            <rect x="-10" y="116" width="142" height="10" rx="4" fill="#D4A373" stroke="#3D312A" strokeWidth="2.2" />
          </g>

          {/* 5. MESITA DE NOCHE JUNTO A LA CAMA CON LÁMPARA HONGO INTERACTIVA */}
          <g
            transform="translate(142, 168)"
            onClick={() => {
              const next = !mushroomLampOn;
              setMushroomLampOn(next);
              soundEngine.playPop();
              showToast(next ? '🍄 Lámpara hongo encendida (Luz cálida)' : '🌙 Lámpara hongo apagada');
            }}
            className="cursor-pointer pointer-events-auto"
          >
            {mushroomLampOn && <circle cx="20" cy="18" r="68" fill="url(#mushroomWarmGlow)" />}
            {/* Mesita de noche de madera */}
            <rect x="2" y="38" width="38" height="44" rx="5" fill="#C68B59" stroke="#3D312A" strokeWidth="2.2" />
            <rect x="7" y="45" width="28" height="14" rx="3" fill="#DDA15E" stroke="#3D312A" strokeWidth="1.6" />
            <circle cx="21" cy="52" r="2.2" fill="#3D312A" />

            {/* Pie y sombrero de la lámpara hongo */}
            <path d="M 16 38 L 18 22 L 24 22 L 26 38 Z" fill="#FFFDF9" stroke="#3D312A" strokeWidth="2" />
            <path
              d="M 4 24 C 4 6, 38 6, 38 24 Z"
              fill={mushroomLampOn ? '#FF6B6B' : '#C85A53'}
              stroke="#3D312A"
              strokeWidth="2.2"
            />
            <circle cx="14" cy="16" r="2.8" fill="#FFFDF9" />
            <circle cx="23" cy="13" r="3.2" fill="#FFFDF9" />
            <circle cx="29" cy="18" r="2.4" fill="#FFFDF9" />
          </g>

          {/* 6. RINCÓN IZQUIERDO: CAMA DOBLE PROPORCIONADA (Solo contiene la manta baja cuando NO están durmiendo en ella) */}
          <g
            transform="translate(12, 132)"
            onClick={() => {
              const next = !inBedSleeping;
              setInBedSleeping(next);
              if (next) {
                careForPets('sleep');
                showToast('¡A dormir en las almohadas bien tapaditos! 🛏️💤');
              } else {
                showToast('¡Saltando de vuelta a la alfombra rosa! 🐾');
              }
            }}
            className="cursor-pointer pointer-events-auto"
          >
            {bedModel === 'dosel' && (
              <path
                d="M 4 -18 Q 62 -34 120 -18 L 126 52 L -2 52 Z"
                fill="#FFD6E0"
                opacity="0.6"
                stroke="#3D312A"
                strokeWidth="2"
              />
            )}

            {/* Cabecero de madera cálida */}
            <path
              d="M 4 44 L 4 12 Q 62 -8 120 12 L 120 44 Z"
              fill={bedModel === 'futon' ? '#DDA15E' : '#9C6644'}
              stroke="#3D312A"
              strokeWidth="2.5"
            />

            {/* Colchón crema */}
            <rect x="2" y="38" width="120" height="84" rx="12" fill="#FFFDF9" stroke="#3D312A" strokeWidth="2.5" />

            {/* Dos almohadas blancas mullidas */}
            <rect x="10" y="24" width="46" height="24" rx="9" fill="#FFFFFF" stroke="#3D312A" strokeWidth="2.2" />
            <rect x="68" y="24" width="46" height="24" rx="9" fill="#FFFFFF" stroke="#3D312A" strokeWidth="2.2" />

            {/* Cuando las mascotas están despiertas en la alfombra, la colcha se ve puesta en la cama */}
            {!inBedSleeping && (
              <g>
                <rect
                  x="4"
                  y="54"
                  width="116"
                  height="64"
                  rx="10"
                  fill={quiltColor}
                  stroke="#3D312A"
                  strokeWidth="2.3"
                />
                <rect
                  x="4"
                  y="48"
                  width="116"
                  height="12"
                  rx="5"
                  fill="#FFFDF9"
                  stroke="#3D312A"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Pie de cama de madera */}
            <rect x="0" y="114" width="124" height="10" rx="4" fill="#7F4F24" stroke="#3D312A" strokeWidth="2.4" />
          </g>

          {/* 7. DERECHA: LIBRERÍA CON PLANTAS COLGANTES Y TOCADISCOS INTERACTIVO */}
          <g transform="translate(342, 42)">
            <rect
              x="0"
              y="0"
              width="96"
              height="198"
              rx="8"
              fill="#B07D52"
              stroke="#3D312A"
              strokeWidth="2.6"
            />
            <rect x="7" y="8" width="82" height="182" rx="4" fill="#7F4F24" stroke="#3D312A" strokeWidth="2" />
            {[50, 98, 146].map((sy, idx) => (
              <rect key={idx} x="6" y={sy} width="84" height="7" fill="#B07D52" stroke="#3D312A" strokeWidth="1.8" />
            ))}

            {/* Libros de colores y marco de fotos */}
            <rect x="12" y="22" width="10" height="28" rx="1.5" fill="#E76F51" stroke="#3D312A" strokeWidth="1.5" />
            <rect x="23" y="26" width="9" height="24" rx="1.5" fill="#2A9D8F" stroke="#3D312A" strokeWidth="1.5" />
            <rect x="33" y="20" width="10" height="30" rx="1.5" fill="#E9C46A" stroke="#3D312A" strokeWidth="1.5" />
            <rect x="54" y="24" width="22" height="26" rx="3" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.8" />
            <circle cx="65" cy="37" r="5" fill="#FF758F" />

            <circle cx="26" cy="78" r="11" fill="#8ECAE6" stroke="#3D312A" strokeWidth="1.8" />
            <rect x="46" y="70" width="10" height="28" fill="#F4A261" stroke="#3D312A" strokeWidth="1.5" />
            <rect x="57" y="73" width="10" height="25" fill="#95D5B2" stroke="#3D312A" strokeWidth="1.5" />
            <rect x="68" y="68" width="10" height="30" fill="#FFB5A7" stroke="#3D312A" strokeWidth="1.5" />

            {/* Poto colgante */}
            <path d="M 70 12 L 73 26 L 85 26 L 88 12 Z" fill="#E07A5F" stroke="#3D312A" strokeWidth="1.6" />
            <path d="M 80 22 Q 90 48 82 74 Q 76 94 84 114" stroke="#52B788" strokeWidth="2.6" fill="none" />
            <ellipse cx="85" cy="46" rx="5.5" ry="3.8" fill="#74C69D" stroke="#3D312A" strokeWidth="1.3" />
            <ellipse cx="81" cy="70" rx="5.5" ry="3.8" fill="#52B788" stroke="#3D312A" strokeWidth="1.3" />
            <ellipse cx="83" cy="96" rx="5.5" ry="3.8" fill="#74C69D" stroke="#3D312A" strokeWidth="1.3" />
          </g>

          {/* TOCADISCOS INTERACTIVO (Gira el vinilo y lanza notas musicales ♪ ♫) */}
          <g
            transform="translate(364, 246)"
            onClick={() => {
              const next = !vinylPlaying;
              setVinylPlaying(next);
              showToast(next ? '🎶 Tocadiscos girando · Melodía Lo-Fi' : '🔇 Tocadiscos en pausa');
            }}
            className="cursor-pointer pointer-events-auto"
          >
            <rect x="0" y="24" width="76" height="50" rx="6" fill="#C68B59" stroke="#3D312A" strokeWidth="2.4" />
            <rect x="6" y="30" width="64" height="36" rx="4" fill="#9C6644" stroke="#3D312A" strokeWidth="1.8" />
            <rect x="6" y="6" width="64" height="20" rx="5" fill="#E76F51" stroke="#3D312A" strokeWidth="2.2" />
            <ellipse cx="34" cy="8" rx="20" ry="7.5" fill="#222222" stroke="#3D312A" strokeWidth="1.8" />
            <ellipse cx="34" cy="8" rx="7" ry="2.8" fill="#FFD166" />
            <line x1="56" y1="4" x2="42" y2="9" stroke="#FFFDF9" strokeWidth="2" strokeLinecap="round" />
            {vinylPlaying && (
              <g className="animate-bounce">
                <text x="10" y="-8" fontSize="17" fill="#3D312A" fontWeight="bold">
                  ♪
                </text>
                <text x="44" y="-14" fontSize="19" fill="#E76F51" fontWeight="bold">
                  ♫
                </text>
              </g>
            )}
          </g>

          {/* 8. GRAN ALFOMBRA CENTRAL ROSA (Protagonista en el centro del salón: cy=342, ~66% de altura) */}
          <g transform="translate(230, 344)">
            {petCare.roomRug === 'flores' && (
              <g>
                <ellipse cx="0" cy="0" rx="154" ry="66" fill="#FFC8DD" stroke="#3D312A" strokeWidth="2.8" />
                <ellipse
                  cx="0"
                  cy="0"
                  rx="134"
                  ry="52"
                  fill="#FFAFCC"
                  stroke="#FFFDF9"
                  strokeWidth="2.2"
                  strokeDasharray="8 5"
                />
              </g>
            )}
            {petCare.roomRug === 'vichy' && (
              <rect
                x="-148"
                y="-60"
                width="296"
                height="120"
                rx="38"
                fill="#FFE5D9"
                stroke="#3D312A"
                strokeWidth="2.8"
              />
            )}
            {petCare.roomRug === 'nube' && (
              <ellipse cx="0" cy="0" rx="154" ry="66" fill="#FFFDF9" stroke="#3D312A" strokeWidth="2.8" />
            )}
          </g>

          {/* 9. MESITA BAJA REDONDA DE MADERA (ESTILO KOTATSU / MESA DE TÉ) CON DOS COJINES MULLIDOS Y OVILLO INTERACTIVO */}
          <g transform="translate(230, 444)">
            {/* Dos cojines mullidos a los lados de la mesita */}
            <ellipse cx="-82" cy="6" rx="28" ry="13" fill="#FFB5A7" stroke="#3D312A" strokeWidth="2.2" />
            <ellipse cx="82" cy="6" rx="28" ry="13" fill="#A8DADC" stroke="#3D312A" strokeWidth="2.2" />

            {/* Patas de madera de la mesita baja */}
            <rect x="-46" y="6" width="11" height="20" rx="4" fill="#7F4F24" stroke="#3D312A" strokeWidth="2" />
            <rect x="35" y="6" width="11" height="20" rx="4" fill="#7F4F24" stroke="#3D312A" strokeWidth="2" />

            {/* Tablero redondo de madera cálida */}
            <ellipse
              cx="0"
              cy="-2"
              rx="64"
              ry="22"
              fill={tableModel === 'kotatsu' ? '#D4A373' : tableModel === 'picnic' ? '#95D5B2' : '#E76F51'}
              stroke="#3D312A"
              strokeWidth="2.6"
            />
            {/* Bandeja con plato de comida y dos tacitas de té */}
            <ellipse cx="0" cy="-4" rx="22" ry="9.5" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.8" />
            <circle cx="-32" cy="-2" r="6.5" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.6" />
            <circle cx="32" cy="-2" r="6.5" fill="#FFFDF9" stroke="#3D312A" strokeWidth="1.6" />
            <text x="0" y="2" fontSize="18" textAnchor="middle">
              {tableSnack}
            </text>
          </g>

          {/* Ovillo de lana / pelota interactiva en el suelo */}
          <g
            transform="translate(96, 442)"
            onClick={() => {
              setInBedSleeping(false);
              setPlayingWithYarn(true);
              soundEngine.playPop(1.3);
              showToast('🧶 ¡Jugando y dando saltitos en la alfombra!');
              setTimeout(() => setPlayingWithYarn(false), 2600);
            }}
            className="cursor-pointer pointer-events-auto"
          >
            <circle cx="0" cy="0" r="16" fill="#FF8FA3" stroke="#3D312A" strokeWidth="2.2" />
            <path d="M -9 -6 Q 0 4 9 -6" stroke="#3D312A" strokeWidth="1.6" fill="none" />
            <path d="M -8 5 Q 0 -4 8 5" stroke="#3D312A" strokeWidth="1.6" fill="none" />
            <path d="M 12 10 Q 26 16 34 8" stroke="#FF8FA3" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        </svg>

        {/* MASCOTA A (Protagonista en la alfombra central: top 62%, left 42% despierta; o en la almohada izquierda cuando inBedSleeping=true) */}
        <motion.div
          layout
          animate={
            inBedSleeping
              ? {
                  left: '11%',
                  top: '36%',
                  x: '-50%',
                  y: '-50%',
                  scale: 0.72,
                }
              : {
                  left: '39%',
                  top: '61%',
                  x: `calc(-50% + ${roamA.dx}px)`,
                  y: `calc(-50% + ${roamA.dy + (roamA.hop ? -10 : 0)}px)`,
                  scale: 1,
                }
          }
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          style={{ position: 'absolute' }}
          className="z-20 flex flex-col items-center pointer-events-auto"
        >
          {/* Bocadillo manuscrito Caveat encima de la mascota en la alfombra */}
          {!inBedSleeping && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-1 px-2.5 py-0.5 rounded-2xl bg-[#FFFDF9]/95 border-2 border-[var(--border-ink)] shadow-xs max-w-[140px]"
            >
              <p className="handwritten text-sm leading-tight text-[var(--text-main)] text-center truncate">
                “{pawHighFive ? '¡Choca esas patitas! 🐾' : petA.speechBubble}”
              </p>
            </motion.div>
          )}

          {/* Sombra ovalada suave sobre la alfombra rosa */}
          {!inBedSleeping && (
            <div className="absolute bottom-5 w-24 h-5 rounded-full bg-[#3D312A]/20 blur-[1px] pointer-events-none" />
          )}

          <div
            ref={petARef}
            onPointerDown={() => handlePetBellyRub('A')}
            onPointerEnter={(e) => {
              if (e.buttons > 0) handlePetBellyRub('A');
            }}
            className="relative cursor-pointer"
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
              size={146}
            />
          </div>

          {!inBedSleeping && (
            <div className="mt-0.5 px-2.5 py-0.5 rounded-full bg-[#FFFDF9]/95 border-2 border-[var(--border-ink)] text-[11px] font-bold shadow-xs">
              {petA.petName} · {petA.ownerName}
            </div>
          )}
        </motion.div>

        {/* MASCOTA B (Protagonista en la alfombra central: top 62%, left 58% despierta; o en la almohada derecha cuando inBedSleeping=true) */}
        <motion.div
          layout
          animate={
            inBedSleeping
              ? {
                  left: '24%',
                  top: '36%',
                  x: '-50%',
                  y: '-50%',
                  scale: 0.72,
                }
              : {
                  left: '61%',
                  top: '61%',
                  x: `calc(-50% + ${roamB.dx}px)`,
                  y: `calc(-50% + ${roamB.dy + (roamB.hop ? -10 : 0)}px)`,
                  scale: 1,
                }
          }
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          style={{ position: 'absolute' }}
          className="z-20 flex flex-col items-center pointer-events-auto"
        >
          {/* Bocadillo manuscrito Caveat encima de la mascota en la alfombra */}
          {!inBedSleeping && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-1 px-2.5 py-0.5 rounded-2xl bg-[#FFFDF9]/95 border-2 border-[var(--border-ink)] shadow-xs max-w-[140px]"
            >
              <p className="handwritten text-sm leading-tight text-[var(--text-main)] text-center truncate">
                “{pawHighFive ? '¡Abrazooo! 💕' : petB.speechBubble}”
              </p>
            </motion.div>
          )}

          {/* Sombra ovalada suave sobre la alfombra rosa */}
          {!inBedSleeping && (
            <div className="absolute bottom-5 w-24 h-5 rounded-full bg-[#3D312A]/20 blur-[1px] pointer-events-none" />
          )}

          <div
            ref={petBRef}
            onPointerDown={() => handlePetBellyRub('B')}
            onPointerEnter={(e) => {
              if (e.buttons > 0) handlePetBellyRub('B');
            }}
            className="relative cursor-pointer"
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
              size={146}
            />
          </div>

          {!inBedSleeping && (
            <div className="mt-0.5 px-2.5 py-0.5 rounded-full bg-[#FFFDF9]/95 border-2 border-[var(--border-ink)] text-[11px] font-bold shadow-xs">
              {petB.petName} · {petB.ownerName}
            </div>
          )}
        </motion.div>

        {/* CORAZÓN FLOTANTE CUANDO CHOCAN LAS PATITAS O SE ABRAZAN EN LA ALFOMBRA */}
        <AnimatePresence>
          {pawHighFive && !inBedSleeping && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1.25, y: -12 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ left: '50%', top: '53%', transform: 'translate(-50%, -50%)' }}
              className="absolute z-30 pointer-events-none text-3xl drop-shadow"
            >
              💞
            </motion.div>
          )}
        </AnimatePresence>

        {/* CAPA SUPERIOR (z-index: 30): COLCHA/MANTA NARANJA DE LA CAMA QUE TAPA SUS CUERPOS DEL CUELLO HACIA ABAJO CUANDO DUERMEN */}
        <AnimatePresence>
          {inBedSleeping && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={() => setInBedSleeping(false)}
              style={{
                left: '3.2%',
                top: '36.2%',
                width: '25.5%',
                height: '13.5%',
              }}
              className="absolute z-30 cursor-pointer pointer-events-auto"
            >
              <svg viewBox="0 0 120 68" preserveAspectRatio="none" className="w-full h-full drop-shadow-md">
                {/* Embozo de sábana blanca justo a la altura del cuello */}
                <rect
                  x="2"
                  y="2"
                  width="116"
                  height="13"
                  rx="5"
                  fill="#FFFDF9"
                  stroke="#3D312A"
                  strokeWidth="2.5"
                />
                {/* Colcha naranja/pastel cubriendo sus cuerpos hasta los pies */}
                <rect
                  x="2"
                  y="12"
                  width="116"
                  height="52"
                  rx="10"
                  fill={quiltColor}
                  stroke="#3D312A"
                  strokeWidth="2.8"
                />
                <line x1="42" y1="14" x2="42" y2="62" stroke="#3D312A" strokeWidth="1.8" opacity="0.3" />
                <line x1="78" y1="14" x2="78" y2="62" stroke="#3D312A" strokeWidth="1.8" opacity="0.3" />
              </svg>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm font-bold text-[#3D312A] bg-[#FFFDF9]/90 px-2 py-0.5 rounded-full border border-[#3D312A] animate-bounce whitespace-nowrap">
                Zzz... 💤
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* POMPAS DE ESPUMA BLANCAS Y BRILLANTES BAJO EL PUNTERO */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
          {foamBubbles.map((b) => (
            <g key={b.id} transform={`translate(${b.x}, ${b.y})`}>
              <circle cx="0" cy="0" r={b.r} fill="#FFFFFF" fillOpacity="0.94" stroke="#8ECAE6" strokeWidth="2" />
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
              className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[var(--accent-terracotta)] text-white px-4 py-1.5 rounded-full text-xs font-bold border-2 border-[var(--border-ink)] shadow-lg whitespace-nowrap"
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
            className="bg-[var(--bg-card)] border-t-2 border-[var(--border-ink)] px-3 pt-2.5 pb-3 max-h-[42vh] overflow-y-auto z-30 shadow-2xl"
          >
            {openDrawer === 'decor' && (
              <div className="space-y-2.5">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'cama', icon: '🛏️', label: 'Cama' },
                    { id: 'alfombra', icon: '🌸', label: 'Alfombra' },
                    { id: 'mesa', icon: '🍵', label: 'Mesa Central' },
                    { id: 'paredes', icon: '🎨', label: 'Paredes' },
                    { id: 'guirnaldas', icon: '✨', label: 'Guirnaldas' },
                    { id: 'mascotas', icon: '🎀', label: 'Accesorios' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setDecorTab(t.id as typeof decorTab);
                        soundEngine.playPop();
                      }}
                      className={`px-2.5 py-1 rounded-xl border-2 text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer ${
                        decorTab === t.id
                          ? 'bg-[var(--accent-primary)] border-[var(--border-ink)]'
                          : 'bg-[var(--bg-paper)] border-[var(--border-ink)] opacity-80'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {decorTab === 'cama' && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'rustica', name: 'Colcha Naranja', c: '#F4845F' },
                      { id: 'dosel', name: 'Dosel Pastel', c: '#F4ACB7' },
                      { id: 'futon', name: 'Futón Menta', c: '#74C69D' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setBedModel(opt.id as typeof bedModel);
                          localStorage.setItem('mw_v4_bed', opt.id);
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 cursor-pointer ${
                          bedModel === opt.id ? 'bg-[#FFE5D9] border-[var(--accent-terracotta)]' : 'bg-[var(--bg-paper)] border-[var(--border-ink)]'
                        }`}
                      >
                        <div className="w-12 h-7 rounded-md border-2 border-[#3D312A] relative overflow-hidden" style={{ backgroundColor: opt.c }}>
                          <div className="w-full h-2 bg-white border-b border-[#3D312A]" />
                        </div>
                        <span className="text-[11px] font-bold">{opt.name}</span>
                      </button>
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
                      <button
                        key={opt.id}
                        onClick={() => {
                          updateRoomDecor(opt.id as 'flores' | 'vichy' | 'nube', petCare.roomLamp);
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 cursor-pointer ${
                          petCare.roomRug === opt.id ? 'bg-[#FFE5D9] border-[var(--accent-terracotta)]' : 'bg-[var(--bg-paper)] border-[var(--border-ink)]'
                        }`}
                      >
                        <div className="w-12 h-6 rounded-full border-2 border-[#3D312A]" style={{ backgroundColor: opt.c }} />
                        <span className="text-[11px] font-bold">{opt.name}</span>
                      </button>
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
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTableModel(opt.id as typeof tableModel);
                          localStorage.setItem('mw_v4_table', opt.id);
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 cursor-pointer ${
                          tableModel === opt.id ? 'bg-[#FFE5D9] border-[var(--accent-terracotta)]' : 'bg-[var(--bg-paper)] border-[var(--border-ink)]'
                        }`}
                      >
                        <div className="w-12 h-5 rounded-full border-2 border-[#3D312A]" style={{ backgroundColor: opt.c }} />
                        <span className="text-[11px] font-bold">{opt.name}</span>
                      </button>
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
                      <button
                        key={w.id}
                        onClick={() => {
                          setWallStyle(w.id as typeof wallStyle);
                          localStorage.setItem('mw_room_wall', w.id);
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 cursor-pointer ${
                          wallStyle === w.id ? 'border-[var(--accent-terracotta)] scale-105' : 'border-[var(--border-ink)]'
                        }`}
                        style={{ backgroundColor: w.bg }}
                      >
                        <span className="text-[11px] font-bold">{w.name}</span>
                      </button>
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
                      <button
                        key={g.id}
                        onClick={() => {
                          setGarlandStyle(g.id as typeof garlandStyle);
                          localStorage.setItem('mw_v4_garland', g.id);
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 cursor-pointer ${
                          garlandStyle === g.id ? 'bg-[#FFE5D9] border-[var(--accent-terracotta)]' : 'bg-[var(--bg-paper)] border-[var(--border-ink)]'
                        }`}
                      >
                        <div className="flex gap-1">
                          <span className="w-3.5 h-3.5 rounded-full border border-[#3D312A]" style={{ backgroundColor: g.c }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-[#3D312A]" style={{ backgroundColor: g.c }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-[#3D312A]" style={{ backgroundColor: g.c }} />
                        </div>
                        <span className="text-[11px] font-bold">{g.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {decorTab === 'mascotas' && (
                  <div className="flex items-center justify-between gap-1.5 bg-[var(--bg-paper)] p-2 rounded-2xl border-2 border-[var(--border-ink)]">
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
                      <button
                        key={i}
                        onClick={() => {
                          if (acc.val === 'ninguno') {
                            updatePetProfile(activeUser, { hat: 'ninguno', glasses: 'ninguno', neck: 'ninguno' });
                          } else {
                            updatePetProfile(activeUser, { [acc.type]: acc.val });
                          }
                          soundEngine.playPop();
                        }}
                        className="w-9 h-9 rounded-xl border-2 border-[var(--border-ink)] bg-white flex items-center justify-center text-lg cursor-pointer"
                      >
                        {acc.icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {openDrawer === 'armario' && (
              <div className="space-y-2.5">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {PET_CATALOG.map((spec) => (
                    <button
                      key={spec.id}
                      onClick={() => {
                        updatePetProfile(activeUser, { species: spec.id as PetSpecies });
                        soundEngine.playPop();
                      }}
                      className={`shrink-0 p-1.5 rounded-2xl border-2 flex flex-col items-center cursor-pointer ${
                        myPet.species === spec.id
                          ? 'bg-[#FFE5D9] border-[var(--accent-terracotta)] scale-105'
                          : 'bg-[var(--bg-paper)] border-[var(--border-ink)]'
                      }`}
                    >
                      <CutePetAvatar species={spec.id} size={46} />
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-1.5 bg-[var(--bg-paper)] p-2 rounded-2xl border-2 border-[var(--border-ink)]">
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
                    <button
                      key={i}
                      onClick={() => {
                        if (acc.val === 'ninguno') {
                          updatePetProfile(activeUser, { hat: 'ninguno', glasses: 'ninguno', neck: 'ninguno' });
                        } else {
                          updatePetProfile(activeUser, { [acc.type]: acc.val });
                        }
                        soundEngine.playPop();
                      }}
                      className="w-9 h-9 rounded-xl border-2 border-[var(--border-ink)] bg-white flex items-center justify-center text-lg cursor-pointer"
                    >
                      {acc.icon}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {openDrawer === 'estado' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        updatePetProfile(activeUser, { mood: m.id });
                        soundEngine.playPop();
                      }}
                      title={m.label}
                      className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center text-xl cursor-pointer ${
                        myPet.mood === m.id
                          ? 'bg-[var(--accent-terracotta)] border-[var(--border-ink)] scale-110'
                          : 'bg-[var(--bg-paper)] border-[var(--border-ink)]'
                      }`}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  maxLength={70}
                  value={myPet.speechBubble}
                  onChange={(e) => updatePetProfile(activeUser, { speechBubble: e.target.value })}
                  placeholder="Escribe qué piensa tu mascota..."
                  className="w-full px-3 py-1.5 rounded-xl border-2 border-[var(--border-ink)] bg-[var(--bg-paper)] handwritten text-base"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DOCK INFERIOR DE INTERACCIÓN FÍSICA DIRECTA */}
      <div className="px-3 py-2.5 bg-[var(--bg-card)] border-t-2 border-[var(--border-ink)] flex items-center justify-between gap-1.5 z-30">
        <div className="flex items-center gap-1.5 bg-[var(--bg-paper)] px-2 py-1 rounded-2xl border-2 border-[var(--border-ink)]">
          {FOODS.map((food) => (
            <motion.button
              key={food.id}
              whileTap={{ scale: 1.2 }}
              onPointerDown={(e) => startFoodDrag(food, e)}
              onPointerMove={moveFoodDrag}
              onPointerUp={endFoodDrag}
              onPointerCancel={endFoodDrag}
              title={`Arrastra ${food.name} a la boca de tu mascota`}
              className="w-11 h-11 rounded-xl bg-white border-2 border-[var(--border-ink)] flex items-center justify-center text-2xl shadow-xs cursor-grab active:cursor-grabbing touch-none"
            >
              {food.emoji}
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const next = !spongeActive;
              setSpongeActive(next);
              setInBedSleeping(false);
              if (next) {
                showToast('Frota la esponja 🧽 sobre las mascotas en la alfombra 🫧');
              } else {
                setFoamBubbles([]);
                setSpongePos(null);
              }
            }}
            className={`w-11 h-11 rounded-2xl border-2 border-[var(--border-ink)] flex items-center justify-center text-2xl shadow-xs cursor-pointer ${
              spongeActive ? 'bg-[#ADE8F4] scale-110 ring-2 ring-[#0077B6]' : 'bg-[var(--bg-paper)]'
            }`}
          >
            🧽
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const next = !inBedSleeping;
              setInBedSleeping(next);
              if (next) {
                careForPets('sleep');
                showToast('¡A dormir en las almohadas bajo la manta! 🛏️💤');
              } else {
                showToast('¡De vuelta a jugar en la alfombra rosa! 🐾');
              }
            }}
            className={`w-11 h-11 rounded-2xl border-2 border-[var(--border-ink)] flex items-center justify-center text-2xl shadow-xs cursor-pointer ${
              inBedSleeping ? 'bg-[#CDB4DB] scale-110' : 'bg-[var(--bg-paper)]'
            }`}
          >
            🛏️
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setInBedSleeping(false);
              careForPets('pamper_partner');
              setPawHighFive(true);
              spawnParticlesAtPet('A', ['💖', '💕']);
              spawnParticlesAtPet('B', ['💖', '💕']);
              soundEngine.speakAnimalese('Mimitos ricos', 520);
              showToast(`¡Abrazos y mimos entre ${petA.petName} y ${petB.petName}! 💕`);
              setTimeout(() => setPawHighFive(false), 1800);
            }}
            className="w-11 h-11 rounded-2xl border-2 border-[var(--border-ink)] bg-[#FFD6E0] flex items-center justify-center text-2xl shadow-xs cursor-pointer"
          >
            💕
          </motion.button>
        </div>

        <div className="flex items-center gap-1">
          {[
            { id: 'decor', icon: '🎨' },
            { id: 'armario', icon: '👑' },
            { id: 'estado', icon: '💭' },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                setOpenDrawer((prev) => (prev === tab.id ? 'none' : (tab.id as 'decor' | 'armario' | 'estado')))
              }
              className={`w-10 h-11 rounded-2xl border-2 border-[var(--border-ink)] flex items-center justify-center text-xl cursor-pointer ${
                openDrawer === tab.id ? 'bg-[var(--accent-terracotta)] text-white' : 'bg-[var(--bg-paper)]'
              }`}
            >
              {tab.icon}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
