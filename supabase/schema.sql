-- =====================================================================
-- Birthday Wish: schema, RLS, storage, RPC.   Idempotent - can run multiple times.
-- =====================================================================

-- ---------- PROFILES --------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'user' check (role in ('user','admin')),
  is_blocked  boolean not null default false,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers (SECURITY DEFINER so policies on profiles don't recurse)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'admin' and not is_blocked);
$$;

create or replace function public.current_user_blocked()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_blocked from public.profiles where id = auth.uid()), false);
$$;

-- ---------- SONGS (built-in list) ------------------------------------
create table if not exists public.songs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  artist      text,
  url         text not null,           -- '/songs/x.mp3' (in /public) or a full URL
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- WISHES ----------------------------------------------------
create table if not exists public.wishes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  -- 16 hex chars = 64 bits of randomness: unguessable
  slug               text not null unique
                     default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  recipient_name     text not null check (char_length(recipient_name) between 1 and 80),
  birth_month        smallint not null check (birth_month between 1 and 12),
  birth_day          smallint not null check (birth_day between 1 and 31),
  timezone           text not null default 'UTC',        -- IANA zone of the recipient
  default_image_url  text not null,
  default_message    text not null check (char_length(default_message) between 1 and 2000),
  song_id            uuid references public.songs(id) on delete set null,
  custom_audio_url   text,
  is_disabled        boolean not null default false,     -- set by admin
  view_count         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists wishes_user_idx on public.wishes(user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists wishes_touch on public.wishes;
create trigger wishes_touch before update on public.wishes
  for each row execute function public.touch_updated_at();

-- ---------- WISH DAYS (per-day schedule) ------------------------------
create table if not exists public.wish_days (
  id         uuid primary key default gen_random_uuid(),
  wish_id    uuid not null references public.wishes(id) on delete cascade,
  date       date not null,
  image_url  text,
  message    text check (char_length(message) <= 2000),
  created_at timestamptz not null default now(),
  unique (wish_id, date),
  check (image_url is not null or message is not null)
);

-- ---------- LINK VIEWS ------------------------------------------------
create table if not exists public.link_views (
  id          bigint generated always as identity primary key,
  wish_id     uuid not null references public.wishes(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  user_agent  text
);
create index if not exists link_views_wish_idx on public.link_views(wish_id, viewed_at);

-- =====================================================================
-- COLUMN-LEVEL PRIVILEGES  (RLS can't restrict columns; grants can)
-- Creators can never touch slug, is_disabled or view_count.
-- =====================================================================
revoke insert, update on public.wishes from anon, authenticated;
grant insert (user_id, recipient_name, birth_month, birth_day, timezone,
              default_image_url, default_message, song_id, custom_audio_url)
  on public.wishes to authenticated;
grant update (recipient_name, birth_month, birth_day, timezone,
              default_image_url, default_message, song_id, custom_audio_url)
  on public.wishes to authenticated;

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (role, is_blocked) on public.profiles to authenticated;  -- admin-only via RLS

revoke all on public.link_views from anon, authenticated;
grant select on public.link_views to authenticated;                    -- filtered by RLS

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles   enable row level security;
alter table public.songs      enable row level security;
alter table public.wishes     enable row level security;
alter table public.wish_days  enable row level security;
alter table public.link_views enable row level security;

-- profiles
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: admin update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- songs: everyone can list active songs, admin manages
drop policy if exists "songs: public read active" on public.songs;
create policy "songs: public read active" on public.songs
  for select using (is_active or public.is_admin());
drop policy if exists "songs: admin write" on public.songs;
create policy "songs: admin write" on public.songs
  for all using (public.is_admin()) with check (public.is_admin());

-- wishes: NO anonymous access. Public pages use get_public_wish() below.
drop policy if exists "wishes: owner read" on public.wishes;
create policy "wishes: owner read" on public.wishes
  for select using (user_id = auth.uid());
drop policy if exists "wishes: owner insert" on public.wishes;
create policy "wishes: owner insert" on public.wishes
  for insert with check (user_id = auth.uid() and not public.current_user_blocked());
drop policy if exists "wishes: owner update" on public.wishes;
create policy "wishes: owner update" on public.wishes
  for update using (user_id = auth.uid() and not public.current_user_blocked())
  with check (user_id = auth.uid());
drop policy if exists "wishes: owner delete" on public.wishes;
create policy "wishes: owner delete" on public.wishes
  for delete using (user_id = auth.uid());
drop policy if exists "wishes: admin all" on public.wishes;
create policy "wishes: admin all" on public.wishes
  for all using (public.is_admin()) with check (public.is_admin());

-- wish_days: only through ownership of the parent wish
drop policy if exists "days: owner all" on public.wish_days;
create policy "days: owner all" on public.wish_days
  for all
  using (exists (select 1 from public.wishes w
                 where w.id = wish_days.wish_id and w.user_id = auth.uid())
         and not public.current_user_blocked())
  with check (exists (select 1 from public.wishes w
                 where w.id = wish_days.wish_id and w.user_id = auth.uid())
         and not public.current_user_blocked());
drop policy if exists "days: admin all" on public.wish_days;
create policy "days: admin all" on public.wish_days
  for all using (public.is_admin()) with check (public.is_admin());

-- link_views: owners see views of their wishes, admin sees all. Writes: RPC only.
drop policy if exists "views: owner read" on public.link_views;
create policy "views: owner read" on public.link_views
  for select using (exists (select 1 from public.wishes w
                            where w.id = link_views.wish_id and w.user_id = auth.uid()));
drop policy if exists "views: admin read" on public.link_views;
create policy "views: admin read" on public.link_views
  for select using (public.is_admin());

-- =====================================================================
-- PUBLIC RPCs  (the ONLY way anonymous visitors touch wish data)
-- =====================================================================
-- Returns only today's content (in the recipient's timezone) so future
-- surprises are never sent to the browser.
create or replace function public.get_public_wish(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', w.id,
    'slug', w.slug,
    'recipient_name', w.recipient_name,
    'birth_month', w.birth_month,
    'birth_day', w.birth_day,
    'timezone', w.timezone,
    'today', (now() at time zone w.timezone)::date,
    'image_url', coalesce(d.image_url, w.default_image_url),
    'message', coalesce(d.message, w.default_message),
    'default_image_url', w.default_image_url,
    'is_scheduled_day', d.id is not null,
    'audio_url', coalesce(w.custom_audio_url, s.url),
    'song_title', s.title
  )
  from public.wishes w
  join public.profiles p on p.id = w.user_id
  left join public.wish_days d
         on d.wish_id = w.id and d.date = (now() at time zone w.timezone)::date
  left join public.songs s on s.id = w.song_id
  where w.slug = p_slug and not w.is_disabled and not p.is_blocked
$$;

create or replace function public.record_view(p_slug text, p_ua text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select w.id into v_id
  from public.wishes w join public.profiles p on p.id = w.user_id
  where w.slug = p_slug and not w.is_disabled and not p.is_blocked;
  if v_id is null then return; end if;
  insert into public.link_views (wish_id, user_agent) values (v_id, left(p_ua, 300));
  update public.wishes set view_count = view_count + 1 where id = v_id;
end $$;

revoke execute on function public.get_public_wish(text) from public;
revoke execute on function public.record_view(text, text) from public;
grant  execute on function public.get_public_wish(text) to anon, authenticated;
grant  execute on function public.record_view(text, text) to anon, authenticated;

-- =====================================================================
-- STORAGE  (public-read buckets, owner-only writes, size/type limits)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('wish-images', 'wish-images', true, 5242880,
     array['image/jpeg','image/png','image/webp']),
  ('wish-audio',  'wish-audio',  true, 10485760,
     array['audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/ogg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files live in  <bucket>/<user_id>/<uuid>.<ext>
drop policy if exists "wish media: owner insert" on storage.objects;
create policy "wish media: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('wish-images','wish-audio')
              and (storage.foldername(name))[1] = auth.uid()::text
              and not public.current_user_blocked());
drop policy if exists "wish media: owner select" on storage.objects;
create policy "wish media: owner select" on storage.objects
  for select to authenticated
  using (bucket_id in ('wish-images','wish-audio')
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "wish media: owner update" on storage.objects;
create policy "wish media: owner update" on storage.objects
  for update to authenticated
  using (bucket_id in ('wish-images','wish-audio')
         and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "wish media: owner delete" on storage.objects;
create policy "wish media: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('wish-images','wish-audio')
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
-- Public buckets serve files by URL without a SELECT policy, so visitors
-- can load media but cannot list bucket contents.

-- =====================================================================
-- SEED: built-in songs (put the matching .mp3 files in /public/songs)
-- =====================================================================
-- Songs removed - add MP3 files to public/songs/ and uncomment below:
-- insert into public.songs (title, artist, url, sort_order) values
--   ('Happy Birthday (Piano)',   'Built-in', '/songs/happy-birthday-piano.mp3', 1),
--   ('Party Time',               'Built-in', '/songs/party-time.mp3',           2),
--   ('Sweet Day (Acoustic)',     'Built-in', '/songs/sweet-day-acoustic.mp3',   3)
-- on conflict do nothing;

-- =====================================================================
-- ADMIN SETUP (after you've signed up once in the app):
--   For priya@gmail.com to be admin:
--   update public.profiles set role = 'admin' where email = 'priya@gmail.com';
-- =====================================================================
