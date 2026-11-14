import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { BuildingId, useWorldStore } from '../store/useWorldStore';
import { SolarEnvironment } from '../utils/solarAndTime';
import { soundEngine } from '../utils/soundAndHaptics';

interface Planet3DSceneProps {
  solar: SolarEnvironment;
  hasUnreadDiary: boolean;
  onBuildingSelect: (building: BuildingId) => void;
}

// Radios esféricos exactos estilo Animal Crossing / Super Mario Galaxy
const R_OCEAN = 2.0;      // Capa 1: Esfera base de océano/río cristalino (#4FC3F7)
const R_SAND = 2.03;      // Capa 2A: Orilla suave de arena crema (#F9E4B7)
const R_MEADOW = 2.06;    // Capa 2B: Superficie de pradera verde menta luminosa (#7ED992)
const R_TRAIN = 2.065;    // Circuito ferroviario continuo sobre franja despejada

// Distribución armónica de los 7 edificios:
// - 1 en el Polo Norte suave (Luna)
// - 3 en el Hemisferio Norte a 120° entre sí (Casita, Correos, Deseos)
// - 3 en el Hemisferio Sur a 120° entre sí (Cine, Hucha, Faro junto a la orilla)
export const BUILDING_COORDS: Record<
  Exclude<BuildingId, null>,
  { lat: number; lon: number; scale: number }
> = {
  luna: { lat: 72, lon: 0, scale: 1.12 },
  casita: { lat: 34, lon: 0, scale: 1.16 },
  correos: { lat: 34, lon: 120, scale: 1.14 },
  deseos: { lat: 34, lon: -120, scale: 1.14 },
  cine: { lat: -32, lon: 0, scale: 1.16 },
  hucha: { lat: -32, lon: 120, scale: 1.14 },
  viajes: { lat: -21, lon: -120, scale: 1.15 },
};

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function latLonToUnitVector(latDeg: number, lonDeg: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon)
  ).normalize();
}

// Función analítica C² ultra-suave (Cero picos dentados, cero grietas, normales esféricas suaves)
function evaluateSmoothPlanetSurface(unitDir: THREE.Vector3): {
  radius: number;
  isWater: boolean;
  isSand: boolean;
  color: THREE.Color;
} {
  const lat = Math.asin(THREE.MathUtils.clamp(unitDir.y, -1, 1)); // [-pi/2, pi/2]
  const lon = Math.atan2(unitDir.x, unitDir.z); // [-pi, pi]
  const latDeg = THREE.MathUtils.radToDeg(lat);
  const lonDeg = THREE.MathUtils.radToDeg(lon);

  // 1. Canal ecuatorial cristalino con ondas muy suaves
  const riverCenterDeg = 3.2 * Math.sin(lon * 2.0);
  const distToEquatorRiver = Math.abs(latDeg - riverCenterDeg);

  // 2. Pequeña cala/bahía turquesa en el sur (lat ~ -55°, lon entre -26° y +26°) para el puente de madera del tren
  const dLatLagoon = (latDeg - -55) / 11;
  const dLonLagoon = lonDeg / 26;
  const lagoonDist = Math.hypot(dLatLagoon, dLonLagoon);

  // Factor de cercanía al agua: 0 en agua profunda, 1 en pradera interior
  const riverLandFactor = smoothstep(10.5, 19.5, distToEquatorRiver);
  const lagoonLandFactor = smoothstep(0.75, 1.28, lagoonDist);
  const landFactor = Math.min(riverLandFactor, lagoonLandFactor);

  // Ondulación orgánica imperceptible y redonda en la pradera (máx ±0.006 para silueta 100% redonda)
  const gentleMeadowWave =
    0.005 * Math.sin(unitDir.x * 3.0 + unitDir.z * 2.5) * Math.cos(unitDir.y * 3.0);

  // Interpolación suave de radio:
  // En el agua baja suavemente a 1.965 (bajo la esfera de océano R=2.00)
  // En la costa pasa por R_SAND (2.03) y sube con bisel redondo a R_MEADOW (2.06)
  const underwaterRadius = 1.965;
  const radius =
    underwaterRadius +
    (R_MEADOW - underwaterRadius) * smoothstep(0.0, 1.0, landFactor) +
    gentleMeadowWave * smoothstep(0.6, 1.0, landFactor);

  const isWater = radius <= R_OCEAN + 0.004;
  const isSand = !isWater && landFactor < 0.72;

  // Color limpio y luminoso estilo Nintendo (Arena crema #F9E4B7 -> Pradera menta #7ED992)
  const sandColor = new THREE.Color('#F9E4B7');
  const meadowColor = new THREE.Color('#7ED992');
  const meadowHighlight = new THREE.Color('#8CE39E');

  const grassTone = meadowColor
    .clone()
    .lerp(meadowHighlight, THREE.MathUtils.clamp((gentleMeadowWave + 0.005) * 80, 0, 1));

  const colorBlend = smoothstep(0.28, 0.78, landFactor);
  const color = sandColor.clone().lerp(grassTone, colorBlend);

  return {
    radius,
    isWater,
    isSand,
    color,
  };
}

// Transformación exacta sobre la superficie del terreno (garantiza que length === R_terreno siempre)
function getSurfaceTransform(latDeg: number, lonDeg: number, radialOffset = 0) {
  const unit = latLonToUnitVector(latDeg, lonDeg);
  const surface = evaluateSmoothPlanetSurface(unit);
  const exactRadius = (surface.isWater ? R_OCEAN : surface.radius) + radialOffset;
  const pos = unit.clone().multiplyScalar(exactRadius);
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, unit);
  return {
    position: [pos.x, pos.y, pos.z] as [number, number, number],
    quaternion: quat,
    vector: pos,
    normal: unit,
    surface,
    exactRadius,
  };
}

// Zócalo discreto de piedra crema del mismo ancho que el edificio, hundido 0.03 unidades en la hierba
const DiscreetStonePlinth: React.FC<{ width?: number; depth?: number; round?: boolean }> = ({
  width = 0.34,
  depth = 0.32,
  round = false,
}) => (
  <mesh position={[0, 0.0, 0]}>
    {round ? (
      <cylinderGeometry args={[width * 0.52, width * 0.55, 0.06, 24]} />
    ) : (
      <boxGeometry args={[width, 0.06, depth]} />
    )}
    <meshStandardMaterial color="#F5E6C8" roughness={0.82} />
  </mesh>
);

