import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorldStore } from './store/useWorldStore';
import { computeSolarEnvironment } from './utils/solarAndTime';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { OnboardingFlow } from './components/OnboardingFlow';
import { LoadingScreen } from './components/LoadingScreen';
import { Planet3DScene } from './components/Planet3DScene';
import { PlanetHUD } from './components/PlanetHUD';
import { TestSimulatorPanel } from './components/TestSimulatorPanel';
import { SettingsModal } from './components/SettingsModal';
import { CasitaTamagotchi } from './components/buildings/CasitaTamagotchi';
import { BuzonDiario } from './components/buildings/BuzonDiario';
import { CineRetro } from './components/buildings/CineRetro';
import { FaroMapaViajes } from './components/buildings/FaroMapaViajes';
import { FuenteDeseos } from './components/buildings/FuenteDeseos';
import { EdificioCerdito } from './components/buildings/EdificioCerdito';
import { InvernaderoLunar } from './components/buildings/InvernaderoLunar';

export const App: React.FC = () => {
  const {
    onboardingCompleted,
    worldId,
    theme,
    solarOverride,
    weatherOverride,
    anniversaryDate,
    petA,
    petB,
    activeUser,
    diaryPages,
    activeBuilding,
    setActiveBuilding,
    setAuthSession,
  } = useWorldStore();

  const [hapticVisualPulse, setHapticVisualPulse] = useState(false);

  const solar = computeSolarEnvironment(
    solarOverride,
    weatherOverride,
    anniversaryDate,
    petA.birthday,
    petB.birthday
  );

  // Comprobación de Sesión Persistente de Supabase (Auto-Login)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user && !onboardingCompleted) {
        const u = data.session.user;
        setAuthSession(
          u.id,
          u.email || '',
          u.user_metadata?.full_name || u.email?.split('@')[0] || 'Cariño'
        );
      }
    });
  }, [onboardingCompleted, setAuthSession]);

  // Sincronizar Tema Pastel y Modo Noche Conectado en el DOM global
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-night', solar.isNightMode ? 'true' : 'false');
  }, [theme, solar.isNightMode]);

  // Fallback visual de latido de corazón para iOS si Navigator.vibrate está restringido
  useEffect(() => {
    const handler = () => {
      setHapticVisualPulse(true);
      setTimeout(() => setHapticVisualPulse(false), 380);
    };
    window.addEventListener('myworld-haptic-pulse', handler);
    return () => window.removeEventListener('myworld-haptic-pulse', handler);
  }, []);

  // Comprobar si hay una Polaroid o dibujo nuevo sin leer en el Buzón para que asome físicamente en el 3D
  const hasUnreadDiary = diaryPages.some((p) =>
    activeUser === 'userA' ? !p.readByUserA : !p.readByUserB
  );

  // Si NO hay sesión guardada o aún no tiene Planeta vinculado -> Mostrar Flujo de "Primera Vez" (Onboarding de 3 pasos)
  const hasActiveLinkedSession = Boolean(onboardingCompleted && worldId);

  if (!hasActiveLinkedSession) {
    return <OnboardingFlow />;
  }

  // Si YA ha iniciado sesión y tiene Planeta vinculado -> NUNCA ve login; va directo al saludo de mascotas y aterrizaje 3D
  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none transition-transform duration-200 ${
        hapticVisualPulse ? 'scale-[1.008]' : 'scale-100'
      }`}
    >
      {/* 1. Pantalla de Carga con saludo de las 2 mascotas y transición de aterrizaje */}
      <LoadingScreen />

      {/* 2. Escena 3D Principal del Planeta con los 7 Edificios y Ciclo Solar */}
      <Planet3DScene
        solar={solar}
        hasUnreadDiary={hasUnreadDiary}
        onBuildingSelect={(b) => setActiveBuilding(b)}
      />

      {/* 3. HUD Fijo del Planeta (Contador, Óvulo Cute Mensajero y Kiss Sender) */}
      <PlanetHUD solar={solar} hasUnreadDiary={hasUnreadDiary} />

      {/* 4. Botón Flotante "🛠️ Modo Test (Simulador)" para QA en un solo dispositivo */}
      <TestSimulatorPanel />

      {/* 5. Módulos Interiores de los 7 Edificios con Físicas Elásticas */}
      <AnimatePresence>
        {activeBuilding && (
          <motion.div
            key={activeBuilding}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="fixed inset-0 z-40"
          >
            {activeBuilding === 'casita' && (
              <CasitaTamagotchi solar={solar} onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'correos' && (
              <BuzonDiario onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'cine' && (
              <CineRetro onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'viajes' && (
              <FaroMapaViajes onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'deseos' && (
              <FuenteDeseos onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'hucha' && (
              <EdificioCerdito onClose={() => setActiveBuilding(null)} />
            )}
            {activeBuilding === 'luna' && (
              <InvernaderoLunar onClose={() => setActiveBuilding(null)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Modal de Ajustes, Temas Pastel, Código de 6 Caracteres, iOS Push, Álbum PDF y Cerrar Sesión */}
      <SettingsModal />
    </div>
  );
};

export default App;
