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
import { joinWorldByCodeInTable, pushWorldStateToSupabase } from '../lib/supabaseClient';
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
  } = useWorldStore();

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [pushStatus, setPushStatus] = useState<string>('Pendiente de activar');
  const [copiedCode, setCopiedCode] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [confirmResetKisses, setConfirmResetKisses] = useState(false);
  const [kissesResetDone, setKissesResetDone] = useState(false);

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
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center px-4 safe-modal-inset"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="hand-card watercolor-paper w-full max-w-md p-4 max-h-[88vh] overflow-y-auto space-y-4"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-[var(--border-ink)]/20 pb-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Ajustes de Nuestro Planeta
              </h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="hand-pill px-3 py-1 text-xs font-bold bg-[var(--bg-card)] cursor-pointer"
              >
                Cerrar ✕
              </button>
            </div>

            {/* 1. Selector de los 4 Temas Pastel + Modo Noche Conectado */}
            <div className="hand-card p-3.5 bg-[var(--bg-card)] space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4" />
                  4 Paletas Pastel Artesanales
                </h3>
                <button
                  onClick={() =>
                    setSolarOverride(solarOverride === 'night' ? 'auto' : 'night')
                  }
                  className="hand-pill px-2.5 py-0.5 text-[11px] font-bold bg-[#1E2436] text-[#F7E8C4] flex items-center gap-1 cursor-pointer"
                >
                  <Moon className="w-3 h-3" />
                  {solarOverride === 'night' ? 'Salir Modo Noche' : 'Cambiar a Azul Noche'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`p-2 rounded-xl border-2 border-[var(--border-ink)] flex items-center gap-2 text-left text-xs font-bold cursor-pointer ${
                      theme === t.id
                        ? 'ring-2 ring-[var(--border-ink)] bg-[var(--bg-secondary)]'
                        : 'bg-[var(--bg-paper)]'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full border border-[#4A3F35] shrink-0"
                      style={{ backgroundColor: t.swatch }}
                    />
                    <span className="leading-tight">{t.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                🌙 <strong>Modo Noche Conectado:</strong> De 21:00 a 07:00, el cielo 3D y todos los menús cambian solos a Azul Noche Pastel (<code>#1E2436</code>) para no deslumbrar en la cama.
              </p>
            </div>

            {/* 2. Privacidad Multi-Pareja y Código de Vinculación de 6 Caracteres */}
            <div className="hand-card p-3.5 bg-[var(--bg-card)] space-y-2.5 text-xs">
              <h3 className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                Sala Privada Multi-Pareja (Código 6 caracteres)
              </h3>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-ink)]">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">
                    Código único de vuestro planeta:
                  </span>
                  <span className="text-xl font-bold tracking-widest font-mono">
                    {roomCode}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(roomCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="hand-button px-2.5 py-1.5 bg-[var(--bg-card)] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedCode ? '¡Copiado!' : 'Copiar'}
                  </button>
                  <button
                    onClick={() => generateNewRoomCode()}
                    className="hand-button p-1.5 bg-[var(--bg-card)] cursor-pointer"
                    title="Generar nuevo código"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Introducir código de mi pareja (6 letras/números)..."
                  className="flex-1 px-2.5 py-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-mono uppercase"
                />
                <button
                  onClick={async () => {
                    if (joinCodeInput.trim().length >= 4) {
                      const worldRow = await joinWorldByCodeInTable(joinCodeInput.trim());
                      setLinkedWorld(
                        worldRow.id,
                        worldRow.name,
                        worldRow.room_code,
                        worldRow.anniversary_date
                      );
                      useWorldStore.setState({ onboardingCompleted: true });
                      setJoinCodeInput('');
                      soundEngine.playChime();
                    }
                  }}
                  className="hand-button px-3 py-1.5 bg-[var(--accent-primary)] font-bold cursor-pointer"
                >
                  Vincular
                </button>
              </div>
            </div>

            {/* 3. Nombre del Planeta, Pareja, Fechas e Invernadero Lunar */}
            <div className="hand-card p-3.5 bg-[var(--bg-card)] space-y-2.5 text-xs">
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
                  className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold mb-0.5">Mote Cariñoso 1:</label>
                  <input
                    type="text"
                    value={petA.ownerName}
                    onChange={(e) => setCoupleNames(e.target.value, petB.ownerName)}
                    className="w-full px-2.5 py-1 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-0.5">Mote Cariñoso 2:</label>
                  <input
                    type="text"
                    value={petB.ownerName}
                    onChange={(e) => setCoupleNames(petA.ownerName, e.target.value)}
                    className="w-full px-2.5 py-1 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1">
                  📱 ¿Quién soy yo en este dispositivo?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveUser('userA')}
                    className={`py-1.5 rounded-xl font-bold border border-[var(--border-ink)] cursor-pointer ${
                      activeUser === 'userA' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-paper)]'
                    }`}
                  >
                    Soy {petA.ownerName}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveUser('userB')}
                    className={`py-1.5 rounded-xl font-bold border border-[var(--border-ink)] cursor-pointer ${
                      activeUser === 'userB' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-paper)]'
                    }`}
                  >
                    Soy {petB.ownerName}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold mb-0.5">Fecha de Aniversario:</label>
                  <input
                    type="date"
                    value={anniversaryDate}
                    onChange={(e) => setAnniversaryDate(e.target.value)}
                    className="w-full px-2 py-1 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-0.5">Invernadero Lunar:</label>
                  <select
                    value={lunarMode}
                    onChange={(e) =>
                      setLunarMode(e.target.value as 'single' | 'dual' | 'hidden')
                    }
                    className="w-full px-2 py-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-bold"
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
                    <button
                      type="button"
                      onClick={() => setLunarOwner('userA')}
                      className={`py-1.5 rounded-xl font-bold border border-[var(--border-ink)] cursor-pointer ${
                        lunarOwner === 'userA'
                          ? 'bg-pink-200 text-pink-950'
                          : 'bg-[var(--bg-paper)]'
                      }`}
                    >
                      🌸 {petA.ownerName} (Edita)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLunarOwner('userB')}
                      className={`py-1.5 rounded-xl font-bold border border-[var(--border-ink)] cursor-pointer ${
                        lunarOwner === 'userB'
                          ? 'bg-pink-200 text-pink-950'
                          : 'bg-[var(--bg-paper)]'
                      }`}
                    >
                      🌸 {petB.ownerName} (Edita)
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    La otra persona verá el calendario en <strong>Modo Solo-Lectura</strong> con el resumen del Óvulo Cute 💕
                  </p>
                </div>
              )}

              {/* Reseteo de Contador de Besos a 0 sincronizado en ambos dispositivos */}
              <div className="pt-2 border-t border-[var(--border-ink)]/15">
                {!confirmResetKisses ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      setConfirmResetKisses(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-rose-300 bg-rose-50/70 hover:bg-rose-100/80 text-rose-900 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {kissesResetDone
                        ? '¡Contador de besos reiniciado a 0! ✅'
                        : `Reiniciar contador de besos a 0 (${totalKissesHistory.toLocaleString('es-ES')} actuales)`}
                    </span>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-xl bg-rose-100/85 border border-rose-300 space-y-2 text-center">
                    <p className="text-[11px] font-bold text-rose-950">
                      ¿Seguro que quieres poner el contador de besos de ambos a 0?
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={async () => {
                          resetKissCounter();
                          setConfirmResetKisses(false);
                          setKissesResetDone(true);
                          setTimeout(() => setKissesResetDone(false), 3000);
                          if (worldId) {
                            const st = useWorldStore.getState();
                            await pushWorldStateToSupabase(worldId, st.roomCode, {
                              worldId,
                              planetName: st.planetName,
                              anniversaryDate: st.anniversaryDate,
                              theme: st.theme,
                              currency: st.currency,
                              lunarMode: st.lunarMode,
                              lunarOwner: st.lunarOwner,
                              totalKissesHistory: 0,
                              pendingKissBursts: [],
                              petA: st.petA,
                              petB: st.petB,
                              petCare: st.petCare,
                              diaryPages: st.diaryPages,
                              mediaItems: st.mediaItems,
                              mapPins: st.mapPins,
                              cravings: st.cravings,
                              expenses: st.expenses,
                              savingsGoals: st.savingsGoals,
                              lunarA: st.lunarA,
                              lunarB: st.lunarB,
                            });
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Sí, reiniciar a 0
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmResetKisses(false)}
                        className="px-3 py-1 rounded-lg bg-white/80 text-rose-950 font-bold text-xs border border-rose-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Tarjeta Interactiva de Ayuda para iPhone / iOS 16.4+ Web Push */}
            <div className="hand-card p-3.5 bg-[var(--bg-card)] space-y-2.5 text-xs">
              <h3 className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-rose-500" />
                Avisos en iPhone (iOS PWA) y Android
              </h3>
              <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] space-y-1 text-[11px]">
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
                whileTap={{ scale: 0.95 }}
                onClick={handleRequestPushPermission}
                className="w-full hand-button py-2 bg-[var(--accent-secondary)] text-[#4A3F35] font-bold cursor-pointer"
              >
                3. Pulsa aquí para activar avisos de tu pareja 🔔
              </motion.button>
              <p className="text-[11px] text-center font-semibold text-[var(--text-muted)]">
                Estado: {pushStatus}
              </p>
            </div>

            {/* 5. Botón "Descargar Nuestro Álbum de Recuerdos" en PDF */}
            <div className="hand-card p-4 bg-[var(--bg-secondary)] space-y-2 text-center">
              <div className="flex items-center justify-center gap-1.5 text-sm font-bold">
                <BookOpen className="w-4 h-4" />
                <span>Libro Imprimible para Aniversario</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Recopila todas vuestras Polaroids, dibujos del diario, deseos cumplidos, películas y lugares del mapa con sus fechas en un PDF maquetado.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDownloadMemoriesPDF}
                disabled={generatingPdf}
                className="w-full hand-button py-2.5 bg-[var(--accent-primary)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {generatingPdf
                  ? 'Maquetando vuestro álbum...'
                  : 'Descargar Nuestro Álbum de Recuerdos (PDF)'}
              </motion.button>
            </div>

            {/* 6. Botón de "Cerrar sesión" escondido únicamente al final del menú de Ajustes */}
            <div className="pt-3 border-t border-[var(--border-ink)]/15 text-center space-y-1.5">
              {authUserEmail && (
                <p className="text-[10px] text-[var(--text-muted)]">
                  Sesión activa: {authUserEmail}
                </p>
              )}
              <button
                onClick={() => logoutSession()}
                className="mx-auto px-3 py-1.5 rounded-xl text-[11px] font-semibold text-rose-700/80 hover:text-rose-800 hover:bg-rose-100/50 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión en este dispositivo</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