// 1. LA CASITA: Cabaña de paredes crema, tejado rojo coral a dos aguas, chimenea con pufs de humo blanco y ventanitas iluminadas
const CasitaBuilding: React.FC<{ onSelect: () => void }> = ({ onSelect }) => {
  const smoke1Ref = useRef<THREE.Mesh>(null);
  const smoke2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (smoke1Ref.current) {
      smoke1Ref.current.position.y = 0.48 + ((t * 0.08) % 0.12);
      const s1 = 1 + Math.sin(t * 3) * 0.12;
      smoke1Ref.current.scale.set(s1, s1, s1);
    }
    if (smoke2Ref.current) {
      smoke2Ref.current.position.y = 0.55 + (((t + 0.7) * 0.08) % 0.12);
      const s2 = 0.85 + Math.cos(t * 3) * 0.12;
      smoke2Ref.current.scale.set(s2, s2, s2);
    }
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <DiscreetStonePlinth width={0.38} depth={0.34} />
      <pointLight position={[0, 0.24, 0.22]} color="#FFD166" intensity={0.75} distance={1.1} />

      {/* Cuerpo crema de la cabaña */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.34, 0.26, 0.28]} />
        <meshStandardMaterial color="#FFF5E4" roughness={0.75} />
      </mesh>

      {/* Tejado rojo coral a dos aguas */}
      <mesh position={[0, 0.36, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.31, 0.24, 4]} />
        <meshStandardMaterial color="#E86F52" roughness={0.68} />
      </mesh>

      {/* Chimenea de ladrillo con pufs de humo blanco */}
      <mesh position={[0.1, 0.4, -0.05]}>
        <boxGeometry args={[0.065, 0.16, 0.065]} />
        <meshStandardMaterial color="#C85A53" />
      </mesh>
      <mesh ref={smoke1Ref} position={[0.1, 0.5, -0.05]}>
        <sphereGeometry args={[0.032, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </mesh>
      <mesh ref={smoke2Ref} position={[0.12, 0.57, -0.04]}>
        <sphereGeometry args={[0.024, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </mesh>

      {/* Puerta redondeada de madera y porche */}
      <mesh position={[0, 0.11, 0.142]}>
        <boxGeometry args={[0.085, 0.15, 0.015]} />
        <meshStandardMaterial color="#9C6644" />
      </mesh>
      <mesh position={[0, 0.2, 0.165]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.14, 0.025, 0.06]} />
        <meshStandardMaterial color="#D4A373" />
      </mesh>

      {/* Ventanitas iluminadas con luz dorada */}
      {[-0.1, 0.1].map((x, idx) => (
        <mesh key={idx} position={[x, 0.16, 0.142]}>
          <boxGeometry args={[0.068, 0.072, 0.015]} />
          <meshStandardMaterial color="#FFF3B0" emissive="#FFB703" emissiveIntensity={0.85} />
        </mesh>
      ))}
    </group>
  );
};

// 2. EL BUZÓN / CORREOS: Cabañita postal con buzón redondeado y carta blanca con corazón asomando
const CorreosBuilding: React.FC<{ hasUnread: boolean; onSelect: () => void }> = ({
  hasUnread,
  onSelect,
}) => {
  const letterRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (letterRef.current) {
      letterRef.current.position.y = 0.25 + Math.sin(clock.getElapsedTime() * 4) * 0.015;
    }
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <DiscreetStonePlinth width={0.36} depth={0.32} />
      <pointLight position={[0, 0.24, 0.2]} color="#FFE066" intensity={0.6} distance={1.0} />

      {/* Cabañita postal azul pastel y crema */}
      <mesh position={[-0.04, 0.15, 0]}>
        <boxGeometry args={[0.26, 0.24, 0.24]} />
        <meshStandardMaterial color="#8ECAE6" roughness={0.7} />
      </mesh>
      <mesh position={[-0.04, 0.32, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.24, 0.18, 4]} />
        <meshStandardMaterial color="#457B9D" roughness={0.7} />
      </mesh>
      <mesh position={[-0.04, 0.15, 0.122]}>
        <boxGeometry args={[0.13, 0.09, 0.015]} />
        <meshStandardMaterial color="#FFF3B0" emissive="#FFB703" emissiveIntensity={0.8} />
      </mesh>

      {/* Buzón redondeado rojo coral al lado */}
      <group position={[0.13, 0, 0.04]}>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.02, 0.024, 0.14, 12]} />
          <meshStandardMaterial color="#9C6644" />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.11, 0.1, 0.13]} />
          <meshStandardMaterial color="#E63946" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.13, 16]} />
          <meshStandardMaterial color="#E63946" roughness={0.6} />
        </mesh>

        {/* Carta blanca con corazón rosa asomando */}
        <group ref={letterRef} position={[0, 0.25, 0.05]} rotation={[0.25, 0, -0.1]}>
          <mesh>
            <boxGeometry args={[0.09, 0.065, 0.012]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0.005, 0.008]}>
            <sphereGeometry args={[0.018, 10, 10]} />
            <meshStandardMaterial
              color="#FF4D6D"
              emissive="#FF4D6D"
              emissiveIntensity={hasUnread ? 0.9 : 0.3}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// 3. EL CINE RETRO: Edificio pastel con marquesina iluminada de bombillas cálidas y cubo de palomitas arriba
