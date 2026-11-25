import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { soundEngine, triggerHeartbeatHaptic } from '../utils/soundAndHaptics';
import {
  signOutFromSupabase,
  type RealtimeConnectionStatus,
} from '../lib/supabaseClient';
import { normalizeRoomCode, SEED_ITEM_IDS } from '../utils/worldSyncMerge';

export type SyncStatus = 'connecting' | 'connected' | 'syncing' | 'error' | 'offline';

export type PastelTheme = 'melocoton' | 'salvia' | 'lavanda' | 'mantequilla';
export type BuildingId =
  | 'casita'
  | 'correos'
  | 'cine'
  | 'viajes'
  | 'deseos'
  | 'hucha'
  | 'luna'
  | null;

export type SolarOverride = 'auto' | 'day' | 'sunset' | 'night';
export type WeatherOverride = 'auto' | 'clear' | 'snow' | 'fireworks';

export type PetSpecies =
  | 'capibara'
  | 'ajolote'
  | 'panda_rojo'
  | 'lemur'
  | 'loro'
  | 'dino'
  | 'vaquita'
  | 'oveja'
  | 'cerdito'
  | 'pollito'
  | 'patito'
  | 'pinguino'
  | 'buho'
  | 'pez_globo'
  | 'carpa_koi'
  | 'osito'
  | 'conejito'
  | 'gatito'
  | 'perrito';

export type PetMood =
  | 'Feliz'
  | 'Mimoso'
  | 'Cansado'
  | 'Con hambre'
  | 'Estresado'
  | 'Triste'
  | 'Estudiando/Trabajando';

export interface PetProfile {
  ownerName: string;
  petName: string;
  species: PetSpecies;
  hat: string;
  glasses: string;
  neck: string;
  mood: PetMood;
  speechBubble: string;
  birthday: string;
}

export interface PetCareState {
  hunger: number;
  energy: number;
  affection: number;
  hygiene: number;
  roomRug: string;
  roomLamp: string;
  lastUpdated: number;
  celebrationBounceUntil: number;
}

export type PolaroidFrameStyle = 'clasico' | 'vichy' | 'estrellitas' | 'flores' | 'rosa_pastel';

export interface DiarySticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

export interface DrawingStroke {
  id: string;
  tool: 'acuarela' | 'rotulador' | 'cera' | 'goma';
  color: string;
  size: number;
  points: number[][];
  author: 'userA' | 'userB';
}

export interface DiaryPage {
  id: string;
  date: string;
  author: 'userA' | 'userB';
  title: string;
  caption: string;
  photoDataUrl?: string;
  photoSizeKB?: number;
  frameStyle: PolaroidFrameStyle;
  canvasBgColor: string;
  strokes: DrawingStroke[];
  stickers: DiarySticker[];
  readByUserA: boolean;
  readByUserB: boolean;
}

export interface MediaItem {
  id: string;
  tmdbId?: number;
  title: string;
  year: string;
  durationMin: number;
  category: 'Película' | 'Serie' | 'Anime';
  genre: string;
  posterUrl: string;
  status: 'watched' | 'watchlist';
  season: number;
  episode: number;
  ratingA?: number;
  reviewA?: string;
  ratingB?: number;
  reviewB?: string;
}

export interface MapPinItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'visited' | 'wishlist';
  category: 'Restaurante/Comida' | 'Viaje/Ciudad' | 'Naturaleza/Mirador' | 'Momento Especial';
  date: string;
  note: string;
  rating: number;
  photoDataUrl?: string;
  photoSizeKB?: number;
}

export interface CravingItem {
  id: string;
  creator: 'userA' | 'userB';
  emoji: string;
  title: string;
  timeTag: 'Antojo de hoy' | 'Para este finde' | 'Regalo futuro';
  intensity: 'un_poco' | 'emergencia';
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export type ExpenseCategory =
  | 'Cena fuera'
  | 'Supermercado'
  | 'Viaje'
  | 'Cine/Ocio'
  | 'Casa'
  | 'Capricho';

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  paidBy: 'userA' | 'userB';
  splitMode: '50_50' | 'invito_yo' | '100_otro' | 'personalizado';
  shareA: number;
  shareB: number;
  category: ExpenseCategory;
  date: string;
  settled: boolean;
}

export interface SavingsGoal {
  id: string;
  title: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  contributions: { id: string; user: 'userA' | 'userB'; amount: number; date: string }[];
}

export type CyclePhase = 'menstruacion' | 'folicular' | 'ovulacion' | 'lutea';

export interface LunarProfileState {
  ownerName: string;
  phase: CyclePhase;
  dayOfCycle: number;
  flow: 'Ninguno' | 'Ligero' | 'Medio' | 'Abundante';
  cramps: 'Sin dolor' | 'Molestia leve' | 'Dolorcito fuerte';
  energy: 'Baja' | 'Normal' | 'Alta';
  mood: 'Sensible' | 'Mimosa' | 'Tranquila' | 'Radiante' | 'Cansada';
  craving: string;
  sensitiveAlertActive: boolean;
  lastUpdated: string;
  cycleLength?: number;
  periodLength?: number;
  periodStartDates?: string[];
}

export type KissIconType = 'corazones' | 'pintalabios' | 'gatitos' | 'estrellas' | 'abrazos';

export interface PendingKissBurst {
  id: string;
  from: 'userA' | 'userB';
  count: number;
  iconType: KissIconType;
  miniNote: string;
  timestamp: number;
}

