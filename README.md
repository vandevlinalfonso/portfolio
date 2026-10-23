# Anatomy of a Breach

A typography-first 3D portfolio for a security engineer, built with Three.js
and GSAP. The thesis: **every system is already compromised — the work is
deciding how far it spreads.**

The centerpiece is the **Specimen**: a dark-glass icosahedron fractured into
five fragments, one per incident. It decays in real time, dissects as you
scroll, ignites when you hover a case, and permanently scars when you open
one. It never resets — damage persists across visits via `localStorage`.

No 3D asset files. The entire specimen is procedural geometry + GLSL.

The site is three pages:

| Page | Path | What it is |
|------|------|------------|
| Case File | `/` | The forensic specimen + incidents (this is the home page) |
| Writeups | `/writeups/` | HackTheBox / CTF machine writeups, markdown-driven |
| Visions | `/visions/` | Three photomanipulation artworks rebuilt as live WebGL scenes |

A header nav links all three.

### As you scroll the Specimen

The dissection is choreographed per section: a forensic **scan ring** sweeps
it during _Specimen_, the fragments fully separate and a hidden red
**payload core** (the thing being contained) burns into view during
_Incidents_, then the shards reassemble with the core glowing through the
seams during _Doctrine_. Scroll velocity adds nervous jitter.

---

## Sections

| # | Section | 3D behavior |
|---|-----------|--------------------------------------------|
| 00 | Index | Specimen intact, slow museum rotation |
| 01 | Specimen | Manifesto; intrusion veins begin to glow |
| 02 | Incidents | Five case rows; scroll dissects the specimen, hover ignites the matching fragment, opening a case scars it |
| 03 | Doctrine | Oversized pull-quotes; low-angle camera |
| 04 | Contact | Giant email link; specimen reassembles |

---

## Installation & development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build in /dist
npm run preview  # check the production build
```

---

## Customization

Search for `TODO` markers:

1. **Name** — `index.html` (`Examiner: ████████`)
2. **Email** — `index.html` (`#contact-link` and `#webgl-fallback`)
3. **Cases** — `public/data/projects.json`
4. **Doctrine quotes** — `public/data/philosophy.json`
5. **Socials** — `public/data/socials.json`

### Case schema

```json
{
  "id": "proj-006",
  "title": "Your Incident Title",
  "type": "cut | bruise | burn",
  "year": "2024",
  "impact": "One-line outcome",
  "context": "What was the situation?",
  "threat": "What could have gone wrong?",
  "action": "What did you do?",
  "tradeoff": "What was the cost?"
}
```

Rows are rendered from this file at runtime; the specimen partitions itself
into one fragment per case automatically.

---

## Adding a machine writeup

The Writeups page is **markdown-driven — no manifest to maintain**:

1. Copy [src/writeups-content/_template.md](src/writeups-content/_template.md)
   to `src/writeups-content/<slug>.md` (e.g. `cap.md`). Files starting with
   `_` are ignored.
2. Fill in the frontmatter (`name`, `platform`, `os`, `difficulty`, `date`,
   `tags`, `status`). `platform` becomes a filter pill; `difficulty` is
   color-coded; entries sort newest-first by `date`.
3. Put screenshots in `public/writeups/<slug>/` and reference them with bare
   filenames: `![Caption](nmap.png)`. They render as forensic exhibits with
   click-to-zoom.
4. Write the body in markdown. Code blocks get a terminal look + copy button.

A filled sample (`sample-machine.md`) ships so you can see the rendering —
delete it once you've added your own.

## Projects — the interactive works annex

`/projects/` is a typography-first index of interactive works. Each entry in
the `WORKS` array in `src/projects.js` becomes a row with a cursor-following
cover preview. **Adding a project:**

1. Create `projects/<slug>/index.html` + `src/<slug>.js`
2. Add the entry to `rollupOptions.input` in `vite.config.js`
3. Add one object to `WORKS` in `src/projects.js`

