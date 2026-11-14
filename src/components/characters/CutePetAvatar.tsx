import React, { useEffect, useState } from 'react';
import { PetSpecies } from '../../store/useWorldStore';

export const PET_CATALOG: {
  id: PetSpecies;
  name: string;
  group: string;
  bodyColor: string;
  bellyColor: string;
  accentColor: string;
  inWaterBubble?: boolean;
}[] = [
  { id: 'capibara', name: 'Capibara', group: 'Exóticos', bodyColor: '#C68B59', bellyColor: '#E3B78D', accentColor: '#7F4F24' },
  { id: 'dino', name: 'Dino Cute', group: 'Aves y Dino', bodyColor: '#7BC697', bellyColor: '#FFF3B0', accentColor: '#F4A261' },
  { id: 'ajolote', name: 'Ajolote', group: 'Exóticos', bodyColor: '#FFC2D1', bellyColor: '#FFE5EC', accentColor: '#FF5D8F' },
  { id: 'loro', name: 'Lorito Pastel', group: 'Aves y Dino', bodyColor: '#6AD18A', bellyColor: '#FFE066', accentColor: '#FF7B54' },
  { id: 'pez_globo', name: 'Pez Globo', group: 'Burbuja Mágica', bodyColor: '#F6BD60', bellyColor: '#FFF8EB', accentColor: '#52B788', inWaterBubble: true },
  { id: 'carpa_koi', name: 'Carpa Koi', group: 'Burbuja Mágica', bodyColor: '#FFFDF9', bellyColor: '#FF758F', accentColor: '#FF9F1C', inWaterBubble: true },
  { id: 'vaquita', name: 'Vaquita', group: 'Granja', bodyColor: '#FFFDF7', bellyColor: '#FFD6E0', accentColor: '#5C4B43' },
  { id: 'gatito', name: 'Gatito', group: 'Clásicos', bodyColor: '#F4ACB7', bellyColor: '#FFF0F3', accentColor: '#D87A88' },
  { id: 'conejito', name: 'Conejito', group: 'Clásicos', bodyColor: '#F9EAE1', bellyColor: '#FFD7BA', accentColor: '#ECA0B6' },
  { id: 'perrito', name: 'Perrito', group: 'Clásicos', bodyColor: '#E6B89C', bellyColor: '#FFF8F0', accentColor: '#9C6644' },
  { id: 'panda_rojo', name: 'Panda Rojo', group: 'Exóticos', bodyColor: '#D96B43', bellyColor: '#F7E3D4', accentColor: '#4A3525' },
  { id: 'lemur', name: 'Lémur', group: 'Exóticos', bodyColor: '#9E9B98', bellyColor: '#F2EFE9', accentColor: '#423E3B' },
  { id: 'oveja', name: 'Ovejita', group: 'Granja', bodyColor: '#FFFDF9', bellyColor: '#EADBC8', accentColor: '#8D7B68' },
  { id: 'cerdito', name: 'Cerdito', group: 'Granja', bodyColor: '#FFB5C2', bellyColor: '#FFD9E0', accentColor: '#E57A8E' },
  { id: 'pollito', name: 'Pollito', group: 'Granja', bodyColor: '#FFE066', bellyColor: '#FFF6CC', accentColor: '#F77F00' },
  { id: 'patito', name: 'Patito', group: 'Aves y Dino', bodyColor: '#FFF3B0', bellyColor: '#FFFFFF', accentColor: '#FF9F1C' },
  { id: 'pinguino', name: 'Pingüino', group: 'Aves y Dino', bodyColor: '#5C738A', bellyColor: '#FFFDF9', accentColor: '#FFB703' },
  { id: 'buho', name: 'Búho Sabio', group: 'Aves y Dino', bodyColor: '#B08968', bellyColor: '#EDE0D4', accentColor: '#7F5539' },
  { id: 'osito', name: 'Osito Miel', group: 'Clásicos', bodyColor: '#D4A373', bellyColor: '#FAEDCD', accentColor: '#9C6644' },
];

export interface CutePetAvatarProps {
  species: PetSpecies;
  hat?: string;
  glasses?: string;
  neck?: string;
  isDirty?: boolean;
  mudOpacity?: number; // 0 a 1 para degradado suave mientras se frota con esponja
  isSleepy?: boolean;
  isWaving?: boolean;
  isBouncing?: boolean;
  mouthState?: 'normal' | 'open' | 'chewing';
  eyesSparkle?: boolean;
  isHappyClosedEyes?: boolean;
  isShakingClean?: boolean;
  foamBubbles?: number;
  size?: number;
  onClick?: () => void;
}

