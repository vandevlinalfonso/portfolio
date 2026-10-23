-- ============================================================
-- Vows collection — database schema (Postgres / Supabase-ready)
--
-- One database serves BOTH invitation templates:
--   template = 'thread'  → /projects/vows/thread/  (lantern wishes)
--   template = 'home'    → /projects/vows/home/    (dictionary entries)
--
-- Two tables:
--   guests  — the invitation list. Each guest gets a private link
--             /projects/vows/home/?g=<slug> ; the page greets them
--             by name and prefills their side in the RSVP writer.
--   wishes  — every RSVP / wish. Superset of both templates:
--             `word` and `country` are only used by 'home'
--             (they stay '' for 'thread' rows).
--
-- Run order: this whole file is idempotent-ish top to bottom in the
-- Supabase SQL editor (or psql). RLS policies at the bottom assume
-- the Supabase `anon` role; adapt if you front it with your own API.
-- See projects/vows/db/MIGRATION.md for the code changes.
-- ============================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ---------- guests: the invitation list ----------

create table if not exists public.guests (
  id            uuid primary key default gen_random_uuid(),
  template      text not null check (template in ('thread', 'home')),
  -- the private link token, e.g. 'tante-mira-x4k2'. Keep it unguessable
  -- enough that guests can't stumble into each other's greetings.
  slug          text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  display_name  text not null check (char_length(display_name) between 1 and 60),
  -- optional: which side invited them (prefills the writer)
  side          text check (side in ('groom', 'bride')),
  -- how many people this invitation covers (cap for the +1 stepper)
  max_party     smallint not null default 2 check (max_party between 1 and 6),
  -- free-form for the couple ("colleague", "Oma's table") — never shown
  note          text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists guests_template_idx on public.guests (template);

-- ---------- wishes: every RSVP ----------

create table if not exists public.wishes (
  id          uuid primary key default gen_random_uuid(),
  template    text not null check (template in ('thread', 'home')),
  -- set when the guest came through a ?g= link; null for open links
  guest_id    uuid references public.guests (id) on delete set null,
  name        text not null check (char_length(name) between 1 and 60),
  side        text not null check (side in ('groom', 'bride')),
  attending   boolean not null,
  plus_ones   smallint not null default 0 check (plus_ones between 0 and 4),
  message     text not null default '' check (char_length(message) <= 280),
  -- 'home' template only: the dictionary headword + passport stamp
  word        text not null default '' check (char_length(word) <= 24),
  country     text not null default '' check (char_length(country) <= 3),
  -- flip the default to false if strangers may get the link (moderation)
  approved    boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists wishes_wall_idx
  on public.wishes (template, created_at desc)
  where approved and message <> '';

-- ---------- the wall: latest wish per guest name, approved only ----------
-- The UI lets a guest re-submit to update their reply; that creates a new
-- row. This view keeps only the newest row per (template, name) so the
-- wall never shows duplicates. security_invoker makes it respect RLS.

create or replace view public.wall_wishes
  with (security_invoker = true) as
  select distinct on (template, lower(name))
    id, template, name, side, attending, plus_ones, message, word, country, created_at
  from public.wishes
  where approved and message <> ''
  order by template, lower(name), created_at desc;

-- ---------- live stats without exposing unapproved rows ----------
-- security definer so the counts include rows the anon role can't select
-- (e.g. moderated-but-not-yet-approved replies still count as attending).

create or replace function public.wish_stats(tpl text)
returns table (parties bigint, guests bigint)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::bigint as parties,
    coalesce(sum(1 + plus_ones), 0)::bigint as guests
  from wishes
  where template = tpl and attending;
$$;

-- ---------- row level security (Supabase anon key) ----------

alter table public.guests enable row level security;
alter table public.wishes enable row level security;

-- guests: the static site looks up exactly one row by slug. Selecting is
-- allowed broadly because the table holds nothing sensitive (names + side);
-- the slug is the secret. If you add emails/phones later, move reads behind
-- a security-definer function instead.
drop policy if exists "read guest by link" on public.guests;
create policy "read guest by link"
  on public.guests for select
  to anon
  using (true);

-- wishes: anyone may submit (the table checks enforce shape), and only
-- approved rows are readable.
drop policy if exists "anyone can rsvp" on public.wishes;
create policy "anyone can rsvp"
  on public.wishes for insert
  to anon
  with check (
    char_length(name) between 1 and 60
    and plus_ones between 0 and 4
    and char_length(message) <= 280
  );

drop policy if exists "read approved wishes" on public.wishes;
create policy "read approved wishes"
  on public.wishes for select
  to anon
  using (approved = true);

grant execute on function public.wish_stats(text) to anon;

-- ---------- seed data (optional) ----------
-- The seeded wishes currently live in each template's config.json and are
-- merged client-side. Once the DB is live you can either keep them there
-- (initStore still merges them under real rows) or move them in:

-- insert into public.wishes (template, name, side, attending, plus_ones, message, word, country) values
--   ('home', 'Sugar & Omi',        'bride', true,  0, 'We crossed an ocean for these two. Worth it. (Woof, twice.)', 'woof',       'DE'),
--   ('home', 'The pack back home', 'bride', false, 0, 'We kept the warm half of home ready. Come visit soon — bring the twins.', 'tunggu', 'ID'),
--   ('home', 'Ibu & Bapak',        'bride', true,  0, 'Our brave girl found the word she was looking for. Blessings, always.', 'restu',  'ID'),
--   ('home', 'Oma Keller',         'groom', true,  1, 'I was a stranger here once too. Welcome home, Ayu.', 'endlich',   'DE'),
--   ('home', 'The Tuesday class',  'groom', true,  2, 'Best vocabulary acquisition we ever witnessed. A+ for both.', 'Wortschatz', 'DE'),
--   ('home', 'Rina',               'bride', false, 0, 'Six time zones can''t dilute this friendship. Save me a dance on video call.', 'sahabat', 'ID');

-- Example guest links (slug = the secret in the URL):
-- insert into public.guests (template, slug, display_name, side, max_party) values
--   ('home',   'tante-mira-x4k2', 'Tante Mira',  'bride', 2),
--   ('home',   'oma-keller-9fq1', 'Oma Keller',  'groom', 2),
--   ('thread', 'aunt-mira-7pd3',  'Aunt Mira',   'bride', 2);
-- → share as  /projects/vows/home/?g=tante-mira-x4k2