New pages pick up the active lens automatically (see
[Lenses & the site-wide theme](#lenses--the-site-wide-theme)) as long as
their entry imports `./theme/index.js` after `base.css`.

### Range — playable exercises (`/projects/range/`)

A sibling of the Lab for works that are games rather than toys: each
exercise is its own page under `/projects/range/<slug>/`, built on a real
simulation whose rules you have to discover. The index card for each
exercise paints a live thumbnail from the exercise's own physics and shows
the visitor's saved progress. Exercise 01 is Resonance; the next slot is
sealed until it ships.

### Resonance — a playable acoustic lock (`/projects/range/resonance/`)

A vault that opens to sound. A steel plate is center-bolted on the bench,
sprinkled with ~100k grains of sand, and driven by a transducer. Seven
keys are figures the sand has to draw: tune the drive frequency until the
plate sings, move the transducer until the figure matches, and hold the
note until the tumbler falls.

Nothing is drawn. The plate is a real modal model of a free square plate
(cosine eigenmodes, eigenfrequencies ∝ m² + n², so families like
(0,5)(5,0)(3,4)(4,3) ring together). Every mode is driven in proportion to
its shape under the transducer, which means a mode with a node under the
drive can't be struck at all. Key 3 can't be solved from the center bolt
for exactly that reason. Each mode answers with a Lorentzian resonance.
On the GPU, grains hop wherever plate acceleration beats gravity and
ratchet slowly downhill where it doesn't, so they pile into the nodal
lines: the Chladni figure falls out of the physics.

- **Ear before eye:** the drive tone is procedural WebAudio at the real
  drive frequency. It is quiet off resonance and blooms as the plate
  answers, with a beating partner tone and sand hiss scaling with the
  airborne grains. You hear a mode before the sand moves.
- **Spectral memory:** the tuning rail keeps a trace of every response
  you've heard, so exploring maps the spectrum. Studio mode marks where
  the modes live; the vault makes you find them.
- **Controls:** wheel or ← → to tune (Shift for fine), drag the rail (drag
  up off it for a vernier), drag the plate to move the drive (keys 1–2
  lock it to the center bolt).
- **Progression:** seven keys from a tuning-only diamond to a four-mode
  master key with a narrow resonance. Progress and best run persist
  (`resonance-v1`). The open vault reveals the codename of a lens the
  visitor hasn't unlocked, and can switch to it in place.
- **Design tooling:** `node resonance-keys.mjs` audits every key (figure,
  search-region size, whether a center drive can solve it); `node
  resonance-keys.mjs search <f> <width>` proposes drive points for a new
  key. Keys live in `src/resonance/keys.js`.

### Visions — a depth gallery (`/projects/visions/`)

Three photomanipulation plates hung in a dark volume. Each plate is the
pristine image on a 200×200-segment plane, displaced in Z by a depth proxy
(image luminance + radial bias) so it gains real relief. Scroll dollies the
camera _into_ the picture — then the plate dissolves past the lens and the
next rises out of the black. Source images live in `public/projects/visions/`;
to swap a plate, replace a JPEG and edit `EXHIBIT_DATA` in `src/visions.js`.

### Vows — a collection of interactive wedding invitations (`/projects/vows/`)

`/projects/vows/` is an index of invitation templates — each couple gets a
different concept. **No. 01: Thread** lives at `/projects/vows/thread/`,
**No. 02: Open House** at `/projects/vows/home/` (its full build spec
is [projects/vows/home/SPEC.md](projects/vows/home/SPEC.md)).

#### No. 01 — Thread (`/projects/vows/thread/`)

Not a page — **a film**. After the seal there are no sections, no cards,
no grids: the entire invitation is one continuous full-viewport canvas
world that morphs as you scroll, twelve chapters from a cradle to a
lantern-lit sky.

1. **The Red Thread (opener)** — a night canvas: two silhouettes joined
   by a sagging, glowing red thread. Drag either figure along it; the
   thread tightens, sheds sparks, and the far figure leans in. When they
   meet: an embrace, the thread coils into a burning heart, and the
   screen ignites into the film. Until the guest touches anything, a
   bead of light rides the thread and the figures take turns leaning —
   nobody misses the cue. A tap-to-open fallback appears after a while.
2. **One City, Two Windows (choice)** — a night cityscape with exactly
   two windows lit. Hover (or first-tap) one and the silhouette inside
   appears: him counting other people's windows, her sketching past
   midnight. Choosing one dives the camera through the glass into that
   life. A rooftop sign skips ahead to the date & details.
3. **The biography years** — five chapters per side, and the sides are
   genuinely different worlds: storm-night birth vs dawn birth, rooftop
   paper planes vs jars of collected small things, half-finished songs
   vs margin doodles, a city of windows vs a single midnight studio, the
   seat he keeps free vs her three near-misses in the rain.
   **The other person hides in every chapter** — her lit window across
   his street, his paper plane crossing her sky. Spot one, tap it: a
   caption card tells the crossing, and a "paths crossed n / 5" tally
   ticks up (persisted per side). The proposal chapter ends with an
   invitation to **rewind to the other side** and watch the same years
   from the other window.
4. Then the shared chapters: **the meeting**, **the proposal**, **the
   reveal** (names in gold shimmer, live countdown, parents' names, plus
   a replay-the-other-side link), **the projection room** (the photos
   screen one by one in a dark booth — a dusty light beam the cursor can
   stir, film grain and flicker, subtitle captions that type themselves,
   and a sprocket filmstrip timeline that advances with the scroll),
   **the day**, **the venue** — and **the lantern sky (RSVP)**: every
   guest reply is a floating lantern; tap one to read its wish, light
   your own and your letter rises into the sky with the others.

Everything is data-driven from `public/projects/vows/thread/config.json`:
couple, date, **journey chapters** (`journeys.groom[]` / `journeys.bride[]`
plus shared `meeting` / `proposal`, each
`{ year, title, text, scene, variant, cameo: { caption } }` — `variant`
picks the side's scene composition, `cameo.caption` is the card shown
when the hidden other-half is found), `opener.hint`, `choice` lines, the
reveal lines, captioned `moments[]`, events, venue, seeded wishes.
Share personalized links as `?to=Aunt+Mira` — the opener greets the
guest by name, the closing says goodbye with it, and the lantern letter
prefills.

RSVP data flows through one module, `src/vows/store.js` (localStorage mock
for now). **When a real database is ready, follow
[projects/vows/BACKEND.md](projects/vows/BACKEND.md)** — schema, REST
contract, and three static-hosting-friendly backends (Supabase, Firebase,
Google Apps Script) with the exact store swap.

#### No. 02 — Open House (`/projects/vows/home/`)

Where Thread is a film you watch, Open House is a place you visit: **the
invitation is the couple's apartment**. Ring the doorbell — two dogs bark
behind the door, paw shadows scurry in the gap — and the door swings open
onto a wide, pannable flat (hallway → living room → kitchen). Twelve
objects hold memories: her kampung sketch and nurse's lanyard, his
father's wristwatch kept wound and the radio he fixed in the children's
home, the phone holding the first chat-app message she sent in practice
German, the airline crates the dogs flew in. Tap one and it opens as an
animated polaroid card; a strip of diamonds keeps count.
Sugar and Omi (her shiba-mix twins) **live in the flat** — they wander,
nap, drift toward your cursor, walk over and *sniff at memories you
haven't found yet*, and Omi periodically steals a flashcard off the
fridge. Find six memories and the ring box on the bookshelf starts to
glow (before that, Omi sits guard in front of it): tap it for the
proposal and the full reveal — names, date, live countdown. The RSVP is
the **guestbook on the dining table**; submitted wishes fold into picture
frames and fly up onto the gallery wall, where every frame is tappable
and stamped with the sender's country — and a hanging tag (or the
"Wishes wall" shortcut) opens the full scrollable book of every wish,
however many hundreds there are. Practical details are never gated
— they're pinned to the hallway corkboard. Config:
`public/projects/vows/home/config.json`; store: `src/vows-home/store.js`
(same BACKEND.md contract); spec:
[projects/vows/home/SPEC.md](projects/vows/home/SPEC.md).

### Lab — experimental UI (`/projects/lab/`)

Full-screen toys behind a switcher (tabs / arrow keys):

- **Embers** — ~125k GPGPU particles (ping-pong half-float FBO) springing
  toward rasterized words on curl noise; the cursor blows them apart
- **Ink** — real-time stable-fluids simulation (advect → splat → Jacobi
  pressure solve → project), cursor drags hue-cycling dye, click pulses
- **Lattice** — kinetic type wall on 2D canvas, magnetic cursor field,
  scroll/click to change the phrase
- **Blackhole** — ray-marched null geodesics (Schwarzschild) per pixel:
  the accretion disk wraps over and under the shadow, doppler-beamed so
  the approaching limb burns white, photon ring and lensed starfield all
  emerge from the integration; move to orbit, scroll to dive toward the
  disk plane, click to feed it

Each experiment is a class with `update/resize/dispose` — add a new one in
`src/lab/` and register it in `EXPERIMENTS` in `src/lab.js`.

## Architecture

```
src/
├── main.js                  # Case File page: sections, rows, panel, loop
├── writeups.js              # Writeups page: markdown loader + router
├── projects.js              # Projects hub: works index + cover peek
├── visions.js               # Visions: plate manager + scroll travel
├── vows.js                  # Vows orchestrator: flow + config renderer
├── vows/                    # Opener, choice city, journey scenes, RSVP, store
├── lab.js                   # Lab: experiment registry + input loop
├── lab/                     # Embers, Ink, Lattice, Blackhole experiments
├── range.js                 # Range: exercise index (EXERCISES, sealed slots)
├── resonance.js             # Resonance: game loop, rules, HUD, persistence
├── resonance/               # plate (modal physics), sand (GPGPU), stage, tone, keys
├── lenses/                  # Lens configs + registry (DEFAULT_ID lives here)
├── theme/                   # Site-wide theme: lens tokens → CSS/canvas/GLSL
├── state/AppState.js        # Decay + scars, persisted to localStorage
├── scenes/
│   ├── MainScene.js         # Specimen scene: camera spline, scan, floor
│   └── exhibits/            # Visions: ArtPanel (depth plate) + atmosphere
├── objects/Artifact.js      # The Specimen: partitioned icosahedron + payload
├── shaders/artifactShader.js# Dark glass + fresnel + FBM veins + scan band
├── systems/                 # PostProcessing, AudioManager, DecaySystem
├── ui/                      # Cursor, Telemetry, TextScramble
├── styles/base.css          # Shared design system (dark pages)
├── writeups-content/        # Your .md writeups live here
└── utils/Quality.js         # Mobile / reduced-motion / WebGL detection
```

Data flow: native scroll → smoothed progress → camera spline + dissection;
DOM case rows → fragment highlight/scar; `AppState` → vein coverage. Writeups
load via `import.meta.glob`; Visions map scroll to a continuous travel
parameter `P` — plate `i` is fully presented at `P = i + 0.5` and plates
cross-dissolve through depth at the boundaries.

---

## Lenses & the site-wide theme

The site has lenses (themes): **DevSecOps** (default, teal, codename
`harden`) and **Breach** (red, codename `breach`, locked until found).
Type a codename on any page to switch. Every page follows the active
lens, not just Home, and so do open tabs.

- **One source of truth:** each lens file (`src/lenses/<id>.js`) carries
  `theme` (`accent`, `accentInk` for print) and `site` (`title`, `file`,
  `home`, `words`). Nothing else hardcodes a brand color.
- **CSS** uses `var(--accent)`, `rgba(var(--accent-rgb), a)` and
  `var(--accent-ink)`. `html[data-lens="<id>"]` is available for rare
  per-lens overrides.
- **Canvas / GLSL** read `Theme.accentRgba(a)` / `Theme.accentVec3()` and
  subscribe with `Theme.onChange(fn)` (see `src/cv/portrait.js`).
- **Copy:** `<el data-lens-tpl="{file} · Annex">` fills from `site`.
- **No flash of the wrong color:** a Vite plugin (`vite.config.js`)
  injects a tiny pre-paint script into every page's `<head>` that applies
  the visitor's cached lens tokens, falling back to the default lens baked
  in at build time. The Vows invitations have their own palettes and are
  skipped.
- **Adding a lens** = one file in `src/lenses/` + one line in
  `src/lenses/registry.js`. Every page, the boot script, the Lab words and
  the Resonance copy (with a neutral fallback) pick it up.

## The forensic systems

- **Decay**: the specimen rots slowly while idle, faster when ignored
  (tab-away is penalized). Decay level drives red vein coverage in the
  shader and is reported in the telemetry HUD.
- **Scars**: opening a case permanently scars its fragment. Scars and decay
  survive reloads (`localStorage`), and the specimen keeps rotting *between*
  visits.
- **Sound**: synthesized WebAudio (no files) — section-tuned drone, hover
  ticks, glitch bursts. Muted by default; opt-in toggle bottom-right.
- **Quality fallbacks**: post-processing off and particles reduced on
  mobile / `prefers-reduced-motion`; static content if WebGL is missing.

---

## Deployment — GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main`:

1. Push the repo to GitHub
2. **Settings → Pages → Source: GitHub Actions**
3. Push to `main` → live at `https://<user>.github.io/<repo>/`

`base: './'` in `vite.config.js` plus `import.meta.env.BASE_URL` data fetches
mean it works from any subpath unchanged.

---

## License

MIT — adapt it, but make it yours: rewrite the copy, replace the cases.

**"Every system I touch is already compromised. I decide how far it spreads."**
