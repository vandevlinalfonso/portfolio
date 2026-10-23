# Vows No. 02 — "Open House" · Full Build Specification

> **Purpose of this document.** A complete, agent-proof specification for the
> second Vows wedding-invitation template. It is written so that any capable
> coding agent (or human) can rebuild, extend, or debug the experience without
> access to the original conversation. Everything intentional is written down;
> if a behaviour isn't specified here, match the existing code in
> `src/vows-home/`.

---

## 1. Identity

| Field | Value |
| --- | --- |
| Title | **Open House** |
| Route | `/projects/vows/home/` |
| Page | `projects/vows/home/index.html` |
| Source | `src/vows-home.js` + `src/vows-home/*.js` |
| Config | `public/projects/vows/home/config.json` |
| Couple | Vella (Indonesia, bride) & Manu (Germany, groom) — first names only, no surnames |
| Their dogs | Sugar (white, fluffy, shiba/pomeranian mix) & Omi (black, short-haired twin sister) |
| Premise | Vella (b. 1995 Bandung, nurse, started learning German in 2022) met Manu (b. 1991 Mannheim; lost his father at three; ADHD; grew up in a children's home until 18; engineer at 19) in 2023 through an ordinary chat app where she practiced her German. She moved to Germany with both dogs; proposal December 2026; wedding May 8th, 2027, Cologne. Manu's reveal line reads "in loving memory of his father". |

### The one-line concept

**You don't watch their story — you visit it.** The invitation is the couple's
apartment. You ring the doorbell, the dogs bark, the door opens, and you are
free to wander a wide side-scrolling flat where every object is a memory.
There is no scroll-film, no chapters, no timeline: the dramaturgy is spatial,
not linear, which is exactly what distinguishes it from Vows No. 01 ("Thread",
a cinematic one-take scroll film).

### Why this format (design rationale)

- No two visits are alike: order of discovery is the visitor's own.
- Replay value is structural: 12 memories, a gated reveal, and live dogs give
  three different reasons to keep exploring.
- The RSVP is diegetic: a guestbook on the dining table, and submitted wishes
  hang as picture frames on the gallery wall — the guest physically joins the
  home.

---

## 2. Hard rules

1. **No shared imports with `src/vows/`** (the Thread template). Visual or
   code reuse between templates is forbidden; each must feel hand-made.
2. All UI copy in **English**; names/config values may be any language.
3. Must run as a static site (GitHub Pages): no server, no env vars. Data
   layer is `src/vows-home/store.js` (localStorage mock) with the swap-in DB
   path documented in `projects/vows/db/MIGRATION.md`.
4. **Everything narrative comes from `config.json`** — captions, dates, dog
   lines, seeded wishes. No hardcoded couple-specific strings in JS (drawing
   labels like "MAI" on the calendar and "CGK→CGN" on the crate stickers
   are acceptable scenery).
5. Personalization via `?to=Guest+Name` — greeting line on the door page, a
   parcel addressed to the guest on the doormat, prefilled guestbook name.
6. `prefers-reduced-motion`: dogs nap instead of wandering, hotspot pulses and
   snow/steam stop, the door opens fast, confetti is skipped.
7. Page never scrolls (`body { overflow: hidden }`); all navigation is the
   canvas camera.

---

## 3. Module map

```
projects/vows/home/index.html   page shell + ALL CSS (door, HUD, overlays)
src/vows-home.js                orchestrator: boot, config, door→flat, HUD,
                                toast captions, wall refresh, music wiring
src/vows-home/music.js          the soundtrack: couple's MP3 or procedural
                                "home ambience", vinyl control, ducking
src/vows-home/door.js           the landing: door canvas, bell, barks, entry
src/vows-home/flat.js           the world: camera, input, layout (SPOTS),
                                room drawing, hotspot glows, hit-testing
src/vows-home/dogs.js           Sugar & Omi agents (wander/sit/sleep/sniff/
                                steal), drawing, tap reactions
src/vows-home/memories.js       memory polaroid cards (12 mini canvas
                                vignettes + proposal), reveal splash
src/vows-home/guestbook.js      writer overlay, wish-frame popover, corkboard
                                details card
src/vows-home/store.js          data layer (same contract as BACKEND.md)
vowshome-shot.mjs               Playwright verification suite
```

---

## 4. Flow

### 4.1 The door (`door.js`)

- Warm landing canvas: plaster wall, sconces, wooden front door with a brass
  plate on its top rail (`Apt. 12 · Keller · Lestari`), a eucalyptus wreath
  with berries and a bow, a terracotta mat stitched *"come in, we left it
  open"*, and — with `?to=` — a kraft parcel on the mat labelled
  *"for {FirstName}"* in Caveat.
- DOM on top: handwritten greeting (`Dear {guest},`), kicker, couple names,
  date, and a brass **doorbell button** (right of the door on desktop, bottom
  centre on mobile ≤620px).
- Ring → bell rocks (CSS `bell-ring`), four speech-bubble barks rise from
  behind the door (`WOOF! / WOOF WOOF! / woof? / WOOF!!`) **with synthesized
  woof sounds timed to the bubbles** (`music.woofs()` — alternating deep
  woof / yip, silent when muted), paw shadows scurry
  in the gap under the door, then the door swings open (horizontal squash on a
  left hinge) onto warm light, the screen floods, and the flat fades in.
- States: `idle → barking → opening → done`; entry callback fires at 55% open.
  Reduced motion: 400ms bark beat, 500ms open.

### 4.2 The flat (`flat.js`)

A single canvas world, `worldW = max(2300, w × 3)` (×4.2 under 700px), camera
clamped to `[0, worldW − viewport]`, eased at 10%/frame.

**Input**

- Pointer drag pans (movement > 8px = pan; ≤ 8px = tap — the disambiguation
  rule). Wheel (either axis) pans. Arrow keys pan by 40% viewport. Desktop
  edge-hover (≤64px from either side) drifts the camera.
- Tap routing order: gallery frames → ring box → corkboard → guestbook →
  memories → dogs.
- Cursor: `grab` baseline, `pointer` over any interactive.

**Layout — the `SPOTS` table** (world-x as fraction of `worldW`, y as fraction
of viewport height). Rooms: hallway `0–0.215`, living room `0.215–0.625`,
kitchen/dining `0.625–1`, with slim wall-return dividers at the boundaries.

| id | fx | fy | object | memory of |
| --- | --- | --- | --- | --- |
| keybowl | 0.085 | 0.625 | lanyard in the key bowl | her 2018, nursing |
| leashes | 0.148 | 0.46 | leashes on coat hooks | the dogs, now |
| corkboard | 0.19 | 0.37 | save-the-date + map | *practical details (not a memory)* |
| journals | 0.272 | 0.75 | banded journal stack, coffee table | her 2013, writing |
| *frames* | ~0.293 | ~0.3 | gallery wall above the sofa | *wishes (store-driven)* |
| wishbook | 0.293 | 0.475 | swinging paper tag under the frames | *opens the all-wishes overlay* |
| phone | 0.318 | 0.765 | propped phone, coffee table, screen aglow | 2023, the first message |
| sketch | 0.478 | 0.3 | framed kampung pencil sketch | her 1995, born |
| radio | 0.522 | 0.395 | repaired radio, shelf 2 | his ~2005, the children's home |
| watch | 0.5495 | 0.4 | his father's wristwatch on a stand, shelf 2 | his 1994 |
| snowglobe | 0.5495 | 0.3 | snow globe (Mannheim water tower), shelf 1 | his 1991, born |
| brother | 0.5235 | 0.5 | school photo, shelf 3 | her 2008, the doorway |
| ringbox | 0.5495 | 0.515 | red ring box, shelf 3 | *the gated reveal* |
| blueprints | 0.594 | 0.7 | leather tube + rolls, corner | his 2010, engineer at 19 |
| flashcards | 0.665 | 0.42 | fridge magnets (der/die/das/Haus/rumah) | her 2022 |
| guestbook | 0.873 | 0.645 | open guestbook, dining table | *RSVP (not a memory)* |
| crates | 0.948 | 0.74 | two airline crates, CGK→CGN stickers | 2023, the flight |

Scenery (non-interactive): front door seen from inside, console + mirror, dog
beds, coat, sofa + cushions + throw, two dusk windows with parallax winter
city (moon in the living-room one, snow in both), floor lamp, calendar with
the circled date ("MAI"), kitchen counter/sink/kettle with steam, plants,
hanging plant. **Bookshelf items must sit ON shelf lines** (shelf y =
`h × (v + 0.06)` for v in 0.27 / 0.355 / 0.47 / 0.6 / 0.72).

**Hotspot affordance**: undiscovered memories breathe a warm halo
(`rgba(255,214,140)`, stronger within 130px of the pointer) plus a twinkle
cross; found ones show a small terracotta heart. Reduced motion: no pulse.

**Wayfinding (the guarantee + the nudge).** Exploration is optional for the
practical things:

- **Quick-nav paper tags** (`#quick-nav`, bottom-left desktop / bottom-row
  mobile, labels from `hud.nav`): "Date & place" → `flat.flyTo('corkboard')`
  then auto-opens the details card; "Sign the guestbook" →
  `flyTo('guestbook')` then opens the writer; "Wishes wall" → glides to the
  gallery and opens the all-wishes overlay. `flyTo(idOrFraction)` eases the camera,
  resolves when it settles (instant under reduced motion), and lights a ~3s
  pulsing **beacon** halo + ring on the target hotspot. Edge-hover panning is
  suspended while hovering UI chrome (`pointer.ui`) and during a flyTo so the
  glide can't be fought.
- **Rotating idle hints**: the bottom hint cycles through `hud.hints[]` every
  7s (cross-fade). The first pan skips straight from the drag instruction to
  the practical hints; rotation stops for good (`stopHints()`) once the
  details card or the writer has been opened — the nudge has done its job.

**Music (`music.js`).** Config-driven soundtrack with a fixed top-right
**vinyl-disc button** (`#vinyl`): spins while playing, shows a slash when
muted, hides when `music.mode` is `"off"`.

- `music.src` set → the couple's own looped MP3 (file dropped in
  `public/projects/vows/home/`), routed through a WebAudio gain;
  `music.title` appears in the tooltip ("Now playing — …"). If the file is
  missing or fails to load, it **falls back to the ambient mode
  automatically** — so `src` can be set as a placeholder before the real
  song exists and the invitation never goes silent.
