import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PetSpecies } from '../store/useWorldStore';

const rawUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://rdvunykuoflteuqkzsfb.supabase.co';
// Asegurar URL base limpia (sin /rest/v1/ al final, ya que Supabase SDK añade /rest/v1 y /auth/v1 automáticamente)
export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_iZHf6ya70vhiwwzQwazrvQ_pBqQ2l5-';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Cliente oficial de Supabase con sesión persistente en móvil
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'myworld-supabase-auth-token',
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
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        let world: WorldRow | undefined;
        if (prof?.world_id) {
          const { data: w } = await supabase
            .from('worlds')
            .select('*')
            .eq('id', prof.world_id)
            .maybeSingle();
          if (w) world = w as WorldRow;
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
  const roomCode = generateSixCharCode();
  const newWorld: WorldRow = {
    id: generateUUID(),
    name: planetName.trim() || 'Nuestro Pequeño Planeta',
    room_code: roomCode,
    anniversary_date: anniversaryDate,
    created_by: userId,
  };

  if (isSupabaseConfigured) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const activeUid = sessionData.session?.user?.id || null;
      const { data, error } = await supabase
        .from('worlds')
        .insert({
          name: newWorld.name,
          room_code: newWorld.room_code,
          anniversary_date: newWorld.anniversary_date,
          created_by: activeUid,
        })
        .select()
        .single();
      if (!error && data) {
        const worlds = getLocalWorlds();
        worlds.push(data as WorldRow);
        saveLocalWorlds(worlds);
        return data as WorldRow;
      }
    } catch {
      // Guardar también localmente si aún no hay sesión confirmada
    }
  }

  const worlds = getLocalWorlds();
  worlds.push(newWorld);
  saveLocalWorlds(worlds);
  return newWorld;
}

// 4. Buscar y vincularse a un Planeta existente en la tabla `worlds` mediante el código de 6 caracteres
export async function joinWorldByCodeInTable(roomCodeInput: string): Promise<WorldRow> {
  const cleanCode = roomCodeInput.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (cleanCode.length < 4) {
    throw new Error('Introduce un código válido de 6 letras o números.');
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('worlds')
        .select('*')
        .eq('room_code', cleanCode)
        .maybeSingle();
      if (!error && data) {
        return data as WorldRow;
      }
    } catch {
      // Continuar a búsqueda local
    }
  }

  const worlds = getLocalWorlds();
  const found = worlds.find((w) => w.room_code.toUpperCase() === cleanCode);
  if (found) return found;

  const linkedWorld: WorldRow = {
    id: generateUUID(),
    name: `Planeta ${cleanCode}`,
    room_code: cleanCode,
    anniversary_date: '2024-06-30',
    created_by: null,
  };
  worlds.push(linkedWorld);
  saveLocalWorlds(worlds);
  return linkedWorld;
}

// 5. Guardar mascota inicial y cumpleaños en la tabla `profiles` con su `auth.user.id`
export async function saveProfileInTable(profile: ProfileRow): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id || profile.id;
      await supabase.from('profiles').upsert({
        id: uid,
        name: profile.name,
        email: profile.email,
        world_id: profile.world_id,
        birthday: profile.birthday,
        pet_species: profile.pet_species,
        pet_name: profile.pet_name,
      });
    } catch {
      // Respaldo en localStorage
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
}

export async function signOutFromSupabase(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut().catch(() => {});
  }
}
