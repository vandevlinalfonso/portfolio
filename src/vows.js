import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600-italic.css';

import { gsap } from 'gsap';

import Atmosphere from './vows/atmosphere.js';
import Opener from './vows/opener.js';
import { buildChoice } from './vows/choice.js';
import { Journey } from './vows/journey.js';
import { openWriter, showWishPop, hideWishPop } from './vows/rsvp.js';
import { initStore, getMessages, getStats } from './vows/store.js';

/** Guest personalization: share links as ?to=Aunt+Mira */
const guestName = (new URLSearchParams(location.search).get('to') || '').trim().slice(0, 40);

let atmosphere = null;
let journey = null;
let chosenSide = 'groom';

/* ============================================================
   The film: build + wire the finale interactions
   ============================================================ */

async function startFilm(cfg, side, { jumpToReveal = false, fromRewind = false } = {}) {
  chosenSide = side;
  journey?.dispose();
  document.getElementById('film').classList.add('on');

  journey = new Journey(cfg, side, {
    onLight: async () => {
      hideWishPop();
      const entry = await openWriter(cfg, { guestName, side: chosenSide });
      if (!entry) return;
      journey.launchLantern(entry);
      await refreshSky(cfg);
    },
    onWish: (wish, x, y) => showWishPop(wish, x, y, cfg),
    onRewind: () => {
      // replay the same years from the other person's window
      startFilm(cfg, chosenSide === 'groom' ? 'bride' : 'groom', { fromRewind: true });
    }
  });
  window.__vows = journey; // for tests / curious consoles

  await refreshSky(cfg);
  startCountdown(new Date(cfg.date));
  document.getElementById('closing-line').textContent = guestName
    ? `${cfg.closing} See you there, ${guestName}.`
    : cfg.closing;

  setTimeout(() => {
    if (fromRewind) {
      // jump straight back to the first chapter of the other reel
      const r = journey.track.getBoundingClientRect();
      window.scrollTo(0, r.top + scrollY + 10);
    } else if (jumpToReveal) {
      journey.scrollToChapter(journey.revealIndex);
    } else {
      document.querySelector('#film .jw-track')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, 80);
}

/** Re-pull wishes + stats into the lantern sky */
async function refreshSky(cfg) {
  const [messages, stats] = await Promise.all([getMessages(), getStats()]);
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
  journey.setWishes(unique,
    `${stats.guests} guests across ${stats.parties} parties are coming`);
}

function startCountdown(target) {
  const host = document.getElementById('countdown');
  if (!host) return;
  const units = [['Days', 86400000], ['Hours', 3600000], ['Minutes', 60000], ['Seconds', 1000]];
  host.innerHTML = units.map(([u]) => `<div class="cd"><b data-u="${u}">0</b><span>${u}</span></div>`).join('');

  const tick = () => {
    if (!document.getElementById('countdown')) return;
    let diff = target.getTime() - Date.now();
    if (diff <= 0) {
      host.innerHTML = '<div class="cd"><b>Today!</b><span>The day is here</span></div>';
      return;
    }
    for (const [u, ms] of units) {
      const v = Math.floor(diff / ms);
      diff -= v * ms;
      const el = host.querySelector(`[data-u="${u}"]`);
      if (el) el.textContent = v;
    }
    setTimeout(tick, 1000);
  };
  tick();
}

/* ============================================================
   Flow: seal → choice → the film (which is everything else)
   ============================================================ */

function openInvitation(cfg) {
  const seal = document.getElementById('seal');
  const content = document.getElementById('content');
  const bloom = document.getElementById('bloom');

  atmosphere?.flare();
  gsap.timeline()
    .to(bloom, { opacity: 1, duration: 0.5, ease: 'power2.in' })
    .add(() => {
      seal.remove();
      document.body.classList.remove('sealed');
      content.removeAttribute('aria-hidden');
      window.scrollTo(0, 0);
      atmosphere?.setMood('invite');
    })
    .to(bloom, { opacity: 0, duration: 1.1, ease: 'power2.out' }, '+=0.15')
    .add(() => bloom.remove(), '+=0')
    .fromTo('#choice .choice-copy > *, #choice-skip',
      { opacity: 0, y: 30 },
      // clearProps: the dive's `.diving` fade must not lose to inline styles
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', clearProps: 'opacity,transform' }, '-=1.0');

  buildChoice(cfg,
    (side) => startFilm(cfg, side),
    () => startFilm(cfg, Math.random() < 0.5 ? 'groom' : 'bride', { jumpToReveal: true }));
}

/* ============================================================
   Boot
   ============================================================ */

async function init() {
  let cfg;
  try {
    cfg = await (await fetch('./config.json')).json();
  } catch {
    document.getElementById('seal-names').textContent = 'Configuration missing';
    return;
  }

  atmosphere = new Atmosphere();
  atmosphere.setMood('seal');

  initStore(cfg.wishes);

  document.getElementById('seal-names').innerHTML = `${cfg.couple.groom.name} & ${cfg.couple.bride.name}`;
  document.getElementById('seal-date').textContent = cfg.dateDisplay;
  if (guestName) {
    document.getElementById('seal-greeting').textContent = `Dear ${guestName},`;
  }

  new Opener(cfg, () => openInvitation(cfg));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
