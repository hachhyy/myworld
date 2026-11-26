import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Camera,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  PolaroidFrameStyle,
  useWorldStore,
} from '../../store/useWorldStore';
import { compressImageToWebP } from '../../utils/imageCompression';
import { soundEngine } from '../../utils/soundAndHaptics';
import { PolaroidUploader } from '../ui/PolaroidUploader';

interface BuzonDiarioProps {
  onClose: () => void;
}

const FRAME_STYLES: { id: PolaroidFrameStyle; label: string; css: string }[] = [
  { id: 'clasico', label: 'Blanco Clásico', css: 'bg-[#FFFDF9]' },
  {
    id: 'vichy',
    label: 'Cuadros Vichy',
    css: 'bg-[repeating-linear-gradient(45deg,#FFE5EC,#FFE5EC_10px,#FFFDF9_10px,#FFFDF9_20px)]',
  },
  { id: 'estrellitas', label: 'Estrellitas ✨', css: 'bg-[#F4F0FF]' },
  { id: 'flores', label: 'Flores 🌸', css: 'bg-[#F2F9F1]' },
  { id: 'rosa_pastel', label: 'Rosa Pastel', css: 'bg-[#FFD6E0]' },
];

export const BuzonDiario: React.FC<BuzonDiarioProps> = ({ onClose }) => {
  const {
    activeUser,
    petA,
    petB,
    diaryPages,
    addDiaryPage,
    updateDiaryPage,
    updateDiaryPagePhoto,
    deleteDiaryPage,
    markDiaryPagesRead,
  } = useWorldStore();

  const [pageIndex, setPageIndex] = useState(0);
  const [creatingNew, setCreatingNew] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Estado para crear nueva página en Modo Estricto Polaroid
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newFrame, setNewFrame] = useState<PolaroidFrameStyle>('vichy');
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | undefined>(undefined);
  const [newPhotoKB, setNewPhotoKB] = useState<number | undefined>(undefined);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingExistingPhoto, setUploadingExistingPhoto] = useState(false);
  const existingPhotoInputRef = useRef<HTMLInputElement>(null);

  // Al abrir el buzón, marcar páginas como leídas por el usuario activo
  useEffect(() => {
    markDiaryPagesRead(activeUser);
  }, [activeUser, markDiaryPagesRead]);

  const safeIndex = Math.min(pageIndex, Math.max(0, diaryPages.length - 1));
  const currentPage = diaryPages[safeIndex];

  const handleTurnPage = (dir: -1 | 1) => {
    const next = safeIndex + dir;
    if (next < 0 || next >= diaryPages.length) return;
    soundEngine.playPageTurn();
    setConfirmDeleteId(null);
    setPageIndex(next);
  };

  const handleExistingPagePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentPage) return;
    setUploadingExistingPhoto(true);
    try {
      const result = await compressImageToWebP(file);
      updateDiaryPagePhoto(currentPage.id, result.dataUrl);
    } finally {
      setUploadingExistingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSaveNewPage = () => {
    if (isUploadingPhoto) {
      setSaveError('Espera un segundito mientras se termina de revelar la foto... 📸');
      soundEngine.playPop(0.8);
      return;
    }
    if (!newTitle.trim() && !newCaption.trim() && !newPhotoUrl) {
      setSaveError('Sube una foto o escribe un título/nota antes de guardarla en el buzón 💌');
      soundEngine.playPop(0.8);
      return;
    }
    setSaveError(null);
    const todayStr = new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    addDiaryPage({
      date: todayStr,
      author: activeUser,
      title: newTitle.trim() || 'Nuestro recuerdo en Polaroid 📸',
      caption: newCaption.trim() || 'Un momento especial guardado juntos 💕',
      photoDataUrl: newPhotoUrl,
      photoSizeKB: newPhotoKB,
      frameStyle: newFrame,
      canvasBgColor: '#FFFDF9',
      strokes: [],
      stickers: [],
    });
    soundEngine.playChime();
    setNewTitle('');
    setNewCaption('');
    setNewPhotoUrl(undefined);
    setNewPhotoKB(undefined);
    setCreatingNew(false);
    setPageIndex(0);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3200);
  };

  return (
    <div className="fixed inset-0 w-full z-40 flex flex-col watercolor-paper overflow-hidden overscroll-none">
      {/* Cabecera con Safe Area superior de iOS */}
      <div className="safe-top-header px-4 pb-3 flex items-center justify-between gap-2 border-b-2 border-[var(--border-ink)] bg-[var(--bg-card)]">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          className="hand-button px-3 py-1.5 bg-[var(--bg-paper)] text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Planeta
        </motion.button>
        <div className="text-center min-w-0">
          <h1 className="text-sm sm:text-base font-bold truncate">📮 Cabaña Postal</h1>
          <p className="text-[11px] text-[var(--text-muted)] truncate">
            Álbum Polaroid y Notas
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            soundEngine.playPageTurn();
            setCreatingNew(!creatingNew);
          }}
          className="hand-button px-3 py-1.5 bg-[var(--accent-primary)] text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          {creatingNew ? 'Ver Álbum' : 'Nueva'}
        </motion.button>
      </div>

      {/* CONTENIDO PRINCIPAL: CREADOR DE NUEVA POLAROID O VISOR ESTRICTO POLAROID */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 safe-bottom-dock flex flex-col items-center">
        {creatingNew ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md hand-card p-4 space-y-3 bg-[var(--bg-card)]"
          >
            <h2 className="text-base font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Revelar nueva Polaroid en el Buzón
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Sube una foto desde vuestra galería y escribe el pie de foto con letra manuscrita. Una esquinita asomará por el Buzón 3D de tu pareja hasta que la abra 💌
            </p>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                if (saveError) setSaveError(null);
              }}
              placeholder="Título del recuerdo (ej. Domingo de tortitas)..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] text-sm font-bold"
            />

            {/* Visor Polaroid Interactivo de Subida de Foto */}
            <div className="space-y-2">
              <PolaroidUploader
                captionPreview={newCaption || newTitle || 'Nuestro recuerdo en el buzón 💌'}
                onProcessingChange={setIsUploadingPhoto}
                onPhotoChange={(dataUrl, kb) => {
                  setNewPhotoUrl(dataUrl);
                  setNewPhotoKB(kb);
                  if (saveError) setSaveError(null);
                }}
              />

              {/* Selector de diseño de marco Polaroid */}
              <div className="flex gap-1.5 overflow-x-auto py-1">
                {FRAME_STYLES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setNewFrame(f.id)}
                    className={`hand-pill px-2.5 py-1 text-[11px] font-semibold shrink-0 cursor-pointer ${
                      newFrame === f.id ? 'bg-[var(--accent-primary)] font-bold' : 'bg-[var(--bg-paper)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={newCaption}
              onChange={(e) => {
                setNewCaption(e.target.value);
                if (saveError) setSaveError(null);
              }}
              rows={3}
              placeholder="Escribe el pie de foto con letra manuscrita Caveat..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-hand text-2xl"
            />

            {saveError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center">
                {saveError}
              </p>
            )}

            <motion.button
              type="button"
              whileTap={{ scale: isUploadingPhoto ? 1 : 0.95 }}
              disabled={isUploadingPhoto}
              onClick={handleSaveNewPage}
              className="w-full hand-button py-2.5 bg-[var(--accent-primary)] font-bold text-sm cursor-pointer disabled:opacity-60"
            >
              {isUploadingPhoto ? 'Revelando foto... 📸' : 'Guardar Polaroid y meter en el Buzón 📮'}
            </motion.button>
          </motion.div>
        ) : diaryPages.length === 0 ? (
          <div className="w-full max-w-md hand-card p-6 bg-[var(--bg-card)] text-center space-y-3 my-auto">
            <span className="text-4xl block">📸💌</span>
            <h2 className="text-base font-bold">Vuestro Álbum Polaroid está vacío</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Pulsa en «Nueva Polaroid» para subir vuestra primera foto juntos con celo Washi-Tape y nota manuscrita.
            </p>
            <button
              onClick={() => setCreatingNew(true)}
              className="hand-button px-4 py-2 bg-[var(--accent-primary)] text-xs font-bold cursor-pointer"
            >
              + Crear primera Polaroid
            </button>
          </div>
        ) : (
          currentPage && (
            <div className="w-full max-w-md flex flex-col gap-3">
              {saveSuccess && (
                <div className="w-full rounded-2xl border border-emerald-300 bg-emerald-50/90 px-3 py-2 text-center text-xs font-bold text-emerald-700 shadow-sm">
                  ¡Polaroid guardada y metida en el Buzón! 📮✨
                </div>
              )}

              {/* Navegador de páginas del libro con sonido de papel */}
              <div className="flex items-center justify-between px-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={safeIndex === 0}
                  onClick={() => handleTurnPage(-1)}
                  className="hand-pill px-3 py-1 bg-[var(--bg-card)] text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </motion.button>

                <span className="text-xs font-bold">
                  Página {safeIndex + 1} de {diaryPages.length} · {currentPage.date}
                </span>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={safeIndex >= diaryPages.length - 1}
                  onClick={() => handleTurnPage(1)}
                  className="hand-pill px-3 py-1 bg-[var(--bg-card)] text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>

              {/* HOJA FÍSICA DEL LIBRO — MODO ESTRICTO POLAROID (SOLO FOTO + TEXTO CAVEAT) */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage.id}
                  initial={{ rotateY: -18, opacity: 0, x: 20 }}
                  animate={{ rotateY: 0, opacity: 1, x: 0 }}
                  exit={{ rotateY: 18, opacity: 0, x: -20 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 25 }}
                  className="hand-card p-5 bg-[var(--bg-card)] relative overflow-hidden"
                >
                  {/* Encuadernación lateral de anillas artesanal */}
                  <div className="absolute left-2 top-5 bottom-5 w-1.5 flex flex-col justify-between opacity-35 pointer-events-none">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="w-2.5 h-2.5 rounded-full border-2 border-[#4A3F35]" />
                    ))}
                  </div>

                  <div className="pl-4 space-y-4">
                    {/* Cabecera de la página (Título editable) + Botón discreto de borrado con micro-confirmación */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={currentPage.title}
                          onChange={(e) =>
                            updateDiaryPage(currentPage.id, { title: e.target.value })
                          }
                          placeholder="Título del recuerdo (toca para editar)..."
                          className="w-full bg-transparent border-b border-dashed border-[#4A3F35]/30 focus:border-[#4A3F35] focus:outline-none text-base font-bold leading-snug pb-0.5"
                        />
                        <span className="hand-pill inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold bg-[var(--bg-secondary)]">
                          Por {currentPage.author === 'userA' ? petA.ownerName : petB.ownerName}
                        </span>
                      </div>

                      {confirmDeleteId === currentPage.id ? (
                        <div className="flex items-center gap-1 bg-rose-100 border border-rose-300 px-2 py-1 rounded-xl shrink-0">
                          <span className="text-[10px] font-bold text-rose-900">¿Borrar hoja?</span>
                          <button
                            onClick={() => {
                              deleteDiaryPage(currentPage.id);
                              setConfirmDeleteId(null);
                              setPageIndex((idx) => Math.max(0, idx - 1));
                            }}
                            className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 rounded-lg bg-white text-rose-900 text-[10px] font-bold cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            soundEngine.playPop();
                            setConfirmDeleteId(currentPage.id);
                          }}
                          title="Borrar esta página del diario"
                          className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50/80 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* MARCO POLAROID CON CELO WASHI-TAPE + NOTA MANUSCRITA EDITABLE EN CAVEAT */}
                    <div
                      className={`p-3.5 pb-5 rounded-2xl border-2 border-[#4A3F35] shadow-lg relative ${
                        FRAME_STYLES.find((f) => f.id === currentPage.frameStyle)?.css || 'bg-[#FFFDF9]'
                      }`}
                    >
                      {/* Celo Washi-Tape superior */}
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-2 w-24 h-4.5 bg-[#FFB5C2] border border-[#4A3F35] opacity-92 shadow-2xs" />

                      {/* Decoración sutil del marco */}
                      {currentPage.frameStyle === 'estrellitas' && (
                        <div className="flex justify-between text-xs mb-1.5">
                          <span>✨ ⭐ ✨</span>
                          <span>🌟 ✨</span>
                        </div>
                      )}
                      {currentPage.frameStyle === 'flores' && (
                        <div className="flex justify-between text-xs mb-1.5">
                          <span>🌸 🌼 🌸</span>
                          <span>🌷 🌸</span>
                        </div>
                      )}

                      <input
                        ref={existingPhotoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleExistingPagePhotoUpload}
                        className="hidden"
                      />

                      {currentPage.photoDataUrl &&
                      !currentPage.photoDataUrl.startsWith('data:image/svg+xml') ? (
                        <div className="relative rounded-2xl overflow-hidden border border-[#FFB7C5]/60 bg-[#FFF5EE]/60 shadow-xs group">
                          <img
                            src={currentPage.photoDataUrl}
                            alt={currentPage.title}
                            className="w-full h-60 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => existingPhotoInputRef.current?.click()}
                            className="absolute bottom-2 right-2 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 text-[10px] font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Camera className="w-3 h-3" />
                            Cambiar foto
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => existingPhotoInputRef.current?.click()}
                          className="w-full h-52 rounded-2xl border-2 border-dashed border-[#FFB7C5]/70 bg-[#FFF5EE]/90 hover:bg-[#FFEAF0]/80 flex flex-col items-center justify-center text-center p-4 transition-colors cursor-pointer gap-1.5"
                        >
                          <Camera className="w-7 h-7 text-[#FF9EBB]" />
                          <span className="text-xs font-bold text-[#4A3F35]">
                            {uploadingExistingPhoto
                              ? 'Revelando Polaroid...'
                              : 'Toca aquí para añadir vuestra foto desde la galería 📸'}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            Se enmarcará automáticamente en esta Polaroid con celo Washi-Tape
                          </span>
                        </button>
                      )}

                      {/* Nota manuscrita Caveat siempre editable debajo de la foto (compatible con Swipe Typing de iOS) */}
                      <textarea
                        value={currentPage.caption}
                        onChange={(e) =>
                          updateDiaryPage(currentPage.id, { caption: e.target.value })
                        }
                        rows={3}
                        placeholder="Toca aquí para escribir vuestra nota manuscrita..."
                        className="w-full bg-transparent font-hand text-2xl text-[#4A3F35] text-center mt-4 px-2 py-1 leading-snug resize-none border-b border-dashed border-[#FFB7C5]/65 focus:border-[#FF9EBB] focus:outline-none"
                      />
                    </div>

                    {/* Botón visible para confirmar guardado / crear nueva página */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                        ✓ Guardado automático en vuestro planeta
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.92, rotate: -1.5 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                        onClick={() => {
                          soundEngine.playPageTurn();
                          setCreatingNew(true);
                        }}
                        className="hand-pill glossy-pink-cta px-3.5 py-1.5 text-xs font-bold cursor-pointer shrink-0"
                      >
                        💾 Guardar / Nueva página +
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )
        )}
      </div>
    </div>
  );
};