const CineBuilding: React.FC<{ onSelect: () => void }> = ({ onSelect }) => {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <DiscreetStonePlinth width={0.38} depth={0.34} />
      <pointLight position={[0, 0.28, 0.24]} color="#FFD166" intensity={0.85} distance={1.15} />

      {/* Edificio de cine pastel coral y crema */}
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[0.34, 0.28, 0.26]} />
        <meshStandardMaterial color="#F28482" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <boxGeometry args={[0.36, 0.05, 0.28]} />
        <meshStandardMaterial color="#F6BD60" />
      </mesh>

      {/* Marquesina iluminada con bombillas cálidas */}
      <mesh position={[0, 0.24, 0.15]}>
        <boxGeometry args={[0.3, 0.075, 0.05]} />
        <meshStandardMaterial color="#3D2645" />
      </mesh>
      {[-0.11, -0.066, -0.022, 0.022, 0.066, 0.11].map((bx, i) => (
        <mesh key={i} position={[bx, 0.24, 0.18]}>
          <sphereGeometry args={[0.014, 10, 10]} />
          <meshStandardMaterial color="#FFF3B0" emissive="#FFD166" emissiveIntensity={1.3} />
        </mesh>
      ))}

      {/* Alfombra roja y doble puerta */}
      <mesh position={[0, 0.032, 0.16]}>
        <boxGeometry args={[0.12, 0.01, 0.12]} />
        <meshStandardMaterial color="#E63946" />
      </mesh>
      <mesh position={[0, 0.1, 0.132]}>
        <boxGeometry args={[0.11, 0.13, 0.015]} />
        <meshStandardMaterial color="#FFF3B0" emissive="#FFB703" emissiveIntensity={0.65} />
      </mesh>

      {/* Cubo de palomitas arriba en el techo */}
      <group position={[0, 0.42, 0]}>
        <mesh>
          <cylinderGeometry args={[0.075, 0.055, 0.12, 16]} />
          <meshStandardMaterial color="#E63946" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.077, 0.057, 0.05, 16]} />
          <meshStandardMaterial color="#FFFDF9" />
        </mesh>
        {/* Palomitas esponjosas doradas asomando */}
        {[
          [0, 0.07, 0],
          [-0.035, 0.065, 0.02],
          [0.035, 0.065, 0.02],
          [0.02, 0.065, -0.03],
          [-0.025, 0.065, -0.025],
        ].map((p, idx) => (
          <mesh key={idx} position={p as [number, number, number]}>
            <sphereGeometry args={[0.028, 10, 10]} />
            <meshStandardMaterial color="#FFF3B0" roughness={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// 4. EL FARO DE VIAJES: Faro esbelto a rayas rojas y blancas junto a la orilla con haz de luz suave y globo aerostático flotando al lado
const ViajesBuilding: React.FC<{ onSelect: () => void }> = ({ onSelect }) => {
  const beamRef = useRef<THREE.Group>(null);
  const balloonRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beamRef.current) {
      beamRef.current.rotation.y = t * 1.2;
    }
    if (balloonRef.current) {
      balloonRef.current.position.y = 0.46 + Math.sin(t * 2.2) * 0.035;
    }
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <DiscreetStonePlinth width={0.34} round />
      <pointLight position={[0, 0.54, 0]} color="#FFF3B0" intensity={0.9} distance={1.3} />

      {/* Torre esbelta del faro a rayas rojas y blancas */}
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.095, 0.12, 0.16, 20]} />
        <meshStandardMaterial color="#FFFDF9" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.08, 0.095, 0.14, 20]} />
        <meshStandardMaterial color="#E63946" />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.068, 0.08, 0.12, 20]} />
        <meshStandardMaterial color="#FFFDF9" />
      </mesh>

      {/* Linterna superior y cúpula roja */}
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.025, 20]} />
        <meshStandardMaterial color="#2B2D42" />
      </mesh>
      <mesh position={[0, 0.49, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.09, 16]} />
        <meshStandardMaterial color="#FFF3B0" emissive="#FFD166" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, 0.56, 0]}>
        <coneGeometry args={[0.08, 0.09, 20]} />
        <meshStandardMaterial color="#E63946" />
      </mesh>

      {/* Haz de luz giratorio suave */}
      <group ref={beamRef} position={[0, 0.49, 0]}>
        <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.38, 16, 1, true]} />
          <meshBasicMaterial color="#FFF3B0" transparent opacity={0.32} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Globo aerostático adorable flotando justo al lado del faro */}
      <group ref={balloonRef} position={[0.22, 0.46, 0.06]}>
        <mesh position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.095, 18, 18]} />
          <meshStandardMaterial color="#FF9F1C" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.08, 0]} scale={[1.02, 0.45, 1.02]}>
          <sphereGeometry args={[0.095, 18, 12]} />
          <meshStandardMaterial color="#FFBF69" />
        </mesh>
        {/* Cestita de mimbre */}
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[0.045, 0.04, 0.045]} />
          <meshStandardMaterial color="#B07D52" />
        </mesh>
      </group>
    </group>
  );
};

// 5. LA FUENTE DE DESEOS: Fuente redonda de piedra clara con agua azul turquesa y toldo de cafetería
const DeseosBuilding: React.FC<{ hasEmergency: boolean; onSelect: () => void }> = ({
  hasEmergency,
  onSelect,
}) => {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <DiscreetStonePlinth width={0.38} round />
      <pointLight
        position={[0, 0.36, 0]}
        color={hasEmergency ? '#FF4D6D' : '#4FC3F7'}
        intensity={0.75}
        distance={1.0}
      />

      {/* Fuente redonda de piedra clara con agua azul turquesa */}
      <mesh position={[-0.04, 0.07, 0.02]}>
        <cylinderGeometry args={[0.18, 0.2, 0.09, 24]} />
        <meshStandardMaterial color="#F5EBE0" />
      </mesh>
      <mesh position={[-0.04, 0.118, 0.02]}>
        <cylinderGeometry args={[0.155, 0.155, 0.015, 24]} />
        <meshStandardMaterial
          color={hasEmergency ? '#FF758F' : '#4FC3F7'}
          emissive={hasEmergency ? '#FF4D6D' : '#29B6F6'}
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh position={[-0.04, 0.18, 0.02]}>
        <cylinderGeometry args={[0.04, 0.055, 0.14, 16]} />
        <meshStandardMaterial color="#F5EBE0" />
      </mesh>
      <mesh position={[-0.04, 0.28, 0.02]}>
        <sphereGeometry args={[0.045, 14, 14]} />
        <meshStandardMaterial
          color="#FFF3B0"
          emissive={hasEmergency ? '#FF4D6D' : '#FFD166'}
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Toldo de cafetería parisina al lado de la fuente */}
      <group position={[0.12, 0, -0.06]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.22, 10]} />
          <meshStandardMaterial color="#8D5B4C" />
        </mesh>
        <mesh position={[0, 0.23, 0]}>
          <coneGeometry args={[0.11, 0.07, 14]} />
          <meshStandardMaterial color="#FF8FA3" />
        </mesh>
      </group>
    </group>
  );
};

