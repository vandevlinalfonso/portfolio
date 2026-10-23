import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/600.css';

import { gsap } from 'gsap';

import Door from './vows-home/door.js';
import { Flat } from './vows-home/flat.js';
import { Music } from './vows-home/music.js';
import { showMemoryCard, showReveal } from './vows-home/memories.js';
import { openWriter, showFramePop, hideFramePop, showDetails, showAllWishes } from './vows-home/guestbook.js';
import { initStore, getMessages, getStats } from './vows-home/store.js';

/** Guest personalization: share links as ?to=Tante+Mira */
const guestName = (new URLSearchParams(location.search).get('to') || '').trim().slice(0, 40);

let flat = null;
let music = null;

/* ---------- the record in the corner ---------- */

function syncVinyl() {
  const v = document.getElementById('vinyl');
  if (!v || !music) return;
  v.classList.toggle('hidden', !music.enabled);
  v.classList.toggle('playing', music.playing);
  v.classList.toggle('muted', music.muted);
  v.title = !music.started
    ? 'Music waits inside'
    : music.muted
      ? 'Tap for music'
      : music.title
        ? `Now playing: ${music.title}`
        : 'The music is on, tap to mute';
}

/** overlays lower the music so the words can be heard */
function withDuck(promise) {
  music?.setDucked(true);
  return promise.finally(() => music?.setDucked(false));
}

/* ---------- small floating caption (dog lines, ring-box guard) ---------- */

let toastEl = null;
let toastTimer = 0;
function showToast(text, x, y) {
  toastEl?.remove();
  toastEl = document.createElement('div');
  toastEl.className = 'dog-pop';
  toastEl.textContent = text;
  document.body.appendChild(toastEl);
  toastEl.style.left = `${Math.min(innerWidth - 130, Math.max(130, x))}px`;
  toastEl.style.top = `${Math.max(90, y - 24)}px`;
  requestAnimationFrame(() => toastEl?.classList.add('on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl?.classList.remove('on');
    setTimeout(() => { toastEl?.remove(); toastEl = null; }, 400);
  }, 3400);
}

/* ---------- the memory strip HUD ---------- */

function buildStrip(cfg) {
  const strip = document.getElementById('memo-strip');
  strip.innerHTML = cfg.memories.map((mm) =>
    `<i data-id="${mm.id}" title="${mm.title}"></i>`).join('');
  const label = document.getElementById('memo-count');
  label.textContent = `0 / ${cfg.memories.length} memories`;
}

function updateStrip(cfg, found) {
  const strip = document.getElementById('memo-strip');
  for (const slot of strip.children) {
    slot.classList.toggle('got', found.has(slot.dataset.id));
  }
  const label = document.getElementById('memo-count');
  label.textContent = `${found.size} / ${cfg.memories.length} memories`;
  label.classList.remove('ping');
  void label.offsetWidth;
  label.classList.add('ping');
}

/* ---------- rotating idle hints ---------- */

let hintIdx = 0;
let hintTimer = 0;
let hintsDone = false;

function swapHint(text) {
  const el = document.getElementById('flat-hint');
  if (!el) return;
  el.classList.add('off');
  setTimeout(() => {
    if (hintsDone) return;
    el.textContent = text;
    el.classList.remove('off');
  }, 650);
}

function startHints(cfg) {
  const hints = cfg.hud.hints || [];
  if (hints.length < 2) return;
  const tick = () => {
    if (hintsDone) return;
    hintIdx = (hintIdx + 1) % hints.length;
    swapHint(hints[hintIdx]);
    hintTimer = setTimeout(tick, 7000);
  };
  hintTimer = setTimeout(tick, 7000);
}

/** the visitor knows how to pan now — skip straight to the practical hints */
function advanceHint(cfg) {
  if (hintsDone || hintIdx !== 0) return;
  hintIdx = 1;
  clearTimeout(hintTimer);
  swapHint((cfg.hud.hints || [])[1] || '');
  hintTimer = setTimeout(function tick() {
    if (hintsDone) return;
    hintIdx = (hintIdx + 1) % cfg.hud.hints.length;
    swapHint(cfg.hud.hints[hintIdx]);
    hintTimer = setTimeout(tick, 7000);
  }, 7000);
}

/** they found the practical stuff — the nudge has done its job */
function stopHints() {
  if (hintsDone) return;
  hintsDone = true;
  clearTimeout(hintTimer);
  document.getElementById('flat-hint')?.classList.add('off');
}

/* ---------- wall data ---------- */