- No `src` (the default) → procedural **home ambience**: felt-piano plucks
  on an A-minor pentatonic with a soft echo, over a faint vinyl-crackle
  noise bed — fully synthesized, zero assets.
- `music.woof(big)` / `music.woofs()`: the barks used by the doorbell
  answer and dog taps. With `music.barkSrc` set (e.g. `"./bark.mp3"`, a
  short dry single bark in `public/projects/vows/home/`), the recording is
  prefetched, decoded once into an `AudioBuffer`, and played overlap-safe
  with per-size pitch shift (~0.92× for the deep WOOF, ~1.18× for the yip)
  plus a little random detune so repeats never sound identical. Missing or
  undecodable file → automatic fallback to the synthesized bark (sawtooth +
  square formant through a bandpass, pitch-dropping envelope). Either way
  they share the AudioContext but bypass the master fade so they're audible
  immediately after the gesture. Muted = no woofs.
- Nothing plays before a user gesture: playback **starts at the doorbell
  click** and fades in as the door opens (fits the fiction — you can hear
  the music is on inside). Overlays (memory card, writer, details,
  all-wishes, reveal) **duck** the level to ~35% via `withDuck()` in the
  orchestrator and restore on close. Mute persists in localStorage
  (`vows-home-muted-v1`). Reduced motion stops the disc's spin animation
  but not the audio.

