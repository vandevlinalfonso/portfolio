# Vows — Backend Migration Guide

> **Newer, concrete version:** [`db/schema.sql`](./db/schema.sql) +
> [`db/MIGRATION.md`](./db/MIGRATION.md) carry the ready-to-run Postgres
> schema (guests **and** wishes, both templates) and the exact step-by-step
> code changes. This file remains as the general contract/options overview.

The RSVP system currently runs on a **mock backend**: seeded wishes from
each template's `config.json` plus the visitor's own entries in
`localStorage`. Every read/write goes through one module per template —
[`src/vows/store.js`](../../src/vows/store.js) (Thread) and
[`src/vows-home/store.js`](../../src/vows-home/store.js) (Open House) —
so migrating to a real database means **replacing the internals of those
files and nothing else**.

## The contract

The rest of the app only ever calls:

```js
initStore(seedWishes)        // called once with config.json wishes (can become a no-op)
await submitRsvp(entry)      // -> stored entry
await getMessages()          // -> [{ id, name, side, attending, plusOnes, message, mine }]
await getOwnRsvp()           // -> the visitor's latest entry or null
await getStats()             // -> { guests, parties }
```

`mine: true` marks entries belonging to the current visitor (used to pin
"Your wish" on the wall). With a real backend, keep returning it by storing
the visitor's submitted ids in `localStorage` and flagging matches.

## Recommended schema

One table is enough:

```sql
create table rsvp (
  id          uuid primary key default gen_random_uuid(),
  guest_name  text not null check (char_length(guest_name) <= 60),
  side        text not null check (side in ('groom', 'bride')),
  attending   boolean not null,
  plus_ones   smallint not null default 0 check (plus_ones between 0 and 4),
  message     text check (char_length(message) <= 280),
  approved    boolean not null default true,   -- flip default to false for moderation
  created_at  timestamptz not null default now()
);
```

REST contract (if you put an API in front):

| Endpoint | Method | Body / Response |
|---|---|---|
| `/rsvp` | POST | `{ guestName, side, attending, plusOnes, message }` → `201 { id, ... }` |
| `/messages` | GET | `[{ guestName, side, message, createdAt }]` (where `approved and message != ''`) |
| `/stats` | GET | `{ guests, parties }` (sum over `attending = true`) |

## Option A — Supabase (recommended for GitHub Pages)

Free tier, real Postgres, works from a static site with the anon key.

1. Create a project, run the schema above in the SQL editor.
2. Row Level Security policies — the anon key may **insert** and **read
   approved messages**, nothing else:

```sql
alter table rsvp enable row level security;

create policy "anyone can rsvp"
  on rsvp for insert with check (
    char_length(guest_name) between 1 and 60 and plus_ones between 0 and 4
  );

create policy "read approved wishes"
  on rsvp for select using (approved = true);
```

3. Swap `store.js` internals:

```js
import { createClient } from '@supabase/supabase-js';
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function submitRsvp(entry) {
  const { data } = await db.from('rsvp').insert({
    guest_name: entry.name, side: entry.side,
    attending: entry.attending, plus_ones: entry.plusOnes,
    message: entry.message
  }).select().single();
  rememberMine(data.id); // keep ids in localStorage for the "mine" flag
  return toEntry(data);
}

export async function getMessages() {
  const { data } = await db.from('rsvp')
    .select('id, guest_name, side, message, created_at')
    .neq('message', '').order('created_at', { ascending: false });
  return data.map(toEntry);
}

export async function getStats() {
  const { data } = await db.from('rsvp')
    .select('plus_ones').eq('attending', true);
  return {
    parties: data.length,
    guests: data.reduce((s, r) => s + 1 + r.plus_ones, 0)
  };
}
```

Note: exposing aggregate stats requires the select policy to allow reading
attending rows; if you want messages private until approved but stats live,
add a Postgres function (`security definer`) returning only the counts and
call it with `db.rpc('rsvp_stats')`.

## Option B — Firebase Firestore

Similar shape: a `rsvp` collection, security rules allowing `create` for
everyone and `read` where `approved == true`. Use `getCountFromServer`
aggregate queries for stats. Slightly more SDK weight than Supabase.

## Option C — Google Apps Script + Sheet (zero infrastructure)

A Google Sheet as the database, an Apps Script Web App as the API:

1. Sheet with columns matching the schema.
2. Apps Script `doPost(e)` appends a row; `doGet(e)` returns JSON of
   approved rows / stats. Deploy as Web App ("Anyone" access).
3. `store.js` swaps to `fetch(SCRIPT_URL, { method: 'POST', body })`.

Free and the couple can moderate by editing the sheet directly. Downsides:
~1-2s latency and a quota of ~20k requests/day (plenty for a wedding).

## Hardening checklist (any option)

- **Moderation**: default `approved = false` and approve from the dashboard
  if you expect strangers to have the link.
- **Spam throttle**: client-side is already length-capped; add a per-IP
  rate limit (Supabase: `created_at` check in the insert policy; Apps
  Script: cache by IP) — or simply accept duplicates and clean up later.
- **Duplicate replies**: the UI lets a guest update their reply, which
  creates a second row. Either dedupe by `guest_name` at read time (keep
  latest) or pass the remembered local id and upsert.
- **The seeded wishes** in `config.json` can stay — `initStore` merges them
  under the real data, or empty the array once real wishes arrive.
