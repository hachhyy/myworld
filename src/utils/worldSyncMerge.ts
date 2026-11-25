export interface Identifiable {
  id: string;
}

export interface SyncableDiaryPage extends Identifiable {
  photoDataUrl?: string;
  readByUserA?: boolean;
  readByUserB?: boolean;
  strokes?: Identifiable[];
  stickers?: Identifiable[];
  [key: string]: unknown;
}

export interface SyncableMediaItem extends Identifiable {
  status?: 'watched' | 'watchlist';
  season?: number;
  episode?: number;
  ratingA?: number;
  reviewA?: string;
  ratingB?: number;
  reviewB?: string;
  [key: string]: unknown;
}

export interface SyncableMapPin extends Identifiable {
  photoDataUrl?: string;
  [key: string]: unknown;
}

export interface SyncableCraving extends Identifiable {
  completed?: boolean;
  completedAt?: string;
  [key: string]: unknown;
}

export interface SyncableExpense extends Identifiable {
  settled?: boolean;
  [key: string]: unknown;
}

export interface SyncableSavingsGoal extends Identifiable {
  currentAmount?: number;
  contributions?: (Identifiable & { amount?: number })[];
  [key: string]: unknown;
}

export interface SyncablePetCare {
  lastUpdated?: number;
  [key: string]: unknown;
}

export interface SyncableWorldData {
  worldId?: string;
  roomCode?: string;
  planetName?: string;
  anniversaryDate?: string;
  theme?: string;
  currency?: string;
  lunarMode?: string;
  lunarOwner?: 'userA' | 'userB';
  totalKissesHistory?: number;
  kissesResetAt?: number;
  pendingKissBursts?: Identifiable[];
  petA?: Record<string, unknown>;
  petB?: Record<string, unknown>;
  petCare?: SyncablePetCare;
  diaryPages?: SyncableDiaryPage[];
  mediaItems?: SyncableMediaItem[];
  mapPins?: SyncableMapPin[];
  cravings?: SyncableCraving[];
  expenses?: SyncableExpense[];
  savingsGoals?: SyncableSavingsGoal[];
  lunarA?: Record<string, unknown>;
  lunarB?: Record<string, unknown>;
  deletedIds?: string[];
  updatedAtClient?: number;
  updatedByClientId?: string;
}

const MAX_TOMBSTONES = 200;

/**
 * Normalizes any 6-char room code consistently across all devices:
 * trims whitespace, uppercases, strips non-alphanumeric characters, max 6 chars.
 */
