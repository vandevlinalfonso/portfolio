# Vows — moving guests + wishes into a real database

Step-by-step migration from the localStorage mock to Postgres (written for
**Supabase**, since the site is static on GitHub Pages and needs a DB it can
talk to with a public key — any PostgREST-ish backend works the same way).
The schema is [`schema.sql`](./schema.sql) in this folder.

Two things move into the DB:

1. **Wishes / RSVPs** — today seeded from `config.json` + the visitor's own
   entries in localStorage, all behind one module per template.
2. **The guest list** — today there is no list: links carry the name in
   plain text (`?to=Tante+Mira`). After migration each guest has a row and
   a private link `?g=<slug>`; `?to=` keeps working as a fallback.

The design principle that makes this cheap: **the rest of the app never
touches storage directly.** Every read/write goes through
`src/vows/store.js` (Thread) and `src/vows-home/store.js` (Open House).
You replace the internals of those two files and patch one constant in each
orchestrator. Nothing in the engines, writers, or scenes changes.

> Note on `word`: the column was designed for an earlier Open House concept
> and the current template never writes it (its guestbook collects `country`
> only). Keep the column — it costs nothing, the store contract still
> carries it as an optional empty string, and dropping it would mean
> touching every snippet below for no gain.

---

## Step 0 — set up the database (10 min)

1. Create a Supabase project → SQL editor → paste and run
   [`schema.sql`](./schema.sql) (tables, view, stats function, RLS).
2. Optionally un-comment and run the seed inserts at the bottom (the same
   wishes that live in the configs today).
3. Note your project values from Settings → API:
   - `SUPABASE_URL` — `https://<ref>.supabase.co`
   - `SUPABASE_ANON_KEY` — the `anon` `public` key (safe to ship in the
     bundle; RLS is what protects the data, not the key).
4. Add the guest list: one row per invitation in `guests`. Generate slugs
   like `tante-mira-x4k2` (name + 4 random chars). A quick way to mint them:

```sql
insert into guests (template, slug, display_name, side, max_party)
values ('home', 'tante-mira-' || substr(md5(random()::text), 1, 4), 'Tante Mira', 'bride', 2)
returning slug;
```

## Step 1 — install the client

```bash
npm i @supabase/supabase-js
```

(~16 kB gzipped. If you'd rather stay dependency-free, every call below is
also expressible as plain `fetch` against PostgREST — the BACKEND.md REST
table shows the shapes — but the SDK is less fiddly.)

## Step 2 — replace `src/vows-home/store.js`

The public contract (what `vows-home.js` and `guestbook.js` call) **must
not change**:

```js
initStore(seedWishes)   // can become a no-op once seeds live in the DB
await submitRsvp(entry) // -> stored entry
await getMessages()     // -> [{ id, name, word, side, attending, plusOnes, country, message, mine }]
await getOwnRsvp()      // -> visitor's latest entry or null
await getStats()        // -> { guests, parties }
```

Drop-in replacement (whole file):

```js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://YOUR-REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
const TEMPLATE = 'home';                  // 'thread' in src/vows/store.js
const MINE_KEY = `vows-${TEMPLATE}-mine`; // ids of the visitor's own rows

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const mineIds = () => {
  try { return new Set(JSON.parse(localStorage.getItem(MINE_KEY) || '[]')); }
  catch { return new Set(); }
};
const rememberMine = (id) => {
  try { localStorage.setItem(MINE_KEY, JSON.stringify([...mineIds(), id])); }
  catch { /* private mode */ }
};

const toEntry = (row, mine) => ({
  id: row.id,
  name: row.name,
  word: row.word || '',
  side: row.side,
  attending: row.attending,
  plusOnes: row.plus_ones,
  country: row.country || '',
  message: row.message || '',
  mine: mine.has(row.id)
});

let seeds = [];
export function initStore(seedWishes = []) {
  // keep merging config seeds until you move them into the DB (Step 0.2),
  // then replace this body with: seeds = [];
  seeds = seedWishes.map((w, i) => ({
    id: `seed-${i}`, name: w.name, word: w.word || '', side: w.side,
    attending: w.attending !== false, plusOnes: w.plusOnes || 0,
    country: (w.country || '').toUpperCase().slice(0, 3),
    message: w.message || '', mine: false
  }));
}

export async function submitRsvp(entry) {
  const { data, error } = await db.from('wishes').insert({
    template: TEMPLATE,
    guest_id: window.__vowsGuest?.id ?? null,   // set in Step 3
    name: entry.name.trim().slice(0, 60),
    side: entry.side === 'bride' ? 'bride' : 'groom',
    attending: !!entry.attending,
    plus_ones: Math.max(0, Math.min(4, entry.plusOnes | 0)),
    word: (entry.word || '').trim().slice(0, 24),
    country: (entry.country || '').trim().toUpperCase().slice(0, 3),
    message: (entry.message || '').trim().slice(0, 280)
  }).select().single();
  if (error) throw error;
  rememberMine(data.id);
  return toEntry(data, mineIds());
}

export async function getMessages() {
  const { data, error } = await db.from('wall_wishes')
    .select('*').eq('template', TEMPLATE)
    .order('created_at', { ascending: false }).limit(60);
  if (error) return seeds;                       // offline → at least seeds
  const mine = mineIds();
  return [...data.map((r) => toEntry(r, mine)), ...seeds.filter((s) => s.message)];
}

export async function getOwnRsvp() {
  const ids = [...mineIds()];
  if (!ids.length) return null;
  const { data } = await db.from('wishes')
    .select('*').in('id', ids)
    .order('created_at', { ascending: false }).limit(1);
  return data?.length ? toEntry(data[0], new Set(ids)) : null;
}

export async function getStats() {
  const { data, error } = await db.rpc('wish_stats', { tpl: TEMPLATE });
  if (error || !data?.length) return { guests: 0, parties: 0 };
  return { guests: Number(data[0].guests), parties: Number(data[0].parties) };
}
```

