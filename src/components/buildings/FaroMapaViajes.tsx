import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, MapPin, Sparkles, Palette, Trash2 } from 'lucide-react';
import L from 'leaflet';
import { MapPinItem, useWorldStore } from '../../store/useWorldStore';
import { soundEngine } from '../../utils/soundAndHaptics';
import { PolaroidUploader } from '../ui/PolaroidUploader';

interface FaroMapaViajesProps {
  onClose: () => void;
}

const CATEGORY_EMOJI: Record<MapPinItem['category'], string> = {
  'Restaurante/Comida': '🍜',
  'Viaje/Ciudad': '✈️',
  'Naturaleza/Mirador': '🌲',
  'Momento Especial': '💕',
};

const QUICK_PLACES = [
  { display_name: 'París · Torre Eiffel y paseo por el Sena', lat: 48.8584, lon: 2.2945 },
  { display_name: 'Roma · Trastevere y Heladería Artesanal', lat: 41.8892, lon: 12.4705 },
  { display_name: 'Lisboa · Mirador de Santa Luzia', lat: 38.7116, lon: -9.1304 },
  { display_name: 'Granada · Mirador de San Nicolás al atardecer', lat: 37.1811, lon: -3.5926 },
  { display_name: 'Tokio · Shibuya y Cafetería de Gatos', lat: 35.6595, lon: 139.7004 },
];

