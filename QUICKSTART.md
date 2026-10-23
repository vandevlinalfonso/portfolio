# Quick Start

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see a boot
loader, then the fractured glass specimen with "ANATOMY OF A BREACH".

## Make it yours (10 minutes)

| What | Where |
|------|-------|
| Your name, email, LinkedIn | `public/data/cv.json` → `identity.name`, `contact` (Home reads them at runtime). Mirror them in `index.html` (`#portfolio-name`, `[data-contact]` links) for no-JS visitors |
| Your cases | `public/data/projects.json` (title, year, context, threat, action, tradeoff) |
| Your quotes | `public/data/philosophy.json` |
| Your socials | `public/data/socials.json` (entries with id `email` / `linkedin` take their URL from `cv.json`). No GitHub or X entry until there is a real profile to link |

The case rows, doctrine quotes, and social links are all rendered from the
JSON files.

## Add a machine writeup

1. Copy `src/writeups-content/_template.md` to `src/writeups-content/<slug>.md`
2. Fill the frontmatter, drop screenshots in `public/writeups/<slug>/`,
   reference them as `![caption](shot.png)`
3. Delete `sample-machine.md` once you've added your own

## Swap a Visions artwork

Replace a JPEG in `public/projects/visions/` and edit its entry in
`EXHIBIT_DATA` (`src/visions.js`) — title, description, haze tint. The
depth relief is derived from the image automatically; no per-image code.

## Reuse the Vows invitation for a real couple

Edit `public/projects/vows/thread/config.json` — names, date, journey chapters
(`journeys.groom[]` / `journeys.bride[]`, each with a `scene` key, a
per-side `variant` (`storm`/`dawn`, `planes`/`collect`, `books`/`margins`,
`windows`/`studio`, `seat`/`almost`) and a `cameo.caption` shown when the
hidden other-half is spotted), schedule, venue, seeded wishes — and drop
photos in `public/projects/vows/thread/gallery/`. Share personalized links as
`?to=Guest+Name`. RSVP data is mocked in localStorage for now; when you
have a database, follow `projects/vows/BACKEND.md` (the swap is one file:
`src/vows/store.js`).

The second template, **Open House** (`/projects/vows/home/`), works the
same way: edit `public/projects/vows/home/config.json` — the door
(`nameplate`, mat line, bell label), the twelve `memories[]` (each
`{ id, who, year, object, title, caption }` — captions are the whole
story; the `id`s map to fixed objects in the flat), the `reveal` (gate
count, guard line, proposal caption), the corkboard `details`, the dogs'
tap captions (`dogLines`), seeded `wishes` (each with a `country` stamp),
and the wayfinding copy (`hud.hints[]` rotating idle hints, `hud.nav`
quick-nav labels, per-dog `dogLines` keyed by dog name). For music, drop
the couple's song into `public/projects/vows/home/` and set
`music: { "src": "./song.mp3", "title": "Their song" }` — you can set
`src` before the file exists; until it's there (or with no `src` at all)
a generated soft "home ambience" plays instead (`"mode": "off"` silences
everything, including the doorbell woofs). Same trick for the barks: set
`"barkSrc": "./bark.mp3"` and drop in a short real bark recording — the
code pitch-shifts it for the woof/yip variety, and the synthesized woof
covers until the file exists. Its store is
`src/vows-home/store.js`, same backend contract. The full agent-proof
build spec lives at `projects/vows/home/SPEC.md`.

## Theme every page from one place

Each lens (`src/lenses/devsecops.js`, `src/lenses/breach.js`) owns its
`theme.accent`, `theme.accentInk` and `site` strings. Every page follows
the active lens. For a new page or component:

- CSS: `var(--accent)`, `rgba(var(--accent-rgb), 0.3)`, `var(--accent-ink)`
- Canvas: `Theme.accentRgba(0.3)`; GLSL: `Theme.accentVec3()` +
  `Theme.onChange()` (import from `src/theme/index.js`)
- Copy: `data-lens-tpl="{file} · Annex"` (`{title}`, `{file}`, `{home}`)
- New page entry: `import './theme/index.js'` right after `base.css`