**Persistence**: found ids in localStorage `vows-home-memories-v1`; reveal
seen flag in `vows-home-reveal-v1`; RSVPs in `vows-home-rsvp-v1` (store.js).

### 4.3 The dogs (`dogs.js`)

Two agents on the floor line, scale `min(vw, vh) × 0.034`:

- **Sugar** — white, drawn with a fluff pass (overlapping circles); easygoing.
- **Omi** — black, sleek, slightly smaller; "very serious".

State machine `idle/walk/sit/sleep/sniff/carry`: random waypoints, sits 3–9s,
naps (curled, breathing, drifting *z*), 35% chance on wake to drift toward the
visitor's pointer. **Sniff-guide (the coach):** every 11–17s a free dog walks
to the *nearest undiscovered* hotspot and sniffs at it — head bobbing, scent
puffs travelling from nose to object. **The heist:** every 34–60s Omi walks to
the fridge, takes a flashcard (visible in mouth: "der"), trots off and drops
it. Tap a dog: tail-wag burst + hop + a soft synthesized woof + a caption in
a speech bubble (`.dog-pop`). **Captions are per-dog**: `dogLines` is an
object keyed by dog name (each dog rotates through its own list), so tapping
Sugar can never produce a line about Omi. Dogs are drawn with pricked, wide-set shiba ears
(short — not cat-pointy) and a tail curled over the back. Reduced motion: both
dogs sleep.

