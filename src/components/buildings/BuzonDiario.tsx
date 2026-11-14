import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Camera,
  Paintbrush,
  Sparkles,
  Eraser,
  PaintBucket,
} from 'lucide-react';
import getStroke from 'perfect-freehand';
import {
  DiarySticker,
  DrawingStroke,
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

const STICKER_TRAY = ['💕', '🩹', '⭐', '🌸', '🥹', '🥞', '🐾', '💌', '🍓', '✨'];

const COLORS = ['#4A3F35', '#E88B84', '#F6B89E', '#88C9A1', '#8CC5E3', '#C9B8E8', '#FFE066'];

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

export const BuzonDiario: React.FC<BuzonDiarioProps> = ({ onClose }) => {
  const {
    activeUser,
    petA,
    petB,
    diaryPages,
    addDiaryPage,
    addStrokeToDiaryPage,
    addStickerToDiaryPage,
    markDiaryPagesRead,
  } = useWorldStore();

  const [pageIndex, setPageIndex] = useState(0);
  const [creatingNew, setCreatingNew] = useState(false);

  // Estado para el Lienzo Colaborativo a 4 Manos sobre la página actual
  const [activeTool, setActiveTool] = useState<'acuarela' | 'rotulador' | 'cera' | 'goma'>('acuarela');
  const [strokeColor, setStrokeColor] = useState('#E88B84');
  const [currentPoints, setCurrentPoints] = useState<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const svgCanvasRef = useRef<SVGSVGElement>(null);

  // Estado para crear nueva página con Polaroid WebP
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newFrame, setNewFrame] = useState<PolaroidFrameStyle>('vichy');
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | undefined>(undefined);
  const [newPhotoKB, setNewPhotoKB] = useState<number | undefined>(undefined);
  const [compressing, setCompressing] = useState(false);

  // Al abrir el buzón, marcar páginas como leídas por el usuario activo
  useEffect(() => {
    markDiaryPagesRead(activeUser);
  }, [activeUser, markDiaryPagesRead]);

  const currentPage = diaryPages[pageIndex] || diaryPages[0];

  const handleTurnPage = (dir: -1 | 1) => {
    const next = pageIndex + dir;
    if (next < 0 || next >= diaryPages.length) return;
    soundEngine.playPageTurn();
    setPageIndex(next);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const result = await compressImageToWebP(file);
      setNewPhotoUrl(result.dataUrl);
      setNewPhotoKB(result.sizeKB);
      soundEngine.playChime();
    } finally {
      setCompressing(false);
    }
  };

  const handleSaveNewPage = () => {
    if (!newTitle.trim() && !newCaption.trim()) return;
    const todayStr = new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    addDiaryPage({
      date: todayStr,
      author: activeUser,
      title: newTitle.trim() || 'Un recuerdo muy nuestro ✨',
      caption: newCaption.trim() || 'Guardado con cariño en nuestro buzón.',
      photoDataUrl: newPhotoUrl,
      photoSizeKB: newPhotoKB,
      frameStyle: newFrame,
      canvasBgColor: '#FFFDF9',
      strokes: [],
      stickers: [{ id: `st-${Date.now()}`, emoji: '💕', x: 82, y: 20 }],
    });
    setNewTitle('');
    setNewCaption('');
    setNewPhotoUrl(undefined);
    setNewPhotoKB(undefined);
    setCreatingNew(false);
    setPageIndex(0);
  };

  // Dibujo a 4 manos en el SVG de la página actual
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!currentPage) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setCurrentPoints([[x, y, e.pressure || 0.5]]);
    soundEngine.playBrushNoise();
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPoints((pts) => [...pts, [x, y, e.pressure || 0.5]]);
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentPage || currentPoints.length < 2) {
      setIsDrawing(false);
      setCurrentPoints([]);
      return;
    }
    const newStroke: DrawingStroke = {
      id: `stroke-${Date.now()}`,
      tool: activeTool,
      color: activeTool === 'goma' ? currentPage.canvasBgColor : strokeColor,
      size: activeTool === 'acuarela' ? 16 : activeTool === 'rotulador' ? 9 : activeTool === 'cera' ? 6 : 18,
      points: currentPoints,
      author: activeUser,
    };
    addStrokeToDiaryPage(currentPage.id, newStroke);
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const handleAddSticker = (emoji: string) => {
    if (!currentPage) return;
    const st: DiarySticker = {
      id: `st-${Date.now()}`,
      emoji,
      x: 20 + Math.round(Math.random() * 60),
      y: 25 + Math.round(Math.random() * 55),
    };
    addStickerToDiaryPage(currentPage.id, st);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col watercolor-paper overflow-hidden">
      {/* Cabecera */}
      <div className="p-3 flex items-center justify-between border-b-2 border-[var(--border-ink)] bg-[var(--bg-card)]">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          className="hand-button px-3 py-1.5 bg-[var(--bg-paper)] text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Planeta
        </motion.button>
        <div className="text-center">
          <h1 className="text-base font-bold">📮 Cabaña Postal · Nuestro Diario</h1>
          <p className="text-[11px] text-[var(--text-muted)]">
            Libro de Polaroids y Dibujos a 4 Manos
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            soundEngine.playPageTurn();
            setCreatingNew(!creatingNew);
          }}
          className="hand-button px-3 py-1.5 bg-[var(--accent-primary)] text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {creatingNew ? 'Ver Libro' : 'Nueva Hoja'}
        </motion.button>
      </div>

      {/* CONTENIDO PRINCIPAL: CREADOR DE NUEVA HOJA O LIBRO QUE PASA PÁGINAS */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col items-center">
        {creatingNew ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md hand-card p-4 space-y-3 bg-[var(--bg-card)]"
          >
            <h2 className="text-base font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Escribir nueva página en el Buzón
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Cuando la guardes, una esquinita de tu Polaroid asomará por la ranura del Buzón 3D de tu pareja hasta que la abra 💌
            </p>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título del recuerdo (ej. Domingo de tortitas)..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] text-sm font-bold"
            />

            {/* Visor Polaroid Interactivo de Subida de Foto */}
            <div className="space-y-2">
              <PolaroidUploader
                captionPreview={newCaption || newTitle || 'Nuestro recuerdo en el buzón 💌'}
                onPhotoChange={(dataUrl, kb) => {
                  setNewPhotoUrl(dataUrl);
                  setNewPhotoKB(kb);
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
              onChange={(e) => setNewCaption(e.target.value)}
              rows={3}
              placeholder="Escribe el pie de foto con letra manuscrita..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-hand text-xl"
            />

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveNewPage}
              className="w-full hand-button py-2.5 bg-[var(--accent-primary)] font-bold text-sm cursor-pointer"
            >
              Guardar en el Libro y meter en el Buzón 📮
            </motion.button>
          </motion.div>
        ) : (
          currentPage && (
            <div className="w-full max-w-md flex flex-col gap-3">
              {/* Navegador de páginas del libro con sonido de papel */}
              <div className="flex items-center justify-between px-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={pageIndex === 0}
                  onClick={() => handleTurnPage(-1)}
                  className="hand-pill px-3 py-1 bg-[var(--bg-card)] text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </motion.button>

                <span className="text-xs font-bold">
                  Página {pageIndex + 1} de {diaryPages.length} · {currentPage.date}
                </span>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={pageIndex >= diaryPages.length - 1}
                  onClick={() => handleTurnPage(1)}
                  className="hand-pill px-3 py-1 bg-[var(--bg-card)] text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>

              {/* HOJA FÍSICA DEL LIBRO CON EFECTO DE CURVATURA AL PASAR PÁGINA */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage.id}
                  initial={{ rotateY: -22, opacity: 0, x: 24 }}
                  animate={{ rotateY: 0, opacity: 1, x: 0 }}
                  exit={{ rotateY: 22, opacity: 0, x: -24 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                  className="hand-card p-4 bg-[var(--bg-card)] relative overflow-hidden"
                >
                  {/* Encuadernación lateral de anillas / costura artesanal */}
                  <div className="absolute left-2 top-4 bottom-4 w-1.5 flex flex-col justify-between opacity-40 pointer-events-none">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="w-2.5 h-2.5 rounded-full border-2 border-[#4A3F35]" />
                    ))}
                  </div>

                  <div className="pl-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold">{currentPage.title}</h2>
                      <span className="hand-pill px-2 py-0.5 text-[10px] font-bold bg-[var(--bg-secondary)]">
                        Por {currentPage.author === 'userA' ? petA.ownerName : petB.ownerName}
                      </span>
                    </div>

                    {/* MARCO POLAROID PERSONALIZABLE CON CELO WASHI-TAPE */}
                    <div
                      className={`p-3 pb-5 rounded-xl border-2 border-[#4A3F35] shadow-md relative ${
                        FRAME_STYLES.find((f) => f.id === currentPage.frameStyle)?.css || 'bg-[#FFFDF9]'
                      }`}
                    >
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-2 w-20 h-4 bg-[#FFB5C2] border border-[#4A3F35] opacity-90" />

                      {/* Decoración del marco si es estrellitas o flores */}
                      {currentPage.frameStyle === 'estrellitas' && (
                        <div className="flex justify-between text-xs mb-1">
                          <span>✨ ⭐ ✨</span>
                          <span>🌟 ✨</span>
                        </div>
                      )}
                      {currentPage.frameStyle === 'flores' && (
                        <div className="flex justify-between text-xs mb-1">
                          <span>🌸 🌼 🌸</span>
                          <span>🌷 🌸</span>
                        </div>
                      )}

                      {currentPage.photoDataUrl ? (
                        <div className="relative rounded-lg overflow-hidden border border-[#4A3F35] bg-black/5">
                          <img
                            src={currentPage.photoDataUrl}
                            alt={currentPage.title}
                            className="w-full h-44 object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-28 rounded-lg border border-dashed border-[#4A3F35]/50 bg-[#FFFDF9]/80 flex flex-col items-center justify-center text-center p-2">
                          <span className="text-2xl">📸💕</span>
                          <span className="text-[11px] font-medium text-[var(--text-muted)]">
                            Nota Polaroid de recuerdo
                          </span>
                        </div>
                      )}

                      {/* Pie de foto con letra manuscrita Caveat */}
                      <p className="font-hand text-2xl text-[#4A3F35] text-center mt-3 leading-snug">
                        {currentPage.caption}
                      </p>
                    </div>

                    {/* LIENZO DE DIBUJO COLABORATIVO A CUATRO MANOS + STICKERS */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold flex items-center gap-1">
                          <Paintbrush className="w-3.5 h-3.5" />
                          Lienzo a 4 manos ({petA.ownerName} + {petB.ownerName})
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          ¡Dibuja encima para completarlo juntos!
                        </span>
                      </div>

                      <div
                        className="relative w-full h-48 rounded-2xl border-2 border-[#4A3F35] overflow-hidden touch-none shadow-inner"
                        style={{ backgroundColor: currentPage.canvasBgColor }}
                      >
                        <svg
                          ref={svgCanvasRef}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerLeave={handlePointerUp}
                          className="w-full h-full cursor-crosshair"
                        >
                          {currentPage.strokes.map((st) => {
                            const outline = getStroke(st.points, {
                              size: st.size,
                              thinning: st.tool === 'cera' ? 0.1 : 0.45,
                              smoothing: 0.6,
                              streamline: 0.5,
                            });
                            const pathData = getSvgPathFromStroke(outline);
                            return (
                              <path
                                key={st.id}
                                d={pathData}
                                fill={st.color}
                                opacity={st.tool === 'acuarela' ? 0.55 : st.tool === 'cera' ? 0.82 : 0.95}
                              />
                            );
                          })}

                          {currentPoints.length > 1 && (
                            <path
                              d={getSvgPathFromStroke(
                                getStroke(currentPoints, {
                                  size: activeTool === 'acuarela' ? 16 : 9,
                                  thinning: 0.4,
                                })
                              )}
                              fill={activeTool === 'goma' ? currentPage.canvasBgColor : strokeColor}
                              opacity={activeTool === 'acuarela' ? 0.55 : 0.9}
                            />
                          )}
                        </svg>

                        {/* Pegatinas arrastrables sobre la página */}
                        {currentPage.stickers.map((st) => (
                          <motion.div
                            key={st.id}
                            drag
                            dragMomentum={false}
                            style={{ left: `${st.x}%`, top: `${st.y}%` }}
                            className="absolute text-2xl cursor-grab active:cursor-grabbing select-none"
                          >
                            {st.emoji}
                          </motion.div>
                        ))}
                      </div>

                      {/* Herramientas de pintura: Acuarela, Rotulador, Cera, Bote de Pintura y Goma */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                        <div className="flex gap-1">
                          {[
                            { id: 'acuarela', label: '🎨 Acuarela' },
                            { id: 'rotulador', label: '🖍️ Rotulador' },
                            { id: 'cera', label: '✏️ Cera' },
                            { id: 'goma', label: '🧽 Goma' },
                          ].map((tl) => (
                            <button
                              key={tl.id}
                              onClick={() => {
                                soundEngine.playPop();
                                setActiveTool(tl.id as 'acuarela' | 'rotulador' | 'cera' | 'goma');
                              }}
                              className={`hand-pill px-2 py-1 text-[10px] font-bold cursor-pointer ${
                                activeTool === tl.id ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-paper)]'
                              }`}
                            >
                              {tl.label}
                            </button>
                          ))}
                          {/* Bote de pintura (cambia fondo del lienzo) */}
                          <button
                            onClick={() => {
                              soundEngine.playPop(1.2);
                              const bgs = ['#FFFDF9', '#FFF3E0', '#F0F9F4', '#F6F0FF'];
                              const nextBg =
                                bgs[(bgs.indexOf(currentPage.canvasBgColor) + 1) % bgs.length];
                              useWorldStore.setState((s) => ({
                                diaryPages: s.diaryPages.map((p) =>
                                  p.id === currentPage.id ? { ...p, canvasBgColor: nextBg } : p
                                ),
                              }));
                            }}
                            className="hand-pill px-2 py-1 text-[10px] font-bold bg-[var(--bg-paper)] flex items-center gap-0.5 cursor-pointer"
                            title="Bote de pintura (cambiar color de papel)"
                          >
                            <PaintBucket className="w-3 h-3" />
                            Fondo
                          </button>
                        </div>

                        {/* Paleta de colores */}
                        <div className="flex items-center gap-1">
                          {COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                setStrokeColor(c);
                                if (activeTool === 'goma') setActiveTool('rotulador');
                              }}
                              style={{ backgroundColor: c }}
                              className={`w-5 h-5 rounded-full border border-[#4A3F35] cursor-pointer ${
                                strokeColor === c ? 'scale-125 ring-2 ring-[#4A3F35]' : ''
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Bandeja de Pegatinas (Stickers) */}
                      <div className="pt-1">
                        <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1">
                          Toca una pegatina para pegarla en la hoja (y arrástrala donde quieras):
                        </p>
                        <div className="flex items-center justify-between bg-[var(--bg-secondary)] px-2.5 py-1.5 rounded-xl border border-[var(--border-ink)]">
                          {STICKER_TRAY.map((em) => (
                            <motion.button
                              key={em}
                              whileTap={{ scale: 1.3 }}
                              onClick={() => handleAddSticker(em)}
                              className="text-lg cursor-pointer hover:scale-110 transition-transform"
                            >
                              {em}
                            </motion.button>
                          ))}
                        </div>
                      </div>
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