Add a lens: copy a lens file, add it to `LENSES` in
`src/lenses/registry.js`. Make it the landing lens: change `DEFAULT_ID`
there.

## Tune or add a Resonance key

Keys live in `src/resonance/keys.js` (`f` = mode family m² + n², `drive`
point, resonance `width`, `match` threshold). `node resonance-keys.mjs`
audits them; `node resonance-keys.mjs search 45 0.4` proposes drive
points for a new family. Reset progress: delete `resonance-v1` in Local
Storage.

## Add a Lab experiment

Create a class in `src/lab/` with `update(dt, time, pointer)`, `resize(w, h)`
and `dispose()`, then register it in `EXPERIMENTS` in `src/lab.js`.

## Add a Range exercise (a new game)

1. `projects/range/<slug>/index.html` + `src/<slug>.js` — copy Resonance's
   frame (nav links are three levels deep; the "Range" crumb is `../`)
2. Register the page in `rollupOptions.input` (`vite.config.js`)
3. Add an entry to `EXERCISES` in `src/range.js` (with a `figure()`
   thumbnail and a `record()` that reads your save) and drop one `SEALED`
   slot

## Add a whole new project

1. `projects/<slug>/index.html` + `src/<slug>.js`
2. Register both in `rollupOptions.input` (`vite.config.js`)
3. Add a row to `WORKS` in `src/projects.js`

## What to test

- **Nav** (top right) — Case File / Writeups / Projects
- **Projects hub** — hover rows for the cover peek; all three works open
- **Vows: Thread** — pull the red thread to bring the two silhouettes
  together, pick a lit window in the night city, then scroll the whole
  film. Watch for the other person hidden in every chapter (tap them —
  "paths crossed" tallies up), rewind to the other side at the proposal,
  and in the lantern sky tap a lantern to read a wish or light your own
  to RSVP
- **Vows: Open House** — ring the doorbell (the dogs answer first), then
  drag through the apartment. Tap glowing objects for memory cards, tap
  the dogs (they'll also lead you to memories you've missed), try the
  ring box too early (Omi objects), find six memories and open it for the
  reveal, read the framed wishes above the sofa (the hanging tag opens
  the full book of every wish), and sign the guestbook on the dining
  table — your wish flies up onto the wall. In a hurry? The paper tags
  bottom-left (Date & place / Sign the guestbook / Wishes wall) glide
  you straight there and open the right thing. The spinning vinyl disc
  top-right is the music — it starts with the doorbell, ducks under
  overlays, and remembers if you mute it
- **Lab** — move through the embers, drag the ink, bend the type wall,
  feed the black hole (arrow keys switch experiments)
- **Range** — the index card's figure cycles through the seven keys and
  shows your progress; the old `/projects/resonance/` URL redirects
- **Resonance** — open the vault: tune with the wheel (listen for the
  bloom), hold the note until the tumbler falls; from key 3 drag the
  transducer on the plate. Studio is free play with the modes marked
- **Theme sync** — type `breach` on any subpage: it retints in place and
  every other page (and open tab) follows; `harden` returns
- **Scroll** through all five sections — a scan ring sweeps the specimen,
  it dissects to expose the red payload core through Incidents, then
  reassembles with the core glowing through the seams
- **Hover** a case row — its fragment ignites red
- **Click** a case row — the report panel slides in; the fragment is
  permanently scarred (check the `●` next to the row index)
- **Reload** — scars and decay persist; the telemetry decay % only goes up
- **Sound toggle** (bottom right) — procedural drone retunes per section
- **Tab away and return** — the specimen is penalized for being unattended

## Reset the specimen

DevTools → Application → Local Storage → delete `aob-state-v1`.

## Deploy

Run `npm run deploy` — it builds `dist/` and pushes it to the `gh-pages`
branch (GitHub Pages source: **Deploy from a branch → `gh-pages` / root**).
Commit and push your source to `main` separately.

## If something looks wrong

- Check the console (the first two log lines are intentional — that's the
  console easter egg)
- `npm run build && npm run preview` to verify the production build
- WebGL unavailable? The site shows a static fallback with your links
