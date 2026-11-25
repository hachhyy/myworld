-- ============================================================================
-- 🪐 MYWORLD · ESQUEMA SQL COMPLETO PARA SUPABASE (SQL EDITOR)
-- Copia y pega todo este bloque en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Incluye: Tablas, Índices, Row Level Security (Privacidad Multi-Pareja) y Realtime
-- ============================================================================

-- 1. Extensiones necesarias
create extension if not exists "pgcrypto";

-- ============================================================================
-- 2. TABLA: worlds (Cada planeta privado compartido por una pareja)
-- ============================================================================
create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nuestro Pequeño Planeta',
  room_code varchar(6) not null unique,
  anniversary_date date not null default current_date,
  theme text not null default 'melocoton',
  currency text not null default '€',
  lunar_mode text not null default 'single', -- 'single' | 'dual' | 'hidden'
  total_kisses_history integer not null default 0,
  world_state jsonb default '{}'::jsonb, -- Sincronización instantánea de todo el estado del mundo
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_worlds_room_code on public.worlds(room_code);

-- ============================================================================
-- 3. TABLA: profiles (Cada miembro de la pareja y su mascota asignada)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  world_id uuid references public.worlds(id) on delete set null,
  birthday date not null default '1999-04-18',
  pet_species text not null default 'capibara',
  pet_name text not null default 'Mochi',
  pet_hat text not null default 'rana',
  pet_glasses text not null default 'ninguno',
  pet_neck text not null default 'ninguno',
  pet_mood text not null default 'Feliz',
  speech_bubble text not null default '¡Con ganas de abrazarte!',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_world_id on public.profiles(world_id);