function getSeedPeriodStartDates(daysAgoLatest = 2, cycleDays = 28): string[] {
  const dates: string[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - (daysAgoLatest + i * cycleDays));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function getSeedAnniversaryDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  d.setMonth(d.getMonth() - 4);
  d.setDate(d.getDate() - 12);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function createCozySvgDataUrl(bg1: string, bg2: string, emoji: string, subtitle: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="400" height="260">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="260" fill="url(#g)"/>
    <circle cx="330" cy="54" r="32" fill="#FFF3B0" opacity="0.85"/>
    <path d="M0 190 Q110 150 220 185 T400 175 L400 260 L0 260 Z" fill="#95D5B2" opacity="0.75"/>
    <text x="200" y="125" font-size="68" text-anchor="middle">${emoji}</text>
    <text x="200" y="228" font-family="sans-serif" font-size="18" font-weight="bold" fill="#4A3F35" text-anchor="middle">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface WorldState {
  // Estado de Sesión Persistente y Onboarding
  authUserId: string | null;
  authUserEmail: string | null;
  worldId: string | null;
  onboardingCompleted: boolean;
  onboardingStep: 1 | 2 | 3;

  planetName: string;
  roomCode: string;
  anniversaryDate: string;
  activeUser: 'userA' | 'userB';
  theme: PastelTheme;
  isMuted: boolean;
  solarOverride: SolarOverride;
  weatherOverride: WeatherOverride;
  activeBuilding: BuildingId;
  settingsOpen: boolean;
  anniversaryModalOpen: boolean;
  hasCompletedLanding: boolean;

  totalKissesHistory: number;
  kissCooldownUntil: number;
  pendingKissBursts: PendingKissBurst[];

  petA: PetProfile;
  petB: PetProfile;
  petCare: PetCareState;

  diaryPages: DiaryPage[];
  mediaItems: MediaItem[];
  tmdbApiKey: string;

  mapPins: MapPinItem[];
  mapVisualStyle: 'vintage' | 'pastel';

  cravings: CravingItem[];

  currency: '€' | '$' | '£' | '¥';
  expenses: ExpenseItem[];
  savingsGoals: SavingsGoal[];

  lunarMode: 'single' | 'dual' | 'hidden';
  lunarOwner: 'userA' | 'userB';
  lunarA: LunarProfileState;
  lunarB: LunarProfileState;

  // Estado de Sincronización Multi-Dispositivo (efímero, no se persiste)
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: number | null;
  realtimeStatus: RealtimeConnectionStatus;
  localChangeVersion: number;

  // Metadatos persistentes para merge sin sobrescritura destructiva
  deletedIds: string[];
  kissesResetAt: number;
  lastSyncedWorldId: string | null;

  // Acciones de Sincronización
  setSyncMeta: (partial: {
    syncStatus?: SyncStatus;
    syncError?: string | null;
    lastSyncedAt?: number | null;
    realtimeStatus?: RealtimeConnectionStatus;
  }) => void;
  clearDemoSeedItems: () => number;

  // Acciones de Sesión y Onboarding
  setAuthSession: (userId: string, email: string, name: string) => void;
  setLinkedWorld: (worldId: string, planetName: string, roomCode: string, anniversaryDate: string) => void;
  completeOnboardingWithPet: (species: PetSpecies, petName: string, birthday: string) => void;
  logoutSession: () => Promise<void>;

  // Acciones generales
  setPlanetName: (name: string) => void;
  setCoupleNames: (nameA: string, nameB: string) => void;
  setRoomCode: (code: string) => void;
  generateNewRoomCode: () => string;
  setAnniversaryDate: (date: string) => void;
  setActiveUser: (user: 'userA' | 'userB') => void;
  setTheme: (theme: PastelTheme) => void;
  toggleMute: () => void;
  setSolarOverride: (mode: SolarOverride) => void;
  setWeatherOverride: (mode: WeatherOverride) => void;
  setActiveBuilding: (b: BuildingId) => void;
  setSettingsOpen: (open: boolean) => void;
  setAnniversaryModalOpen: (open: boolean) => void;
  completeLanding: () => void;

  // Besos
  sendKissBurst: (count: number, iconType: KissIconType, miniNote: string) => void;
  consumePendingKissesForActiveUser: () => PendingKissBurst[];
  resetKissCounter: () => void;

  // Mascotas
  updatePetProfile: (user: 'userA' | 'userB', partial: Partial<PetProfile>) => void;
  careForPets: (action: 'feed' | 'wash' | 'sleep' | 'pamper_partner' | 'celebrate') => void;
  updateRoomDecor: (rug: string, lamp: string) => void;

  // Diario Postal
  addDiaryPage: (page: Omit<DiaryPage, 'id' | 'readByUserA' | 'readByUserB'>) => void;
  updateDiaryPage: (id: string, patch: { title?: string; caption?: string }) => void;
  updateDiaryPagePhoto: (id: string, photoDataUrl: string, photoSizeKB?: number) => void;
  deleteDiaryPage: (id: string) => void;
  addStrokeToDiaryPage: (pageId: string, stroke: DrawingStroke) => void;
  addStickerToDiaryPage: (pageId: string, sticker: DiarySticker) => void;
  markDiaryPagesRead: (user: 'userA' | 'userB') => void;

  // Cine Retro
  addMediaItem: (item: Omit<MediaItem, 'id'>) => void;
  deleteMediaItem: (id: string) => void;
  submitMediaReview: (id: string, user: 'userA' | 'userB', rating: number, review: string) => void;
  incrementSeriesProgress: (id: string, field: 'season' | 'episode') => void;
  moveWatchlistToWatched: (id: string) => void;
  setTmdbApiKey: (key: string) => void;

  // Mapa 2D
  addMapPin: (pin: Omit<MapPinItem, 'id'>) => void;
  deleteMapPin: (id: string) => void;
  toggleMapPinStatus: (id: string) => void;
  setMapVisualStyle: (style: 'vintage' | 'pastel') => void;

  // Deseos / Antojos
  addCraving: (item: Omit<CravingItem, 'id' | 'completed' | 'createdAt'>) => void;
  fulfillCraving: (id: string) => void;
  deleteCraving: (id: string) => void;

  // Hucha / Tricount
  setCurrency: (curr: '€' | '$' | '£' | '¥') => void;
  addExpense: (exp: Omit<ExpenseItem, 'id' | 'settled'>) => void;
  deleteExpense: (id: string) => void;
  settleAllExpenses: () => void;
  addSavingsContribution: (goalId: string, amount: number) => void;
  addSavingsGoal: (title: string, emoji: string, targetAmount: number) => void;

  // Invernadero Lunar
  setLunarMode: (mode: 'single' | 'dual' | 'hidden') => void;
  setLunarOwner: (owner: 'userA' | 'userB') => void;
  updateLunarProfile: (which: 'A' | 'B', partial: Partial<LunarProfileState>) => void;
}

const broadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('myworld_realtime_sync')
    : null;

export const useWorldStore = create<WorldState>()(
  persist(
    (set, get) => {
      // Wrapper para mutaciones de datos del planeta: incrementa localChangeVersion
      // para disparar push a Supabase SOLO en cambios reales del usuario (nunca al recibir Realtime ni al montar).
      const setSynced = (
        updater:
          | Partial<WorldState>
          | ((state: WorldState) => Partial<WorldState>)
      ) => {
        set((state) => {
          const patch = typeof updater === 'function' ? updater(state) : updater;
          return {
            ...patch,
            localChangeVersion: state.localChangeVersion + 1,
          };
        });
      };

      const appendDeletedId = (deletedIds: string[], id: string): string[] =>
        Array.from(new Set([...deletedIds, id])).slice(-200);

      return {
      // Estado de Sincronización Multi-Dispositivo (efímero)
      syncStatus: 'connecting',
      syncError: null,
      lastSyncedAt: null,
      realtimeStatus: 'CONNECTING',
      localChangeVersion: 0,

      // Tombstones persistentes y marca de reinicio de besos
      deletedIds: [],
      kissesResetAt: 0,
      lastSyncedWorldId: null,

      // Si es la primera vez en el móvil, comienza en el Paso 1 del Onboarding
      authUserId: null,
      authUserEmail: null,
      worldId: null,
      onboardingCompleted: false,
      onboardingStep: 1,

      planetName: 'Planeta Canela y Miel',
      roomCode: 'MIEL26',
      anniversaryDate: getSeedAnniversaryDate(),
      activeUser: 'userA',
      theme: 'melocoton',
      isMuted: false,
      solarOverride: 'auto',
      weatherOverride: 'auto',
      activeBuilding: null,
      settingsOpen: false,
      anniversaryModalOpen: false,
      hasCompletedLanding: false,

      totalKissesHistory: 0,
      kissCooldownUntil: 0,
      pendingKissBursts: [],

      petA: {
        ownerName: 'Alex',
        petName: 'Mochi',
        species: 'capibara',
        hat: 'rana',
        glasses: 'ninguno',
        neck: 'bufanda',
        mood: 'Mimoso',
        speechBubble: '¡Con ganas de abrazarte fuerte!',
        birthday: '1999-04-18',
      },
      petB: {
        ownerName: 'Cris',
        petName: 'DinoBoli',
        species: 'dino',
        hat: 'corona_flores',
        glasses: 'redondas',
        neck: 'ninguno',
        mood: 'Feliz',
        speechBubble: 'Preparando tortitas para los dos 🥞',
        birthday: '1998-11-24',
      },
      petCare: {
        hunger: 84,
        energy: 88,
        affection: 92,
        hygiene: 78,
        roomRug: 'flores',
        roomLamp: 'honguito',
        lastUpdated: Date.now(),
        celebrationBounceUntil: 0,
      },

      diaryPages: [
        {
          id: 'diary-seed-1',
          date: '10 de Noviembre, 2026',
          author: 'userB',
          title: 'Nuestro domingo de lluvia y tortitas',
          caption: 'Me encanta cómo te ríes cuando intentamos dar la vuelta a las tortitas en el aire 🥞💕',
          photoDataUrl: undefined,
          frameStyle: 'clasico',
          canvasBgColor: '#FFFDF9',
          strokes: [],
          stickers: [],
          readByUserA: false,
          readByUserB: true,
        },
        {
          id: 'diary-seed-2',
          date: '2 de Noviembre, 2026',
          author: 'userA',
          title: 'Atardecer mágico en el mirador',
          caption: 'Prometimos volver cada otoño con nuestra mantita de cuadros y chocolate caliente.',
          photoDataUrl: undefined,
          frameStyle: 'clasico',
          canvasBgColor: '#FFFDF9',
          strokes: [],
          stickers: [],
          readByUserA: true,
          readByUserB: true,
        },
      ],

      mediaItems: [
        {
          id: 'media-watched-1',
          title: 'Mi Vecino Totoro',
          year: '1988',
          durationMin: 86,
          category: 'Anime',
          genre: 'Fantasía Cozy',
          posterUrl: 'https://image.tmdb.org/t/p/w500/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg',
          status: 'watched',
          season: 1,
          episode: 1,
          ratingA: 5,
          reviewA: '¡Quiero vivir dentro de ese bosque contigo y un paraguas gigante!',
          ratingB: 5,
          reviewB: 'El gatobús es literalmente nuestro transporte soñado 🐾',
        },
        {
          id: 'media-watched-2',
          title: 'Frieren: Más allá del final del viaje',
          year: '2023',
          durationMin: 24,
          category: 'Anime',
          genre: 'Aventura / Fantasía',
          posterUrl: 'https://image.tmdb.org/t/p/w500/dqZENchTd7lp5zht7BdlqM7RBhD.jpg',
          status: 'watched',
          season: 1,
          episode: 18,
          ratingB: 5,
          reviewB: 'Cada capítulo nos deja abrazados en el sofá valorando cada segundo juntos 💕',
        },
        {
          id: 'media-pending-1',
          title: 'El Castillo Ambulante',
          year: '2004',
          durationMin: 119,
          category: 'Película',
          genre: 'Fantasía / Romance',
          posterUrl: 'https://image.tmdb.org/t/p/w500/TkTPELv4kC3u1lkloush8skOjE.jpg',
          status: 'watchlist',
          season: 1,
          episode: 1,
        },
        {
          id: 'media-pending-2',
          title: 'Mi Vecino Totoro',
          year: '1988',
          durationMin: 86,
          category: 'Película',
          genre: 'Fantasía Rápida',
          posterUrl: 'https://image.tmdb.org/t/p/w500/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg',
          status: 'watchlist',
          season: 1,
          episode: 1,
        },
        {
          id: 'media-pending-3',
          title: 'Spy x Family',
          year: '2022',
          durationMin: 24,
          category: 'Anime',
          genre: 'Comedia / Familia',
          posterUrl: 'https://image.tmdb.org/t/p/w500/3r4LYFuXrg3G8fepysr4xSLWnQL.jpg',
          status: 'watchlist',
          season: 2,
          episode: 4,
        },
        {
          id: 'media-pending-4',
          title: 'Antes del Amanecer',
          year: '1995',
          durationMin: 88,
          category: 'Película',
          genre: 'Romance / Viaje',
          posterUrl: 'https://image.tmdb.org/t/p/w500/kf1Jb1c2JAOqjuzA3H4oDM263uB.jpg',
          status: 'watchlist',
          season: 1,
          episode: 1,
        },
      ],
      tmdbApiKey: '',

      mapPins: [
        {
          id: 'pin-visited-1',
          name: 'Madrid · Barquitas del Parque del Retiro',
          lat: 40.4153,
          lng: -3.6845,
          status: 'visited',
          category: 'Momento Especial',
          date: '14 Mayo 2025',
          note: 'Remamos en círculos pero nos reímos durante dos horas seguidas con helado de pistacho.',
          rating: 5,
        },
        {
          id: 'pin-visited-2',
          name: 'París · Picnic al atardecer en Montmartre',
          lat: 48.8867,
          lng: 2.3431,
          status: 'visited',
          category: 'Viaje/Ciudad',
          date: '19 Agosto 2025',
          note: 'Croissants recién horneados, música de acordeón y las luces encendiéndose.',
          rating: 5,
        },
        {
          id: 'pin-visited-3',
          name: 'Lisboa · Mirador de Santa Luzia y Pastéis',
          lat: 38.7116,
          lng: -9.1304,
          status: 'visited',
          category: 'Restaurante/Comida',
          date: '12 Febrero 2026',
          note: 'El tranvía amarillo pasando detrás mientras compartíamos pastéis de nata calentitos.',
          rating: 5,
        },
        {
          id: 'pin-pending-1',
          name: 'Kioto · Bosque de Bambú de Arashiyama',
          lat: 35.017,
          lng: 135.6713,
          status: 'wishlist',
          category: 'Viaje/Ciudad',
          date: 'Nuestro gran sueño',
          note: 'El viaje para el que estamos ahorrando juntos en la Hucha Cerdito ⛩️✨',
          rating: 5,
        },
        {
          id: 'pin-pending-2',
          name: 'Roma · Heladería en Trastevere de noche',
          lat: 41.8892,
          lng: 12.4705,
          status: 'wishlist',
          category: 'Naturaleza/Mirador',
          date: 'Próxima escapada',
          note: 'Pasear de la mano por las callejuelas iluminadas con guirnaldas.',
          rating: 5,
        },
      ],
      mapVisualStyle: 'vintage',

      cravings: [
        {
          id: 'crav-1',
          creator: 'userB',
          emoji: '🍜',
          title: 'Ir a por ramen calentito y gyozas esta noche',
          timeTag: 'Antojo de hoy',
          intensity: 'emergencia',
          completed: false,
          createdAt: 'Hoy, 18:30',
        },
        {
          id: 'crav-2',
          creator: 'userA',
          emoji: '💆‍♀️',
          title: 'Masaje de espalda de 20 minutos con música de lluvia',
          timeTag: 'Para este finde',
          intensity: 'un_poco',
          completed: false,
          createdAt: 'Ayer',
        },
        {
          id: 'crav-3',
          creator: 'userB',
          emoji: '🎬',
          title: 'Fuerte de mantas en el salón y maratón de Studio Ghibli',
          timeTag: 'Para este finde',
          intensity: 'un_poco',
          completed: false,
          createdAt: 'Hace 2 días',
        },
        {
          id: 'crav-4',
          creator: 'userA',
          emoji: '🥐',
          title: 'Desayunar croissants recién hechos en la cama',
          timeTag: 'Para este finde',
          intensity: 'un_poco',
          completed: true,
          createdAt: 'Hace 5 días',
          completedAt: 'Domingo pasado',
        },
      ],

      currency: '€',
      expenses: [
        {
          id: 'exp-1',
          title: 'Cena de sushi y mochis de mango',
          amount: 44.0,
          paidBy: 'userA',
          splitMode: '50_50',
          shareA: 22.0,
          shareB: 22.0,
          category: 'Cena fuera',
          date: 'Ayer',
          settled: false,
        },
        {
          id: 'exp-2',
          title: 'Entradas de cine retro y palomitas dulces',
          amount: 18.0,
          paidBy: 'userB',
          splitMode: '50_50',
          shareA: 9.0,
          shareB: 9.0,
          category: 'Cine/Ocio',
          date: 'Viernes',
          settled: false,
        },
        {
          id: 'exp-3',
          title: 'Compra semanal del supermercado',
          amount: 62.0,
          paidBy: 'userA',
          splitMode: '50_50',
          shareA: 31.0,
          shareB: 31.0,
          category: 'Supermercado',
          date: 'Miércoles',
          settled: false,
        },
        {
          id: 'exp-4',
          title: 'Velas aromáticas de vainilla para la casita',
          amount: 16.0,
          paidBy: 'userB',
          splitMode: 'invito_yo',
          shareA: 0,
          shareB: 16.0,
          category: 'Casa',
          date: 'Lunes',
          settled: false,
        },
      ],
      savingsGoals: [
        {
          id: 'goal-1',
          title: 'Viaje a Japón',
          emoji: '⛩️',
          targetAmount: 1200,
          currentAmount: 540,
          contributions: [
            { id: 'c1', user: 'userA', amount: 300, date: 'Octubre' },
            { id: 'c2', user: 'userB', amount: 240, date: 'Noviembre' },
          ],
        },
      ],

      lunarMode: 'single',
      lunarOwner: 'userA',
      lunarA: {
        ownerName: 'Alex',
        phase: 'menstruacion',
        dayOfCycle: 3,
        flow: 'Medio',
        cramps: 'Dolorcito fuerte',
        energy: 'Baja',
        mood: 'Mimosa',
        craving: 'Chocolate calentito y abrazos largos',
        sensitiveAlertActive: true,
        lastUpdated: 'Hoy',
        cycleLength: 28,
        periodLength: 5,
        periodStartDates: getSeedPeriodStartDates(2, 28),
      },
      lunarB: {
        ownerName: 'Cris',
        phase: 'folicular',
        dayOfCycle: 9,
        flow: 'Ninguno',
        cramps: 'Sin dolor',
        energy: 'Alta',
        mood: 'Radiante',
        craving: 'Paseo al sol y helado',
        sensitiveAlertActive: false,
        lastUpdated: 'Hoy',
        cycleLength: 28,
        periodLength: 5,
        periodStartDates: getSeedPeriodStartDates(8, 28),
      },

      // ============================================================
      // ACCIONES DE SINCRONIZACIÓN
      // ============================================================
      setSyncMeta: (partial) => set(partial),

      clearDemoSeedItems: () => {
        const st = get();
        const removedIds: string[] = [];
        const keepNonSeed = <T extends { id: string }>(arr: T[]): T[] =>
          arr.filter((item) => {
            if (SEED_ITEM_IDS.has(item.id)) {
              removedIds.push(item.id);
              return false;
            }
            return true;
          });

        const diaryPages = keepNonSeed(st.diaryPages);
        const mediaItems = keepNonSeed(st.mediaItems);
        const mapPins = keepNonSeed(st.mapPins);
        const cravings = keepNonSeed(st.cravings);
        const expenses = keepNonSeed(st.expenses);
        const savingsGoals = keepNonSeed(st.savingsGoals);

        if (removedIds.length > 0) {
          soundEngine.playChime();
          setSynced((state) => ({
            diaryPages,
            mediaItems,
            mapPins,
            cravings,
            expenses,
            savingsGoals,
            deletedIds: Array.from(new Set([...state.deletedIds, ...removedIds])).slice(-200),
          }));
        }
        return removedIds.length;
      },

      // ============================================================
      // ACCIONES DE SESIÓN PERSISTENTE Y ONBOARDING (3 PASOS)
      // ============================================================
      setAuthSession: (userId, email, name) => {
        soundEngine.playPop(1.15);
        set((state) => ({
          authUserId: userId,
          authUserEmail: email,
          petA: {
            ...state.petA,
            ownerName: name.trim() || state.petA.ownerName,
          },
          lunarA: {
            ...state.lunarA,
            ownerName: name.trim() || state.lunarA.ownerName,
          },
          onboardingStep: 2,
        }));
      },

      setLinkedWorld: (worldId, planetName, roomCode, anniversaryDate) => {
        soundEngine.playChime();
        set({
          worldId,
          lastSyncedWorldId: null,
          planetName: planetName.trim() || 'Nuestro Planeta',
          roomCode: normalizeRoomCode(roomCode),
          anniversaryDate: anniversaryDate || getSeedAnniversaryDate(),
          onboardingStep: 3,
        });
      },

      completeOnboardingWithPet: (species, petName, birthday) => {
        soundEngine.playChime();
        triggerHeartbeatHaptic('onboarding-complete');
        setSynced((state) => ({
          petA: {
            ...state.petA,
            species,
            petName: petName.trim() || 'Mochi',
            birthday: birthday || '1999-04-18',
          },
          onboardingCompleted: true,
          hasCompletedLanding: false,
        }));
      },

      logoutSession: async () => {
        soundEngine.playPop(0.85);
        await signOutFromSupabase();
        set({
          authUserId: null,
          authUserEmail: null,
          worldId: null,
          lastSyncedWorldId: null,
          onboardingCompleted: false,
          onboardingStep: 1,
          settingsOpen: false,
          activeBuilding: null,
          hasCompletedLanding: false,
          syncStatus: 'offline',
          syncError: null,
          lastSyncedAt: null,
          realtimeStatus: 'DISCONNECTED',
        });
      },

      setPlanetName: (planetName) => {
        setSynced({ planetName });
        const wid = get().worldId;
        if (wid) {
          broadcastChannel?.postMessage({ type: 'SYNC', worldId: wid, state: { planetName } });
        }
      },
      setCoupleNames: (nameA, nameB) => {
        const cleanA = nameA.trim() || 'Alex';
        const cleanB = nameB.trim() || 'Cris';
        soundEngine.playPop(1.1);
        setSynced((state) => ({
          petA: { ...state.petA, ownerName: cleanA },
          petB: { ...state.petB, ownerName: cleanB },
          lunarA: { ...state.lunarA, ownerName: cleanA },
          lunarB: { ...state.lunarB, ownerName: cleanB },
        }));
      },
      setRoomCode: (roomCode) => {
        const clean = normalizeRoomCode(roomCode);
        setSynced({ roomCode: clean });
      },
      generateNewRoomCode: () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        setSynced({ roomCode: code });
        return code;
      },
      setAnniversaryDate: (anniversaryDate) => setSynced({ anniversaryDate }),
      setActiveUser: (activeUser) => {
        soundEngine.playPop(1.1);
        set({ activeUser });
      },
      setTheme: (theme) => {
        soundEngine.playPop(1.15);
        setSynced({ theme });
      },
      toggleMute: () => {
        const next = !get().isMuted;
        soundEngine.isMuted = next;
        set({ isMuted: next });
        if (!next) soundEngine.playPop(1.2);
      },
      setSolarOverride: (solarOverride) => set({ solarOverride }),
      setWeatherOverride: (weatherOverride) => set({ weatherOverride }),
      setActiveBuilding: (activeBuilding) => {
        soundEngine.playPop(activeBuilding ? 1.15 : 0.9);
        set({ activeBuilding });
      },
      setSettingsOpen: (settingsOpen) => {
        soundEngine.playPop();
        set({ settingsOpen });
      },
      setAnniversaryModalOpen: (anniversaryModalOpen) => {
        soundEngine.playPop();
        set({ anniversaryModalOpen });
      },
      completeLanding: () => set({ hasCompletedLanding: true }),

      sendKissBurst: (count, iconType, miniNote) => {
        const trimmedNote = miniNote.trim().split(/\s+/).slice(0, 3).join(' ') || '¡Te quiero!';
        const burst: PendingKissBurst = {
          id: `kiss-${Date.now()}`,
          from: get().activeUser,
          count,
          iconType,
          miniNote: trimmedNote,
          timestamp: Date.now(),
        };
        const cooldown = Date.now() + 5 * 60 * 1000;
        triggerHeartbeatHaptic('kiss-burst');
        soundEngine.playChime();
        setSynced((state) => ({
          totalKissesHistory: state.totalKissesHistory + count,
          kissCooldownUntil: cooldown,
          pendingKissBursts: [...state.pendingKissBursts, burst],
        }));
        const wid = get().worldId;
        if (wid) {
          broadcastChannel?.postMessage({ type: 'KISS_BURST', worldId: wid, burst });
        }
      },

      resetKissCounter: () => {
        soundEngine.playPop(0.95);
        triggerHeartbeatHaptic('reset-kisses');
        setSynced({
          totalKissesHistory: 0,
          kissesResetAt: Date.now(),
          pendingKissBursts: [],
          kissCooldownUntil: 0,
        });
        const wid = get().worldId;
        if (wid) {
          broadcastChannel?.postMessage({
            type: 'SYNC',
            worldId: wid,
            state: { totalKissesHistory: 0, pendingKissBursts: [] },
          });
        }
      },

      consumePendingKissesForActiveUser: () => {
        const current = get().activeUser;
        const all = get().pendingKissBursts;
        const forMe = all.filter((b) => b.from !== current);
        if (forMe.length > 0) {
          setSynced((state) => ({
            pendingKissBursts: all.filter((b) => b.from === current),
            deletedIds: forMe.reduce(
              (acc, b) => appendDeletedId(acc, b.id),
              state.deletedIds
            ),
          }));
        }
        return forMe;
      },

      updatePetProfile: (user, partial) => {
        setSynced((state) => ({
          [user === 'userA' ? 'petA' : 'petB']: {
            ...(user === 'userA' ? state.petA : state.petB),
            ...partial,
          },
        }));
      },

      careForPets: (action) => {
        triggerHeartbeatHaptic(action);
        soundEngine.playPop(1.25);
        setSynced((state) => {
          const c = state.petCare;
          const next = { ...c, lastUpdated: Date.now() };
          if (action === 'feed') {
            next.hunger = Math.min(100, c.hunger + 25);
            next.affection = Math.min(100, c.affection + 8);
          } else if (action === 'wash') {
            next.hygiene = Math.min(100, c.hygiene + 32);
            next.affection = Math.min(100, c.affection + 8);
          } else if (action === 'sleep') {
            next.energy = Math.min(100, c.energy + 30);
          } else if (action === 'pamper_partner') {
            next.affection = Math.min(100, c.affection + 20);
            next.celebrationBounceUntil = Date.now() + 5000;
          } else if (action === 'celebrate') {
            next.affection = 100;
            next.celebrationBounceUntil = Date.now() + 6000;
          }
          return { petCare: next };
        });
      },

      updateRoomDecor: (roomRug, roomLamp) => {
        soundEngine.playPop();
        setSynced((state) => ({
          petCare: { ...state.petCare, roomRug, roomLamp, lastUpdated: Date.now() },
        }));
      },

      addDiaryPage: (pageData) => {
        soundEngine.playPageTurn();
        const author = pageData.author;
        const newPage: DiaryPage = {
          ...pageData,
          id: `diary-${Date.now()}`,
          readByUserA: author === 'userA',
          readByUserB: author === 'userB',
        };
        setSynced((state) => ({
          diaryPages: [newPage, ...state.diaryPages],
        }));
      },

      updateDiaryPage: (pageId, patch) => {
        setSynced((state) => ({
          diaryPages: state.diaryPages.map((p) =>
            p.id === pageId ? { ...p, ...patch } : p
          ),
        }));
      },

      updateDiaryPagePhoto: (pageId, photoDataUrl) => {
        soundEngine.playChime();
        setSynced((state) => ({
          diaryPages: state.diaryPages.map((p) =>
            p.id === pageId ? { ...p, photoDataUrl } : p
          ),
        }));
      },

      deleteDiaryPage: (pageId) => {
        soundEngine.playPop(0.85);
        setSynced((state) => ({
          diaryPages: state.diaryPages.filter((p) => p.id !== pageId),
          deletedIds: appendDeletedId(state.deletedIds, pageId),
        }));
      },

      addStrokeToDiaryPage: (pageId, stroke) => {
        setSynced((state) => ({
          diaryPages: state.diaryPages.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  strokes: [...p.strokes, stroke],
                  readByUserA: stroke.author === 'userA',
                  readByUserB: stroke.author === 'userB',
                }
              : p
          ),
        }));
      },

      addStickerToDiaryPage: (pageId, sticker) => {
        soundEngine.playPop(1.3);
        setSynced((state) => ({
          diaryPages: state.diaryPages.map((p) =>
            p.id === pageId ? { ...p, stickers: [...p.stickers, sticker] } : p
          ),
        }));
      },

      markDiaryPagesRead: (user) => {
        setSynced((state) => ({
          diaryPages: state.diaryPages.map((p) =>
            user === 'userA' ? { ...p, readByUserA: true } : { ...p, readByUserB: true }
          ),
        }));
      },

      addMediaItem: (item) => {
        soundEngine.playPop(1.1);
        setSynced((state) => ({
          mediaItems: [{ ...item, id: `media-${Date.now()}` }, ...state.mediaItems],
        }));
      },

      deleteMediaItem: (id) => {
        soundEngine.playPop(0.85);
        setSynced((state) => ({
          mediaItems: state.mediaItems.filter((m) => m.id !== id),
          deletedIds: appendDeletedId(state.deletedIds, id),
        }));
      },

      submitMediaReview: (id, user, rating, review) => {
        soundEngine.playChime();
        triggerHeartbeatHaptic('movie-review');
        setSynced((state) => ({
          mediaItems: state.mediaItems.map((m) => {
            if (m.id !== id) return m;
            return user === 'userA'
              ? { ...m, ratingA: rating, reviewA: review, status: 'watched' as const }
              : { ...m, ratingB: rating, reviewB: review, status: 'watched' as const };
          }),
          petCare: {
            ...state.petCare,
            affection: Math.min(100, state.petCare.affection + 15),
            celebrationBounceUntil: Date.now() + 5000,
            lastUpdated: Date.now(),
          },
        }));
      },

      incrementSeriesProgress: (id, field) => {
        soundEngine.playPop(1.15);
        setSynced((state) => ({
          mediaItems: state.mediaItems.map((m) =>
            m.id === id ? { ...m, [field]: m[field] + 1 } : m
          ),
        }));
      },

      moveWatchlistToWatched: (id) => {
        soundEngine.playChime();
        setSynced((state) => ({
          mediaItems: state.mediaItems.map((m) =>
            m.id === id ? { ...m, status: 'watched' } : m
          ),
        }));
      },

      setTmdbApiKey: (tmdbApiKey) => set({ tmdbApiKey }),

      addMapPin: (pin) => {
        soundEngine.playChime();
        setSynced((state) => ({
          mapPins: [{ ...pin, id: `pin-${Date.now()}` }, ...state.mapPins],
        }));
      },

      deleteMapPin: (id) => {
        soundEngine.playPop(0.85);
        setSynced((state) => ({
          mapPins: state.mapPins.filter((p) => p.id !== id),
          deletedIds: appendDeletedId(state.deletedIds, id),
        }));
      },

      toggleMapPinStatus: (id) => {
        soundEngine.playPop();
        setSynced((state) => ({
          mapPins: state.mapPins.map((p) =>
            p.id === id
              ? { ...p, status: p.status === 'visited' ? 'wishlist' : 'visited' }
              : p
          ),
        }));
      },

      setMapVisualStyle: (mapVisualStyle) => {
        soundEngine.playPop();
        set({ mapVisualStyle });
      },

      addCraving: (item) => {
        soundEngine.playPop(1.2);
        setSynced((state) => ({
          cravings: [
            {
              ...item,
              id: `crav-${Date.now()}`,
              completed: false,
              createdAt: 'Hace un instante',
            },
            ...state.cravings,
          ],
        }));
      },

      fulfillCraving: (id) => {
        soundEngine.playChime();
        triggerHeartbeatHaptic('craving-fulfilled');
        const today = new Date().toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
        });
        setSynced((state) => ({
          cravings: state.cravings.map((c) =>
            c.id === id ? { ...c, completed: true, completedAt: today } : c
          ),
          petCare: {
            ...state.petCare,
            affection: 100,
            celebrationBounceUntil: Date.now() + 6000,
            lastUpdated: Date.now(),
          },
        }));
      },

      deleteCraving: (id) => {
        soundEngine.playPop(0.85);
        setSynced((state) => ({
          cravings: state.cravings.filter((c) => c.id !== id),
          deletedIds: appendDeletedId(state.deletedIds, id),
        }));
      },

      setCurrency: (currency) => setSynced({ currency }),

      addExpense: (exp) => {
        soundEngine.playPop(1.1);
        setSynced((state) => ({
          expenses: [{ ...exp, id: `exp-${Date.now()}`, settled: false }, ...state.expenses],
        }));
      },

      deleteExpense: (id) => {
        soundEngine.playPop(0.85);
        setSynced((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
          deletedIds: appendDeletedId(state.deletedIds, id),
        }));
      },

      settleAllExpenses: () => {
        soundEngine.playChime();
        triggerHeartbeatHaptic('settle-piggy');
        setSynced((state) => ({
          expenses: state.expenses.map((e) => ({ ...e, settled: true })),
          petCare: {
            ...state.petCare,
            affection: 100,
            celebrationBounceUntil: Date.now() + 5000,
            lastUpdated: Date.now(),
          },
        }));
      },

      addSavingsContribution: (goalId, amount) => {
        soundEngine.playChime();
        triggerHeartbeatHaptic('savings-added');
        const active = get().activeUser;
        const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        setSynced((state) => ({
          savingsGoals: state.savingsGoals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  currentAmount: g.currentAmount + amount,
                  contributions: [
                    ...g.contributions,
                    { id: `c-${Date.now()}`, user: active, amount, date: today },
                  ],
                }
              : g
          ),
        }));
      },

      addSavingsGoal: (title, emoji, targetAmount) => {
        soundEngine.playPop();
        setSynced((state) => ({
          savingsGoals: [
            ...state.savingsGoals,
            {
              id: `goal-${Date.now()}`,
              title,
              emoji,
              targetAmount,
              currentAmount: 0,
              contributions: [],
            },
          ],
        }));
      },

      setLunarMode: (lunarMode) => setSynced({ lunarMode }),

      setLunarOwner: (lunarOwner) => {
        soundEngine.playPop(1.1);
        setSynced({ lunarOwner });
      },

      updateLunarProfile: (which, partial) => {
        soundEngine.playPop(1.1);
        setSynced((state) => {
          const key = which === 'A' ? 'lunarA' : 'lunarB';
          const updated = { ...state[key], ...partial, lastUpdated: 'Hoy' };
          return { [key]: updated };
        });
      },
      };
    },
    {
      name: 'myworld-cozy-storage-v3',
      partialize: (state) => {
        const {
          syncStatus: _s1,
          syncError: _s2,
          lastSyncedAt: _s3,
          realtimeStatus: _s4,
          localChangeVersion: _s5,
          ...persisted
        } = state;
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.onboardingCompleted && state.worldId) {
          state.hasCompletedLanding = false;
        }
        state.roomCode = normalizeRoomCode(state.roomCode || 'MIEL26') || 'MIEL26';
        state.deletedIds = Array.isArray(state.deletedIds) ? state.deletedIds : [];
        state.kissesResetAt = typeof state.kissesResetAt === 'number' ? state.kissesResetAt : 0;
        state.lunarOwner = state.lunarOwner || 'userA';
        // Limpiar cuadrados verdes inventados (data:image/svg+xml) de versiones anteriores
        if (Array.isArray(state.diaryPages)) {
          state.diaryPages = state.diaryPages.map((p) => ({
            ...p,
            photoDataUrl: p.photoDataUrl?.startsWith('data:image/svg+xml')
              ? undefined
              : p.photoDataUrl,
          }));
        }
        if (Array.isArray(state.mapPins)) {
          state.mapPins = state.mapPins.map((p) => ({
            ...p,
            photoDataUrl: p.photoDataUrl?.startsWith('data:image/svg+xml')
              ? undefined
              : p.photoDataUrl,
          }));
        }
        // Limpieza automática de nombres antiguos por defecto ("Usuario A / B")
        if (state.petA && (!state.petA.ownerName || state.petA.ownerName.includes('Usuario A'))) {
          state.petA.ownerName = 'Alex';
        }
        if (state.petB && (!state.petB.ownerName || state.petB.ownerName.includes('Usuario B'))) {
          state.petB.ownerName = 'Cris';
        }
        if (state.lunarA && (!state.lunarA.ownerName || state.lunarA.ownerName.includes('Usuario A'))) {
          state.lunarA.ownerName = state.petA?.ownerName || 'Alex';
        }
        if (state.lunarB && (!state.lunarB.ownerName || state.lunarB.ownerName.includes('Usuario B'))) {
          state.lunarB.ownerName = state.petB?.ownerName || 'Cris';
        }
        if (state.lunarA && (!state.lunarA.periodStartDates || state.lunarA.periodStartDates.length === 0)) {
          state.lunarA.cycleLength = 28;
          state.lunarA.periodLength = 5;
          state.lunarA.periodStartDates = getSeedPeriodStartDates(2, 28);
        }
        if (state.lunarB && (!state.lunarB.periodStartDates || state.lunarB.periodStartDates.length === 0)) {
          state.lunarB.cycleLength = 28;
          state.lunarB.periodLength = 5;
          state.lunarB.periodStartDates = getSeedPeriodStartDates(8, 28);
        }
      },
    }
  )
);