## Step 3 — guest lookup in `src/vows-home.js`

Today (top of the file):

```js
/** Guest personalization: share links as ?to=Tante+Mira */
const guestName = (new URLSearchParams(location.search).get('to') || '').trim().slice(0, 40);
```

Change `const` → `let`, and resolve the guest at the top of `init()`
**before** `initStore(cfg.wishes)` runs:

```js
let guestName = (new URLSearchParams(location.search).get('to') || '').trim().slice(0, 40);
let guest = null; // { id, display_name, side, max_party }

async function resolveGuest() {
  const slug = (new URLSearchParams(location.search).get('g') || '').trim();
  if (!slug) return;
  const { data } = await db.from('guests')
    .select('id, display_name, side, max_party')
    .eq('slug', slug).eq('template', 'home').maybeSingle();
  if (data) {
    guest = data;
    guestName = data.display_name;
    window.__vowsGuest = data;   // read by submitRsvp for guest_id
  }
}
```

(Export the `db` client from `store.js` — `export { db }` — or add a tiny
`getGuest(slug)` helper there to keep all DB code in one module. The helper
is the cleaner option.)

Then three call sites in the same file pick the guest up automatically
because they already read `guestName`:

- `init()` → `document.getElementById('door-greeting')` ("Dear …,") and the
  addressed parcel on the doormat (`new Door(cfg, guestName, …)`)
- the reveal → `showReveal(cfg, guestName)` (the closing line "See you
  there, …")
- the `onGuestbook` hook → `openWriter(cfg, { guestName })` — optionally
  pass `side: guest?.side` so the writer pills default to the side that
  invited them, and use `guest?.max_party` to cap the +1 stepper
  (`#rf-plus` handler in `src/vows-home/guestbook.js`, currently
  hard-capped at 4).

Call it first thing in `init()`:

```js
async function init() {
  await resolveGuest();   // ← add
  let cfg;
  ...
```

## Step 4 — same two changes for Thread

- `src/vows/store.js`: same replacement as Step 2 with `TEMPLATE = 'thread'`
  and without the `word` / `country` fields (Thread's entries don't have
  them; the columns just stay `''`).
- `src/vows.js`: same `resolveGuest()` patch as Step 3 (template `'thread'`,
  same `seal-greeting` / closing / `openWriter` touchpoints — the file
  mirrors `vows-home.js`).

## Step 5 — verify

```bash
npx vite build
npx vite preview --port 8901 &
node vowshome-shot.mjs http://localhost:8901   # submits ONE real test RSVP
node vowshot.mjs      http://localhost:8901    # same, for thread
node labshot.mjs      http://localhost:8901
```

- All three must end with zero console errors / failed assertions.
- The Playwright suites submit a real test row each run — point them at a
  staging Supabase project, or clean up after:
  `delete from wishes where name in ('Playwright Test', 'Cypress & Co.');`
- Manual checks: open `/projects/vows/home/?g=<your-test-slug>` (greeting +
  prefilled side), submit a reply, reload — the wall shows it with "yours",
  the stats line moved, and a second submit from the same browser *updates*
  rather than duplicates on the wall (that's the `wall_wishes` view doing
  dedupe by name).

## Gotchas (read before you start)

- **Don't rename the store functions.** Five files import them; the whole
  point of the migration design is that only the two store files change.
- **The `mine` flag** ("Your wish" pin + writer prefill) has no auth — it's
  just remembered ids in localStorage. That's intentional; weddings don't
  need accounts.
- **Memory progress** (`vows-home-memories-v1`, `vows-home-reveal-v1`) and
  Thread's cameo tallies stay in localStorage. They're per-device game
  state, not data — do not move them to the DB.
- **`getMessages()` must never throw** — the gallery wall calls it right
  after the door opens. Keep the offline fallback (return seeds / `[]` on
  error) so the invitation still renders if the DB is down.
- **Scale (hundreds of wishes)**: the wall only ever draws 12 frames, but
  the "read all the wishes" overlay renders everything `getMessages()`
  returns. At real-wedding scale, split the queries: keep a `limit(12)`
  on the wall fetch and add a `getAllMessages()` (or a paginated fetch)
  that the overlay calls lazily when it opens — both are one-line
  `select` variations on the same `wall_wishes` view.
- **CORS**: Supabase allows browser calls out of the box. If you front it
  with your own API instead, remember the site origin is a GitHub Pages
  domain.
- **Moderation**: if links may leak beyond the guest list, set
  `approved boolean not null default false` in the schema and approve from
  the Supabase table editor; the wall and stats both already respect it.
