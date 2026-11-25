import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PetSpecies } from '../store/useWorldStore';
import {
  normalizeRoomCode,
  type SyncableWorldData,
} from '../utils/worldSyncMerge';

const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const FALLBACK_SUPABASE_URL = 'https://rdvunykuoflteuqkzsfb.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_iZHf6ya70vhiwwzQwazrvQ_pBqQ2l5-';

const rawUrl = envUrl || FALLBACK_SUPABASE_URL;
// Asegurar URL base limpia (sin /rest/v1/ al final, ya que Supabase SDK añade /rest/v1 y /auth/v1 automáticamente)
export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

export const SUPABASE_ANON_KEY = envAnonKey || FALLBACK_SUPABASE_ANON_KEY;

export const isUsingEnvVars = Boolean(envUrl && envAnonKey);
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isUsingEnvVars && typeof console !== 'undefined') {
  console.warn(
    '[MyWorld Sync] VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no detectadas en import.meta.env; usando configuración de proyecto por defecto.'
  );
}

// Cliente oficial de Supabase con sesión persistente en móvil y heartbeat Realtime para iOS PWA
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'myworld-supabase-auth-token',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface WorldRow {
  id: string;
  name: string;
  room_code: string;
  anniversary_date: string;
  created_by: string | null;
}

export interface ProfileRow {
  id: string; // auth.user.id (UUID)
  name: string;
  email: string;
  world_id: string | null;
  birthday: string;
  pet_species: PetSpecies;
  pet_name: string;
}

export interface SyncResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export type RealtimeConnectionStatus = 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';

const LOCAL_WORLDS_KEY = 'myworld_local_worlds_table';
const LOCAL_PROFILES_KEY = 'myworld_local_profiles_table';

function getLocalWorlds(): WorldRow[] {
  try {
    const raw = localStorage.getItem(LOCAL_WORLDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const seedWorld: WorldRow = {
    id: '00000000-0000-4000-8000-000000000026',
    name: 'Planeta Canela y Miel',
    room_code: 'MIEL26',
    anniversary_date: '2024-06-30',
    created_by: null,
  };
  return [seedWorld];
}

function saveLocalWorlds(worlds: WorldRow[]) {
  try {
    localStorage.setItem(LOCAL_WORLDS_KEY, JSON.stringify(worlds));
  } catch {
    // ignore
  }
}

function getLocalProfiles(): ProfileRow[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveLocalProfiles(profiles: ProfileRow[]) {
  try {
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore
  }
}

export function generateSixCharCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function syncAuthenticatedProfileWorldId(worldId: string): Promise<void> {
  if (!isSupabaseConfigured || !worldId) return;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;
    const { error } = await supabase
      .from('profiles')
      .update({ world_id: worldId, updated_at: new Date().toISOString() })
      .eq('id', uid);
    if (error) {
      console.warn('[MyWorld Sync] No se pudo actualizar profiles.world_id:', error.message);
    }
  } catch (err) {
    console.warn('[MyWorld Sync] Error actualizando profiles.world_id:', err);
  }
}

// 1. Registro con supabase.auth.signUp
export async function registerUserWithSupabase(
  name: string,
  email: string,
  password: string
): Promise<{ userId: string; email: string; name: string }> {
  let userId = generateUUID();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) {
        // Si el usuario ya existe en Supabase, intentar iniciar sesión directamente
        if (error.message.toLowerCase().includes('already registered')) {
          const loginRes = await supabase.auth.signInWithPassword({ email, password });
          if (loginRes.data.user) {
            userId = loginRes.data.user.id;
          }
        } else {
          throw new Error(error.message);
        }
      } else if (data.user) {
        userId = data.user.id;
      }
    } catch (err) {
      console.error('[MyWorld Sync] Error en signUp:', err);
      if (err instanceof Error && err.message && !err.message.includes('fetch')) {
        throw err;
      }
    }
  }

  const profiles = getLocalProfiles();
  profiles.push({
    id: userId,
    name,
    email,
    world_id: null,
    birthday: '1999-04-18',
    pet_species: 'capibara',
    pet_name: 'Mochi',
  });
  saveLocalProfiles(profiles);
  return { userId, email, name };
}