export const CutePetAvatar: React.FC<CutePetAvatarProps> = ({
  species,
  hat = 'ninguno',
  glasses = 'ninguno',
  neck = 'ninguno',
  isDirty = false,
  mudOpacity = 1,
  isSleepy = false,
  isWaving = false,
  isBouncing = false,
  mouthState = 'normal',
  eyesSparkle = false,
  isHappyClosedEyes = false,
  isShakingClean = false,
  size = 140,
  onClick,
}) => {
  const meta = PET_CATALOG.find((p) => p.id === species) || PET_CATALOG[0];

  // Parpadeo natural cada 3.2 - 4.4 segundos
  const [isBlinking, setIsBlinking] = useState(false);
  const [tickleScale, setTickleScale] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      const nextDelay = 3000 + Math.random() * 1600;
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 160);
      }, nextDelay);
    };
    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  const handleTap = () => {
    setTickleScale(true);
    setTimeout(() => setTickleScale(false), 420);
    onClick?.();
  };

  const isFish = species === 'pez_globo' || species === 'carpa_koi';
  const isBird = ['loro', 'patito', 'pinguino', 'buho', 'pollito'].includes(species);
  const effectiveMudOpacity = isDirty ? Math.max(0.15, mudOpacity) : 0;

  // Renderizado de ojos según estado (parpadeo, sueño, ojos cerrados felices con esponja, o brillantes ante comida)
  const renderEyes = (cxLeft: number, cxRight: number, cy: number, relaxedCapibara = false) => {
    if (isHappyClosedEyes) {
      return (
        <g stroke="#4A3F35" strokeWidth="3.2" fill="none" strokeLinecap="round">
          <path d={`M${cxLeft - 7} ${cy + 2} Q${cxLeft} ${cy - 6} ${cxLeft + 7} ${cy + 2}`} />
          <path d={`M${cxRight - 7} ${cy + 2} Q${cxRight} ${cy - 6} ${cxRight + 7} ${cy + 2}`} />
        </g>
      );
    }
    if (isSleepy || isBlinking) {
      return (
        <g stroke="#4A3F35" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d={`M${cxLeft - 6} ${cy} Q${cxLeft} ${cy + 5} ${cxLeft + 6} ${cy}`} />
          <path d={`M${cxRight - 6} ${cy} Q${cxRight} ${cy + 5} ${cxRight + 6} ${cy}`} />
        </g>
      );
    }
    if (eyesSparkle) {
      return (
        <g>
          <circle cx={cxLeft} cy={cy} r="7" fill="#4A3F35" />
          <circle cx={cxLeft - 2} cy={cy - 2} r="3" fill="#FFFDF9" />
          <circle cx={cxLeft + 2.5} cy={cy + 2} r="1.5" fill="#FFE066" />
          <circle cx={cxRight} cy={cy} r="7" fill="#4A3F35" />
          <circle cx={cxRight - 2} cy={cy - 2} r="3" fill="#FFFDF9" />
          <circle cx={cxRight + 2.5} cy={cy + 2} r="1.5" fill="#FFE066" />
        </g>
      );
    }
    return (
      <g>
        <circle cx={cxLeft} cy={cy} r="5.5" fill="#4A3F35" />
        <circle cx={cxLeft - 1.8} cy={cy - 1.8} r="2.1" fill="#FFFDF9" />
        <circle cx={cxRight} cy={cy} r="5.5" fill="#4A3F35" />
        <circle cx={cxRight - 1.8} cy={cy - 1.8} r="2.1" fill="#FFFDF9" />
        {relaxedCapibara && (
          <g stroke="#4A3F35" strokeWidth="2.4" strokeLinecap="round">
            <line x1={cxLeft - 6} y1={cy - 3.5} x2={cxLeft + 6} y2={cy - 2.5} />
            <line x1={cxRight - 6} y1={cy - 2.5} x2={cxRight + 6} y2={cy - 3.5} />
          </g>
        )}
      </g>
    );
  };

  // Renderizado de boca (normal, abierta esperando pizza/comida, o masticando con mofletes)
  const renderMouth = (cx: number, cy: number, isBeak = false) => {
    if (mouthState === 'open') {
      return (
        <g>
          <ellipse
            cx={cx}
            cy={cy + 3}
            rx="9"
            ry="10"
            fill="#D9534F"
            stroke="#4A3F35"
            strokeWidth="2.6"
          />
          <path
            d={`M${cx - 6} ${cy + 7} Q${cx} ${cy + 2} ${cx + 6} ${cy + 7} A6 5 0 0 1 ${cx - 6} ${cy + 7}`}
            fill="#FF9EBB"
          />
        </g>
      );
    }
    if (mouthState === 'chewing') {
      return (
        <g>
          {/* Mofletes hinchados moviéndose al masticar */}
          <circle cx={cx - 14} cy={cy} r="6.5" fill="#FF8FA3" opacity="0.85">
            <animate attributeName="r" values="5.5;8;5.5" dur="0.32s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx + 14} cy={cy} r="6.5" fill="#FF8FA3" opacity="0.85">
            <animate attributeName="r" values="5.5;8;5.5" dur="0.32s" repeatCount="indefinite" />
          </circle>
          <path
            d={`M${cx - 7} ${cy + 1} Q${cx} ${cy + 9} ${cx + 7} ${cy + 1}`}
            fill="#FF8FA3"
            stroke="#4A3F35"
            strokeWidth="2.8"
            strokeLinecap="round"
          >
            <animate
              attributeName="d"
              values={`M${cx - 7} ${cy + 1} Q${cx} ${cy + 9} ${cx + 7} ${cy + 1};M${cx - 6} ${cy + 3} Q${cx} ${cy - 2} ${cx + 6} ${cy + 3};M${cx - 7} ${cy + 1} Q${cx} ${cy + 9} ${cx + 7} ${cy + 1}`}
              dur="0.32s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      );
    }
    if (isBeak) {
      return (
        <path
          d={`M${cx - 8} ${cy - 3} Q${cx} ${cy - 7} ${cx + 8} ${cy - 3} L${cx} ${cy + 9} Z`}
          fill={meta.accentColor}
          stroke="#4A3F35"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      );
    }
    return (
      <path
        d={`M${cx - 6} ${cy + 1} Q${cx} ${cy + 7} ${cx + 6} ${cy + 1}`}
        stroke="#4A3F35"
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
      />
    );
  };

  return (
    <div
      onClick={handleTap}
      style={{ width: size, height: size }}
      className={`relative select-none cursor-pointer transition-transform duration-300 ${
        isBouncing ? 'animate-bounce' : ''
      } ${tickleScale ? 'scale-110 -rotate-3' : ''} ${
        isShakingClean ? 'animate-wiggle' : ''
      }`}
    >
      <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
        {/* Grupo con respiración continua viva (scaleY suave) */}
        <g>
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1 1; 1.02 0.975; 1 1"
            dur="3.1s"
            repeatCount="indefinite"
            additive="sum"
          />

          {/* Sombra elíptica en el suelo */}
          <ellipse cx="90" cy="162" rx="46" ry="9" fill="rgba(74, 63, 53, 0.16)" />

          {/* ==============================================================
              ANATOMÍA 1: PECES (Pez Globo / Carpa Koi) EN BURBUJA DE AGUA
             ============================================================== */}
          {isFish ? (
            <g>
              {/* Burbuja de agua mágica transparente */}
              <circle
                cx="90"
                cy="96"
                r="64"
                fill="rgba(140, 205, 245, 0.28)"
                stroke="#64B5F6"
                strokeWidth="2.8"
                strokeDasharray="10 5"
              />
              <ellipse
                cx="64"
                cy="52"
                rx="16"
                ry="7"
                transform="rotate(-26 64 52)"
                fill="rgba(255,255,255,0.7)"
              />
              {/* Cola ondulante de pez */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-8 128 98; 10 128 98; -8 128 98"
                  dur="1.1s"
                  repeatCount="indefinite"
                />
                <path
                  d="M124 96 C148 72, 158 78, 146 98 C158 116, 148 124, 124 100 Z"
                  fill={meta.accentColor}
                  stroke="#4A3F35"
                  strokeWidth="2.8"
                />
              </g>
              {/* Aleta dorsal */}
              <path
                d="M72 60 Q92 40 108 62 Z"
                fill={meta.accentColor}
                stroke="#4A3F35"
                strokeWidth="2.6"
              />
              {/* Cuerpo de pez */}
              <ellipse
                cx="86"
                cy="98"
                rx={species === 'pez_globo' ? 42 : 44}
                ry={species === 'pez_globo' ? 36 : 29}
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3.2"
              />
              <ellipse cx="82" cy="108" rx="28" ry="16" fill={meta.bellyColor} />
              {/* Manchas Koi si es Carpa Koi */}
              {species === 'carpa_koi' && (
                <g fill="#FF6B8B" opacity="0.88">
                  <ellipse cx="74" cy="84" rx="14" ry="8" />
                  <ellipse cx="102" cy="96" rx="11" ry="7" />
                </g>
              )}
              {/* Aleta lateral móvil */}
              <path
                d="M86 104 Q104 114 96 124 Q82 118 86 104 Z"
                fill={meta.accentColor}
                stroke="#4A3F35"
                strokeWidth="2.4"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0 86 104; 15 86 104; 0 86 104"
                  dur="0.9s"
                  repeatCount="indefinite"
                />
              </path>
              <ellipse cx="58" cy="102" rx="6" ry="4" fill="#FF8FA3" opacity="0.8" />
              <ellipse cx="96" cy="102" rx="6" ry="4" fill="#FF8FA3" opacity="0.8" />
              {renderEyes(64, 90, 90)}
              {renderMouth(77, 98)}
            </g>
          ) : species === 'dino' ? (
            /* ==============================================================
               ANATOMÍA 2: DINOSAURIO CUTE (Crestas dorsales, cola gordita, hocico y patitas)
               ============================================================== */
            <g>
              {/* Cola gordita de dinosaurio con movimiento */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-5 118 132; 7 118 132; -5 118 132"
                  dur="1.4s"
                  repeatCount="indefinite"
                />
                <path
                  d="M115 122 C148 126, 162 106, 154 92 C144 102, 134 106, 118 106 Z"
                  fill={meta.bodyColor}
                  stroke="#4A3F35"
                  strokeWidth="3"
                />
                {/* Crestas en la cola */}
                <polygon
                  points="132,106 140,94 145,104"
                  fill={meta.accentColor}
                  stroke="#4A3F35"
                  strokeWidth="2.2"
                />
              </g>

              {/* Crestas dorsales en cabeza y espalda */}
              <g fill={meta.accentColor} stroke="#4A3F35" strokeWidth="2.5" strokeLinejoin="round">
                <polygon points="78,36 86,20 96,36" />
                <polygon points="100,40 114,28 114,48" />
                <polygon points="116,56 132,48 124,68" />
                <polygon points="124,76 138,72 128,88" />
              </g>

              {/* Patitas robustas de dino */}
              <rect
                x="56"
                y="138"
                width="22"
                height="20"
                rx="9"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3"
              />
              <rect
                x="98"
                y="138"
                width="22"
                height="20"
                rx="9"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3"
              />

              {/* Cuerpo de dinosaurio con hocico redondeado */}
              <path
                d="M46 76 C44 42, 114 38, 120 78 C128 112, 126 146, 88 148 C50 148, 38 118, 46 76 Z"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3.2"
              />
              {/* Barriguita con rayas de dino */}
              <path
                d="M58 98 C58 80, 110 80, 110 98 C112 132, 102 145, 84 145 C66 145, 56 132, 58 98 Z"
                fill={meta.bellyColor}
                stroke="#4A3F35"
                strokeWidth="2.2"
              />
              <line x1="65" y1="108" x2="103" y2="108" stroke="#E9C46A" strokeWidth="2.5" />
              <line x1="63" y1="122" x2="105" y2="122" stroke="#E9C46A" strokeWidth="2.5" />

              {/* Hocico de dinosaurio con fosas nasales cute */}
              <ellipse
                cx="84"
                cy="78"
                rx="28"
                ry="15"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="2.4"
              />
              <circle cx="76" cy="73" r="2" fill="#4A3F35" />
              <circle cx="92" cy="73" r="2" fill="#4A3F35" />

              {/* Bracitos cortos de T-Rex / Dino cute */}
              <path
                d={isWaving ? 'M48 96 Q24 72 34 62 Q46 70 50 86' : 'M48 98 Q32 104 38 114 Q50 112 54 102'}
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3"
              />
              <path
                d="M118 98 Q134 104 128 114 Q116 112 112 102"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3"
              />

              <ellipse cx="56" cy="80" rx="7" ry="4.5" fill="#FF8FA3" opacity="0.75" />
              <ellipse cx="112" cy="80" rx="7" ry="4.5" fill="#FF8FA3" opacity="0.75" />
              {renderEyes(64, 104, 64)}
              {renderMouth(84, 84)}
            </g>
          ) : species === 'capibara' ? (
            /* ==============================================================
               ANATOMÍA 3: CAPIBARA (Cuerpo rechoncho marrón, hocico cuadrado clásico, orejitas pequeñas y ojos relajados)
               ============================================================== */
            <g>
              {/* Orejitas pequeñas oscuras atrás */}
              <ellipse
                cx="54"
                cy="46"
                rx="9"
                ry="11"
                transform="rotate(-18 54 46)"
                fill={meta.accentColor}
                stroke="#4A3F35"
                strokeWidth="3"
              />
              <ellipse
                cx="126"
                cy="46"
                rx="9"
                ry="11"
                transform="rotate(18 126 46)"
                fill={meta.accentColor}
                stroke="#4A3F35"
                strokeWidth="3"
              />

              {/* Patitas rechonchas */}
              <rect x="52" y="140" width="22" height="18" rx="8" fill={meta.accentColor} stroke="#4A3F35" strokeWidth="3" />
              <rect x="106" y="140" width="22" height="18" rx="8" fill={meta.accentColor} stroke="#4A3F35" strokeWidth="3" />

              {/* Cuerpo rechoncho cálido de capibara */}
              <rect
                x="36"
                y="46"
                width="108"
                height="104"
                rx="46"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3.2"
              />
              <ellipse cx="90" cy="122" rx="34" ry="22" fill={meta.bellyColor} />

              {/* Hocico cuadrado clásico de capibara */}
              <rect
                x="66"
                y="68"
                width="48"
                height="36"
                rx="14"
                fill={meta.accentColor}
                stroke="#4A3F35"
                strokeWidth="2.8"
              />
              {/* Naricita en T de capibara */}
              <circle cx="81" cy="77" r="2.5" fill="#2B1D12" />
              <circle cx="99" cy="77" r="2.5" fill="#2B1D12" />
              <line x1="90" y1="79" x2="90" y2="91" stroke="#2B1D12" strokeWidth="2.8" strokeLinecap="round" />

              {/* Bracitos */}
              <path
                d={isWaving ? 'M40 96 Q16 70 28 60 Q40 68 44 86' : 'M40 100 Q26 112 36 122 Q48 118 48 106'}
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3"
              />
              <path
                d="M140 100 Q154 112 144 122 Q132 118 132 106"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3"
              />

              <ellipse cx="52" cy="84" rx="7" ry="4.5" fill="#FF8FA3" opacity="0.7" />
              <ellipse cx="128" cy="84" rx="7" ry="4.5" fill="#FF8FA3" opacity="0.7" />
              {renderEyes(56, 124, 68, true)}
              {renderMouth(90, 92)}
            </g>
          ) : isBird ? (
            /* ==============================================================
               ANATOMÍA 4: LORO Y AVES (Cuerpo emplumado, alas laterales móviles, pico curvo y cresta)
               ============================================================== */
            <g>
              {/* Patitas de ave */}
              <path d="M72 146 L72 158 M66 158 L78 158" stroke="#F77F00" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M108 146 L108 158 M102 158 L114 158" stroke="#F77F00" strokeWidth="3.5" strokeLinecap="round" />

              {/* Cresta de plumas en la cabeza */}
              <g fill={meta.accentColor} stroke="#4A3F35" strokeWidth="2.6">
                <path d="M84 42 Q76 18 90 22 Q94 32 92 42 Z" />
                <path d="M92 42 Q98 20 108 28 Q102 38 96 44 Z" />
              </g>

              {/* Cuerpo emplumado */}
              <path
                d="M46 96 C46 46, 134 46, 134 96 C136 132, 118 148, 90 148 C62 148, 44 132, 46 96 Z"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3.2"
              />
              <ellipse cx="90" cy="112" rx="30" ry="26" fill={meta.bellyColor} />

              {/* Alas laterales móviles con plumas */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0 46 92; -14 46 92; 0 46 92"
                  dur={isWaving ? '0.45s' : '1.8s'}
                  repeatCount="indefinite"
                />
                <path
                  d="M48 86 C22 92, 20 124, 42 128 C52 120, 52 102, 48 86 Z"
                  fill={species === 'loro' ? '#FF7B54' : meta.bodyColor}
                  stroke="#4A3F35"
                  strokeWidth="3"
                />
              </g>
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0 134 92; 14 134 92; 0 134 92"
                  dur={isWaving ? '0.45s' : '1.8s'}
                  repeatCount="indefinite"
                />
                <path
                  d="M132 86 C158 92, 160 124, 138 128 C128 120, 128 102, 132 86 Z"
                  fill={species === 'loro' ? '#FF7B54' : meta.bodyColor}
                  stroke="#4A3F35"
                  strokeWidth="3"
                />
              </g>

              <ellipse cx="62" cy="86" rx="7" ry="4.5" fill="#FF8FA3" opacity="0.8" />
              <ellipse cx="118" cy="86" rx="7" ry="4.5" fill="#FF8FA3" opacity="0.8" />
              {renderEyes(68, 112, 74)}
              {renderMouth(90, 82, true)}
            </g>
          ) : species === 'ajolote' ? (
            /* ==============================================================
               ANATOMÍA 5: AJOLOTE (6 Branquias externas plumosas móviles y cola de renacuajo)
               ============================================================== */
            <g>
              {/* Cola acuática de ajolote */}
              <path
                d="M122 124 Q162 118 156 96 Q138 98 124 110 Z"
                fill="#FF8FA3"
                stroke="#4A3F35"
                strokeWidth="2.6"
              />
              {/* 6 Branquias externas plumosas animadas */}
              <g stroke="#4A3F35" strokeWidth="2.6" fill="#FF5D8F">
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1 1; 1.04 0.97; 1 1"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
                <path d="M44 62 Q14 44 18 62 Q28 68 42 68 Z" />
                <path d="M40 76 Q10 68 14 84 Q28 86 40 82 Z" />
                <path d="M42 90 Q16 92 22 104 Q34 102 44 94 Z" />
                <path d="M136 62 Q166 44 162 62 Q152 68 138 68 Z" />
                <path d="M140 76 Q170 68 166 84 Q152 86 140 82 Z" />
                <path d="M138 90 Q164 92 158 104 Q146 102 136 94 Z" />
              </g>

              <rect x="56" y="140" width="18" height="16" rx="8" fill={meta.bodyColor} stroke="#4A3F35" strokeWidth="2.8" />
              <rect x="106" y="140" width="18" height="16" rx="8" fill={meta.bodyColor} stroke="#4A3F35" strokeWidth="2.8" />

              <path
                d="M42 94 C42 46, 138 46, 138 94 C140 130, 120 146, 90 146 C60 146, 40 130, 42 94 Z"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3.2"
              />
              <ellipse cx="90" cy="116" rx="30" ry="20" fill={meta.bellyColor} />

              <ellipse cx="60" cy="86" rx="8" ry="5" fill="#FF5D8F" opacity="0.65" />
              <ellipse cx="120" cy="86" rx="8" ry="5" fill="#FF5D8F" opacity="0.65" />
              {renderEyes(68, 112, 76)}
              {renderMouth(90, 84)}
            </g>
          ) : (
            /* ==============================================================
               ANATOMÍA 6: GRANJA Y MAMÍFEROS DIFERENCIADOS (Vaquita, Gatito, Conejito, Perrito, Panda Rojo, Oveja, Cerdito)
               ============================================================== */
            <g>
              {/* Colas diferenciadas según especie */}
              {species === 'gatito' && (
                <path
                  d="M126 130 Q162 116 152 84 Q144 82 142 94 Q146 112 124 122"
                  fill={meta.bodyColor}
                  stroke="#4A3F35"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}
              {(species === 'panda_rojo' || species === 'lemur') && (
                <g stroke="#4A3F35" strokeWidth="3">
                  <path
                    d="M122 128 C162 128, 168 92, 144 88 C132 88, 130 112, 120 118 Z"
                    fill={meta.bodyColor}
                  />
                  <path d="M144 96 L156 104 M136 108 L150 116" stroke={meta.accentColor} strokeWidth="5" />
                </g>
              )}
              {species === 'conejito' && (
                <circle cx="134" cy="128" r="12" fill="#FFFDF9" stroke="#4A3F35" strokeWidth="2.8" />
              )}

              {/* Orejas y Cuernos anatómicos diferenciados */}
              {species === 'conejito' ? (
                <g stroke="#4A3F35" strokeWidth="3">
                  <ellipse cx="68" cy="34" rx="12" ry="28" transform="rotate(-8 68 34)" fill={meta.bodyColor} />
                  <ellipse cx="68" cy="36" rx="6" ry="18" transform="rotate(-8 68 36)" fill="#FFB5C2" stroke="none" />
                  <ellipse cx="112" cy="34" rx="12" ry="28" transform="rotate(8 112 34)" fill={meta.bodyColor} />
                  <ellipse cx="112" cy="36" rx="6" ry="18" transform="rotate(8 112 36)" fill="#FFB5C2" stroke="none" />
                </g>
              ) : species === 'gatito' || species === 'panda_rojo' ? (
                <g stroke="#4A3F35" strokeWidth="3" strokeLinejoin="round">
                  <polygon points="46,66 42,32 74,48" fill={meta.bodyColor} />
                  <polygon points="50,60 47,40 68,50" fill="#FFB5C2" stroke="none" />
                  <polygon points="134,66 138,32 106,48" fill={meta.bodyColor} />
                  <polygon points="130,60 133,40 112,50" fill="#FFB5C2" stroke="none" />
                </g>
              ) : species === 'vaquita' ? (
                <g stroke="#4A3F35" strokeWidth="2.8">
                  {/* Cuernitos cremosos y orejas laterales de vaquita */}
                  <path d="M58 48 Q48 28 62 28 Q68 36 66 46 Z" fill="#F6D8AE" />
                  <path d="M122 48 Q132 28 118 28 Q112 36 114 46 Z" fill="#F6D8AE" />
                  <ellipse cx="42" cy="58" rx="14" ry="8" transform="rotate(-20 42 58)" fill={meta.bodyColor} />
                  <ellipse cx="138" cy="58" rx="14" ry="8" transform="rotate(20 138 58)" fill={meta.bodyColor} />
                </g>
              ) : species === 'perrito' ? (
                <g stroke="#4A3F35" strokeWidth="3">
                  {/* Orejas caídas de perrito */}
                  <ellipse cx="42" cy="74" rx="11" ry="24" transform="rotate(14 42 74)" fill={meta.accentColor} />
                  <ellipse cx="138" cy="74" rx="11" ry="24" transform="rotate(-14 138 74)" fill={meta.accentColor} />
                </g>
              ) : (
                <g stroke="#4A3F35" strokeWidth="3">
                  <circle cx="54" cy="48" r="14" fill={meta.bodyColor} />
                  <circle cx="54" cy="48" r="7" fill={meta.accentColor} stroke="none" />
                  <circle cx="126" cy="48" r="14" fill={meta.bodyColor} />
                  <circle cx="126" cy="48" r="7" fill={meta.accentColor} stroke="none" />
                </g>
              )}

              {/* Patitas */}
              <rect x="56" y="140" width="20" height="16" rx="8" fill={meta.bodyColor} stroke="#4A3F35" strokeWidth="3" />
              <rect x="104" y="140" width="20" height="16" rx="8" fill={meta.bodyColor} stroke="#4A3F35" strokeWidth="3" />

              {/* Cuerpo principal */}
              <path
                d="M42 96 C42 46, 138 46, 138 96 C142 130, 124 148, 90 148 C56 148, 38 130, 42 96 Z"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3.2"
              />
              <ellipse cx="90" cy="116" rx="30" ry="22" fill={meta.bellyColor} />

              {/* Manchas de vaquita */}
              {species === 'vaquita' && (
                <g fill="#5C4B43" opacity="0.88">
                  <circle cx="58" cy="84" r="11" />
                  <circle cx="118" cy="104" r="13" />
                  <circle cx="106" cy="62" r="8" />
                  <ellipse cx="90" cy="88" rx="18" ry="11" fill="#FFD6E0" stroke="#4A3F35" strokeWidth="2.2" />
                </g>
              )}

              {/* Bigotes de gatito o conejito */}
              {(species === 'gatito' || species === 'conejito') && (
                <g stroke="#4A3F35" strokeWidth="2" strokeLinecap="round">
                  <line x1="36" y1="80" x2="52" y2="82" />
                  <line x1="36" y1="88" x2="52" y2="87" />
                  <line x1="144" y1="80" x2="128" y2="82" />
                  <line x1="144" y1="88" x2="128" y2="87" />
                </g>
              )}

              {/* Bracitos */}
              <path
                d={isWaving ? 'M44 92 Q20 66 32 56 Q44 64 48 82' : 'M44 96 Q30 106 38 116 Q48 114 50 102'}
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3"
              />
              <path
                d="M136 96 Q150 106 142 116 Q132 114 130 102"
                fill={meta.bodyColor}
                stroke="#4A3F35"
                strokeWidth="3"
              />

              <ellipse cx="62" cy="86" rx="7" ry="4.5" fill="#FF8FA3" opacity="0.75" />
              <ellipse cx="118" cy="86" rx="7" ry="4.5" fill="#FF8FA3" opacity="0.75" />
              {renderEyes(68, 112, 74)}
              {renderMouth(90, 84)}
            </g>
          )}

          {/* ==============================================================
              ACCESORIOS DEL ARMARIO (Gorritos, Gafas, Bufanda/Pijama)
             ============================================================== */}
          {neck === 'bufanda' && (
            <g stroke="#4A3F35" strokeWidth="2.6">
              <rect x="52" y="98" width="76" height="14" rx="7" fill="#E88B84" />
              <rect x="96" y="106" width="15" height="24" rx="5" fill="#E88B84" />
            </g>
          )}
          {neck === 'collar_perlas' && (
            <g fill="#FFFDF9" stroke="#4A3F35" strokeWidth="2">
              <circle cx="66" cy="103" r="4.5" />
              <circle cx="78" cy="106" r="4.5" />
              <circle cx="90" cy="107" r="5" />
              <circle cx="102" cy="106" r="4.5" />
              <circle cx="114" cy="103" r="4.5" />
            </g>
          )}

          {glasses === 'redondas' && (
            <g stroke="#4A3F35" strokeWidth="2.6" fill="rgba(255,255,255,0.28)">
              <circle cx="68" cy="72" r="12" />
              <circle cx="112" cy="72" r="12" />
              <line x1="80" y1="72" x2="100" y2="72" />
            </g>
          )}
          {glasses === 'corazon' && (
            <g stroke="#D94E64" strokeWidth="2.5" fill="rgba(255, 143, 163, 0.45)">
              <path d="M68 80 C58 72, 59 62, 68 67 C77 62, 78 72, 68 80 Z" />
              <path d="M112 80 C102 72, 103 62, 112 67 C121 62, 122 72, 112 80 Z" />
              <line x1="77" y1="71" x2="103" y2="71" />
            </g>
          )}
          {glasses === 'sol' && (
            <g stroke="#4A3F35" strokeWidth="2.5" fill="#3B322C">
              <rect x="54" y="64" width="28" height="15" rx="4" />
              <rect x="98" y="64" width="28" height="15" rx="4" />
              <line x1="82" y1="70" x2="98" y2="70" />
            </g>
          )}

          {hat === 'rana' && (
            <g stroke="#4A3F35" strokeWidth="2.6">
              <path d="M54 50 Q90 30 126 50 Z" fill="#88C9A1" />
              <circle cx="70" cy="36" r="9" fill="#88C9A1" />
              <circle cx="70" cy="36" r="3.5" fill="#4A3F35" />
              <circle cx="110" cy="36" r="9" fill="#88C9A1" />
              <circle cx="110" cy="36" r="3.5" fill="#4A3F35" />
            </g>
          )}
          {hat === 'corona_flores' && (
            <g stroke="#4A3F35" strokeWidth="2.2">
              <circle cx="64" cy="46" r="7.5" fill="#FFB5C2" />
              <circle cx="81" cy="42" r="7.5" fill="#FFE066" />
              <circle cx="99" cy="42" r="7.5" fill="#A8D5BA" />
              <circle cx="116" cy="46" r="7.5" fill="#C9B8E8" />
            </g>
          )}
          {hat === 'gorro_dormir' && (
            <g stroke="#4A3F35" strokeWidth="2.6">
              <path d="M56 48 Q92 14 132 42 Q108 46 56 48 Z" fill="#9BB8ED" />
              <circle cx="134" cy="42" r="7" fill="#FFFDF9" />
            </g>
          )}
          {hat === 'lazo' && (
            <g stroke="#4A3F35" strokeWidth="2.5" fill="#FF8FA3">
              <polygon points="90,42 70,32 70,52" />
              <polygon points="90,42 110,32 110,52" />
              <circle cx="90" cy="42" r="5.5" fill="#FFE066" />
            </g>
          )}
          {hat === 'boina' && (
            <g stroke="#4A3F35" strokeWidth="2.6" fill="#E88B84">
              <ellipse cx="92" cy="40" rx="34" ry="11" transform="rotate(-8 92 40)" />
              <line x1="90" y1="29" x2="92" y2="23" />
            </g>
          )}

          {/* Manchitas de barro orgánicas que desaparecen poco a poco al frotar con la esponja */}
          {effectiveMudOpacity > 0.05 && (
            <g fill="#7F5539" opacity={effectiveMudOpacity * 0.78}>
              <path d="M54 114 Q62 108 66 116 Q60 124 52 120 Z" />
              <circle cx="68" cy="124" r="4" />
              <path d="M108 108 Q118 104 120 114 Q112 120 106 114 Z" />
              <circle cx="102" cy="64" r="4.5" />
              <circle cx="72" cy="96" r="3.5" />
            </g>
          )}

          {/* Estrellitas de limpieza cuando termina el baño */}
          {isShakingClean && (
            <g fontSize="18">
              <text x="24" y="54">✨</text>
              <text x="140" y="52">✨</text>
              <text x="84" y="22">🌟</text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
