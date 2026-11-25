import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BookOpen,
  Copy,
  Download,
  KeyRound,
  LogOut,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Share2,
  Sparkles,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { PastelTheme, useWorldStore } from '../store/useWorldStore';
import {
  joinWorldByCodeInTable,
  updateWorldRoomCodeInTable,
} from '../lib/supabaseClient';
import { normalizeRoomCode } from '../utils/worldSyncMerge';
import { calculateRelationshipDuration } from '../utils/solarAndTime';
import { soundEngine, triggerHeartbeatHaptic } from '../utils/soundAndHaptics';

const THEMES: { id: PastelTheme; name: string; swatch: string; accent: string }[] = [
  { id: 'melocoton', name: 'Melocotón Primavera', swatch: '#F6B89E', accent: '#E88B84' },
  { id: 'salvia', name: 'Salvia Bosque', swatch: '#A8D5BA', accent: '#76B090' },
  { id: 'lavanda', name: 'Lavanda Sueño', swatch: '#C9B8E8', accent: '#A68FD8' },
  { id: 'mantequilla', name: 'Mantequilla Dulce', swatch: '#F9DF92', accent: '#E6BC5A' },
];

export const SettingsModal: React.FC = () => {
  const {
    settingsOpen,
    setSettingsOpen,
    worldId,
    planetName,
    setPlanetName,
    roomCode,
    setLinkedWorld,
    generateNewRoomCode,
    anniversaryDate,
    setAnniversaryDate,
    theme,
    setTheme,
    solarOverride,
    setSolarOverride,
    petA,
    petB,
    setCoupleNames,
    activeUser,
    setActiveUser,
    diaryPages,
    cravings,
    mapPins,
    mediaItems,
    totalKissesHistory,
    resetKissCounter,
    lunarMode,
    setLunarMode,
    lunarOwner,
    setLunarOwner,
    authUserEmail,
    logoutSession,
    syncStatus,
    syncError,
    lastSyncedAt,
    realtimeStatus,
  } = useWorldStore();

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [linkFeedback, setLinkFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(
    null
  );
  const [linkingCode, setLinkingCode] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>('Pendiente de activar');
  const [copiedCode, setCopiedCode] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [confirmResetKisses, setConfirmResetKisses] = useState(false);
  const [kissesResetDone, setKissesResetDone] = useState(false);

  const formattedLastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Pendiente';

  const handleForceSyncNow = () => {
    soundEngine.playPop(1.15);
    setLinkFeedback(null);
    window.dispatchEvent(new CustomEvent('myworld-force-sync'));
  };

  const handleRelinkByCode = async () => {
    const clean = normalizeRoomCode(joinCodeInput);
    if (clean.length < 4) {
      setLinkFeedback({
        type: 'error',
        text: 'Introduce un código válido de 6 caracteres (ej. MIEL26).',
      });
      return;
    }
    setLinkingCode(true);
    setLinkFeedback(null);
    try {
      const worldRow = await joinWorldByCodeInTable(clean);
      setLinkedWorld(
        worldRow.id,
        worldRow.name,
        worldRow.room_code,
        worldRow.anniversary_date
      );
      useWorldStore.setState({ onboardingCompleted: true });
      setJoinCodeInput('');
      soundEngine.playChime();
      setLinkFeedback({
        type: 'ok',
        text: `¡Vinculado al planeta ${worldRow.room_code}! Descargando datos...`,
      });
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('myworld-force-sync'));
      }, 100);
    } catch (err) {
      setLinkFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo vincular el código.',
      });
    } finally {
      setLinkingCode(false);
    }
  };

  // Activar Notificaciones Web Push mediante clic directo del usuario (requisito iOS 16.4+)
  const handleRequestPushPermission = async () => {
    soundEngine.playPop(1.2);
    triggerHeartbeatHaptic('push-permission');
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushStatus('Avisos locales activados en este navegador ✅');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setPushStatus('¡Avisos de tu pareja activados! 🔔💕');
        new Notification(`🪐 ${planetName}`, {
          body: '¡Recibirás aquí las lluvias de besos, antojos y notas del buzón!',
        });
      } else {
        setPushStatus(`Estado del permiso: ${perm}`);
      }
    } catch {
      setPushStatus('¡Avisos configurados en este dispositivo! ✨');
    }
  };

  // Generar y descargar "Nuestro Álbum de Recuerdos" en PDF maquetado listo para imprimir
  const handleDownloadMemoriesPDF = async () => {
    setGeneratingPdf(true);
    soundEngine.playChime();
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const duration = calculateRelationshipDuration(anniversaryDate);

      doc.setFillColor(253, 248, 242);
      doc.rect(0, 0, 210, 297, 'F');
      doc.setDrawColor(74, 63, 53);
      doc.setLineWidth(1.2);
      doc.roundedRect(12, 12, 186, 273, 6, 6, 'S');

      doc.setTextColor(74, 63, 53);
      doc.setFontSize(24);
      doc.text(planetName, 105, 42, { align: 'center' });

      doc.setFontSize(14);
      doc.text(
        `Álbum Oficial de Recuerdos de ${petA.ownerName} y ${petB.ownerName}`,
        105,
        54,
        { align: 'center' }
      );

      doc.setFontSize(11);
      doc.text(
        `Juntos desde el ${anniversaryDate} (${duration.years} años, ${duration.months} meses, ${duration.days} días) · ${totalKissesHistory} besos enviados`,
        105,
        64,
        { align: 'center' }
      );

      let y = 82;

      doc.setFontSize(15);
      doc.text('1. Nuestro Libro Diario y Polaroids (Buzón Postal)', 20, y);
      y += 8;
      doc.setFontSize(10);
      diaryPages.forEach((p) => {
        if (y > 260) {
          doc.addPage();
          y = 25;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`• [${p.date}] ${p.title}`, 22, y);
        y += 5;
        doc.setFont('helvetica', 'italic');
        doc.text(`  «${p.caption}»`, 24, y);
        y += 8;
      });

      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('2. Nuestro Mapa de Viajes y Citas (El Faro)', 20, y);
      y += 8;
      doc.setFontSize(10);
      mapPins.forEach((pin) => {
        if (y > 265) {
          doc.addPage();
          y = 25;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(
          `• ${pin.name} (${pin.status === 'visited' ? 'Visitado' : 'Pendiente'} - ${pin.date})`,
          22,
          y
        );
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(`  ${pin.note}`, 24, y);
        y += 7;
      });

      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('3. Baúl de Antojos y Deseos Cumplidos', 20, y);
      y += 8;
      doc.setFontSize(10);
      cravings
        .filter((c) => c.completed)
        .forEach((c) => {
          if (y > 270) {
            doc.addPage();
            y = 25;
          }
          doc.setFont('helvetica', 'normal');
          doc.text(`• ${c.title} (Cumplido: ${c.completedAt || 'Sí'})`, 22, y);
          y += 6;
        });

      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('4. Nuestra Cartelera en el Cine Retro', 20, y);
      y += 8;
      doc.setFontSize(10);
      mediaItems
        .filter((m) => m.status === 'watched')
        .forEach((m) => {
          if (y > 270) {
            doc.addPage();
            y = 25;
          }
          doc.setFont('helvetica', 'bold');
          doc.text(
            `• ${m.title} (${m.year}) - Nota: ${m.ratingA || 5}/5 y ${m.ratingB || 5}/5`,
            22,
            y
          );
          y += 6;
        });

      doc.save(`Album_MyWorld_${planetName.replace(/\s+/g, '_')}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <AnimatePresence>
      {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
            className="fixed inset-0 w-screen h-[100dvh] z-50 bg-[#4A3F35]/25 backdrop-blur-sm flex flex-col justify-start px-3 safe-modal-inset overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="hand-card watercolor-paper w-full max-w-md mx-auto p-4 flex-1 min-h-0 overflow-y-auto space-y-4"
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between border-b border-[var(--border-ink)]/40 pb-2.5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#FF9EBB]" />
                  Ajustes de Nuestro Planeta
                </h2>
                <motion.button
                  whileTap={{ scale: 0.9, rotate: -2 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 16 }}
                  onClick={() => setSettingsOpen(false)}
                  className="hand-pill px-3.5 py-1 text-xs font-bold cursor-pointer"
                >
                  Cerrar ✕
                </motion.button>
              </div>

              {/* 1. Selector de los 4 Temas Pastel + Modo Noche Conectado */}
              <div className="hand-card p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-[#FF7A9E]" />
                    4 Paletas Pastel
                  </h3>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                    onClick={() =>
                      setSolarOverride(solarOverride === 'night' ? 'auto' : 'night')
                    }
                    className={`hand-pill px-3 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 ${
                      solarOverride === 'night'
                        ? 'bg-[#FFD2DE] text-[#4A3F35] border border-white/80'
                        : 'bg-[#2B3359] text-[#FFF5EE] border border-white/30'
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                    {solarOverride === 'night' ? 'Salir Modo Noche' : 'Cambiar a Azul Noche'}
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <motion.button
                      whileTap={{ scale: 0.93, rotate: -1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`p-2.5 rounded-2xl border flex items-center gap-2 text-left text-xs font-bold cursor-pointer transition-all ${
                        theme === t.id
                          ? 'ring-2 ring-[#FF9EBB] bg-[#FFEAF0]/90 text-[#4A3F35] border-white/90 shadow-xs'
                          : 'bg-[var(--glass-bg)] border-[var(--glass-border)]'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border-2 border-white/90 shadow-xs shrink-0"
                        style={{ backgroundColor: t.swatch }}
                      />
                      <span className="leading-tight">{t.name}</span>
                    </motion.button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  🌙 <strong>Modo Noche Conectado:</strong> De 21:00 a 07:00, el cielo 3D y todos los menús cambian solos a Azul Noche Pastel para no deslumbrar en la cama.
                </p>
              </div>

              {/* 2. Privacidad Multi-Pareja, Código de 6 Caracteres y Estado de Sincronización en Vivo */}
              <div className="hand-card p-3.5 space-y-2.5 text-xs">
                <h3 className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#FF7A9E]" />
                  Sincronización y Código de Mundo (6 caracteres)
                </h3>

                {/* Estado de Sincronización en Vivo */}
                <div className="p-2.5 rounded-2xl bg-[var(--bg-secondary)]/85 border border-[var(--glass-border)] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[11px] flex items-center gap-1.5">
                      {syncStatus === 'connected' && '🟢 Conectado a Supabase'}
                      {(syncStatus === 'syncing' || syncStatus === 'connecting') &&
                        '🟡 Sincronizando con la nube...'}
                      {(syncStatus === 'error' || syncStatus === 'offline') &&
                        '🔴 Modo Local / Error'}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                      Última sync: {formattedLastSync}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span>
                      Realtime:{' '}
                      <strong>
                        {realtimeStatus === 'SUBSCRIBED'
                          ? 'Activo ⚡'
                          : realtimeStatus === 'CONNECTING'
                          ? 'Conectando...'
                          : 'Reconectando'}
                      </strong>
                    </span>
                    {worldId && (
                      <span className="font-mono opacity-75">ID: {worldId.slice(0, 8)}</span>
                    )}
                  </div>
                  {syncError && (
                    <p className="text-[10px] text-[#B4234F] bg-[#FFEAF0] border border-[#FFB7C5] rounded-xl px-2.5 py-1.5 font-semibold break-words">
                      ⚠️ {syncError}
                    </p>
                  )}
                </div>

                {/* Código de Mundo activo (6 caracteres) + Copiar */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-secondary)]/80 border border-[var(--glass-border)]">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      Código de Mundo activo (ambos móviles deben tener el mismo):
                    </span>
                    <span className="text-xl font-bold tracking-widest font-mono">
                      {normalizeRoomCode(roomCode)}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        const clean = normalizeRoomCode(roomCode);
                        navigator.clipboard?.writeText(clean);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="hand-button px-3 py-1.5 bg-[var(--glass-bg)] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedCode ? '¡Copiado!' : 'Copiar'}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9, rotate: -15 }}
                      onClick={async () => {
                        const newCode = generateNewRoomCode();
                        if (worldId) {
                          const res = await updateWorldRoomCodeInTable(worldId, newCode);
                          if (!res.ok) {
                            setLinkFeedback({
                              type: 'error',
                              text:
                                res.error ||
                                'El nuevo código no se pudo guardar en Supabase.',
                            });
                          } else {
                            setLinkFeedback({
                              type: 'ok',
                              text: `Nuevo código ${newCode} guardado en la nube. Compártelo con tu pareja.`,
                            });
                          }
                        }
                      }}
                      className="hand-button p-2 bg-[var(--glass-bg)] cursor-pointer"
                      title="Generar nuevo código"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>

                {/* Botón manual: Forzar sincronización ahora */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleForceSyncNow}
                  disabled={syncStatus === 'syncing'}
                  className="w-full hand-button glossy-pink-cta rounded-full py-2.5 px-3 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {syncStatus === 'syncing'
                      ? 'Sincronizando ahora...'
                      : '🔄 Forzar sincronización ahora'}
                  </span>
                </motion.button>

                {/* Cambiar / Re-vincular código de 6 letras */}
                <div className="pt-1 space-y-1.5">
                  <label className="block text-[11px] font-bold text-[var(--text-ink)]">
                    🔗 Cambiar / Re-vincular código de 6 letras:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={6}
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(normalizeRoomCode(e.target.value))}
                      placeholder="Ej. MIEL26"
                      className="flex-1 min-w-0 px-3 py-2 rounded-2xl border border-[#FFB7C5]/55 bg-[var(--input-bg)] font-mono uppercase text-xs placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                    />
                    <motion.button
                      whileTap={{ scale: 0.92, rotate: -1.5 }}
                      type="button"
                      disabled={linkingCode}
                      onClick={handleRelinkByCode}
                      className="hand-button glossy-mint-cta rounded-full px-4 py-2 font-bold cursor-pointer shrink-0"
                    >
                      {linkingCode ? 'Vinculando...' : 'Re-vincular'}
                    </motion.button>
                  </div>
                  {linkFeedback && (
                    <p
                      className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border ${
                        linkFeedback.type === 'ok'
                          ? 'bg-[#E9FBF2] border-[#9EE6C4] text-[#246646]'
                          : 'bg-[#FFEAF0] border-[#FFB7C5] text-[#B4234F]'
                      }`}
                    >
                      {linkFeedback.text}
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Nombre del Planeta, Pareja, Fechas e Invernadero Lunar */}
              <div className="hand-card p-3.5 space-y-2.5 text-xs">
                <h3 className="font-bold uppercase tracking-wider">
                  🪐 Datos de Nuestro Planeta y Fechas
                </h3>

                <div>
                  <label className="block text-[11px] font-bold mb-0.5">
                    Nombre personalizado del Planeta:
                  </label>
                  <input
                    type="text"
                    value={planetName}
                    onChange={(e) => setPlanetName(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl border border-[#FFB7C5]/55 bg-[var(--input-bg)] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold mb-0.5">Mote Cariñoso 1:</label>
                    <input
                      type="text"
                      value={petA.ownerName}
                      onChange={(e) => setCoupleNames(e.target.value, petB.ownerName)}
                      className="w-full px-3 py-1.5 rounded-2xl border border-[#FFB7C5]/55 bg-[var(--input-bg)] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-0.5">Mote Cariñoso 2:</label>
                    <input
                      type="text"
                      value={petB.ownerName}
                      onChange={(e) => setCoupleNames(petA.ownerName, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-2xl border border-[#FFB7C5]/55 bg-[var(--input-bg)] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1">
                    📱 ¿Quién soy yo en este dispositivo?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      type="button"
                      onClick={() => setActiveUser('userA')}
                      className={`py-2 rounded-2xl font-bold border cursor-pointer transition-all ${
                        activeUser === 'userA'
                          ? 'glossy-pink-cta shadow-xs'
                          : 'bg-[var(--glass-bg)] border-[var(--glass-border)]'
                      }`}
                    >
                      Soy {petA.ownerName}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      type="button"
                      onClick={() => setActiveUser('userB')}
                      className={`py-2 rounded-2xl font-bold border cursor-pointer transition-all ${
                        activeUser === 'userB'
                          ? 'glossy-pink-cta shadow-xs'
                          : 'bg-[var(--glass-bg)] border-[var(--glass-border)]'
                      }`}
                    >
                      Soy {petB.ownerName}
                    </motion.button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold mb-0.5">Fecha de Aniversario:</label>
                    <input
                      type="date"
                      value={anniversaryDate}
                      onChange={(e) => setAnniversaryDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-2xl border border-[#FFB7C5]/55 bg-[var(--input-bg)] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-0.5">Invernadero Lunar:</label>
                    <select
                      value={lunarMode}
                      onChange={(e) =>
                        setLunarMode(e.target.value as 'single' | 'dual' | 'hidden')
                      }
                      className="w-full px-2.5 py-2 rounded-2xl border border-[#FFB7C5]/55 bg-[var(--input-bg)] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF9EBB]"
                    >
                      <option value="single">1 Calendario</option>
                      <option value="dual">2 Calendarios</option>
                      <option value="hidden">Ocultar Edificio</option>
                    </select>
                  </div>
                </div>

                {lunarMode === 'single' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold mb-1">
                      🌙 ¿Quién registra su ciclo en el Invernadero Lunar?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        type="button"
                        onClick={() => setLunarOwner('userA')}
                        className={`py-2 rounded-2xl font-bold border cursor-pointer transition-all ${
                          lunarOwner === 'userA'
                            ? 'glossy-pink-cta shadow-xs'
                            : 'bg-[var(--glass-bg)] border-[var(--glass-border)]'
                        }`}
                      >
                        🌸 {petA.ownerName} (Edita)
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        type="button"
                        onClick={() => setLunarOwner('userB')}
                        className={`py-2 rounded-2xl font-bold border cursor-pointer transition-all ${
                          lunarOwner === 'userB'
                            ? 'glossy-pink-cta shadow-xs'
                            : 'bg-[var(--glass-bg)] border-[var(--glass-border)]'
                        }`}
                      >
                        🌸 {petB.ownerName} (Edita)
                      </motion.button>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      La otra persona verá el calendario en <strong>Modo Solo-Lectura</strong> con el resumen del Óvulo Cute 💕
                    </p>
                  </div>
                )}

                {/* Reseteo de Contador de Besos a 0 sincronizado en ambos dispositivos */}
                <div className="pt-2 border-t border-[var(--border-ink)]/35">
                  {!confirmResetKisses ? (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        setConfirmResetKisses(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-2xl border border-[#FFB7C5]/65 bg-[#FFEAF0]/80 hover:bg-[#FFDCE6] text-[#6B3B4B] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>
                        {kissesResetDone
                          ? '¡Contador de besos reiniciado a 0! ✅'
                          : `Reiniciar contador de besos a 0 (${totalKissesHistory.toLocaleString('es-ES')} actuales)`}
                      </span>
                    </motion.button>
                  ) : (
                    <div className="p-3 rounded-2xl bg-[#FFEAF0]/90 border border-[#FFB7C5] space-y-2 text-center">
                      <p className="text-[11px] font-bold text-[#6B3B4B]">
                        ¿Seguro que quieres poner el contador de besos de ambos a 0?
                      </p>
                      <div className="flex gap-2 justify-center">
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          type="button"
                          onClick={() => {
                            resetKissCounter();
                            setConfirmResetKisses(false);
                            setKissesResetDone(true);
                            setTimeout(() => setKissesResetDone(false), 3000);
                            if (worldId) {
                              window.dispatchEvent(new CustomEvent('myworld-force-sync'));
                            }
                          }}
                          className="hand-button px-3.5 py-1.5 rounded-full bg-[#FF7A9E] text-white font-bold text-xs cursor-pointer"
                        >
                          Sí, reiniciar a 0
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          type="button"
                          onClick={() => setConfirmResetKisses(false)}
                          className="hand-pill px-3.5 py-1.5 bg-white/85 text-[#4A3F35] font-bold text-xs cursor-pointer"
                        >
                          Cancelar
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Tarjeta Interactiva de Ayuda para iPhone / iOS 16.4+ Web Push */}
              <div className="hand-card p-3.5 space-y-2.5 text-xs">
                <h3 className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-[#FF7A9E]" />
                  Avisos en iPhone (iOS PWA) y Android
                </h3>
                <div className="p-3 rounded-2xl bg-[var(--bg-secondary)]/80 border border-[var(--glass-border)] space-y-1 text-[11px]">
                  <p className="font-semibold flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" />
                    1. Toca <strong>Compartir</strong> en Safari
                  </p>
                  <p className="font-semibold">
                    ➕ 2. Pulsa <strong>«Añadir a pantalla de inicio»</strong>
                  </p>
                  <p className="font-semibold">
                    🔔 3. Abre MyWorld desde tu inicio y pulsa el botón de abajo:
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92, rotate: -1.5 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                  onClick={handleRequestPushPermission}
                  className="w-full hand-button glossy-mint-cta rounded-full py-2.5 font-bold cursor-pointer"
                >
                  3. Pulsa aquí para activar avisos de tu pareja 🔔
                </motion.button>
                <p className="text-[11px] text-center font-semibold text-[var(--text-muted)]">
                  Estado: {pushStatus}
                </p>
              </div>

              {/* 5. Botón "Descargar Nuestro Álbum de Recuerdos" en PDF */}
              <div className="hand-card p-4 bg-[var(--bg-secondary)]/90 space-y-2.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-sm font-bold">
                  <BookOpen className="w-4 h-4 text-[#FF7A9E]" />
                  <span>Libro Imprimible para Aniversario</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Recopila todas vuestras Polaroids, dibujos del diario, deseos cumplidos, películas y lugares del mapa con sus fechas en un PDF maquetado.
                </p>
                <motion.button
                  whileTap={{ scale: 0.92, rotate: -1.5 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                  onClick={handleDownloadMemoriesPDF}
                  disabled={generatingPdf}
                  className="w-full hand-button glossy-pink-cta rounded-full py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {generatingPdf
                    ? 'Maquetando vuestro álbum...'
                    : 'Descargar Nuestro Álbum de Recuerdos (PDF)'}
                </motion.button>
              </div>

              {/* 6. Botón de "Cerrar sesión" escondido únicamente al final del menú de Ajustes */}
              <div className="pt-3 border-t border-[var(--border-ink)]/35 text-center space-y-1.5">
                {authUserEmail && (
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Sesión activa: {authUserEmail}
                  </p>
                )}
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => logoutSession()}
                  className="mx-auto px-4 py-1.5 rounded-full text-[11px] font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión en este dispositivo</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
      )}
    </AnimatePresence>
  );
};