// 6. EL EDIFICIO CERDITO (HUCHA): Edificio rosado adorable con orejitas, morrito de cerdo y moneda dorada arriba
const HuchaBuilding: React.FC<{ onSelect: () => void }> = ({ onSelect }) => {
  const coinRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (coinRef.current) {
      coinRef.current.rotation.y = clock.getElapsedTime() * 1.8;
    }
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <DiscreetStonePlinth width={0.36} round />
      <pointLight position={[0, 0.42, 0.1]} color="#FFD166" intensity={0.65} distance={1.0} />

      {/* Cuerpo redondito rosado */}
      <mesh position={[0, 0.19, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial color="#FFB5C2" roughness={0.55} />
      </mesh>

      {/* Morrito de cerdito */}
      <mesh position={[0, 0.18, 0.165]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.045, 18]} />
        <meshStandardMaterial color="#FF8FA3" />
      </mesh>
      {[-0.022, 0.022].map((nx, idx) => (
        <mesh key={idx} position={[nx, 0.18, 0.19]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshStandardMaterial color="#590D22" />
        </mesh>
      ))}

      {/* Ojitos brillantes */}
      {[-0.065, 0.065].map((ex, idx) => (
        <mesh key={idx} position={[ex, 0.24, 0.15]}>
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshStandardMaterial color="#3D312A" />
        </mesh>
      ))}

      {/* Orejitas */}
      <mesh position={[-0.1, 0.34, 0.04]} rotation={[0, 0, 0.35]}>
        <coneGeometry args={[0.05, 0.1, 12]} />
        <meshStandardMaterial color="#FF8FA3" />
      </mesh>
      <mesh position={[0.1, 0.34, 0.04]} rotation={[0, 0, -0.35]}>
        <coneGeometry args={[0.05, 0.1, 12]} />
        <meshStandardMaterial color="#FF8FA3" />
      </mesh>

      {/* Moneda dorada brillante arriba */}
      <mesh ref={coinRef} position={[0, 0.39, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.022, 20]} />
        <meshStandardMaterial
          color="#FFD166"
          emissive="#FFB703"
          emissiveIntensity={0.8}
          metalness={0.45}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
};

// 7. EL INVERNADERO LUNAR: Cúpula de cristal translúcido azul/menta con flores dentro y luna creciente dorada en el techo
const InvernaderoLunarBuilding: React.FC<{
  sensitiveActive: boolean;
  onSelect: () => void;
}> = ({ sensitiveActive, onSelect }) => {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <DiscreetStonePlinth width={0.38} round />
      <pointLight
        position={[0, 0.3, 0]}
        color={sensitiveActive ? '#FF8FA3' : '#FFE699'}
        intensity={0.85}
        distance={1.1}
      />

      {/* Base circular de piedra clara */}
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.19, 0.2, 0.09, 24]} />
        <meshStandardMaterial color="#F5EBE0" />
      </mesh>

      {/* Flores de colores dentro del invernadero */}
      {[
        { pos: [-0.06, 0.14, 0.04], col: '#FF8FA3' },
        { pos: [0.06, 0.15, 0.03], col: '#FFD166' },
        { pos: [0, 0.16, -0.05], col: '#CDB4DB' },
      ].map((fl, idx) => (
        <group key={idx} position={fl.pos as [number, number, number]}>
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.05, 8]} />
            <meshStandardMaterial color="#52B788" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.032, 10, 10]} />
            <meshStandardMaterial color={fl.col} emissive={fl.col} emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}

      {/* Cúpula de cristal translúcido azul/menta */}
      <mesh position={[0, 0.11, 0]}>
        <sphereGeometry args={[0.185, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={sensitiveActive ? '#FFB5C2' : '#A8E6CF'}
          emissive={sensitiveActive ? '#FF758F' : '#80ED99'}
          emissiveIntensity={0.3}
          transparent
          opacity={0.62}
          roughness={0.15}
        />
      </mesh>

      {/* Luna creciente dorada en el techo */}
      <mesh position={[0, 0.36, 0]} rotation={[0, 0, Math.PI * 0.15]}>
        <torusGeometry args={[0.055, 0.018, 12, 24, Math.PI * 1.45]} />
        <meshStandardMaterial color="#FFE066" emissive="#FFB703" emissiveIntensity={1.1} />
      </mesh>
    </group>
  );
};

