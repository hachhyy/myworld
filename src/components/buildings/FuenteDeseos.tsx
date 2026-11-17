import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Sparkles, CheckCircle2, Archive } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CravingItem, useWorldStore } from '../../store/useWorldStore';
import { soundEngine } from '../../utils/soundAndHaptics';

interface FuenteDeseosProps {
  onClose: () => void;
}

const EMOJI_CHOICES = ['🍜', '💆‍♀️', '🥐', '🍕', '🍦', '🎬', '🏕️', '🍣', '💐', '🧸', '🥞', '🍷'];

export const FuenteDeseos: React.FC<FuenteDeseosProps> = ({ onClose }) => {
  const { activeUser, petA, petB, cravings, addCraving, fulfillCraving } = useWorldStore();

  const [tab, setTab] = useState<'activos' | 'baul'>('activos');
  const [composerOpen, setComposerOpen] = useState(false);
  const [emoji, setEmoji] = useState('🍜');
  const [title, setTitle] = useState('');
  const [timeTag, setTimeTag] = useState<CravingItem['timeTag']>('Antojo de hoy');
  const [intensity, setIntensity] = useState<CravingItem['intensity']>('un_poco');

  const activeCravings = cravings.filter((c) => !c.completed);
  const completedCravings = cravings.filter((c) => c.completed);

  const handleCreateCraving = () => {
    if (!title.trim()) return;
    addCraving({
      creator: activeUser,
      emoji,
      title: title.trim(),
      timeTag,
      intensity,
    });
    setTitle('');
    setComposerOpen(false);
  };

  const handleFulfill = (id: string) => {
    fulfillCraving(id);
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#F6B89E', '#A8D5BA', '#C9B8E8', '#F9DF92', '#FFB5C2'],
    });
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] z-40 flex flex-col watercolor-paper overflow-hidden overscroll-none">
      {/* Cabecera con Safe Area superior de iOS */}
      <div className="safe-top-header px-4 pb-3 flex items-center justify-between gap-2 border-b-2 border-[var(--border-ink)] bg-[var(--bg-card)]">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          className="hand-button px-3 py-1.5 bg-[var(--bg-paper)] text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Planeta
        </motion.button>
        <div className="text-center">
          <h1 className="text-base font-bold">🧁 La Fuente de los Deseos</h1>
          <p className="text-[11px] text-[var(--text-muted)]">
            Tablón Vivo de Antojos y Caprichos
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            soundEngine.playPop();
            setComposerOpen(!composerOpen);
          }}
          className="hand-button px-3 py-1.5 bg-[var(--accent-primary)] text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nuevo Antojo
        </motion.button>
      </div>

      {/* Pestañas: Tablón Vivo vs Baúl de Deseos Cumplidos */}
      <div className="px-3 pt-2.5 flex gap-2 max-w-md mx-auto w-full">
        <button
          onClick={() => setTab('activos')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 border-[var(--border-ink)] cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'activos' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Tablón Vivo ({activeCravings.length})
        </button>
        <button
          onClick={() => setTab('baul')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 border-[var(--border-ink)] cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'baul' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Baúl Cumplidos ({completedCravings.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-w-md mx-auto w-full">
        {/* Creador de tarjeta de antojo */}
        <AnimatePresence>
          {composerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              className="hand-card p-4 bg-[var(--bg-card)] space-y-3"
            >
              <h2 className="text-sm font-bold">Pedir un nuevo antojo o plan juntos ✨</h2>

              {/* Selector de Emoji Gigante */}
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Elige el emoji gigante de tu tarjeta:
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {EMOJI_CHOICES.map((em) => (
                    <button
                      key={em}
                      onClick={() => setEmoji(em)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 border-[var(--border-ink)] shrink-0 cursor-pointer ${
                        emoji === em ? 'bg-[var(--accent-primary)] scale-105' : 'bg-[var(--bg-paper)]'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Ir a por ramen, Tarde de manta y peli, Masaje..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] text-xs font-bold"
              />

              {/* Etiqueta temporal */}
              <div className="flex gap-1.5">
                {(['Antojo de hoy', 'Para este finde', 'Regalo futuro'] as const).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTimeTag(tag)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border border-[var(--border-ink)] cursor-pointer ${
                      timeTag === tag ? 'bg-[var(--accent-highlight)] text-[#4A3F35]' : 'bg-[var(--bg-paper)]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Selector de Intensidad */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIntensity('un_poco')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border-2 border-[var(--border-ink)] cursor-pointer ${
                    intensity === 'un_poco' ? 'bg-[#A8D5BA] text-[#2B3A30]' : 'bg-[var(--bg-paper)]'
                  }`}
                >
                  😊 Me apetece un poco
                </button>
                <button
                  onClick={() => setIntensity('emergencia')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border-2 border-[var(--border-ink)] cursor-pointer ${
                    intensity === 'emergencia' ? 'bg-rose-300 text-rose-950' : 'bg-[var(--bg-paper)]'
                  }`}
                >
                  🚨 Emergencia de antojo
                </button>
              </div>

              <button
                onClick={handleCreateCraving}
                className="w-full hand-button py-2 bg-[var(--accent-primary)] text-xs font-bold cursor-pointer"
              >
                Colgar Tarjeta en el Tablón 📌
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {tab === 'activos' ? (
          <div className="space-y-3">
            {activeCravings.map((c) => {
              const isEmergency = c.intensity === 'emergencia';
              return (
                <motion.div
                  key={c.id}
                  animate={
                    isEmergency
                      ? {
                          rotate: [0, -1.2, 1.2, -1.2, 0],
                          scale: [1, 1.015, 1],
                        }
                      : {}
                  }
                  transition={
                    isEmergency
                      ? { duration: 1.8, repeat: Infinity, repeatDelay: 0.8 }
                      : {}
                  }
                  className={`hand-card p-3.5 flex items-center justify-between gap-3 ${
                    isEmergency
                      ? 'bg-gradient-to-r from-[var(--bg-card)] to-rose-100/80 ring-2 ring-rose-400/70'
                      : 'bg-[var(--bg-card)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-ink)] flex items-center justify-center text-3xl shrink-0 shadow-xs">
                      {c.emoji}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1 mb-1">
                        <span className="hand-pill px-2 py-0.5 text-[10px] font-bold bg-[var(--bg-secondary)]">
                          {c.timeTag}
                        </span>
                        <span
                          className={`hand-pill px-2 py-0.5 text-[10px] font-bold ${
                            isEmergency
                              ? 'bg-rose-400 text-white'
                              : 'bg-emerald-200 text-emerald-950'
                          }`}
                        >
                          {isEmergency ? 'Emergencia de antojo 🚨' : 'Me apetece un poco'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold leading-snug">{c.title}</h3>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Pedido por {c.creator === 'userA' ? petA.ownerName : petB.ownerName} · {c.createdAt}
                      </p>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleFulfill(c.id)}
                    className="hand-button px-3 py-2 bg-[var(--accent-primary)] text-xs font-bold flex flex-col items-center gap-0.5 shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Cumplido!</span>
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="hand-card p-3 bg-[var(--bg-secondary)] text-xs text-center font-medium">
              ✨ Cada deseo cumplido llena el cariño de {petA.petName} y {petB.petName} en la Casita y queda guardado aquí para siempre.
            </div>
            {completedCravings.map((c) => (
              <div
                key={c.id}
                className="hand-card p-3 bg-[var(--bg-card)] flex items-center justify-between gap-3 opacity-90"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{c.emoji}</span>
                  <div>
                    <h3 className="text-sm font-bold">{c.title}</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      De {c.creator === 'userA' ? petA.ownerName : petB.ownerName} · Cumplido el {c.completedAt} 💕
                    </p>
                  </div>
                </div>
                <span className="hand-pill px-2.5 py-1 text-[10px] font-bold bg-emerald-200 text-emerald-950">
                  Hecho realidad ✨
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
