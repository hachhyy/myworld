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

// Radios esféricos exactos V5: Esfera base de Océano (R=2.0) + Islas/Continentes Orgánicos (R=2.05)
const R_OCEAN = 2.0;      // Esfera interior completa de agua turquesa suave brillante
const R_SAND = 2.022;     // Bordes orgánicos de arena crema (#F9E4B7)
const R_MEADOW = 2.05;    // Islas y continentes orgánicos verde menta pastel (#7ED992)
const R_TRAIN = 2.054;    // Anillo ferroviario perfecto paralelo al ecuador en el hemisferio sur

// Distribución armónica de los 7 edificios sobre el corazón de cada isla orgánica (Tamaño reducido un 15% para que el planeta respire)
export const BUILDING_COORDS: Record<
  Exclude<BuildingId, null>,
  { lat: number; lon: number; scale: number }
> = {
  luna: { lat: 68, lon: 8, scale: 0.95 },
  casita: { lat: 28, lon: -4, scale: 0.98 },
  correos: { lat: 26, lon: 116, scale: 0.96 },
  deseos: { lat: 26, lon: -116, scale: 0.96 },
  cine: { lat: -22, lon: 14, scale: 0.98 },
  hucha: { lat: -22, lon: 126, scale: 0.96 },
  viajes: { lat: -19, lon: -110, scale: 0.97 },
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

// Centros de masas de tierra orgánicas (continentes e islas redondeadas con istmos y bahías naturales)
const ORGANIC_LAND_LOBES: { vec: THREE.Vector3; radiusRad: number; weight: number }[] = [
  // Isla/Continente Norte-Central (La Casita + Istmo hacia el Invernadero Lunar)
  { vec: latLonToUnitVector(28, -4), radiusRad: 0.56, weight: 1.15 },
  { vec: latLonToUnitVector(50, 4), radiusRad: 0.42, weight: 0.95 },
  { vec: latLonToUnitVector(68, 8), radiusRad: 0.46, weight: 1.12 },
  // Isla Noreste (Correos / Buzón Postal)
  { vec: latLonToUnitVector(26, 116), radiusRad: 0.52, weight: 1.12 },
  { vec: latLonToUnitVector(44, 92), radiusRad: 0.36, weight: 0.85 },
  // Isla Noroeste (Fuente de los Deseos)
  { vec: latLonToUnitVector(26, -116), radiusRad: 0.52, weight: 1.12 },
  { vec: latLonToUnitVector(42, -82), radiusRad: 0.35, weight: 0.82 },
  // Isla Sur-Central (Cine Retro + cruce de vía férrea en tierra)
  { vec: latLonToUnitVector(-22, 14), radiusRad: 0.54, weight: 1.15 },
  { vec: latLonToUnitVector(-44, 18), radiusRad: 0.42, weight: 1.04 },
  // Isla Sureste (Hucha Cerdito + cruce de vía férrea en tierra)
  { vec: latLonToUnitVector(-22, 126), radiusRad: 0.53, weight: 1.14 },
  { vec: latLonToUnitVector(-44, 128), radiusRad: 0.41, weight: 1.02 },
  // Península Suroeste (Faro de Viajes junto a la bahía + cruce de vía férrea)
  { vec: latLonToUnitVector(-19, -110), radiusRad: 0.5, weight: 1.12 },
  { vec: latLonToUnitVector(-43, -112), radiusRad: 0.38, weight: 0.98 },
  // Pequeño archipiélago austral decorativo
  { vec: latLonToUnitVector(-74, -30), radiusRad: 0.36, weight: 0.9 },
];

// Ruido esférico multi-frecuencia suave para costas orgánicas con calas, lagos y penínsulas naturales (cero líneas rectas)
function organicSphericalNoise(u: THREE.Vector3): number {
  const n1 = Math.sin(u.x * 3.7 + u.y * 2.3) * Math.cos(u.z * 3.4 - u.x * 1.9);
  const n2 = Math.sin(u.y * 5.3 - u.z * 4.1) * Math.cos(u.x * 4.8 + u.y * 2.7);
  const n3 = Math.cos(u.z * 7.2 + u.x * 5.6 - u.y * 3.8);
  return n1 * 0.085 + n2 * 0.045 + n3 * 0.022;
}

// Función de elevación de Islas y Continentes Orgánicos sobre el Océano (R=2.0 -> R=2.05)
function evaluateSmoothPlanetSurface(unitDir: THREE.Vector3): {
  radius: number;
  isWater: boolean;
  isSand: boolean;
  landFactor: number;
  color: THREE.Color;
} {
  // Combinación suave (smooth-max) de los lóbulos continentales para crear islas orgánicas y mares/lagos naturales entre ellas
  let maxInfluence = 0;
  let secondInfluence = 0;

  for (let i = 0; i < ORGANIC_LAND_LOBES.length; i++) {
    const lobe = ORGANIC_LAND_LOBES[i];
    const dot = THREE.MathUtils.clamp(unitDir.dot(lobe.vec), -1, 1);
    const angle = Math.acos(dot);
    const normalized = 1 - angle / lobe.radiusRad;
    if (normalized > 0) {
      const val = smoothstep(0, 1, normalized) * lobe.weight;
      if (val > maxInfluence) {
        secondInfluence = maxInfluence;
        maxInfluence = val;
      } else if (val > secondInfluence) {
        secondInfluence = val;
      }
    }
  }

  // Fusión orgánica entre lóbulos cercanos + perturbación costera natural
  const blendedContinent =
    maxInfluence + secondInfluence * 0.28 + organicSphericalNoise(unitDir);

  // landFactor: 0 en mar/lago abierto, 0.35 en la orilla de arena crema, 1.0 en la pradera verde menta
  const landFactor = smoothstep(0.24, 0.56, blendedContinent);

  // Relieve suave interior en las islas
  const gentleIslandRelief =
    0.0045 * Math.sin(unitDir.x * 4.2 + unitDir.z * 3.8) * Math.cos(unitDir.y * 4.0);

  const underwaterRadius = 1.968;
  const radius =
    underwaterRadius +
    (R_MEADOW - underwaterRadius) * landFactor +
    gentleIslandRelief * smoothstep(0.55, 1.0, landFactor);

  const isWater = radius <= R_OCEAN + 0.003;
  const isSand = !isWater && landFactor < 0.68;

  // Bordes de arena crema (#F9E4B7) y pradera verde menta pastel (#7ED992 -> #8CE39E)
  const sandColor = new THREE.Color('#F9E4B7');
  const meadowColor = new THREE.Color('#7ED992');
  const meadowHighlight = new THREE.Color('#8EE6A1');

  const grassTone = meadowColor
    .clone()
    .lerp(meadowHighlight, THREE.MathUtils.clamp((gentleIslandRelief + 0.0045) * 95, 0, 1));

  const colorBlend = smoothstep(0.3, 0.72, landFactor);
  const color = sandColor.clone().lerp(grassTone, colorBlend);

  return {
    radius,
    isWater,
    isSand,
    landFactor,
    color,
  };
}

// Transformación exacta sobre la superficie de tierra firme
function getSurfaceTransform(latDeg: number, lonDeg: number, radialOffset = 0) {
  const unit = latLonToUnitVector(latDeg, lonDeg);
  const surface = evaluateSmoothPlanetSurface(unit);
  const exactRadius = Math.max(R_MEADOW, surface.radius) + radialOffset;
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
  const { position, quaternion, surface } = useMemo(
    () => getSurfaceTransform(lat, lon, -0.012),
    [lat, lon]
  );
  if (surface.isWater) return null;
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

// Arbustos y flores redondeadas ancladas exclusivamente sobre tierra firme
const GroundedFlowerBush: React.FC<{ lat: number; lon: number; flowerColor: string }> = ({
  lat,
  lon,
  flowerColor,
}) => {
  const { position, quaternion, surface } = useMemo(
    () => getSurfaceTransform(lat, lon, -0.008),
    [lat, lon]
  );
  if (surface.isWater) return null;
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

// Caminos finos de piedrecitas crema sobre las islas + puente peatonal curvo entre la Isla Norte (Casita) y la Isla Sur (Cine)
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

  // Puente peatonal curvo sobre el estrecho natural entre la Isla Norte y la Isla Sur
  const straitBridgePlanks = useMemo(() => {
    const u1 = latLonToUnitVector(12, 4);
    const u2 = latLonToUnitVector(-10, 10);
    const steps = 12;
    const list: { pos: [number, number, number]; quat: THREE.Quaternion }[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = new THREE.Vector3().lerpVectors(u1, u2, t).normalize();
      const arch = Math.sin(t * Math.PI) * 0.052;
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
          <cylinderGeometry args={[0.026, 0.03, 0.008, 12]} />
          <meshStandardMaterial color="#F9E4B7" roughness={0.85} />
        </mesh>
      ))}
      {straitBridgePlanks.map((pl, idx) => (
        <group key={idx} position={pl.pos} quaternion={pl.quat}>
          <mesh>
            <boxGeometry args={[0.1, 0.014, 0.036]} />
            <meshStandardMaterial color="#E6C29F" roughness={0.8} />
          </mesh>
          <mesh position={[-0.044, 0.018, 0]}>
            <boxGeometry args={[0.009, 0.028, 0.009]} />
            <meshStandardMaterial color="#B07D52" />
          </mesh>
          <mesh position={[0.044, 0.018, 0]}>
            <boxGeometry args={[0.009, 0.028, 0.009]} />
            <meshStandardMaterial color="#B07D52" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// 4. VÍAS DE TREN CON SENTIDO FÍSICO (Anillo TorusGeometry paralelo al ecuador en el hemisferio sur, lat = -43°)
// - Donde pasa sobre TIERRA: renderiza balasto de grava y traviesas de madera.
// - Donde pasa sobre AGUA: renderiza un viaducto/puente de arcos de ladrillo y madera con pilares hasta el mar.
const ContinuousRailwayAndTrain: React.FC = () => {
  const trainLatDeg = -43;
  const trainLatRad = THREE.MathUtils.degToRad(trainLatDeg);
  const ringY = R_TRAIN * Math.sin(trainLatRad);
  const ringRadius = R_TRAIN * Math.cos(trainLatRad);

  const locoRef = useRef<THREE.Group>(null);
  const wagon1Ref = useRef<THREE.Group>(null);
  const wagon2Ref = useRef<THREE.Group>(null);

  const { landBallastSegments, waterBridgeSegments } = useMemo(() => {
    const segmentCount = 88;
    const landList: { pos: [number, number, number]; quat: THREE.Quaternion }[] = [];
    const bridgeList: {
      pos: [number, number, number];
      quat: THREE.Quaternion;
      hasPier: boolean;
    }[] = [];

    const getCirclePoint = (angle: number) =>
      new THREE.Vector3(
        ringRadius * Math.sin(angle),
        ringY,
        ringRadius * Math.cos(angle)
      );

    for (let i = 0; i < segmentCount; i++) {
      const lonRad = (i / segmentCount) * Math.PI * 2 - Math.PI;
      const p = getCirclePoint(lonRad);
      const pNext = getCirclePoint(lonRad + 0.035);
      const normal = p.clone().normalize();
      const tangent = pNext.clone().sub(p).normalize();
      const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      const m = new THREE.Matrix4().makeBasis(binormal, normal, tangent);
      const quat = new THREE.Quaternion().setFromRotationMatrix(m);

      // Comprobar matemáticamente si este punto del anillo está sobre tierra firme o sobre el mar
      const surf = evaluateSmoothPlanetSurface(normal);
      if (surf.isWater || surf.landFactor < 0.45) {
        bridgeList.push({
          pos: [p.x, p.y, p.z],
          quat,
          hasPier: i % 2 === 0,
        });
      } else {
        landList.push({
          pos: [p.x, p.y, p.z],
          quat,
        });
      }
    }
    return { landBallastSegments: landList, waterBridgeSegments: bridgeList };
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
    placeCarriageOnRing(wagon1Ref.current, baseAngle - 0.13);
    placeCarriageOnRing(wagon2Ref.current, baseAngle - 0.25);
  });

  return (
    <group>
      {/* Dos raíles plateados continuos (TorusGeometry perfecto paralelo al ecuador en el hemisferio sur) */}
      <mesh position={[0, ringY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringRadius - 0.021, 0.005, 10, 110]} />
        <meshStandardMaterial color="#DCE3EA" metalness={0.55} roughness={0.3} />
      </mesh>
      <mesh position={[0, ringY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringRadius + 0.021, 0.005, 10, 110]} />
        <meshStandardMaterial color="#DCE3EA" metalness={0.55} roughness={0.3} />
      </mesh>

      {/* Tramos sobre TIERRA: lecho de balasto de grava + traviesas de madera */}
      {landBallastSegments.map((s, idx) => (
        <group key={`land-${idx}`} position={s.pos} quaternion={s.quat}>
          {/* Balasto de grava cálida asentado sobre la tierra */}
          <mesh position={[0, -0.005, 0]}>
            <boxGeometry args={[0.088, 0.008, 0.082]} />
            <meshStandardMaterial color="#C8B8A6" roughness={0.92} />
          </mesh>
          {/* Traviesa de madera */}
          <mesh position={[0, 0.001, 0]}>
            <boxGeometry args={[0.072, 0.006, 0.019]} />
            <meshStandardMaterial color="#8D5B4C" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Tramos sobre AGUA: Puente de arcos de ladrillo terracota y madera con pilares hasta el océano */}
      {waterBridgeSegments.map((b, idx) => (
        <group key={`bridge-${idx}`} position={b.pos} quaternion={b.quat}>
          {/* Tablero de madera y ladrillo del puente */}
          <mesh position={[0, -0.009, 0]}>
            <boxGeometry args={[0.112, 0.015, 0.115]} />
            <meshStandardMaterial color="#D9A066" roughness={0.78} />
          </mesh>
          {/* Traviesa sobre el puente */}
          <mesh position={[0, 0.001, 0]}>
            <boxGeometry args={[0.072, 0.006, 0.019]} />
            <meshStandardMaterial color="#7F4F24" roughness={0.85} />
          </mesh>
          {/* Barandillas laterales de madera */}
          <mesh position={[-0.05, 0.014, 0]}>
            <boxGeometry args={[0.008, 0.024, 0.112]} />
            <meshStandardMaterial color="#B07D52" />
          </mesh>
          <mesh position={[0.05, 0.014, 0]}>
            <boxGeometry args={[0.008, 0.024, 0.112]} />
            <meshStandardMaterial color="#B07D52" />
          </mesh>
          {/* Arco de ladrillo terracota bajo el tablero */}
          <mesh position={[0, -0.024, 0]}>
            <boxGeometry args={[0.096, 0.018, 0.084]} />
            <meshStandardMaterial color="#C86D51" roughness={0.82} />
          </mesh>
          {/* Pilares de ladrillo y piedra que bajan hasta el mar */}
          {b.hasPier && (
            <group>
              <mesh position={[-0.034, -0.052, 0]}>
                <cylinderGeometry args={[0.012, 0.016, 0.068, 8]} />
                <meshStandardMaterial color="#B55D43" roughness={0.85} />
              </mesh>
              <mesh position={[0.034, -0.052, 0]}>
                <cylinderGeometry args={[0.012, 0.016, 0.068, 8]} />
                <meshStandardMaterial color="#B55D43" roughness={0.85} />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* Locomotora roja/pastel siguiendo matemáticamente el anillo */}
      <group ref={locoRef}>
        <mesh position={[0, 0.042, 0]}>
          <boxGeometry args={[0.07, 0.058, 0.116]} />
          <meshStandardMaterial color="#E76F51" />
        </mesh>
        <mesh position={[0, 0.078, -0.022]}>
          <boxGeometry args={[0.066, 0.048, 0.058]} />
          <meshStandardMaterial color="#FFD166" />
        </mesh>
        <mesh position={[0, 0.082, 0.03]}>
          <cylinderGeometry args={[0.014, 0.012, 0.044, 10]} />
          <meshStandardMaterial color="#3D312A" />
        </mesh>
        <mesh position={[0, 0.118, 0.028]}>
          <sphereGeometry args={[0.019, 10, 10]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Vagoncito 1 (Azul menta pastel) */}
      <group ref={wagon1Ref}>
        <mesh position={[0, 0.038, 0]}>
          <boxGeometry args={[0.064, 0.052, 0.096]} />
          <meshStandardMaterial color="#4EA8DE" />
        </mesh>
        <mesh position={[0, 0.068, 0]}>
          <boxGeometry args={[0.068, 0.013, 0.1]} />
          <meshStandardMaterial color="#FFFDF9" />
        </mesh>
      </group>

      {/* Vagoncito 2 (Rosa coral pastel) */}
      <group ref={wagon2Ref}>
        <mesh position={[0, 0.038, 0]}>
          <boxGeometry args={[0.064, 0.052, 0.096]} />
          <meshStandardMaterial color="#FF8FA3" />
        </mesh>
        <mesh position={[0, 0.068, 0]}>
          <boxGeometry args={[0.068, 0.013, 0.1]} />
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

// Malla de Islas Orgánicas con IcosahedronGeometry sobre la Esfera Base de Océano (R = 2.0)
const SmoothLayeredPlanetMesh: React.FC = () => {
  const continentGeo = useMemo(() => {
    // IcosahedronGeometry(1, 36) proporciona teselación orgánica isótropa sin pellizcos en los polos
    const geo = new THREE.IcosahedronGeometry(1, 36);
    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const colors = new Float32Array(posAttr.count * 3);
    const u = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      u.fromBufferAttribute(posAttr, i).normalize();
      const { radius, color } = evaluateSmoothPlanetSurface(u);
      posAttr.setXYZ(i, u.x * radius, u.y * radius, u.z * radius);
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
      {/* CAPA 1: Esfera Base Interior de Océano (R = 2.0, color turquesa suave brillante) */}
      <mesh>
        <sphereGeometry args={[R_OCEAN, 64, 64]} />
        <meshStandardMaterial
          color="#4FC3F7"
          roughness={0.18}
          metalness={0.08}
        />
      </mesh>

      {/* CAPA 2: Islas y Continentes Orgánicos (R = 2.05) en verde menta pastel con orillas de arena crema */}
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

  // Bases de los 7 edificios asentadas firmemente sobre tierra firme (hundidas -0.02 en las islas orgánicas)
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

  // Árboles distribuidos dentro de las islas orgánicas (nunca en el agua ni sobre la vía en lat = -43°)
  const trees = useMemo(
    () => [
      { lat: 42, lon: -14, kind: 'cherry' as const, scale: 0.92 },
      { lat: 46, lon: 16, kind: 'oak' as const, scale: 0.92 },
      { lat: 36, lon: 102, kind: 'cherry' as const, scale: 0.9 },
      { lat: 18, lon: 130, kind: 'oak' as const, scale: 0.9 },
      { lat: 36, lon: -102, kind: 'cherry' as const, scale: 0.9 },
      { lat: 16, lon: -128, kind: 'pine' as const, scale: 0.9 },
      { lat: -14, lon: 28, kind: 'cherry' as const, scale: 0.92 },
      { lat: -30, lon: 4, kind: 'oak' as const, scale: 0.9 },
      { lat: -14, lon: 138, kind: 'pine' as const, scale: 0.92 },
      { lat: -30, lon: 114, kind: 'oak' as const, scale: 0.9 },
      { lat: -12, lon: -98, kind: 'cherry' as const, scale: 0.9 },
      { lat: -72, lon: -28, kind: 'pine' as const, scale: 0.88 },
    ],
    []
  );

  const bushes = useMemo(
    () => [
      { lat: 22, lon: 10, color: '#FF8FA3' },
      { lat: 34, lon: -18, color: '#FFD166' },
      { lat: 32, lon: 126, color: '#CDB4DB' },
      { lat: 32, lon: -126, color: '#FF8FA3' },
      { lat: -18, lon: 2, color: '#FFD166' },
      { lat: -18, lon: 116, color: '#FF8FA3' },
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
  const isNarrowMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Canvas
        camera={{
          position: isNarrowMobile ? [0, 0.35, 11.4] : [0, 0.35, 9.8],
          fov: isNarrowMobile ? 48 : 44,
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
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
        <mesh position={[1.95, 2.05, -2.4]}>
          <sphereGeometry args={[0.28, 28, 28]} />
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
          minDistance={7.5}
          maxDistance={15.5}
          rotateSpeed={0.68}
          zoomSpeed={0.8}
        />
      </Canvas>
    </div>
  );
};