-- ============================================================================
-- 4. TABLA: kiss_bursts (Ráfagas de hasta 50 besos y lluvia física en el planeta)
-- ============================================================================
create table if not exists public.kiss_bursts (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  count integer not null check (count between 1 and 50),
  icon_type text not null default 'corazones', -- 'corazones' | 'pintalabios' | 'gatitos' | 'estrellas' | 'abrazos'
  mini_note text not null default '¡Te echo de menos!',
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. TABLA: diary_pages (Edificio 2: Buzón Postal, Polaroids WebP y Dibujo a 4 manos)
-- ============================================================================
create table if not exists public.diary_pages (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  date_label text not null,
  title text not null,
  caption text not null,
  photo_data_url text, -- Imagen comprimida en cliente a WebP (<120KB)
  photo_size_kb numeric(6,1),
  frame_style text not null default 'vichy',
  canvas_bg_color text not null default '#FFFDF9',
  strokes jsonb not null default '[]'::jsonb,
  stickers jsonb not null default '[]'::jsonb,
  is_read_by_partner boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 6. TABLA: media_items (Edificio 3: Cine Retro, Doble Voto Secreto y Ruleta)
-- ============================================================================
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  tmdb_id integer,
  title text not null,
  year text not null default '2025',
  duration_min integer not null default 90,
  category text not null default 'Película', -- 'Película' | 'Serie' | 'Anime'
  genre text not null default 'Fantasía',
  poster_url text,
  status text not null default 'watchlist', -- 'watched' | 'watchlist'
  season integer not null default 1,
  episode integer not null default 1,
  rating_a smallint check (rating_a between 1 and 5),
  review_a text,
  rating_b smallint check (rating_b between 1 and 5),
  review_b text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 7. TABLA: map_pins (Edificio 4: Faro y Mapa 2D de Viajes y Citas)
-- ============================================================================
create table if not exists public.map_pins (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  status text not null default 'visited', -- 'visited' | 'wishlist'
  category text not null default 'Momento Especial',
  visit_date text not null default 'Recuerdo juntos',
  note text not null default '',
  rating smallint not null default 5,
  photo_data_url text, -- Foto Polaroid WebP (<120KB)
  photo_size_kb numeric(6,1),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 8. TABLA: cravings (Edificio 5: Fuente de los Deseos y Tablón de Antojos)
-- ============================================================================
create table if not exists public.cravings (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  creator_id uuid references auth.users(id) on delete set null,
  emoji text not null default '🍜',
  title text not null,
  time_tag text not null default 'Antojo de hoy',
  intensity text not null default 'un_poco', -- 'un_poco' | 'emergencia'
  completed boolean not null default false,
  completed_at text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 9. TABLAS: expenses y savings_goals (Edificio 6: Cerdito Tricount y Hucha)
-- ============================================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  title text not null,
  amount numeric(10,2) not null,
  paid_by text not null default 'userA',
  split_mode text not null default '50_50',
  share_a numeric(10,2) not null,
  share_b numeric(10,2) not null,
  category text not null default 'Cena fuera',
  settled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  title text not null,
  emoji text not null default '⛩️',
  target_amount numeric(10,2) not null default 1000,
  current_amount numeric(10,2) not null default 0,
  contributions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 10. TABLA: lunar_cycles (Edificio 7: Invernadero Lunar y Óvulo Cute)
-- ============================================================================
create table if not exists public.lunar_cycles (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  slot text not null default 'A', -- 'A' o 'B' (soporta 1 o 2 calendarios simultáneos)
  owner_name text not null default 'Cariño',
  phase text not null default 'menstruacion',
  day_of_cycle integer not null default 1,
  flow text not null default 'Medio',
  cramps text not null default 'Sin dolor',
  energy text not null default 'Normal',
  mood text not null default 'Mimosa',
  craving text not null default 'Chocolate calentito y mimos',
  sensitive_alert_active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 11. SEGURIDAD ROW LEVEL SECURITY (RLS) · PRIVACIDAD TOTAL MULTI-PAREJA
-- ============================================================================
alter table public.worlds enable row level security;
alter table public.profiles enable row level security;
alter table public.kiss_bursts enable row level security;
alter table public.diary_pages enable row level security;
alter table public.media_items enable row level security;
alter table public.map_pins enable row level security;
alter table public.cravings enable row level security;
alter table public.expenses enable row level security;
alter table public.savings_goals enable row level security;
alter table public.lunar_cycles enable row level security;

-- Función auxiliar que devuelve el world_id de la pareja del usuario autenticado
create or replace function public.my_world_id()
returns uuid
language sql
security definer
stable
as $$
  select world_id from public.profiles where id = auth.uid() limit 1;
$$;

-- Políticas para profiles
drop policy if exists "Perfiles: ver propio y el de mi pareja" on public.profiles;
create policy "Perfiles: ver propio y el de mi pareja" on public.profiles
  for select using (auth.uid() = id or (world_id is not null and world_id = public.my_world_id()));

drop policy if exists "Perfiles: insertar o editar propio" on public.profiles;
create policy "Perfiles: insertar o editar propio" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Garantizar columna world_state y REPLICA IDENTITY FULL para Realtime
alter table public.worlds add column if not exists world_state jsonb default '{}'::jsonb;
alter table public.worlds replica identity full;

-- Políticas para worlds (soporta tanto usuarios autenticados como acceso directo por código de 6 letras)
drop policy if exists "Worlds: usuarios autenticados pueden crear y vincularse" on public.worlds;
drop policy if exists "Worlds: lectura por codigo o id" on public.worlds;
create policy "Worlds: lectura por codigo o id" on public.worlds
  for select using (auth.role() in ('anon', 'authenticated'));

drop policy if exists "Worlds: insertar nuevo planeta" on public.worlds;
create policy "Worlds: insertar nuevo planeta" on public.worlds
  for insert with check (auth.role() in ('anon', 'authenticated'));

drop policy if exists "Worlds: actualizar nuestro planeta" on public.worlds;
create policy "Worlds: actualizar nuestro planeta" on public.worlds
  for update
  using (
    auth.role() in ('anon', 'authenticated')
    and (
      auth.uid() is null
      or id = public.my_world_id()
      or created_by = auth.uid()
      or public.my_world_id() is null
    )
  )
  with check (auth.role() in ('anon', 'authenticated'));

-- Políticas de aislamiento por pareja (world_id = public.my_world_id()) para todos los módulos
drop policy if exists "Aislamiento pareja kiss_bursts" on public.kiss_bursts;
create policy "Aislamiento pareja kiss_bursts" on public.kiss_bursts
  for all using (world_id = public.my_world_id()) with check (world_id = public.my_world_id());

drop policy if exists "Aislamiento pareja diary_pages" on public.diary_pages;
create policy "Aislamiento pareja diary_pages" on public.diary_pages
  for all using (world_id = public.my_world_id()) with check (world_id = public.my_world_id());

drop policy if exists "Aislamiento pareja media_items" on public.media_items;
create policy "Aislamiento pareja media_items" on public.media_items
  for all using (world_id = public.my_world_id()) with check (world_id = public.my_world_id());

drop policy if exists "Aislamiento pareja map_pins" on public.map_pins;
create policy "Aislamiento pareja map_pins" on public.map_pins
  for all using (world_id = public.my_world_id()) with check (world_id = public.my_world_id());

drop policy if exists "Aislamiento pareja cravings" on public.cravings;
create policy "Aislamiento pareja cravings" on public.cravings
  for all using (world_id = public.my_world_id()) with check (world_id = public.my_world_id());

drop policy if exists "Aislamiento pareja expenses" on public.expenses;
create policy "Aislamiento pareja expenses" on public.expenses
  for all using (world_id = public.my_world_id()) with check (world_id = public.my_world_id());

drop policy if exists "Aislamiento pareja savings_goals" on public.savings_goals;
create policy "Aislamiento pareja savings_goals" on public.savings_goals
  for all using (world_id = public.my_world_id()) with check (world_id = public.my_world_id());

drop policy if exists "Aislamiento pareja lunar_cycles" on public.lunar_cycles;
create policy "Aislamiento pareja lunar_cycles" on public.lunar_cycles
  for all using (world_id = public.my_world_id()) with check (world_id = public.my_world_id());

-- ============================================================================
-- 12. ACTIVAR SUPABASE REALTIME EN TODAS LAS TABLAS DEL PLANETA (IDEMPOTENTE)
-- ============================================================================
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'worlds',
    'profiles',
    'kiss_bursts',
    'diary_pages',
    'media_items',
    'map_pins',
    'cravings',
    'expenses',
    'savings_goals',
    'lunar_cycles'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;
