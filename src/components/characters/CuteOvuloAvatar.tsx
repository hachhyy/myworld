import React from 'react';
import { CyclePhase } from '../../store/useWorldStore';

interface CuteOvuloAvatarProps {
  phase: CyclePhase;
  size?: number;
  onClick?: () => void;
}

/**
 * Personaje ilustrado "Óvulo Cute": redondito, rosita/crema, con bracitos expresivos, coloretes y vestuario por fase
 */
export const CuteOvuloAvatar: React.FC<CuteOvuloAvatarProps> = ({
  phase,
  size = 130,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size }}
      className="relative select-none cursor-pointer animate-float-slow"
    >
      <svg viewBox="0 0 160 160" className="w-full h-full overflow-visible">
        {/* Halo exterior suave celular */}
        <circle
          cx="80"
          cy="84"
          r="56"
          fill="rgba(255, 194, 209, 0.32)"
          stroke="#E88B84"
          strokeWidth="2.2"
          strokeDasharray="6 5"
        />

        {/* Cuerpo redondito rosita/crema */}
        <circle
          cx="80"
          cy="84"
          r="44"
          fill="#FFD6E0"
          stroke="#4A3F35"
          strokeWidth="3.2"
        />
        <circle cx="66" cy="66" r="10" fill="rgba(255, 255, 255, 0.55)" />

        {/* Vestuario Fase 1: Menstruación -> Mantita suave y bolsa de agua caliente en la barriga */}
        {phase === 'menstruacion' && (
          <g>
            {/* Mantita por los hombros */}
            <path
              d="M34 86 Q80 102 126 86 C126 116, 106 130, 80 130 C54 130, 34 116, 34 86 Z"
              fill="#F6B89E"
              stroke="#4A3F35"
              strokeWidth="2.8"
            />
            {/* Bolsa de agua caliente con corazoncito */}
            <rect
              x="64"
              y="92"
              width="32"
              height="28"
              rx="9"
              fill="#E86F68"
              stroke="#4A3F35"
              strokeWidth="2.5"
            />
            <rect
              x="74"
              y="85"
              width="12"
              height="7"
              rx="2"
              fill="#E86F68"
              stroke="#4A3F35"
              strokeWidth="2.2"
            />
            <path
              d="M80 112 C74 106, 72 100, 77 100 C79 100, 80 102, 80 102 C80 102, 81 100, 83 100 C88 100, 86 106, 80 112 Z"
              fill="#FFFDF9"
            />
          </g>
        )}

        {/* Vestuario Fase 2: Folicular -> Flor alegre en la cabeza */}
        {phase === 'folicular' && (
          <g stroke="#4A3F35" strokeWidth="2.2">
            <line x1="80" y1="40" x2="80" y2="24" strokeWidth="3" />
            <path d="M80 32 Q94 26 90 36 Z" fill="#A8D5BA" />
            <circle cx="72" cy="20" r="6" fill="#FFB5C2" />
            <circle cx="88" cy="20" r="6" fill="#FFB5C2" />
            <circle cx="80" cy="12" r="6" fill="#FFB5C2" />
            <circle cx="80" cy="26" r="6" fill="#FFB5C2" />
            <circle cx="80" cy="19" r="5" fill="#FFE066" />
          </g>
        )}

        {/* Vestuario Fase 4: Lútea -> Gorrito de dormir y taza de té calentita */}
        {phase === 'lutea' && (
          <g stroke="#4A3F35" strokeWidth="2.6">
            <path d="M46 52 Q84 14 124 44 Q96 48 46 52 Z" fill="#C9B8E8" />
            <circle cx="126" cy="44" r="7" fill="#FFFDF9" />
          </g>
        )}

        {/* Bracitos expresivos */}
        <g stroke="#4A3F35" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M36 84 Q18 72 24 60" />
          <path d="M124 84 Q142 72 136 60" />
        </g>

        {/* Coloretes grandes y tiernos */}
        <ellipse cx="56" cy="84" rx="8" ry="5" fill="#FF758F" opacity="0.75" />
        <ellipse cx="104" cy="84" rx="8" ry="5" fill="#FF758F" opacity="0.75" />

        {/* Ojitos y boquita */}
        {phase === 'ovulacion' ? (
          // En Ovulación lleva gafas de sol brillantes y estrellitas
          <g>
            <g stroke="#4A3F35" strokeWidth="2.6" fill="#3D314A">
              <rect x="48" y="64" width="27" height="16" rx="5" />
              <rect x="85" y="64" width="27" height="16" rx="5" />
              <line x1="75" y1="71" x2="85" y2="71" />
              <line x1="53" y1="68" x2="60" y2="76" stroke="#FFFDF9" strokeWidth="2" />
              <line x1="90" y1="68" x2="97" y2="76" stroke="#FFFDF9" strokeWidth="2" />
            </g>
            {/* Estrellitas brillantes alrededor */}
            <text x="18" y="42" fontSize="18">✨</text>
            <text x="126" y="44" fontSize="18">🌟</text>
            <text x="128" y="118" fontSize="16">✨</text>
          </g>
        ) : (
          <g>
            <circle cx="64" cy="74" r="5" fill="#4A3F35" />
            <circle cx="62" cy="72" r="2" fill="#FFFDF9" />
            <circle cx="96" cy="74" r="5" fill="#4A3F35" />
            <circle cx="94" cy="72" r="2" fill="#FFFDF9" />
          </g>
        )}

        {/* Sonrisa tierna */}
        <path
          d={phase === 'menstruacion' ? 'M74 84 Q80 88 86 84' : 'M72 82 Q80 91 88 82'}
          stroke="#4A3F35"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />

        {/* Taza de té en fase lútea */}
        {phase === 'lutea' && (
          <g stroke="#4A3F35" strokeWidth="2.4">
            <rect x="92" y="96" width="24" height="20" rx="5" fill="#FFFDF9" />
            <path d="M116 100 Q124 100 124 106 Q124 112 116 112" fill="none" />
            <path d="M100 90 Q102 84 98 80" fill="none" stroke="#E88B84" strokeWidth="2" />
            <path d="M108 90 Q110 84 106 80" fill="none" stroke="#E88B84" strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  );
};
