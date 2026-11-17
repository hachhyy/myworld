import React, { useState, useRef, useEffect } from 'react';
import { Camera, ZoomIn, Sparkles } from 'lucide-react';
import { soundEngine } from '../../utils/soundAndHaptics';

export type WashiTapeStyle = 'rosa' | 'vichy' | 'salvia' | 'dorado' | 'lavanda';
export type PolaroidFilter = 'original' | 'vintage' | 'pastel';

interface PolaroidUploaderProps {
  initialDataUrl?: string;
  captionPreview?: string;
  onPhotoChange: (dataUrl: string, sizeKB: number, washi: WashiTapeStyle) => void;
}

const WASHI_STYLES: { id: WashiTapeStyle; label: string; bg: string; pattern?: string }[] = [
  { id: 'rosa', label: 'Rosa', bg: '#FFB5C2' },
  { id: 'vichy', label: 'Vichy', bg: '#F4A261' },
  { id: 'salvia', label: 'Salvia', bg: '#95D5B2' },
  { id: 'dorado', label: 'Estrellas', bg: '#FFE066' },
  { id: 'lavanda', label: 'Lavanda', bg: '#CDB4DB' },
];

export const PolaroidUploader: React.FC<PolaroidUploaderProps> = ({
  initialDataUrl,
  captionPreview = 'Nuestro recuerdo especial 💕',
  onPhotoChange,
}) => {
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(initialDataUrl || null);
  const [zoom, setZoom] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [washi, setWashi] = useState<WashiTapeStyle>('rosa');
  const [filter, setFilter] = useState<PolaroidFilter>('original');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [sizeKB, setSizeKB] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Procesa y encuadra la imagen en un Canvas WebP cuando cambia foto, zoom, encuadre o filtro
  useEffect(() => {
    if (!rawImageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const targetW = 640;
      const targetH = 520;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(0, 0, targetW, targetH);

      // Aplicar filtro suave
      if (filter === 'vintage') {
        ctx.filter = 'sepia(0.28) contrast(1.05) brightness(1.04) saturate(1.12)';
      } else if (filter === 'pastel') {
        ctx.filter = 'brightness(1.08) contrast(0.94) saturate(1.18)';
      } else {
        ctx.filter = 'none';
      }

      // Calcular cover + zoom + desplazamiento
      const scaleBase = Math.max(targetW / img.width, targetH / img.height);
      const finalScale = scaleBase * zoom;
      const drawW = img.width * finalScale;
      const drawH = img.height * finalScale;
      const dx = (targetW - drawW) / 2 + (offsetX / 100) * (drawW * 0.35);
      const dy = (targetH - drawH) / 2 + (offsetY / 100) * (drawH * 0.35);

      ctx.drawImage(img, dx, dy, drawW, drawH);

      // Cálido velo vintage opcional
      if (filter === 'vintage') {
        ctx.filter = 'none';
        ctx.fillStyle = 'rgba(244, 162, 97, 0.08)';
        ctx.fillRect(0, 0, targetW, targetH);
      }

      const webpUrl = canvas.toDataURL('image/webp', 0.82);
      const kb = Math.round(((webpUrl.length * 3) / 4 / 1024) * 10) / 10;
      setSizeKB(kb);
      onPhotoChange(webpUrl, kb, washi);
    };
    img.src = rawImageSrc;
  }, [rawImageSrc, zoom, offsetX, offsetY, filter, washi]);

  const handleFileSelected = (file?: File | null) => {
    if (!file) return;
    soundEngine.playPop(1.15);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setRawImageSrc(ev.target.result);
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const activeWashiObj = WASHI_STYLES.find((w) => w.id === washi) || WASHI_STYLES[0];

  return (
    <div className="space-y-2.5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
        className="hidden"
      />

      {/* MARCO POLAROID ARTESANAL INTERACTIVO CON CELO WASHI-TAPE */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          handleFileSelected(e.dataTransfer.files?.[0]);
        }}
        className={`relative mx-auto max-w-[270px] bg-[#FFFDF9] p-3 pb-5 rounded-xl border-2 border-[var(--border-ink)] shadow-md transition-transform ${
          isDraggingOver ? 'scale-105 ring-2 ring-[var(--accent-terracotta)]' : ''
        }`}
      >
        {/* Celo decorativo (Washi-Tape) sujetando la Polaroid arriba */}
        <div
          style={{ backgroundColor: activeWashiObj.bg }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 -rotate-2 w-24 h-6 border-2 border-[var(--border-ink)] opacity-90 shadow-xs flex items-center justify-center text-[10px] font-bold"
        >
          {washi === 'dorado' ? '✨ ★ ✨' : washi === 'vichy' ? '格子 · ♥' : '♡ · ♡'}
        </div>

        {/* Visor de la foto o zona táctil de subida */}
        {rawImageSrc ? (
          <div className="relative w-full h-44 rounded-lg overflow-hidden border-2 border-[var(--border-ink)] bg-[#F7F1E5]">
            <img
              src={rawImageSrc}
              alt="Vista previa Polaroid"
              style={{
                transform: `scale(${zoom}) translate(${offsetX * 0.25}%, ${offsetY * 0.25}%)`,
                filter:
                  filter === 'vintage'
                    ? 'sepia(0.28) contrast(1.05) brightness(1.04) saturate(1.12)'
                    : filter === 'pastel'
                      ? 'brightness(1.08) contrast(0.94) saturate(1.18)'
                      : 'none',
              }}
              className="w-full h-full object-cover transition-transform duration-150"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-[#FFFDF9]/95 border border-[var(--border-ink)] text-[10px] font-bold shadow-sm cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3 h-3" />
              Cambiar foto
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-40 rounded-lg border-2 border-dashed border-[var(--border-ink)] bg-[#FAF3E8] flex flex-col items-center justify-center gap-1.5 p-3 text-center cursor-pointer hover:bg-[#F5E8D6] transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-[var(--accent-primary)]/40 border-2 border-[var(--border-ink)] flex items-center justify-center text-xl">
              📸
            </div>
            <p className="text-xs font-bold">Toca o arrastra vuestra foto aquí</p>
            <p className="text-[10px] text-[var(--text-muted)]">
              Se revelará al instante en tu marco Polaroid artesanal
            </p>
          </div>
        )}

        {/* Pie manuscrito de la Polaroid */}
        <p className="font-hand text-lg text-center mt-2.5 leading-tight text-[#3D312A] truncate">
          {captionPreview || 'Nuestro recuerdo especial 💕'}
        </p>
      </div>

      {/* CONTROLES DE ENCUADRE, CELO WASHI-TAPE Y FILTROS CUANDO HAY FOTO */}
      {rawImageSrc && (
        <div className="bg-[var(--bg-paper)] p-2.5 rounded-2xl border-2 border-[var(--border-ink)] space-y-2 text-[11px]">
          {/* Zoom y Encuadre */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="font-bold flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5" /> Zoom:
            </label>
            <input
              type="range"
              min={1}
              max={2.4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="col-span-2 accent-[var(--accent-secondary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-bold block">Mover Horizontal:</span>
              <input
                type="range"
                min={-60}
                max={60}
                value={offsetX}
                onChange={(e) => setOffsetX(Number(e.target.value))}
                className="w-full accent-[var(--accent-secondary)]"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold block">Mover Vertical:</span>
              <input
                type="range"
                min={-60}
                max={60}
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="w-full accent-[var(--accent-secondary)]"
              />
            </div>
          </div>

          {/* Selector de Celo Washi-Tape */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <span className="font-bold">Celo Washi:</span>
            <div className="flex items-center gap-1.5">
              {WASHI_STYLES.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setWashi(w.id);
                    soundEngine.playPop();
                  }}
                  title={w.label}
                  style={{ backgroundColor: w.bg }}
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                    washi === w.id ? 'border-[#FF7A9E] ring-2 ring-[#FFB7C5] scale-115 shadow-xs' : 'border-white/80 opacity-80'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Selector de Filtros Suaves */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Filtro:
            </span>
            <div className="flex gap-1">
              {(
                [
                  { id: 'original', label: 'Original' },
                  { id: 'vintage', label: 'Cálido Vintage' },
                  { id: 'pastel', label: 'Pastel' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFilter(f.id);
                    soundEngine.playPop();
                  }}
                  className={`px-2 py-0.5 rounded-full border border-[var(--border-ink)] font-bold cursor-pointer ${
                    filter === f.id ? 'bg-[var(--accent-primary)]' : 'bg-white opacity-75'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {sizeKB > 0 && (
            <p className="text-[10px] text-right text-[var(--text-muted)]">
              Revelado optimizado WebP · {sizeKB} KB
            </p>
          )}
        </div>
      )}
    </div>
  );
};