/** own entry pinned first (once), then everyone else, deduped */
function dedupeWishes(messages) {
  const seen = new Set();
  const unique = [];
  let minePinned = false;
  for (const m of messages) {
    if (m.mine) {
      if (minePinned) continue;
      minePinned = true;
    }
    const key = `${m.name}|${m.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(m);
  }
  return unique;
}

async function refreshWall(cfg) {
  const [messages, stats] = await Promise.all([getMessages(), getStats()]);
  flat.setFrames(dedupeWishes(messages));
  const statsEl = document.getElementById('flat-stats');
  if (statsEl) statsEl.textContent = `${stats.guests} guests across ${stats.parties} parties are coming`;
}

async function openAllWishes(cfg) {
  hideFramePop();
  return withDuck(showAllWishes(cfg, dedupeWishes(await getMessages())));
}

/* ---------- the guestbook flow (table tap + quick-nav share it) ---------- */

async function signGuestbook(cfg) {
  hideFramePop();
  stopHints();
  const entry = await withDuck(openWriter(cfg, { guestName }));
  if (!entry) return;
  await refreshWall(cfg); // the new entry comes back from the store
  const mineFrame = flat.frames.find((f) => f.wish.mine);
  if (mineFrame) {
    mineFrame.pop = 1;
    flat.panTo(0.293); // glide to the gallery wall to watch it hang
  }
}

/* ---------- enter the flat ---------- */

async function enterFlat(cfg) {
  const doorSec = document.getElementById('door');
  const flatSec = document.getElementById('flat');
  flatSec.classList.add('on');
  document.body.classList.remove('at-door');

  const names = { bride: cfg.couple.bride.name, groom: cfg.couple.groom.name };

  flat = new Flat(cfg, {
    onMemory: (mm) => {
      hideFramePop();
      updateStrip(cfg, flat.found);
      withDuck(showMemoryCard(mm, names)).then(() => {
        if (flat.unlocked && !flat.revealSeen) {
          showToast('Something on the bookshelf just started to glow…',
            flat.screenPos('ringbox').x, flat.screenPos('ringbox').y - 40);
        }
      });
    },
    onDetails: () => { stopHints(); return withDuck(showDetails(cfg)); },
    onGuestbook: () => signGuestbook(cfg),
    onRingbox: () => withDuck((async () => {
      await showMemoryCard({
        id: 'proposal',
        year: '2026',
        who: 'both',
        object: 'question',
        title: cfg.reveal.proposalTitle,
        caption: cfg.reveal.proposalCaption
      }, names);
      await showReveal(cfg, guestName);
      flat.reveal();
    })()),
    onFrame: (wish, x, y) => showFramePop(wish, x, y, cfg),
    onWishbook: () => openAllWishes(cfg),
    onDog: (text, x, y) => {
      music?.woof(Math.random() < 0.5);
      showToast(text, x, y);
    },
    onFound: () => updateStrip(cfg, flat.found),
    onPan: () => advanceHint(cfg)
  });
  window.__vowsHome = flat; // for tests / curious consoles

  // quick-nav paper tags: the guaranteed route to the practical things
  const nav = cfg.hud.nav || {};
  const navBtn = (id, label) => {
    const b = document.getElementById(id);
    if (label) b.textContent = label;
    return b;
  };
  navBtn('nav-details', nav.details).addEventListener('click', async () => {
    hideFramePop();
    await flat.flyTo('corkboard');
    stopHints();
    showDetails(cfg);
  });
  navBtn('nav-guestbook', nav.guestbook).addEventListener('click', async () => {
    hideFramePop();
    await flat.flyTo('guestbook');
    signGuestbook(cfg);
  });
  navBtn('nav-wishes', nav.wishes).addEventListener('click', async () => {
    await flat.flyTo(0.293);
    openAllWishes(cfg);
  });

  buildStrip(cfg);
  updateStrip(cfg, flat.found);
  await refreshWall(cfg);
  startHints(cfg);

  // arrive: drift gently from the hallway toward the living room
  gsap.fromTo(flatSec, { opacity: 0 }, {
    opacity: 1, duration: 0.9, ease: 'power2.out',
    onComplete: () => doorSec.remove()
  });
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTimeout(() => { flat.panTo(0.16); }, 600);
  }
}

/* ---------- boot ---------- */

async function init() {
  let cfg;
  try {
    cfg = await (await fetch('./config.json')).json();
  } catch {
    document.getElementById('door-names').textContent = 'Configuration missing';
    return;
  }

  initStore(cfg.wishes);

  // the record in the corner: starts on the bell (the gesture browsers want)
  music = new Music(cfg.music);
  syncVinyl();
  document.getElementById('vinyl').addEventListener('click', () => {
    music.toggle();
    syncVinyl();
  });
  document.getElementById('door-bell').addEventListener('click', () => {
    music.start();
    music.woofs(); // the dogs answer audibly, synced to the bark bubbles
    syncVinyl();
  }, { once: true });

  document.getElementById('door-kicker').textContent = cfg.door.kicker;
  document.getElementById('door-names').innerHTML =
    `${cfg.couple.groom.name} <span class="amp">&amp;</span> ${cfg.couple.bride.name}`;
  document.getElementById('door-date').textContent = cfg.dateDisplay;
  document.getElementById('door-bell-label').textContent = cfg.door.bell;
  document.getElementById('flat-hint').textContent =
    (cfg.hud.hints && cfg.hud.hints[0]) || cfg.hud.hint || '';
  if (guestName) {
    document.getElementById('door-greeting').textContent = `Dear ${guestName},`;
  }

  new Door(cfg, guestName, () => enterFlat(cfg));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