// 2. Inicio de sesión con supabase.auth.signInWithPassword
export async function loginUserWithSupabase(
  email: string,
  password: string
): Promise<{
  userId: string;
  email: string;
  name: string;
  profile?: ProfileRow;
  world?: WorldRow;
}> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      if (data.user) {
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profErr) {
          console.error('[MyWorld Sync] Error leyendo perfil tras login:', profErr.message);
        }
        let world: WorldRow | undefined;
        if (prof?.world_id) {
          const { data: w, error: wErr } = await supabase
            .from('worlds')
            .select('id,name,room_code,anniversary_date,created_by')
            .eq('id', prof.world_id)
            .maybeSingle();
          if (wErr) {
            console.error('[MyWorld Sync] Error leyendo mundo tras login:', wErr.message);
          }
          if (w) {
            world = {
              ...(w as WorldRow),
              room_code: normalizeRoomCode((w as WorldRow).room_code),
            };
          }
        }
        return {
          userId: data.user.id,
          email: data.user.email || email,
          name: prof?.name || data.user.user_metadata?.full_name || email.split('@')[0],
          profile: (prof as ProfileRow) || undefined,
          world,
        };
      }
    } catch (err) {
      console.error('[MyWorld Sync] Error en login:', err);
      // Buscar también en respaldo local si el correo aún no fue confirmado en Supabase
      const profiles = getLocalProfiles();
      const existing = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        const worlds = getLocalWorlds();
        const world = worlds.find((w) => w.id === existing.world_id);
        return {
          userId: existing.id,
          email: existing.email,
          name: existing.name,
          profile: existing,
          world,
        };
      }
      if (err instanceof Error) throw err;
    }
  }

  const profiles = getLocalProfiles();
  const existing = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    const worlds = getLocalWorlds();
    const world = worlds.find((w) => w.id === existing.world_id);
    return {
      userId: existing.id,
      email: existing.email,
      name: existing.name,
      profile: existing,
      world,
    };
  }

  const fallbackName = email.split('@')[0] || 'Cariño';
  const userId = generateUUID();
  return { userId, email, name: fallbackName };
}

