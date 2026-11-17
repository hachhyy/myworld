import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Heart,
  Copy,
  Check,
  ArrowRight,
  KeyRound,
  Globe,
  Cake,
} from 'lucide-react';
import { PetSpecies, useWorldStore } from '../store/useWorldStore';
import {
  registerUserWithSupabase,
  loginUserWithSupabase,
  createWorldInTable,
  joinWorldByCodeInTable,
  saveProfileInTable,
} from '../lib/supabaseClient';
import { CutePetAvatar, PET_CATALOG } from './characters/CutePetAvatar';
import { soundEngine } from '../utils/soundAndHaptics';

export const OnboardingFlow: React.FC = () => {
  const {
    onboardingStep,
    authUserId,
    authUserEmail,
    worldId,
    petA,
    petB,
    setCoupleNames,
    setAuthSession,
    setLinkedWorld,
    completeOnboardingWithPet,
  } = useWorldStore();

  // Estado Paso 1: Registro / Login
  const [authTab, setAuthTab] = useState<'signup' | 'login'>('signup');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [quickRoomCodeInput, setQuickRoomCodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado Paso 2: Crear o Unirse a un Planeta
  const [newPlanetName, setNewPlanetName] = useState('Planeta Canela y Miel');
  const [newAnniversaryDate, setNewAnniversaryDate] = useState('2024-06-30');
  const [myNickname, setMyNickname] = useState(petA.ownerName || 'Alex');
  const [partnerNickname, setPartnerNickname] = useState(petB.ownerName || 'Cris');
  const [generatedWorld, setGeneratedWorld] = useState<{
    id: string;
    name: string;
    roomCode: string;
    anniversaryDate: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Estado Paso 3: Elección de Mascota y Cumpleaños
  const [selectedSpecies, setSelectedSpecies] = useState<PetSpecies>('capibara');
  const [petNameInput, setPetNameInput] = useState('Mochi');
  const [birthdayInput, setBirthdayInput] = useState('1999-04-18');

  // Acceso directo por código de 6 letras en el Login -> aterriza directamente en el `world_id` aislado de la pareja
  const handleQuickCodeEnter = async () => {
    setAuthError(null);
    const clean = quickRoomCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) {
      setAuthError('Introduce vuestro código privado de 6 letras o números 💕');
      return;
    }
    setLoading(true);
    try {
      const worldRow = await joinWorldByCodeInTable(clean);
      setAuthSession(
        authUserId || `usr_${clean.toLowerCase()}`,
        authUserEmail || `${clean.toLowerCase()}@myworld.app`,
        nameInput.trim() || petA.ownerName || 'Alex'
      );
      setLinkedWorld(
        worldRow.id,
        worldRow.name,
        worldRow.room_code,
        worldRow.anniversary_date
      );
      completeOnboardingWithPet(selectedSpecies, petNameInput || 'Mochi', birthdayInput);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'No encontramos ese código de planeta');
    } finally {
      setLoading(false);
    }
  };

  // Paso 1: Crear cuenta nueva o Iniciar sesión
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!emailInput.trim() || !passwordInput.trim()) {
      setAuthError('Por favor, rellena tu correo y contraseña con cariño 💕');
      return;
    }
    if (authTab === 'signup' && !nameInput.trim()) {
      setAuthError('Dinos cómo te llamas para que tu pareja te reconozca ✨');
      return;
    }

    setLoading(true);
    try {
      if (authTab === 'signup') {
        const res = await registerUserWithSupabase(
          nameInput.trim(),
          emailInput.trim(),
          passwordInput
        );
        setAuthSession(res.userId, res.email, res.name);
      } else {
        const res = await loginUserWithSupabase(emailInput.trim(), passwordInput);
        setAuthSession(res.userId, res.email, res.name);
        // Si ya tenía un mundo y mascota vinculados en su perfil, restaurar y entrar directo a su `world_id`
        if (res.world && res.profile) {
          setLinkedWorld(
            res.world.id,
            res.world.name,
            res.world.room_code,
            res.world.anniversary_date
          );
          completeOnboardingWithPet(
            res.profile.pet_species,
            res.profile.pet_name,
            res.profile.birthday
          );
        }
      }
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'No hemos podido conectar. Prueba de nuevo 💕'
      );
    } finally {
      setLoading(false);
    }
  };

  // Paso 2 - Opción A: Crear nuestro Planeta y generar código único de 6 caracteres
  const handleCreateWorldOptionA = async () => {
    setStep2Error(null);
    if (!newPlanetName.trim()) {
      setStep2Error('Ponle un nombre bonito a vuestro planeta 🪐');
      return;
    }
    setLoading(true);
    try {
      const worldRow = await createWorldInTable(
        authUserId || `usr_${Date.now()}`,
        newPlanetName.trim(),
        newAnniversaryDate
      );
      setGeneratedWorld({
        id: worldRow.id,
        name: worldRow.name,
        roomCode: worldRow.room_code,
        anniversaryDate: worldRow.anniversary_date,
      });
      soundEngine.playChime();
    } catch (err) {
      setStep2Error(err instanceof Error ? err.message : 'Error al crear el planeta');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2 - Opción B: Unirse con el código de 6 caracteres de mi pareja
  const handleJoinWorldOptionB = async () => {
    setStep2Error(null);
    if (partnerCodeInput.trim().length < 4) {
      setStep2Error('Introduce el código de 6 letras o números de tu pareja (ej. MIEL26)');
      return;
    }
    setLoading(true);
    try {
      const worldRow = await joinWorldByCodeInTable(partnerCodeInput.trim());
      setLinkedWorld(
        worldRow.id,
        worldRow.name,
        worldRow.room_code,
        worldRow.anniversary_date
      );
    } catch (err) {
      setStep2Error(err instanceof Error ? err.message : 'No encontramos ese código');
    } finally {
      setLoading(false);
    }
  };

  // Paso 3: Guardar Mascota y Cumpleaños en la tabla `profiles` e ir al Planeta 3D
  const handleFinishOnboardingStep3 = async () => {
    setLoading(true);
    try {
      await saveProfileInTable({
        id: authUserId || `usr_${Date.now()}`,
        name: petA.ownerName,
        email: authUserEmail || 'pareja@myworld.app',
        world_id: worldId || null,
        birthday: birthdayInput,
        pet_species: selectedSpecies,
        pet_name: petNameInput.trim() || 'Mochi',
      });
      soundEngine.speakAnimalese(`Hola soy ${petNameInput || 'Mochi'} vamos a nuestro mundo`, 470);
      completeOnboardingWithPet(selectedSpecies, petNameInput.trim() || 'Mochi', birthdayInput);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] z-50 watercolor-paper overflow-y-auto overscroll-none flex flex-col justify-between px-4 safe-modal-inset select-none">
      {/* Indicador superior de pasos */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xl">🪐</span>
          <span className="font-bold text-sm">MyWorld</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((st) => (
            <span
              key={st}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-black/15 transition-all ${
                onboardingStep === st
                  ? 'bg-[var(--accent-primary)] scale-105'
                  : onboardingStep > st
                  ? 'bg-[#A8D5BA]'
                  : 'bg-white/80 opacity-60'
              }`}
            >
              Paso {st}
            </span>
          ))}
        </div>
      </div>

      {/* CONTENEDOR CENTRAL PASO A PASO */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-evenly py-2">
        <AnimatePresence mode="wait">
          {/* ==========================================================
              PASO 1: BIENVENIDA, REGISTRO O INICIAR SESIÓN
             ========================================================== */}
          {onboardingStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="space-y-4"
            >
              {/* Logo artesanal de MyWorld */}
              <div className="text-center space-y-1">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-white/95 border border-black/10 shadow-sm flex items-center justify-center text-4xl animate-float-slow">
                  🪐💕
                </div>
                <h1 className="text-2xl font-bold tracking-tight mt-2">
                  Bienvenidos a MyWorld
                </h1>
                <p className="font-hand text-xl text-[var(--text-muted)]">
                  «Vuestro pequeño planeta privado hecho a mano»
                </p>
              </div>

              <div className="bg-white/95 rounded-3xl shadow-sm p-5 border border-black/5">
                {/* Pestañas: Crear cuenta nueva vs Iniciar sesión */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      setAuthTab('signup');
                      setAuthError(null);
                    }}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                      authTab === 'signup'
                        ? 'bg-[var(--accent-primary)] border-black/15 shadow-xs'
                        : 'bg-[var(--bg-paper)] border-black/5 opacity-80'
                    }`}
                  >
                    🌱 Crear cuenta nueva
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      setAuthTab('login');
                      setAuthError(null);
                    }}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                      authTab === 'login'
                        ? 'bg-[var(--accent-primary)] border-black/15 shadow-xs'
                        : 'bg-[var(--bg-paper)] border-black/5 opacity-80'
                    }`}
                  >
                    🔑 Iniciar sesión
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
                  {authTab === 'signup' && (
                    <div>
                      <label className="block font-bold mb-1 text-[#4A3F35]">
                        Tu nombre o apodo cariñoso:
                      </label>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Ej. Lucía"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 bg-[var(--bg-paper)] text-[#4A3F35] font-semibold focus:outline-none focus:border-[#E88B84]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold mb-1 text-[#4A3F35]">Correo electrónico:</label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 bg-[var(--bg-paper)] text-[#4A3F35] font-semibold focus:outline-none focus:border-[#E88B84]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[#4A3F35]">Contraseña:</label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 bg-[var(--bg-paper)] text-[#4A3F35] font-semibold focus:outline-none focus:border-[#E88B84]"
                    />
                  </div>

                  {authError && (
                    <div className="p-2.5 rounded-2xl bg-rose-100 border border-rose-300 text-rose-950 font-semibold">
                      {authError}
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl py-3 px-4 bg-[var(--accent-secondary)] text-[#4A3F35] font-bold text-sm shadow-sm border border-black/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                    <span>
                      {loading
                        ? 'Preparando tu rincón...'
                        : authTab === 'signup'
                        ? 'Crear mi cuenta y continuar'
                        : 'Entrar a mi cuenta'}
                    </span>
                  </motion.button>
                </form>
              </div>

              {/* Acceso directo por Código de Pareja de 6 letras (Aislamiento por world_id) */}
              <div className="bg-white/95 rounded-3xl shadow-sm p-5 border border-black/5">
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-[#4A3F35]">
                      <KeyRound className="w-3.5 h-3.5 text-rose-500" />
                      ¿Ya tenéis código de 6 letras de vuestro planeta?
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={quickRoomCodeInput}
                      onChange={(e) => setQuickRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="EJ. MIEL26"
                      className="flex-1 min-w-0 rounded-2xl border border-slate-300 px-2.5 py-3 bg-[var(--bg-paper)] text-[#4A3F35] font-mono text-xs sm:text-sm font-bold tracking-wider uppercase text-center focus:outline-none focus:border-[#A8D5BA]"
                    />
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      disabled={loading}
                      onClick={handleQuickCodeEnter}
                      className="rounded-2xl px-4 py-3 bg-[#A8D5BA] text-[#2B3A30] font-bold shadow-sm border border-black/10 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Aterrizar 🪐</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==========================================================
              PASO 2: CREAR O UNIRSE A UN PLANETA (VINCULACIÓN DE PAREJA)
             ========================================================== */}
          {onboardingStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="space-y-3.5"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold">
                  ¡Hola, {petA.ownerName}! 🌍💕
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Vincula tu cuenta con la de tu pareja en una sala privada 100% aislada
                </p>
              </div>

              {step2Error && (
                <div className="p-3 rounded-2xl bg-rose-100 border border-rose-300 text-rose-950 text-xs font-bold text-center">
                  {step2Error}
                </div>
              )}

              {/* TARJETA GRANDE OPCIÓN A: CREAR NUESTRO PLANETA */}
              <div className="bg-white/95 rounded-3xl shadow-sm p-5 border border-black/5">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-2xl bg-[var(--accent-primary)] border border-black/10 flex items-center justify-center text-base shrink-0">
                      🪐
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#4A3F35]">Opción A · Crear nuestro Planeta</h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Bautiza vuestro mundo y genera el código para tu pareja
                      </p>
                    </div>
                  </div>

                  {!generatedWorld ? (
                    <>
                      <div>
                        <label className="block font-bold mb-1 text-[#4A3F35]">
                          Nombre personalizado del Planeta:
                        </label>
                        <input
                          type="text"
                          value={newPlanetName}
                          onChange={(e) => setNewPlanetName(e.target.value)}
                          placeholder="Ej. Planeta Canela y Miel"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 bg-[var(--bg-paper)] text-[#4A3F35] font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-bold mb-1 text-[#4A3F35]">
                          Fecha de inicio de vuestra relación:
                        </label>
                        <input
                          type="date"
                          value={newAnniversaryDate}
                          onChange={(e) => setNewAnniversaryDate(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 bg-[var(--bg-paper)] text-[#4A3F35] font-bold focus:outline-none"
                        />
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleCreateWorldOptionA}
                        disabled={loading}
                        className="w-full rounded-2xl py-3 px-4 bg-[var(--accent-primary)] text-[#4A3F35] font-bold shadow-sm border border-black/10 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Generar nuestro Planeta y Código Único</span>
                      </motion.button>
                    </>
                  ) : (
                    /* Mostrar el código único de 6 letras/números en GRANDE para compartir */
                    <motion.div
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-black/10 text-center space-y-2.5"
                    >
                      <p className="text-[11px] font-bold text-[var(--text-muted)]">
                        ¡Planeta «{generatedWorld.name}» creado! Comparte este código con tu pareja:
                      </p>
                      <div className="py-2.5 px-4 rounded-2xl bg-white border border-dashed border-slate-400 flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-[0.25em] font-mono text-[#4A3F35]">
                          {generatedWorld.roomCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(generatedWorld.roomCode);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="rounded-full px-3 py-1 bg-[var(--accent-highlight)] text-[#4A3F35] text-[11px] font-bold border border-black/10 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCode ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() =>
                          setLinkedWorld(
                            generatedWorld.id,
                            generatedWorld.name,
                            generatedWorld.roomCode,
                            generatedWorld.anniversaryDate
                          )
                        }
                        className="w-full rounded-2xl py-3 px-4 bg-[var(--accent-secondary)] text-[#4A3F35] font-bold shadow-sm border border-black/10 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Continuar a elegir mi mascota</span>
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* TARJETA GRANDE OPCIÓN B: TENGO EL CÓDIGO DE MI PAREJA */}
              <div className="bg-white/95 rounded-3xl shadow-sm p-5 border border-black/5">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-2xl bg-[#A8D5BA] border border-black/10 flex items-center justify-center text-base shrink-0">
                      💌
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#4A3F35]">
                        Opción B · Tengo el código de mi pareja
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Introduce sus 6 caracteres para unirte a su mismo planeta
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={partnerCodeInput}
                      onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
                      placeholder="Ej. MIEL26"
                      className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 bg-[var(--bg-paper)] text-[#4A3F35] font-mono text-base font-bold tracking-widest uppercase text-center focus:outline-none"
                    />
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleJoinWorldOptionB}
                      disabled={loading}
                      className="rounded-2xl px-4 py-3 bg-[#A8D5BA] text-[#2B3A30] font-bold shadow-sm border border-black/10 flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Vincular</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==========================================================
              PASO 3: ELECCIÓN DE MASCOTA INICIAL Y CUMPLEAÑOS
             ========================================================== */}
          {onboardingStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="space-y-3.5"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold">
                  ¡Elige tu Mascota Compañera! 🐾✨
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Vivirá con la mascota de tu pareja en la Casita con Jardín
                </p>
              </div>

              <div className="bg-white/95 rounded-3xl shadow-sm p-5 border border-black/5">
                <div className="flex flex-col items-center space-y-3 text-xs">
                  {/* Vista previa viva del avatar mascota */}
                  <div className="p-3 rounded-3xl bg-[var(--bg-secondary)] border border-black/10 flex flex-col items-center">
                    <CutePetAvatar
                      species={selectedSpecies}
                      hat="rana"
                      isWaving={true}
                      size={128}
                    />
                    <span className="font-hand text-xl font-bold text-[#4A3F35]">
                      ¡Hola, {petA.ownerName}! Soy {petNameInput || 'Mochi'} 💕
                    </span>
                  </div>

                  {/* Catálogo de especies */}
                  <div className="w-full">
                    <label className="block font-bold mb-1 text-[#4A3F35]">
                      Elige tu especie favorita ({PET_CATALOG.length} disponibles):
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-2xl bg-[var(--bg-paper)] border border-slate-300">
                      {PET_CATALOG.map((spec) => (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playPop(1.2);
                            setSelectedSpecies(spec.id);
                          }}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer truncate ${
                            selectedSpecies === spec.id
                              ? 'bg-[var(--accent-primary)] border-black/20 shadow-xs text-[#4A3F35]'
                              : 'bg-white border-black/5 text-[#4A3F35]/80'
                          }`}
                        >
                          {spec.name} {spec.inWaterBubble ? '🫧' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <div>
                      <label className="block font-bold mb-1 text-[#4A3F35]">
                        Tu mote cariñoso:
                      </label>
                      <input
                        type="text"
                        value={myNickname}
                        onChange={(e) => setMyNickname(e.target.value)}
                        placeholder="Ej. Alex"
                        className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 bg-[var(--bg-paper)] text-[#4A3F35] font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-[#4A3F35]">
                        Mote de tu pareja:
                      </label>
                      <input
                        type="text"
                        value={partnerNickname}
                        onChange={(e) => setPartnerNickname(e.target.value)}
                        placeholder="Ej. Cris"
                        className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 bg-[var(--bg-paper)] text-[#4A3F35] font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <div>
                      <label className="block font-bold mb-1 text-[#4A3F35]">
                        Nombre de tu mascota:
                      </label>
                      <input
                        type="text"
                        value={petNameInput}
                        onChange={(e) => setPetNameInput(e.target.value)}
                        placeholder="Ej. Mochi"
                        className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 bg-[var(--bg-paper)] text-[#4A3F35] font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1 flex items-center gap-1 text-[#4A3F35]">
                        <Cake className="w-3.5 h-3.5 text-rose-500" />
                        Tu fecha de cumpleaños:
                      </label>
                      <input
                        type="date"
                        value={birthdayInput}
                        onChange={(e) => setBirthdayInput(e.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 bg-[var(--bg-paper)] text-[#4A3F35] font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setCoupleNames(myNickname, partnerNickname);
                      handleFinishOnboardingStep3();
                    }}
                    disabled={loading}
                    className="w-full rounded-2xl py-3.5 px-4 bg-[var(--accent-secondary)] text-[#4A3F35] font-bold text-sm shadow-sm border border-black/10 flex items-center justify-center gap-2 cursor-pointer mt-1"
                  >
                    <span>¡Ir a nuestro mundo! 🪐✨</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pie artesanal */}
      <p className="text-[11px] text-[var(--text-muted)] text-center pb-1 shrink-0">
        Hecho a mano con cariño · Sesión persistente automática en tu móvil
      </p>
    </div>
  );
};