### 4.4 Memory cards (`memories.js`)

Tap a memory object → `.mem-pol`, a washi-taped polaroid card: animated canvas
vignette (one bespoke `MINIS[id]` draw function per memory — e.g. the snow
globe snows, the radio dial sweeps with expanding signal arcs, the watch's
second hand keeps real time, the phone replays the first chat exchange
bubble by bubble), then year (terracotta italic),
ownership line ("AYU'S A NURSE'S LANYARD" style), title, and a Caveat caption.
Close: ×, backdrop, or Esc. First discovery also fills a diamond in the HUD
strip and bumps the counter with a `scale` ping (the keyframe animates `scale`
specifically so it composes with any layout transform — minifier/compositor
lesson from Thread).

### 4.5 The ring box → the reveal

- Found < gate (6): tap → Omi runs over and sits guard in front of the shelf;
  toast shows `reveal.guard`. No reveal. (Test-asserted.)
- Found ≥ 6: box glows and cracks open; closing the 6th memory card also
  toasts *"Something on the bookshelf just started to glow…"*.
- Tap when unlocked → proposal memory card (`MINIS.proposal`: winter garden,
  string lights, kneel, ring glint, Omi crossing mid-frame, snow) → full
  `#reveal` splash: gold-sweep names, "are getting married", date, live
  countdown (tabular numerals), parents' lines, closing line (+ guest name if
  personalized), hashtag, drifting confetti, and a "← back to the flat"
  button. Afterwards the box stays open with a sparkling ring
  (`revealSeen`, persisted).

### 4.6 Guestbook + gallery wall (`guestbook.js`)

- **Corkboard** (hallway) → details card: kicker "The practical wall", date,
  ceremony/reception rows, venue + maps link, RSVP deadline note pointing to
  the guestbook. Practical info is deliberately **never gated**.