// Árboles estilizados anclados exactamente a la superficie (length === R_terreno)
const GroundedStylizedTree: React.FC<{
  lat: number;
  lon: number;
  kind: 'cherry' | 'pine' | 'oak';
  scale?: number;
}> = ({ lat, lon, kind, scale = 1 }) => {
  // Hundido -0.012 para que el tronco nunca flote sobre la esfera
  const { position, quaternion } = useMemo(() => getSurfaceTransform(lat, lon, -0.012), [lat, lon]);
  return (
    <group position={position} quaternion={quaternion} scale={scale}>
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.018, 0.026, 0.12, 10]} />
        <meshStandardMaterial color="#8D5B4C" roughness={0.85} />
      </mesh>
      {kind === 'cherry' && (
        <group>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.075, 14, 14]} />
            <meshStandardMaterial color="#FFB5C2" roughness={0.78} />
          </mesh>
          <mesh position={[0.035, 0.165, 0.025]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color="#FFD6E0" roughness={0.78} />
          </mesh>
        </group>
      )}
      {kind === 'pine' && (
        <group>
          <mesh position={[0, 0.12, 0]}>
            <coneGeometry args={[0.075, 0.13, 12]} />
            <meshStandardMaterial color="#40916C" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.19, 0]}>
            <coneGeometry args={[0.058, 0.11, 12]} />
            <meshStandardMaterial color="#52B788" roughness={0.8} />
          </mesh>
        </group>
      )}
      {kind === 'oak' && (
        <group>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.072, 14, 14]} />
            <meshStandardMaterial color="#52B788" roughness={0.8} />
          </mesh>
          <mesh position={[-0.035, 0.125, 0.02]}>
            <sphereGeometry args={[0.048, 12, 12]} />
            <meshStandardMaterial color="#74C69D" roughness={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Arbustos y flores redondeadas ancladas a R_terreno
const GroundedFlowerBush: React.FC<{ lat: number; lon: number; flowerColor: string }> = ({
  lat,
  lon,
  flowerColor,
}) => {
  const { position, quaternion } = useMemo(() => getSurfaceTransform(lat, lon, -0.008), [lat, lon]);
  return (
    <group position={position} quaternion={quaternion}>
      <mesh position={[0, 0.022, 0]}>
        <sphereGeometry args={[0.036, 12, 12]} />
        <meshStandardMaterial color="#52B788" roughness={0.85} />
      </mesh>
      <mesh position={[0.012, 0.048, 0.01]}>
        <sphereGeometry args={[0.014, 8, 8]} />
        <meshStandardMaterial color={flowerColor} />
      </mesh>
      <mesh position={[-0.014, 0.044, -0.008]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#FFFDF9" />
      </mesh>
    </group>
  );
};

// Caminos finos de piedrecitas crema sobre la hierba + puente curvo sobre el río ecuatorial
const CreamPebblePathsAndBridge: React.FC = () => {
  const pebbles = useMemo(() => {
    const pairs: [Exclude<BuildingId, null>, Exclude<BuildingId, null>][] = [
      ['casita', 'luna'],
      ['correos', 'luna'],
      ['deseos', 'luna'],
      ['casita', 'correos'],
      ['casita', 'deseos'],
      ['cine', 'hucha'],
      ['cine', 'viajes'],
    ];

    const list: { pos: [number, number, number]; quat: THREE.Quaternion; scale: number }[] = [];
    const up = new THREE.Vector3(0, 1, 0);

    for (const [a, b] of pairs) {
      const u1 = latLonToUnitVector(BUILDING_COORDS[a].lat, BUILDING_COORDS[a].lon);
      const u2 = latLonToUnitVector(BUILDING_COORDS[b].lat, BUILDING_COORDS[b].lon);
      const steps = 18;
      for (let i = 3; i <= steps - 3; i++) {
        const t = i / steps;
        const u = new THREE.Vector3().lerpVectors(u1, u2, t).normalize();
        const surf = evaluateSmoothPlanetSurface(u);
        if (surf.isWater) continue;
        const p = u.clone().multiplyScalar(surf.radius + 0.002);
        const q = new THREE.Quaternion().setFromUnitVectors(up, u);
        list.push({
          pos: [p.x, p.y, p.z],
          quat: q,
          scale: i % 2 === 0 ? 1 : 0.78,
        });
      }
    }
    return list;
  }, []);

  // Puente peatonal curvo de madera clara que une La Casita (Norte) con El Cine (Sur) sobre el río
  const riverBridgePlanks = useMemo(() => {
    const u1 = latLonToUnitVector(16, 0);
    const u2 = latLonToUnitVector(-16, 0);
    const steps = 14;
    const list: { pos: [number, number, number]; quat: THREE.Quaternion }[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = new THREE.Vector3().lerpVectors(u1, u2, t).normalize();
      const arch = Math.sin(t * Math.PI) * 0.055;
      const r = R_SAND + arch;
      const p = u.clone().multiplyScalar(r);

      const uNext = new THREE.Vector3()
        .lerpVectors(u1, u2, Math.min(1, t + 0.05))
        .normalize();
      const tangent = uNext.clone().sub(u).normalize();
      const binormal = new THREE.Vector3().crossVectors(u, tangent).normalize();
      const m = new THREE.Matrix4().makeBasis(binormal, u, tangent);
      const quat = new THREE.Quaternion().setFromRotationMatrix(m);
      list.push({ pos: [p.x, p.y, p.z], quat });
    }
    return list;
  }, []);

  return (
    <group>
      {pebbles.map((st, idx) => (
        <mesh key={idx} position={st.pos} quaternion={st.quat} scale={[st.scale, 1, st.scale]}>
          <cylinderGeometry args={[0.028, 0.032, 0.008, 12]} />
          <meshStandardMaterial color="#F9E4B7" roughness={0.85} />
        </mesh>
      ))}
      {riverBridgePlanks.map((pl, idx) => (
        <group key={idx} position={pl.pos} quaternion={pl.quat}>
          <mesh>
            <boxGeometry args={[0.11, 0.014, 0.038]} />
            <meshStandardMaterial color="#E6C29F" roughness={0.8} />
          </mesh>
          <mesh position={[-0.048, 0.02, 0]}>
            <boxGeometry args={[0.01, 0.032, 0.01]} />
            <meshStandardMaterial color="#B07D52" />
          </mesh>
          <mesh position={[0.048, 0.02, 0]}>
            <boxGeometry args={[0.01, 0.032, 0.01]} />
            <meshStandardMaterial color="#B07D52" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// 4. CIRCUITO FERROVIARIO CONTINUO (TorusGeometry fino a radio constante R = 2.065 en franja despejada lat = -55°)
const ContinuousRailwayAndTrain: React.FC = () => {
  const trainLatDeg = -55;
  const trainLatRad = THREE.MathUtils.degToRad(trainLatDeg);
  const ringY = R_TRAIN * Math.sin(trainLatRad);
  const ringRadius = R_TRAIN * Math.cos(trainLatRad);

  const locoRef = useRef<THREE.Group>(null);
  const wagon1Ref = useRef<THREE.Group>(null);
  const wagon2Ref = useRef<THREE.Group>(null);

  // Traviesas pequeñas uniformes + puente curvo de madera clara cuando pasa sobre la cala de agua (lon entre -25° y +25°)
  const { sleepers, bridgeSegments } = useMemo(() => {
    const sleeperCount = 72;
    const sList: { pos: [number, number, number]; quat: THREE.Quaternion }[] = [];
    const bList: { pos: [number, number, number]; quat: THREE.Quaternion }[] = [];

    for (let i = 0; i < sleeperCount; i++) {
      const lonRad = (i / sleeperCount) * Math.PI * 2 - Math.PI;
      const lonDeg = THREE.MathUtils.radToDeg(lonRad);

      const getCirclePoint = (angle: number) =>
        new THREE.Vector3(
          ringRadius * Math.sin(angle),
          ringY,
          ringRadius * Math.cos(angle)
        );

      const p = getCirclePoint(lonRad);
      const pNext = getCirclePoint(lonRad + 0.04);
      const normal = p.clone().normalize();
      const tangent = pNext.clone().sub(p).normalize();
      const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      const m = new THREE.Matrix4().makeBasis(binormal, normal, tangent);
      const quat = new THREE.Quaternion().setFromRotationMatrix(m);

      sList.push({ pos: [p.x, p.y, p.z], quat });

      if (Math.abs(lonDeg) <= 27) {
        bList.push({ pos: [p.x, p.y, p.z], quat });
      }
    }
    return { sleepers: sList, bridgeSegments: bList };
  }, [ringRadius, ringY]);

  useFrame(({ clock }) => {
    const baseAngle = clock.getElapsedTime() * 0.42;

    const placeCarriageOnRing = (group: THREE.Group | null, lonAngle: number) => {
      if (!group) return;
      const p = new THREE.Vector3(
        ringRadius * Math.sin(lonAngle),
        ringY,
        ringRadius * Math.cos(lonAngle)
      );
      const pAhead = new THREE.Vector3(
        ringRadius * Math.sin(lonAngle + 0.03),
        ringY,
        ringRadius * Math.cos(lonAngle + 0.03)
      );
      const normal = p.clone().normalize();
      const tangent = pAhead.clone().sub(p).normalize();
      const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      const m = new THREE.Matrix4().makeBasis(binormal, normal, tangent);
      group.position.copy(p);
      group.quaternion.setFromRotationMatrix(m);
    };

    placeCarriageOnRing(locoRef.current, baseAngle);
    placeCarriageOnRing(wagon1Ref.current, baseAngle - 0.14);
    placeCarriageOnRing(wagon2Ref.current, baseAngle - 0.27);
  });

  return (
    <group>
      {/* Dos raíles plateados finos continuos (TorusGeometry apoyado a radio constante R = 2.065) */}
      <mesh position={[0, ringY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringRadius - 0.022, 0.0055, 10, 96]} />
        <meshStandardMaterial color="#DCE3EA" metalness={0.55} roughness={0.3} />
      </mesh>
      <mesh position={[0, ringY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringRadius + 0.022, 0.0055, 10, 96]} />
        <meshStandardMaterial color="#DCE3EA" metalness={0.55} roughness={0.3} />
      </mesh>

      {/* Traviesas pequeñas uniformes de madera */}
      {sleepers.map((s, idx) => (
        <mesh key={idx} position={s.pos} quaternion={s.quat}>
          <boxGeometry args={[0.072, 0.006, 0.018]} />
          <meshStandardMaterial color="#9C6644" roughness={0.85} />
        </mesh>
      ))}

      {/* Puente curvo continuo de madera clara cuando la vía cruza sobre el agua azul */}
      {bridgeSegments.map((b, idx) => (
        <group key={idx} position={b.pos} quaternion={b.quat}>
          <mesh position={[0, -0.012, 0]}>
            <boxGeometry args={[0.12, 0.016, 0.08]} />
            <meshStandardMaterial color="#E6C29F" roughness={0.78} />
          </mesh>
          <mesh position={[-0.052, 0.012, 0]}>
            <boxGeometry args={[0.008, 0.028, 0.075]} />
            <meshStandardMaterial color="#C68B59" />
          </mesh>
          <mesh position={[0.052, 0.012, 0]}>
            <boxGeometry args={[0.008, 0.028, 0.075]} />
            <meshStandardMaterial color="#C68B59" />
          </mesh>
          {idx % 3 === 0 && (
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.012, 0.016, 0.08, 8]} />
              <meshStandardMaterial color="#B07D52" />
            </mesh>
          )}
        </group>
      ))}

      {/* Locomotora roja/pastel */}
      <group ref={locoRef}>
        <mesh position={[0, 0.042, 0]}>
          <boxGeometry args={[0.072, 0.06, 0.12]} />
          <meshStandardMaterial color="#E76F51" />
        </mesh>
        <mesh position={[0, 0.08, -0.022]}>
          <boxGeometry args={[0.068, 0.05, 0.06]} />
          <meshStandardMaterial color="#FFD166" />
        </mesh>
        <mesh position={[0, 0.085, 0.032]}>
          <cylinderGeometry args={[0.015, 0.012, 0.045, 10]} />
          <meshStandardMaterial color="#3D312A" />
        </mesh>
        <mesh position={[0, 0.122, 0.028]}>
          <sphereGeometry args={[0.02, 10, 10]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Vagoncito 1 (Azul menta pastel) */}
      <group ref={wagon1Ref}>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.066, 0.054, 0.1]} />
          <meshStandardMaterial color="#4EA8DE" />
        </mesh>
        <mesh position={[0, 0.072, 0]}>
          <boxGeometry args={[0.07, 0.014, 0.104]} />
          <meshStandardMaterial color="#FFFDF9" />
        </mesh>
      </group>

      {/* Vagoncito 2 (Rosa coral pastel) */}
      <group ref={wagon2Ref}>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.066, 0.054, 0.1]} />
          <meshStandardMaterial color="#FF8FA3" />
        </mesh>
        <mesh position={[0, 0.072, 0]}>
          <boxGeometry args={[0.07, 0.014, 0.104]} />
          <meshStandardMaterial color="#FFFDF9" />
        </mesh>
      </group>
    </group>
  );
};

// Nubes esponjosas orbitando suavemente a altura limpia
const FluffyCloudsOrbit: React.FC = () => {
  const cloudsRef = useRef<THREE.Group>(null);
  const cloudCoords = useMemo(
    () => [
      { lat: 22, lon: -55, r: R_MEADOW + 0.52, s: 0.9 },
      { lat: -15, lon: 65, r: R_MEADOW + 0.56, s: 0.85 },
      { lat: 48, lon: 155, r: R_MEADOW + 0.5, s: 0.8 },
      { lat: -42, lon: -165, r: R_MEADOW + 0.54, s: 0.88 },
    ],
    []
  );

  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group ref={cloudsRef}>
      {cloudCoords.map((c, idx) => {
        const u = latLonToUnitVector(c.lat, c.lon);
        const pos = u.clone().multiplyScalar(c.r);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), u);
        return (
          <group key={idx} position={[pos.x, pos.y, pos.z]} quaternion={q} scale={c.s}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
            </mesh>
            <mesh position={[0.08, -0.01, 0.01]}>
              <sphereGeometry args={[0.085, 14, 14]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
            </mesh>
            <mesh position={[-0.08, -0.01, -0.01]}>
              <sphereGeometry args={[0.08, 14, 14]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// Malla Esférica Suave en Capas (Cero flatShading, cero picos dentados, SphereGeometry de alta definición)
const SmoothLayeredPlanetMesh: React.FC = () => {
  const continentGeo = useMemo(() => {
    // SphereGeometry(1, 128, 96) con sombreado 100% suave y normales analíticas esféricas
    const geo = new THREE.SphereGeometry(1, 128, 96);
    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const colors = new Float32Array(posAttr.count * 3);
    const u = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      u.fromBufferAttribute(posAttr, i).normalize();
      const { radius, color } = evaluateSmoothPlanetSurface(u);
      posAttr.setXYZ(i, u.x * radius, u.y * radius, u.z * radius);
      // Normal esférica radial suave para eliminar cualquier grieta o sombra negra en la costa
      normAttr.setXYZ(i, u.x, u.y, u.z);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  return (
    <group>
      {/* CAPA 1: Esfera Base de Océano / Río Cristalino (R = 2.0, #4FC3F7 con brillo especular suave) */}
      <mesh>
        <sphereGeometry args={[R_OCEAN, 64, 64]} />
        <meshStandardMaterial
          color="#4FC3F7"
          roughness={0.2}
          metalness={0.06}
        />
      </mesh>

      {/* CAPA 2: Continentes de Arena Crema (#F9E4B7) y Pradera Verde Menta Luminosa (#7ED992) */}
      <mesh geometry={continentGeo}>
        <meshStandardMaterial
          vertexColors
          roughness={0.78}
          metalness={0.02}
        />
      </mesh>
    </group>
  );
};

const PlanetWorldGroup: React.FC<{
  solar: SolarEnvironment;
  hasUnreadDiary: boolean;
  hasEmergencyCraving: boolean;
  sensitiveLunarActive: boolean;
  onBuildingSelect: (b: BuildingId) => void;
}> = ({
  hasUnreadDiary,
  hasEmergencyCraving,
  sensitiveLunarActive,
  onBuildingSelect,
}) => {
  const planetGroupRef = useRef<THREE.Group>(null);
  const [zoomTarget, setZoomTarget] = useState<BuildingId>(null);

  // Anclaje hundido -0.03 en el terreno verde como exige la especificación
  const bTransforms = useMemo(() => {
    return {
      casita: getSurfaceTransform(BUILDING_COORDS.casita.lat, BUILDING_COORDS.casita.lon, -0.02),
      correos: getSurfaceTransform(BUILDING_COORDS.correos.lat, BUILDING_COORDS.correos.lon, -0.02),
      cine: getSurfaceTransform(BUILDING_COORDS.cine.lat, BUILDING_COORDS.cine.lon, -0.02),
      viajes: getSurfaceTransform(BUILDING_COORDS.viajes.lat, BUILDING_COORDS.viajes.lon, -0.02),
      deseos: getSurfaceTransform(BUILDING_COORDS.deseos.lat, BUILDING_COORDS.deseos.lon, -0.02),
      hucha: getSurfaceTransform(BUILDING_COORDS.hucha.lat, BUILDING_COORDS.hucha.lon, -0.02),
      luna: getSurfaceTransform(BUILDING_COORDS.luna.lat, BUILDING_COORDS.luna.lon, -0.02),
    };
  }, []);

  // Todos los árboles y arbustos en tierra firme verificada (lejos de edificios y de la vía en lat = -55°)
  const trees = useMemo(
    () => [
      { lat: 52, lon: 55, kind: 'cherry' as const, scale: 1.0 },
      { lat: 50, lon: -58, kind: 'oak' as const, scale: 1.0 },
      { lat: 48, lon: 180, kind: 'pine' as const, scale: 1.05 },
      { lat: 24, lon: 52, kind: 'oak' as const, scale: 0.95 },
      { lat: 25, lon: -52, kind: 'cherry' as const, scale: 0.95 },
      { lat: 26, lon: 175, kind: 'pine' as const, scale: 0.95 },
      { lat: -24, lon: 58, kind: 'cherry' as const, scale: 1.0 },
      { lat: -26, lon: -58, kind: 'oak' as const, scale: 0.95 },
      { lat: -36, lon: 175, kind: 'pine' as const, scale: 1.0 },
      { lat: -72, lon: 35, kind: 'pine' as const, scale: 0.95 },
      { lat: -72, lon: -85, kind: 'oak' as const, scale: 0.95 },
      { lat: -70, lon: 155, kind: 'cherry' as const, scale: 0.95 },
    ],
    []
  );

  const bushes = useMemo(
    () => [
      { lat: 38, lon: 28, color: '#FF8FA3' },
      { lat: 38, lon: -28, color: '#FFD166' },
      { lat: 42, lon: 92, color: '#CDB4DB' },
      { lat: -28, lon: 28, color: '#FF8FA3' },
      { lat: -28, lon: -28, color: '#FFD166' },
      { lat: -35, lon: 88, color: '#FF8FA3' },
    ],
    []
  );

  const handleSelect = (b: BuildingId) => {
    soundEngine.playPop();
    setZoomTarget(b);
    setTimeout(() => {
      onBuildingSelect(b);
      setZoomTarget(null);
    }, 320);
  };

  useFrame((_, delta) => {
    if (!planetGroupRef.current) return;
    if (!zoomTarget) {
      planetGroupRef.current.rotation.y += delta * 0.06;
      planetGroupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.12);
    } else {
      planetGroupRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.14);
    }
  });

  return (
    <group ref={planetGroupRef}>
      <SmoothLayeredPlanetMesh />
      <CreamPebblePathsAndBridge />
      <ContinuousRailwayAndTrain />
      <FluffyCloudsOrbit />

      {trees.map((t, i) => (
        <GroundedStylizedTree key={i} lat={t.lat} lon={t.lon} kind={t.kind} scale={t.scale} />
      ))}

      {bushes.map((b, i) => (
        <GroundedFlowerBush key={i} lat={b.lat} lon={b.lon} flowerColor={b.color} />
      ))}

      {/* LOS 7 EDIFICIOS CON ZÓCALO DISCRETO DE PIEDRA CREMA HUNDIDO EN EL TERRENO */}
      <group
        position={bTransforms.casita.position}
        quaternion={bTransforms.casita.quaternion}
        scale={BUILDING_COORDS.casita.scale}
      >
        <CasitaBuilding onSelect={() => handleSelect('casita')} />
      </group>

      <group
        position={bTransforms.correos.position}
        quaternion={bTransforms.correos.quaternion}
        scale={BUILDING_COORDS.correos.scale}
      >
        <CorreosBuilding hasUnread={hasUnreadDiary} onSelect={() => handleSelect('correos')} />
      </group>

      <group
        position={bTransforms.cine.position}
        quaternion={bTransforms.cine.quaternion}
        scale={BUILDING_COORDS.cine.scale}
      >
        <CineBuilding onSelect={() => handleSelect('cine')} />
      </group>

      <group
        position={bTransforms.viajes.position}
        quaternion={bTransforms.viajes.quaternion}
        scale={BUILDING_COORDS.viajes.scale}
      >
        <ViajesBuilding onSelect={() => handleSelect('viajes')} />
      </group>

      <group
        position={bTransforms.deseos.position}
        quaternion={bTransforms.deseos.quaternion}
        scale={BUILDING_COORDS.deseos.scale}
      >
        <DeseosBuilding hasEmergency={hasEmergencyCraving} onSelect={() => handleSelect('deseos')} />
      </group>

      <group
        position={bTransforms.hucha.position}
        quaternion={bTransforms.hucha.quaternion}
        scale={BUILDING_COORDS.hucha.scale}
      >
        <HuchaBuilding onSelect={() => handleSelect('hucha')} />
      </group>

      <group
        position={bTransforms.luna.position}
        quaternion={bTransforms.luna.quaternion}
        scale={BUILDING_COORDS.luna.scale}
      >
        <InvernaderoLunarBuilding
          sensitiveActive={sensitiveLunarActive}
          onSelect={() => handleSelect('luna')}
        />
      </group>
    </group>
  );
};

const SkyParticles3D: React.FC<{ isNight: boolean; weather: string }> = ({
  isNight,
  weather,
}) => {
  const stars = useMemo(
    () =>
      Array.from({ length: 40 }).map(() => ({
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        z: -2.2 - Math.random() * 3,
        r: 0.022 + Math.random() * 0.024,
      })),
    []
  );

  return (
    <group>
      {(isNight || weather === 'fireworks') &&
        stars.map((s, idx) => (
          <mesh key={idx} position={[s.x, s.y, s.z]}>
            <sphereGeometry args={[s.r, 8, 8]} />
            <meshBasicMaterial
              color={weather === 'fireworks' && idx % 3 === 0 ? '#FF8FA3' : '#FFF3B0'}
            />
          </mesh>
        ))}
    </group>
  );
};

export const Planet3DScene: React.FC<Planet3DSceneProps> = ({
  solar,
  hasUnreadDiary,
  onBuildingSelect,
}) => {
  const cravings = useWorldStore((s) => s.cravings);
  const lunarA = useWorldStore((s) => s.lunarA);
  const lunarB = useWorldStore((s) => s.lunarB);

  const hasEmergencyCraving = cravings.some((c) => !c.completed && c.intensity === 'emergencia');
  const sensitiveLunarActive = lunarA.sensitiveAlertActive || lunarB.sensitiveAlertActive;

  // Iluminación limpia y luminosa (en Atardecer Rosado baña el planeta con luz dorada/rosada sin oscurecer el agua ni embarrar el verde)
  const isSunset = solar.timeOfDay === 'sunset';

  return (
    <div
      className="relative w-full h-full overflow-hidden transition-colors duration-1000"
      style={{
        background: `linear-gradient(180deg, ${solar.skyTopColor} 0%, ${solar.skyBottomColor} 100%)`,
      }}
    >
      <Canvas
        camera={{ position: [0, 0.45, 7.6], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <ambientLight
          intensity={solar.isNightMode ? 0.72 : isSunset ? 1.1 : 1.15}
          color={isSunset ? '#FFF0D6' : '#FFFFFF'}
        />
        <hemisphereLight
          args={[
            isSunset ? '#FFD6E0' : '#E0F7FA',
            isSunset ? '#FFE5B4' : '#B7E4C7',
            solar.isNightMode ? 0.38 : 0.65,
          ]}
        />
        <directionalLight
          position={[5, 7, 6]}
          intensity={solar.isNightMode ? 0.65 : isSunset ? 1.15 : 1.25}
          color={isSunset ? '#FFD166' : solar.sunColor}
        />
        <directionalLight
          position={[-5, -3, 4]}
          intensity={0.38}
          color={isSunset ? '#FFCAD4' : '#E0FBFC'}
        />

        {/* Sol / Luna en el cielo */}
        <mesh position={[2.4, 2.5, -2.4]}>
          <sphereGeometry args={[0.3, 28, 28]} />
          <meshBasicMaterial
            color={solar.isNightMode ? '#FFF3B0' : isSunset ? '#FFB5A7' : '#FFD166'}
          />
        </mesh>

        <SkyParticles3D isNight={solar.isNightMode} weather={solar.weather} />

        <PlanetWorldGroup
          solar={solar}
          hasUnreadDiary={hasUnreadDiary}
          hasEmergencyCraving={hasEmergencyCraving}
          sensitiveLunarActive={sensitiveLunarActive}
          onBuildingSelect={onBuildingSelect}
        />

        <OrbitControls
          enablePan={false}
          minDistance={5.2}
          maxDistance={10.2}
          rotateSpeed={0.68}
          zoomSpeed={0.8}
        />
      </Canvas>
    </div>
  );
};