export const FaroMapaViajes: React.FC<FaroMapaViajesProps> = ({ onClose }) => {
  const {
    mapPins,
    mapVisualStyle,
    setMapVisualStyle,
    addMapPin,
    deleteMapPin,
    toggleMapPinStatus,
  } = useWorldStore();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const draftMarkerRef = useRef<L.Marker | null>(null);

  // Entrar directamente al mapa limpio e interactivo (sin modal inicial tapando la pantalla)
  const [selectedPin, setSelectedPin] = useState<MapPinItem | null>(null);
  const [confirmDeletePinId, setConfirmDeletePinId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ display_name: string; lat: number; lon: number }[]>([]);

  // Modal de crear nueva chincheta al tocar el mapa o elegir del buscador
  const [newPinCoords, setNewPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newName, setNewName] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);
  const [newStatus, setNewStatus] = useState<'visited' | 'wishlist'>('visited');
  const [newCategory, setNewCategory] = useState<MapPinItem['category']>('Restaurante/Comida');
  const [newDate, setNewDate] = useState('Noviembre 2026');
  const [newNote, setNewNote] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | undefined>(undefined);
  const [newPhotoKB, setNewPhotoKB] = useState<number | undefined>(undefined);

  const visitedCount = mapPins.filter((p) => p.status === 'visited').length;
  const wishlistCount = mapPins.filter((p) => p.status === 'wishlist').length;

  // Reverse Geocoding automático con Nominatim al tocar cualquier punto del mapa
  const reverseGeocodePlace = async (lat: number, lng: number) => {
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const place =
          addr.attraction ||
          addr.amenity ||
          addr.neighbourhood ||
          addr.suburb ||
          addr.town ||
          addr.city ||
          addr.village ||
          addr.county ||
          addr.country;
        const city = addr.city || addr.town || addr.state || addr.country || '';
        const label =
          place && city && place !== city
            ? `${place} · ${city}`
            : place || city || `Rincón especial (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
        setNewName(label);
      } else if (data?.display_name) {
        setNewName(String(data.display_name).split(',').slice(0, 2).join(' · '));
      } else {
        setNewName(`Nuestro rincón (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
      }
    } catch {
      setNewName(`Nuestro rincón (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
    } finally {
      setReverseLoading(false);
    }
  };

  // Coloca una chincheta temporal con animación de rebote en el mapa y abre el modal
  const dropPinAtCoords = (lat: number, lng: number, presetName?: string) => {
    soundEngine.playPop(1.25);
    setSelectedPin(null);
    setConfirmDeletePinId(null);
    setNewPinCoords({ lat, lng });
    setNewNote('');
    setNewPhotoUrl(undefined);

    if (presetName) {
      setNewName(presetName);
    } else {
      setNewName('Buscando nombre del lugar...');
      reverseGeocodePlace(lat, lng);
    }

    // Dibujar marcador con rebote inmediato sobre el mapa
    if (leafletMapRef.current) {
      if (draftMarkerRef.current) {
        draftMarkerRef.current.remove();
      }
      const bounceIcon = L.divIcon({
        className: 'custom-bouncing-draft-pin',
        html: `<div style="background:#FF758F;color:#fff;border:2.5px solid #3D312A;border-radius:999px;padding:5px 10px;font-size:15px;font-weight:bold;box-shadow:0 6px 14px rgba(0,0,0,0.28);animation:bounce 0.7s infinite alternate;display:flex;align-items:center;gap:4px;white-space:nowrap;">
          <span>📍</span><span style="font-size:11px;">¡Aquí!</span>
        </div>`,
        iconSize: [74, 34],
        iconAnchor: [37, 30],
      });
      draftMarkerRef.current = L.marker([lat, lng], { icon: bounceIcon }).addTo(
        leafletMapRef.current
      );
    }
  };

  // Inicializar Mapa 2D con Leaflet + OpenStreetMap y listener de clic directo
  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [40.4168, -3.7038],
      zoom: 5,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;
    leafletMapRef.current = map;

    // Al tocar cualquier punto del mapa se clava inmediatamente una chincheta con rebote
    map.on('click', (e: L.LeafletMouseEvent) => {
      dropPinAtCoords(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Limpiar marcador temporal cuando se cierra el modal de creación
  useEffect(() => {
    if (!newPinCoords && draftMarkerRef.current) {
      draftMarkerRef.current.remove();
      draftMarkerRef.current = null;
    }
  }, [newPinCoords]);

  // Renderizar chinchetas guardadas
  useEffect(() => {
    const group = markersLayerRef.current;
    if (!group) return;
    group.clearLayers();

    mapPins.forEach((pin) => {
      const bg = pin.status === 'visited' ? '#88C9A1' : '#FFB5C2';
      const emoji = CATEGORY_EMOJI[pin.category] || '📍';
      const icon = L.divIcon({
        className: 'custom-cozy-pin',
        html: `<div style="background:${bg};border:2.2px solid #4A3F35;border-radius:999px;padding:4px 8px;font-size:14px;font-weight:bold;box-shadow:2px 3px 0 rgba(74,63,53,0.3);display:flex;align-items:center;gap:3px;white-space:nowrap;">
          <span>${emoji}</span>
        </div>`,
        iconSize: [38, 32],
        iconAnchor: [19, 16],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(group);
      marker.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        soundEngine.playPop(1.15);
        setNewPinCoords(null);
        setConfirmDeletePinId(null);
        setSelectedPin(pin);
        leafletMapRef.current?.flyTo([pin.lat, pin.lng], 12, { duration: 1.1 });
      });
    });
  }, [mapPins]);

  // Buscador Nominatim OpenStreetMap en vivo
  const handleSearchChange = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const localMatches = QUICK_PLACES.filter((p) =>
      p.display_name.toLowerCase().includes(q.toLowerCase())
    );
    setSuggestions(localMatches);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSuggestions(
          data.map((d: Record<string, unknown>) => ({
            display_name: String(d.display_name),
            lat: Number(d.lat),
            lon: Number(d.lon),
          }))
        );
      }
    } catch {
      if (localMatches.length === 0) {
        setSuggestions([
          {
            display_name: `${q} (Clavar chincheta aquí)`,
            lat: 40.4168 + (Math.random() - 0.5) * 0.08,
            lon: -3.7038 + (Math.random() - 0.5) * 0.08,
          },
        ]);
      }
    }
  };

  const handleSelectSuggestion = (s: { display_name: string; lat: number; lon: number }) => {
    setSuggestions([]);
    setSearchQuery('');
    leafletMapRef.current?.flyTo([s.lat, s.lon], 13, { duration: 1.2 });
    const shortTitle = s.display_name.split(',').slice(0, 2).join(' · ');
    dropPinAtCoords(s.lat, s.lon, shortTitle);
  };

  const handleSaveNewPin = () => {
    if (!newPinCoords || !newName.trim()) return;
    const created: Omit<MapPinItem, 'id'> = {
      name: newName.trim(),
      lat: newPinCoords.lat,
      lng: newPinCoords.lng,
      status: newStatus,
      category: newCategory,
      date: newDate || 'Recuerdo juntos',
      note: newNote.trim() || 'Un rincón muy especial de nuestra historia 💕',
      rating: newRating,
      photoDataUrl: newPhotoUrl,
      photoSizeKB: newPhotoKB,
    };
    addMapPin(created);
    setNewPinCoords(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col watercolor-paper overflow-hidden">
      {/* Cabecera */}
      <div className="p-3 flex items-center justify-between border-b-2 border-[var(--border-ink)] bg-[var(--bg-card)] z-20">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          className="hand-button px-3 py-1.5 bg-[var(--bg-paper)] text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Planeta
        </motion.button>

        <div className="text-center">
          <h1 className="text-sm font-bold">🎈 Faro de Viajes y Citas</h1>
          <p className="text-[11px] font-semibold text-[var(--text-muted)]">
            {visitedCount} visitados juntos · {wishlistCount} pendientes
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setMapVisualStyle(mapVisualStyle === 'vintage' ? 'pastel' : 'vintage')}
          className="hand-button px-2.5 py-1.5 bg-[var(--accent-primary)] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
        >
          <Palette className="w-3.5 h-3.5" />
          {mapVisualStyle === 'vintage' ? 'Vintage' : 'Pastel'}
        </motion.button>
      </div>

      {/* Buscador Nominatim + Chips de lugares (Sin tutorial inicial intrusivo) */}
      <div className="p-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-ink)] z-20 space-y-2">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <div className="hand-card px-3 py-1.5 bg-[var(--bg-card)] flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Busca ciudad, calle o restaurante..."
                className="flex-1 bg-transparent text-xs font-semibold focus:outline-none"
              />
            </div>

            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-10 hand-card bg-[var(--bg-card)] p-1.5 z-50 space-y-1 shadow-xl">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-black/5 text-xs font-medium truncate cursor-pointer flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span className="truncate">{s.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón rápido para clavar chincheta */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              setSelectedPin(null);
              const center = leafletMapRef.current?.getCenter();
              if (center) {
                dropPinAtCoords(center.lat, center.lng);
              }
            }}
            className="hand-button px-3 py-1.5 bg-[#FFB5C2] text-[#3D312A] text-[11px] font-bold shrink-0 cursor-pointer shadow-xs"
          >
            📍 Clavar chincheta
          </motion.button>
        </div>

        {mapPins.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto max-w-md mx-auto pb-0.5">
            {mapPins.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setNewPinCoords(null);
                  setConfirmDeletePinId(null);
                  setSelectedPin(p);
                  leafletMapRef.current?.flyTo([p.lat, p.lng], 13, { duration: 1.1 });
                }}
                className={`hand-pill px-2.5 py-0.5 text-[11px] font-bold shrink-0 cursor-pointer flex items-center gap-1 ${
                  p.status === 'visited' ? 'bg-[#A8D5BA] text-[#2B3A30]' : 'bg-[#FFB5C2] text-[#4A252C]'
                }`}
              >
                <span>{CATEGORY_EMOJI[p.category]}</span>
                <span>{p.name.split('·')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTENEDOR DEL MAPA 2D INTERACTIVO */}
      <div
        className={`relative flex-1 w-full overflow-hidden ${
          mapVisualStyle === 'vintage' ? 'map-style-vintage' : 'map-style-pastel'
        }`}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

        {/* Tarjeta Polaroid artesanal al tocar una chincheta existente (con opción de borrado) */}
        <AnimatePresence>
          {selectedPin && !newPinCoords && (
            <motion.div
              key={selectedPin.id}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute bottom-3 left-3 right-3 max-w-sm mx-auto hand-card p-3.5 bg-[var(--bg-card)] z-30 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span
                    onClick={() => toggleMapPinStatus(selectedPin.id)}
                    className={`hand-pill px-2 py-0.5 text-[10px] font-bold cursor-pointer inline-block mb-1 ${
                      selectedPin.status === 'visited'
                        ? 'bg-[#A8D5BA] text-[#2B3A30]'
                        : 'bg-[#FFB5C2] text-[#4A252C]'
                    }`}
                  >
                    {selectedPin.status === 'visited'
                      ? '✅ Ya hemos estado aquí'
                      : '✨ Queremos ir juntos'}
                  </span>
                  <h3 className="text-sm font-bold">
                    {CATEGORY_EMOJI[selectedPin.category]} {selectedPin.name}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {selectedPin.category} · {selectedPin.date} · {'❤️'.repeat(selectedPin.rating)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {confirmDeletePinId === selectedPin.id ? (
                    <div className="flex items-center gap-1 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-xl">
                      <span className="text-[10px] font-bold text-rose-900">¿Borrar?</span>
                      <button
                        onClick={() => {
                          deleteMapPin(selectedPin.id);
                          setConfirmDeletePinId(null);
                          setSelectedPin(null);
                        }}
                        className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmDeletePinId(null)}
                        className="px-1.5 py-0.5 rounded bg-white text-rose-900 text-[10px] font-bold cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        soundEngine.playPop();
                        setConfirmDeletePinId(selectedPin.id);
                      }}
                      title="Borrar esta chincheta"
                      className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setConfirmDeletePinId(null);
                      setSelectedPin(null);
                    }}
                    className="hand-pill px-2 py-0.5 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {selectedPin.photoDataUrl &&
              !selectedPin.photoDataUrl.startsWith('data:image/svg+xml') ? (
                <div className="relative mx-auto bg-[#FFFDF9] p-2.5 pb-4 rounded-xl border-2 border-[var(--border-ink)] shadow-sm mb-1">
                  {/* Celo decorativo Washi-Tape arriba */}
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-2 w-20 h-4 bg-[#FFB5C2] border border-[var(--border-ink)] opacity-90" />
                  <img
                    src={selectedPin.photoDataUrl}
                    alt={selectedPin.name}
                    className="w-full h-36 object-cover rounded-lg border border-[var(--border-ink)]"
                  />
                  <p className="font-hand text-xl text-center mt-2 leading-tight text-[#3D312A]">
                    «{selectedPin.note}»
                  </p>
                </div>
              ) : (
                <p className="font-hand text-xl text-center py-1.5 px-2 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-ink)]/20 leading-tight text-[#3D312A]">
                  «{selectedPin.note}»
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal con Visor Polaroid Interactivo al clavar nueva chincheta */}
        <AnimatePresence>
          {newPinCoords && (
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="absolute inset-x-3 bottom-3 max-w-sm mx-auto hand-card p-3.5 bg-[var(--bg-card)] z-30 space-y-2.5 max-h-[78vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  📍 Clavar Chincheta en el Mapa
                </h3>
                <button
                  onClick={() => setNewPinCoords(null)}
                  className="text-xs font-bold px-2 py-0.5 hand-pill cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre de la ciudad, calle o lugar..."
                  className="w-full px-3 py-1.5 rounded-xl border-2 border-[var(--border-ink)] bg-[var(--bg-paper)] text-xs font-bold"
                />
                {reverseLoading && (
                  <span className="absolute right-2.5 top-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    Localizando...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setNewStatus('visited')}
                  className={`py-1.5 rounded-xl font-bold border-2 border-[var(--border-ink)] cursor-pointer ${
                    newStatus === 'visited' ? 'bg-[#A8D5BA] text-[#2B3A30]' : 'bg-[var(--bg-paper)]'
                  }`}
                >
                  ✅ Ya hemos estado
                </button>
                <button
                  type="button"
                  onClick={() => setNewStatus('wishlist')}
                  className={`py-1.5 rounded-xl font-bold border-2 border-[var(--border-ink)] cursor-pointer ${
                    newStatus === 'wishlist' ? 'bg-[#FFB5C2] text-[#4A252C]' : 'bg-[var(--bg-paper)]'
                  }`}
                >
                  ✨ Queremos ir
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MapPinItem['category'])}
                  className="p-1.5 rounded-xl border-2 border-[var(--border-ink)] bg-[var(--bg-paper)] font-semibold"
                >
                  <option value="Restaurante/Comida">🍜 Restaurante/Comida</option>
                  <option value="Viaje/Ciudad">✈️ Viaje/Ciudad</option>
                  <option value="Naturaleza/Mirador">🌲 Naturaleza/Mirador</option>
                  <option value="Momento Especial">💕 Momento Especial</option>
                </select>

                <input
                  type="text"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder="Fecha (ej. Mayo 2026)"
                  className="px-2.5 py-1.5 rounded-xl border-2 border-[var(--border-ink)] bg-[var(--bg-paper)] font-semibold"
                />
              </div>

              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Nota manuscrita para el pie de la Polaroid..."
                className="w-full px-3 py-1.5 rounded-xl border-2 border-[var(--border-ink)] bg-[var(--bg-paper)] font-hand text-lg"
              />

              {/* VISOR POLAROID INTERACTIVO DE SUBIDA DE FOTO */}
              <PolaroidUploader
                captionPreview={newNote || newName || 'Nuestro viaje juntos 💕'}
                onPhotoChange={(dataUrl, kb) => {
                  setNewPhotoUrl(dataUrl);
                  setNewPhotoKB(kb);
                }}
              />

              <button
                type="button"
                onClick={handleSaveNewPin}
                className="w-full hand-button py-2.5 bg-[var(--accent-primary)] text-xs font-bold cursor-pointer"
              >
                Guardar Chincheta en Nuestro Mapa 📍✨
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