// 3. Crear un nuevo Planeta en la tabla `worlds`
export async function createWorldInTable(
  userId: string,
  planetName: string,
  anniversaryDate: string
): Promise<WorldRow> {
  const roomCode = normalizeRoomCode(generateSixCharCode());
  const cleanName = planetName.trim() || 'Nuestro Pequeño Planeta';

  if (!isSupabaseConfigured) {
    throw new Error('Supabase no está configurado en este despliegue.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const activeUid = sessionData.session?.user?.id || null;
  const { data, error } = await supabase
    .from('worlds')
    .insert({
      name: cleanName,
      room_code: roomCode,
      anniversary_date: anniversaryDate,
      created_by: activeUid,
    })
    .select('id,name,room_code,anniversary_date,created_by')
    .single();

  if (error || !data) {
    const msg = error?.message || 'No se pudo crear el planeta en Supabase.';
    console.error('[MyWorld Sync] Error creando planeta en Supabase:', msg, error);
    throw new Error(
      `No se pudo crear el planeta en la nube (${msg}). Revisa conexión o políticas RLS.`
    );
  }

  const createdWorld: WorldRow = {
    ...(data as WorldRow),
    room_code: normalizeRoomCode((data as WorldRow).room_code),
  };

  await syncAuthenticatedProfileWorldId(createdWorld.id);

  const worlds = getLocalWorlds().filter((w) => w.id !== createdWorld.id);
  worlds.push(createdWorld);
  saveLocalWorlds(worlds);

  // Guardar referencia local del creador
  if (userId) {
    const profiles = getLocalProfiles();
    const idx = profiles.findIndex((p) => p.id === userId);
    if (idx >= 0) {
      profiles[idx] = { ...profiles[idx], world_id: createdWorld.id };
      saveLocalProfiles(profiles);
    }
  }

  return createdWorld;
}

// 4. Buscar y vincularse a un Planeta existente en la tabla `worlds` mediante el código de 6 caracteres (aislamiento estricto por `world_id`)
export async function joinWorldByCodeInTable(roomCodeInput: string): Promise<WorldRow> {
  const cleanCode = normalizeRoomCode(roomCodeInput);
  if (cleanCode.length < 4) {
    throw new Error('Introduce un código válido de 6 letras o números.');
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase no está configurado en este despliegue.');
  }

  const { data, error } = await supabase
    .from('worlds')
    .select('id,name,room_code,anniversary_date,created_by')
    .eq('room_code', cleanCode)
    .maybeSingle();

  if (error) {
    console.error('[MyWorld Sync] Error buscando planeta por room_code:', error.message, error);
    throw new Error(
      `Sin conexión con la nube al buscar el código ${cleanCode} (${error.message}).`
    );
  }

  if (data) {
    const foundWorld: WorldRow = {
      ...(data as WorldRow),
      room_code: normalizeRoomCode((data as WorldRow).room_code),
    };
    await syncAuthenticatedProfileWorldId(foundWorld.id);

    const worlds = getLocalWorlds().filter((w) => w.id !== foundWorld.id);
    worlds.push(foundWorld);
    saveLocalWorlds(worlds);
    return foundWorld;
  }

  // Si el código aún no existe en la tabla remota, crear la fila aislada con su UUID único `world_id`
  const { data: sessionData } = await supabase.auth.getSession();
  const activeUid = sessionData.session?.user?.id || null;

  const { data: created, error: insertErr } = await supabase
    .from('worlds')
    .insert({
      name: `Planeta ${cleanCode}`,
      room_code: cleanCode,
      anniversary_date: '2024-06-30',
      created_by: activeUid,
    })
    .select('id,name,room_code,anniversary_date,created_by')
    .single();

  if (insertErr || !created) {
    const msg = insertErr?.message || 'RLS o red impidió crear la sala.';
    console.error('[MyWorld Sync] Error creando planeta por room_code:', msg, insertErr);
    throw new Error(
      `No se pudo vincular el código ${cleanCode} en Supabase (${msg}).`
    );
  }

  const createdWorld: WorldRow = {
    ...(created as WorldRow),
    room_code: normalizeRoomCode((created as WorldRow).room_code),
  };
  await syncAuthenticatedProfileWorldId(createdWorld.id);

  const worlds = getLocalWorlds().filter((w) => w.id !== createdWorld.id);
  worlds.push(createdWorld);
  saveLocalWorlds(worlds);
  return createdWorld;
}

export async function updateWorldRoomCodeInTable(
  worldId: string,
  newRoomCode: string
): Promise<SyncResult<{ roomCode: string }>> {
  const cleanCode = normalizeRoomCode(newRoomCode);
  if (!isSupabaseConfigured || !worldId || cleanCode.length < 4) {
    return { ok: false, error: 'Código o mundo inválido.' };
  }
  try {
    const { data, error } = await supabase
      .from('worlds')
      .update({ room_code: cleanCode, updated_at: new Date().toISOString() })
      .eq('id', worldId)
      .select('id,room_code');

    if (error) {
      console.error('[MyWorld Sync] Error actualizando room_code:', error.message);
      return { ok: false, error: error.message, code: error.code };
    }
    if (!data || data.length === 0) {
      const msg = 'No se pudo actualizar el código (0 filas afectadas por RLS o ID inexistente).';
      console.error('[MyWorld Sync]', msg);
      return { ok: false, error: msg, code: 'RLS_ZERO_ROWS' };
    }
    return { ok: true, data: { roomCode: cleanCode } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de red actualizando código';
    console.error('[MyWorld Sync] Excepción actualizando room_code:', msg);
    return { ok: false, error: msg };
  }
}

// 5. Guardar mascota inicial y cumpleaños en la tabla `profiles` filtrando por `world_id`
export async function saveProfileInTable(profile: ProfileRow): Promise<SyncResult> {
  let cloudResult: SyncResult = { ok: true };
  if (isSupabaseConfigured && profile.world_id) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (uid) {
        const { error } = await supabase.from('profiles').upsert({
          id: uid,
          name: profile.name,
          email: profile.email,
          world_id: profile.world_id,
          birthday: profile.birthday,
          pet_species: profile.pet_species,
          pet_name: profile.pet_name,
        });
        if (error) {
          console.error('[MyWorld Sync] Error guardando perfil en Supabase:', error.message);
          cloudResult = { ok: false, error: error.message, code: error.code };
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de red guardando perfil';
      console.error('[MyWorld Sync] Excepción guardando perfil:', msg);
      cloudResult = { ok: false, error: msg };
    }
  }

  const profiles = getLocalProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  saveLocalProfiles(profiles);
  return cloudResult;
}

export async function signOutFromSupabase(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut().catch((err) => {
      console.warn('[MyWorld Sync] Error al cerrar sesión:', err);
    });
  }
}

// 6. Sincronización en Tiempo Real del estado completo de los 7 edificios filtrado estrictamente por `world_id`
export const CLIENT_INSTANCE_ID = generateUUID();

export type SyncedWorldSnapshot = SyncableWorldData;

export interface PulledWorldPayload {
  snapshot: SyncedWorldSnapshot;
  resolvedWorldId: string;
  resolvedRoomCode: string;
}

function rowToSnapshot(row: Record<string, unknown>): SyncedWorldSnapshot {
  const ws = (row.world_state as SyncedWorldSnapshot) || {};
  return {
    ...ws,
    worldId: row.id as string,
    roomCode: row.room_code ? normalizeRoomCode(row.room_code as string) : ws.roomCode,
    planetName: (row.name as string) || ws.planetName,
    anniversaryDate: (row.anniversary_date as string) || ws.anniversaryDate,
    theme: (row.theme as string) || ws.theme,
    currency: (row.currency as string) || ws.currency,
    lunarMode: (row.lunar_mode as string) || ws.lunarMode,
    totalKissesHistory:
      typeof row.total_kisses_history === 'number'
        ? ws.kissesResetAt
          ? row.total_kisses_history
          : Math.max(row.total_kisses_history, ws.totalKissesHistory || 0)
        : ws.totalKissesHistory,
  };
}

export async function pullWorldStateFromSupabase(
  worldId: string,
  roomCodeFallback?: string
): Promise<SyncResult<PulledWorldPayload>> {
  if (!isSupabaseConfigured || !worldId) {
    return { ok: false, error: 'Supabase no configurado o world_id vacío.' };
  }

  try {
    const selectCols =
      'id,name,room_code,anniversary_date,theme,currency,lunar_mode,total_kisses_history,world_state';

    let { data, error } = await supabase
      .from('worlds')
      .select(selectCols)
      .eq('id', worldId)
      .maybeSingle();

    if (error) {
      console.error('[MyWorld Sync] Error al leer worlds por id:', error.message, error);
      return { ok: false, error: error.message, code: error.code };
    }

    // Auto-sanación: si el dispositivo tenía un worldId local antiguo pero un roomCode válido, re-anclar al UUID real de Supabase
    if (!data && roomCodeFallback) {
      const cleanCode = normalizeRoomCode(roomCodeFallback);
      if (cleanCode.length >= 4) {
        const byCode = await supabase
          .from('worlds')
          .select(selectCols)
          .eq('room_code', cleanCode)
          .maybeSingle();

        if (byCode.error) {
          console.error(
            '[MyWorld Sync] Error al buscar worlds por room_code:',
            byCode.error.message
          );
          return { ok: false, error: byCode.error.message, code: byCode.error.code };
        }
        data = byCode.data;
        if (data) {
          await syncAuthenticatedProfileWorldId(data.id);
        }
      }
    }

    if (!data) {
      const msg =
        'No se encontró el planeta en Supabase (verifica el código de 6 letras o políticas RLS de SELECT).';
      console.error('[MyWorld Sync]', msg, { worldId, roomCodeFallback });
      return { ok: false, error: msg, code: 'WORLD_NOT_FOUND' };
    }

    const snapshot = rowToSnapshot(data as Record<string, unknown>);
    return {
      ok: true,
      data: {
        snapshot,
        resolvedWorldId: data.id,
        resolvedRoomCode: normalizeRoomCode(data.room_code || roomCodeFallback || ''),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de red al sincronizar con Supabase';
    console.error('[MyWorld Sync] Excepción en pullWorldStateFromSupabase:', msg);
    return { ok: false, error: msg, code: 'NETWORK_ERROR' };
  }
}

export async function pushWorldStateToSupabase(
  worldId: string,
  roomCode: string,
  snapshot: SyncedWorldSnapshot
): Promise<SyncResult<{ updatedAt: string }>> {
  if (!isSupabaseConfigured || !worldId) {
    return { ok: false, error: 'Supabase no configurado o world_id vacío.' };
  }

  const normalizedCode = normalizeRoomCode(roomCode);
  const nowIso = new Date().toISOString();

  try {
    const payload = {
      name: snapshot.planetName || 'Nuestro Pequeño Planeta',
      room_code: normalizedCode || undefined,
      anniversary_date: snapshot.anniversaryDate || '2024-06-30',
      theme: snapshot.theme || 'melocoton',
      currency: snapshot.currency || '€',
      lunar_mode: snapshot.lunarMode || 'single',
      total_kisses_history: snapshot.totalKissesHistory || 0,
      world_state: {
        ...snapshot,
        worldId,
        roomCode: normalizedCode,
        updatedAtClient: Date.now(),
        updatedByClientId: CLIENT_INSTANCE_ID,
      },
      updated_at: nowIso,
    };

    // IMPORTANTE: .select('id') detecta bloqueos silenciosos de RLS (cuando PostgREST devuelve error=null pero 0 filas afectadas)
    const { data, error } = await supabase
      .from('worlds')
      .update(payload)
      .eq('id', worldId)
      .select('id');

    if (error) {
      console.error('[MyWorld Sync] Error al guardar en Supabase:', error.message, error);
      return { ok: false, error: error.message, code: error.code };
    }

    if (!data || data.length === 0) {
      const msg =
        'Guardado bloqueado (0 filas actualizadas). Revisa RLS de UPDATE en public.worlds o re-vincula el código.';
      console.error('[MyWorld Sync]', msg, { worldId, roomCode: normalizedCode });
      return { ok: false, error: msg, code: 'RLS_ZERO_ROWS' };
    }

    return { ok: true, data: { updatedAt: nowIso } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de red al guardar en Supabase';
    console.error('[MyWorld Sync] Excepción en pushWorldStateToSupabase:', msg);
    return { ok: false, error: msg, code: 'NETWORK_ERROR' };
  }
}

export interface RealtimeSubscriptionHandle {
  unsubscribe: () => void;
  getStatus: () => RealtimeConnectionStatus;
}

export function subscribeToWorldRealtime(
  worldId: string,
  onRemoteUpdate: (snapshot: SyncedWorldSnapshot) => void,
  onStatusChange?: (status: RealtimeConnectionStatus, detail?: string) => void
): RealtimeSubscriptionHandle {
  if (!isSupabaseConfigured || !worldId) {
    onStatusChange?.('DISCONNECTED', 'Supabase no configurado');
    return {
      unsubscribe: () => {},
      getStatus: () => 'DISCONNECTED',
    };
  }

  let currentStatus: RealtimeConnectionStatus = 'CONNECTING';
  onStatusChange?.('CONNECTING');

  const channelName = `myworld-isolated-${worldId}-${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'worlds',
        filter: `id=eq.${worldId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (!row || row.id !== worldId) return;
        const ws = (row.world_state as SyncedWorldSnapshot) || {};
        // Ignorar actualizaciones originadas en esta misma pestaña/dispositivo para evitar bucles
        if (ws.updatedByClientId && ws.updatedByClientId === CLIENT_INSTANCE_ID) {
          return;
        }
        onRemoteUpdate(rowToSnapshot(row));
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        currentStatus = 'SUBSCRIBED';
        onStatusChange?.('SUBSCRIBED');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        currentStatus = 'ERROR';
        console.error('[MyWorld Sync] Canal Realtime en error:', status, err?.message);
        onStatusChange?.('ERROR', err?.message || status);
      } else if (status === 'CLOSED') {
        currentStatus = 'DISCONNECTED';
        onStatusChange?.('DISCONNECTED', 'Canal Realtime cerrado');
      }
    });

  return {
    unsubscribe: () => {
      currentStatus = 'DISCONNECTED';
      supabase.removeChannel(channel);
    },
    getStatus: () => currentStatus,
  };
}