export function normalizeRoomCode(code: string): string {
  return (code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

/**
 * Unions two arrays of identifiable objects by unique `id`, applying an optional
 * per-item conflict resolver and filtering out any tombstoned `deletedIds`.
 * Ordering preserves remote items first, then local-only additions.
 */
export function mergeById<T extends Identifiable>(
  localItems: T[] | undefined,
  remoteItems: T[] | undefined,
  deletedIds: string[] = [],
  resolveConflict?: (localItem: T, remoteItem: T) => T
): T[] {
  const deletedSet = new Set(deletedIds);
  const localMap = new Map<string, T>();
  const remoteMap = new Map<string, T>();

  for (const item of localItems || []) {
    if (item && item.id && !deletedSet.has(item.id)) {
      localMap.set(item.id, item);
    }
  }

  for (const item of remoteItems || []) {
    if (item && item.id && !deletedSet.has(item.id)) {
      remoteMap.set(item.id, item);
    }
  }

  const result: T[] = [];
  const seen = new Set<string>();

  for (const [id, remoteItem] of remoteMap.entries()) {
    const localItem = localMap.get(id);
    if (localItem) {
      result.push(resolveConflict ? resolveConflict(localItem, remoteItem) : remoteItem);
    } else {
      result.push(remoteItem);
    }
    seen.add(id);
  }

  for (const [id, localItem] of localMap.entries()) {
    if (!seen.has(id)) {
      result.push(localItem);
    }
  }

  return result;
}

function sanitizePhotoUrl(url: string | undefined): string | undefined {
  if (!url || url.startsWith('data:image/svg+xml')) return undefined;
  return url;
}

function mergeDiaryPage(local: SyncableDiaryPage, remote: SyncableDiaryPage): SyncableDiaryPage {
  return {
    ...local,
    ...remote,
    photoDataUrl: sanitizePhotoUrl(remote.photoDataUrl ?? local.photoDataUrl),
    readByUserA: Boolean(local.readByUserA || remote.readByUserA),
    readByUserB: Boolean(local.readByUserB || remote.readByUserB),
    strokes: mergeById(local.strokes, remote.strokes),
    stickers: mergeById(local.stickers, remote.stickers),
  };
}

function mergeMediaItem(local: SyncableMediaItem, remote: SyncableMediaItem): SyncableMediaItem {
  const status =
    local.status === 'watched' || remote.status === 'watched'
      ? 'watched'
      : remote.status || local.status;
  return {
    ...local,
    ...remote,
    status,
    season: Math.max(local.season || 1, remote.season || 1),
    episode: Math.max(local.episode || 1, remote.episode || 1),
    ratingA: remote.ratingA ?? local.ratingA,
    reviewA: remote.reviewA ?? local.reviewA,
    ratingB: remote.ratingB ?? local.ratingB,
    reviewB: remote.reviewB ?? local.reviewB,
  };
}

function mergeMapPin(local: SyncableMapPin, remote: SyncableMapPin): SyncableMapPin {
  return {
    ...local,
    ...remote,
    photoDataUrl: sanitizePhotoUrl(remote.photoDataUrl ?? local.photoDataUrl),
  };
}

function mergeCraving(local: SyncableCraving, remote: SyncableCraving): SyncableCraving {
  const completed = Boolean(local.completed || remote.completed);
  return {
    ...local,
    ...remote,
    completed,
    completedAt: remote.completedAt || local.completedAt,
  };
}

function mergeExpense(local: SyncableExpense, remote: SyncableExpense): SyncableExpense {
  return {
    ...local,
    ...remote,
    settled: Boolean(local.settled || remote.settled),
  };
}

function mergeSavingsGoal(
  local: SyncableSavingsGoal,
  remote: SyncableSavingsGoal
): SyncableSavingsGoal {
  const contributions = mergeById(local.contributions, remote.contributions);
  const sumContribs = contributions.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const currentAmount = Math.max(
    Number(local.currentAmount) || 0,
    Number(remote.currentAmount) || 0,
    sumContribs
  );
  return {
    ...local,
    ...remote,
    contributions,
    currentAmount,
  };
}

/**
 * Non-destructively merges a remote Supabase snapshot with local state.
 * Preserves concurrent additions from both devices, respects deletion tombstones,
 * and avoids clobbering per-partner fields (e.g. movie reviews, diary strokes).
 */
export function mergeWorldSnapshots(
  local: SyncableWorldData,
  remote: SyncableWorldData
): SyncableWorldData {
  const mergedDeletedIds = Array.from(
    new Set([...(local.deletedIds || []), ...(remote.deletedIds || [])])
  ).slice(-MAX_TOMBSTONES);

  const localReset = local.kissesResetAt || 0;
  const remoteReset = remote.kissesResetAt || 0;
  let totalKissesHistory: number | undefined;
  const kissesResetAt = Math.max(localReset, remoteReset);

  if (remoteReset > localReset) {
    totalKissesHistory = remote.totalKissesHistory ?? 0;
  } else if (localReset > remoteReset) {
    totalKissesHistory = local.totalKissesHistory ?? 0;
  } else if (
    typeof local.totalKissesHistory === 'number' ||
    typeof remote.totalKissesHistory === 'number'
  ) {
    totalKissesHistory = Math.max(
      local.totalKissesHistory ?? 0,
      remote.totalKissesHistory ?? 0
    );
  }

  const localPetCareTime = local.petCare?.lastUpdated || 0;
  const remotePetCareTime = remote.petCare?.lastUpdated || 0;
  const mergedPetCare =
    remote.petCare && local.petCare
      ? remotePetCareTime >= localPetCareTime
        ? { ...local.petCare, ...remote.petCare }
        : { ...remote.petCare, ...local.petCare }
      : remote.petCare || local.petCare;

  const diaryPages =
    local.diaryPages || remote.diaryPages
      ? mergeById(local.diaryPages, remote.diaryPages, mergedDeletedIds, mergeDiaryPage).map(
          (p) => ({ ...p, photoDataUrl: sanitizePhotoUrl(p.photoDataUrl) })
        )
      : undefined;

  const mapPins =
    local.mapPins || remote.mapPins
      ? mergeById(local.mapPins, remote.mapPins, mergedDeletedIds, mergeMapPin).map((p) => ({
          ...p,
          photoDataUrl: sanitizePhotoUrl(p.photoDataUrl),
        }))
      : undefined;

  return {
    ...local,
    ...remote,
    worldId: remote.worldId || local.worldId,
    roomCode: remote.roomCode
      ? normalizeRoomCode(remote.roomCode)
      : local.roomCode
      ? normalizeRoomCode(local.roomCode)
      : undefined,
    planetName: remote.planetName || local.planetName,
    anniversaryDate: remote.anniversaryDate || local.anniversaryDate,
    theme: remote.theme || local.theme,
    currency: remote.currency || local.currency,
    lunarMode: remote.lunarMode || local.lunarMode,
    lunarOwner: remote.lunarOwner || local.lunarOwner,
    totalKissesHistory,
    kissesResetAt,
    pendingKissBursts:
      local.pendingKissBursts || remote.pendingKissBursts
        ? mergeById(local.pendingKissBursts, remote.pendingKissBursts, mergedDeletedIds)
        : undefined,
    petA:
      local.petA || remote.petA
        ? { ...(local.petA || {}), ...(remote.petA || {}) }
        : undefined,
    petB:
      local.petB || remote.petB
        ? { ...(local.petB || {}), ...(remote.petB || {}) }
        : undefined,
    petCare: mergedPetCare,
    diaryPages,
    mediaItems:
      local.mediaItems || remote.mediaItems
        ? mergeById(local.mediaItems, remote.mediaItems, mergedDeletedIds, mergeMediaItem)
        : undefined,
    mapPins,
    cravings:
      local.cravings || remote.cravings
        ? mergeById(local.cravings, remote.cravings, mergedDeletedIds, mergeCraving)
        : undefined,
    expenses:
      local.expenses || remote.expenses
        ? mergeById(local.expenses, remote.expenses, mergedDeletedIds, mergeExpense)
        : undefined,
    savingsGoals:
      local.savingsGoals || remote.savingsGoals
        ? mergeById(local.savingsGoals, remote.savingsGoals, mergedDeletedIds, mergeSavingsGoal)
        : undefined,
    lunarA:
      local.lunarA || remote.lunarA
        ? { ...(local.lunarA || {}), ...(remote.lunarA || {}) }
        : undefined,
    lunarB:
      local.lunarB || remote.lunarB
        ? { ...(local.lunarB || {}), ...(remote.lunarB || {}) }
        : undefined,
    deletedIds: mergedDeletedIds,
  };
}