- **Guestbook** (dining table) → writer overlay: name (prefilled from `?to=`
  or a previous RSVP), "Writing from" country stamp (≤3 chars), side pills,
  attending pills (plus-ones stepper hidden when declining, 0–4 "Just me/Me +
  n"), wish textarea. Submit → the page folds into a mini frame
  (`.fly-frame`) and flies up; the wall refreshes from the store; the
  visitor's frame (terracotta border vs walnut) pops in with a wobble and the
  camera glides to the wall.
- **Wall frames**: up to 12 wishes from `getMessages()` (own entries newest
  first, deduped by name+message — the `dedupeWishes` helper in
  `vows-home.js`), 4-column jittered grid around (0.293 · worldW, 0.295 · h),
  tilted, name in Caveat, dashed-circle country stamp. Tap → `.wish-pop`
  paper popover (message, name, stamp, side), auto-dismisses after ~4s.
- **All-wishes overlay** (`showAllWishes` in guestbook.js): the wall is a
  12-frame teaser; the full archive opens as a scrollable two-column paper
  sheet (`#allwishes` / `.aw-sheet`) listing every deduped wish — message,
  name, country stamp, side; the visitor's card highlighted terracotta;
  header shows total count + country count; footer points to the guestbook.
  Entry points: the swinging "read all the wishes" tag under the frames
  (`wishbook` hotspot) and the quick-nav "Wishes wall" tab (glide → open).
- Stats line under the HUD strip: `"{guests} guests across {parties} parties
  are coming"` from `getStats()`.

---

## 5. Art direction

- **Palette (daylight, warm):** cream `#f6efe3`, paper `#fdf6e8`, ink
  `#3d342b`, terracotta `#c2604f` (accent + "mine"), sage `#8a9b77`, walnut
  `#7a5c44`, brass `#b98a47`. Windows hold the only cool dusk blues — the
  "two countries, one sky" residue of the couple's story.
- **Type:** Cormorant Garamond (display, italic) + **Caveat** (handwriting:
  captions, mat, hint, wishes). Small-caps kickers letter-spaced 4–6px.
- **Texture:** SVG fractal-noise grain overlay at 0.4 opacity, fixed, above
  everything (`body::after`, `z-index 95`).
- **Light:** golden-hour radial pools at the two windows, lamp glow, soft
  vignette. Interior light is always warmer than the dusk outside.
- Canvas drawing is flat-shape illustration (rounded rects, ellipses, quads) —
  no gradients on small props, shadows only under dogs/frames/furniture.

---

## 6. Engineering requirements

1. **DPR pattern** everywhere: backing store `min(devicePixelRatio, 2)`,
   `ctx.setTransform(dpr,0,0,dpr,0,0)`, draw in CSS px, resize by comparing
   `canvas.width` to `Math.round(w * dpr)`.
2. **Pan/tap disambiguation** exactly as §4.2; pointer capture on the stage
   element; ignore pointerdowns on `button/a/input/textarea/select/label`.
3. **Minifier safety:** mutable cross-frame state lives in instance fields or
   closure variables that are *assigned* at runtime (`found`, `revealSeen`,
   `cam`, dog state objects). Never expose state only via an object literal
   property that Rollup can constant-fold.
4. **Hit tests in world coordinates** (`screenX + cam`); `screenPos(id)` and
   `panTo(fraction, instant)` are part of the public surface (used by tests
   via `window.__vowsHome`).
5. Overlays are DOM, created on demand, animated with GSAP
   (`clearProps: 'opacity,transform'` after staggered intros — inline-style
   lesson from Thread).
6. All listeners that outlive the flat are stored and removed in `dispose()`.
7. Culling: each room draw block early-outs when its anchor is > ~400px off
   screen.

---

## 7. Config schema (`public/projects/vows/home/config.json`)

```jsonc
{
  "couple": { "groom": { "name", "fullName", "parents", "country" },
              "bride": { …same…, "dogs": [{ "name", "look" }] } },
  "hashtag": "#ManuFindetVella",
  "date": "ISO datetime (countdown target)",
  "dateDisplay": "Saturday, May 8th, 2027",
  "door": { "nameplate", "flatNo", "bell", "mat", "kicker" },
  "music": { "mode": "ambient|file|off", "src": "./song.mp3 or empty",
             "title": "shown in the vinyl tooltip",
             "barkSrc": "./bark.mp3 or empty (synth woof fallback)" },
  "hud": { "hints": ["…rotating idle hints, first = drag instruction…"],
           "nav": { "details", "guestbook", "wishes" } },  // quick-nav labels
  "memories": [ { "id", "who": "bride|groom|both", "year", "object",
                  "title", "caption" } ],   // exactly 12, ids must match SPOTS
  "reveal": { "gate": 6, "guard", "proposalTitle", "proposalCaption",
              "kicker", "line" },
  "details": { "kicker", "events": [{ "name", "time", "place", "note" }],
               "venue": { "name", "address", "mapsUrl" },
               "rsvp": { "deadline" } },
  "dogLines": { "Sugar": ["…her captions…"], "Omi": ["…his captions…"] },
                                  // keyed by dog name; each rotates its own
  "wishes": [ { "name", "side", "attending", "plusOnes", "country",
                "message" } ],              // seeds; no "word" field anymore
  "closing": "…"
}
```

Both timelines are the couple's **real** facts (Manu: 1991 Mannheim, father
died 1994, ADHD, children's home until 18, engineer at 19, met Vella 2023
via a chat app). Date, venue and the proposal staging remain placeholders.
Caption changes are config-only; no code changes needed.

---

## 8. Verification protocol

```bash
npx vite build
npx vite preview --port 8901 --strictPort &
node vowshome-shot.mjs http://localhost:8901   # Open House (this template)
node vowshot.mjs http://localhost:8901          # Thread must stay green
node labshot.mjs                                # whole-portfolio smoke
```

`vowshome-shot.mjs` asserts, desktop + mobile (390×844, touch): flat boots
after the bell; the vinyl spins after the bell, mutes on tap, and the mute
survives reload (state classes, not audibility — headless runs stay silent);
quick-nav tabs (details card, all-wishes overlay, writer — desktop
and mobile); corkboard/details; memory cards open and the strip counts;
ring-box guard before the gate (and **no** reveal); 6 found; persistence
across reload; proposal + reveal at the gate; box stays open; dog tap captions
(and doesn't count as a memory); frame popover; writer prefill from `?to=`;
submitted frame joins the wall; drag panning. All screenshots land in `/tmp/
oh-*.png` / `/tmp/ohm-*.png` — **look at them**; layout bugs (floating
furniture, overlaps, unseated shelf items) won't fail assertions.
