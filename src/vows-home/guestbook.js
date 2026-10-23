/**
 * Open House — the guestbook (diegetic RSVP), the framed-wish popover,
 * and the corkboard details card. All data flows through store.js.
 */

import { gsap } from 'gsap';
import { submitRsvp, getOwnRsvp } from './store.js';

let popEl = null;
let popTimer = 0;

/** Tap a frame on the gallery wall → read the wish */
export function showFramePop(wish, x, y, cfg) {
  hideFramePop();
  popEl = document.createElement('div');
  popEl.className = 'wish-pop';
  const sideName = wish.side === 'bride' ? cfg.couple.bride.name : cfg.couple.groom.name;
  popEl.innerHTML = `
    <p>${escapeHtml(wish.message || '(a quiet wish, kept private)')}</p>
    <div class="wp-meta">
      <span class="wp-name">${escapeHtml(wish.name)}${wish.country ? ` <i class="wp-stamp">${escapeHtml(wish.country)}</i>` : ''}</span>
      <span class="wp-side">${sideName}'s side${wish.mine ? ' · yours' : ''}</span>
    </div>`;
  document.body.appendChild(popEl);
  const pad = 12;
  popEl.style.left = `${Math.min(innerWidth - 170 - pad, Math.max(170 + pad, x))}px`;
  popEl.style.top = `${Math.max(150, y)}px`;
  gsap.fromTo(popEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' });
  clearTimeout(popTimer);
  popTimer = setTimeout(hideFramePop, 4200);
}

export function hideFramePop() {
  if (!popEl) return;
  const el = popEl;
  popEl = null;
  gsap.to(el, { opacity: 0, y: 8, duration: 0.25, onComplete: () => el.remove() });
}

/**
 * The full guest book, readable: every wish as a card on one scrollable
 * sheet. The gallery wall stays a 12-frame teaser; this is the archive.
 * @param {object} cfg config
 * @param {Array} wishes deduped list (own entries first, `mine` flagged)
 */
export function showAllWishes(cfg, wishes) {
  return new Promise((resolve) => {
    hideFramePop();
    const countries = new Set(wishes.map((w) => w.country).filter(Boolean));
    const el = document.createElement('div');
    el.id = 'allwishes';
    el.innerHTML = `
      <div class="aw-sheet" role="dialog" aria-label="All wishes">
        <button class="aw-close" aria-label="Close">×</button>
        <div class="aw-kicker">The gallery wall, unabridged</div>
        <div class="aw-title">${wishes.length} ${wishes.length === 1 ? 'wish' : 'wishes'}${countries.size > 1 ? ` · ${countries.size} countries` : ''}</div>
        <div class="aw-list">
          ${wishes.map((w) => `
            <div class="aw-card${w.mine ? ' mine' : ''}">
              <p>${escapeHtml(w.message || '(a quiet wish, kept private)')}</p>
              <div class="aw-meta">
                <span class="aw-name">${escapeHtml(w.name)}${w.country ? ` <i class="wp-stamp">${escapeHtml(w.country)}</i>` : ''}</span>
                <span class="aw-side">${w.side === 'bride' ? cfg.couple.bride.name : cfg.couple.groom.name}'s side${w.mine ? ' · yours' : ''}</span>
              </div>
            </div>`).join('')}
        </div>
        <div class="aw-foot">Yours is missing? The guestbook is on the dining table.</div>
      </div>`;
    document.body.appendChild(el);

    const sheet = el.querySelector('.aw-sheet');
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(sheet, { y: 30, scale: 0.97 }, { y: 0, scale: 1, duration: 0.45, ease: 'power3.out' });
    gsap.fromTo(el.querySelectorAll('.aw-card'),
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: { amount: 0.55 },
        ease: 'power2.out', clearProps: 'opacity,transform' });

    const close = () => {
      gsap.to(el, { opacity: 0, duration: 0.25, onComplete: () => el.remove() });
      resolve();
    };
    el.querySelector('.aw-close').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    window.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); window.removeEventListener('keydown', esc); }
    });
  });
}

/** The corkboard → practical details card */
export function showDetails(cfg) {
  return new Promise((resolve) => {
    const d = cfg.details;
    const el = document.createElement('div');
    el.id = 'details';
    el.innerHTML = `
      <div class="det-card" role="dialog" aria-label="The practical details">
        <button class="det-close" aria-label="Close">×</button>
        <div class="det-kicker">${d.kicker}</div>
        <div class="det-date">${cfg.dateDisplay}</div>
        <div class="det-events">
          ${d.events.map((ev) => `
            <div class="det-ev">
              <b>${ev.time}</b>
              <span>${ev.name}</span>
              <i>${ev.place} · ${ev.note}</i>
            </div>`).join('')}
        </div>
        <div class="det-venue">
          <b>${d.venue.name}</b> · ${d.venue.address}<br>
          <a href="${d.venue.mapsUrl}" target="_blank" rel="noopener">Open in maps ↗</a>
        </div>
        <div class="det-note">Please reply before ${d.rsvp.deadline}: the guestbook is on the dining table.</div>
      </div>`;
    document.body.appendChild(el);
    const card = el.querySelector('.det-card');
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(card, { y: 26, rotation: -1.6, scale: 0.96 }, { y: 0, rotation: 0.6, scale: 1, duration: 0.45, ease: 'back.out(1.5)' });
    const close = () => {
      gsap.to(el, { opacity: 0, duration: 0.25, onComplete: () => el.remove() });
      resolve();
    };
    el.querySelector('.det-close').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
  });
}

/**
 * The guestbook writer.
 * @returns {Promise<object|null>} stored entry or null if dismissed
 */
export function openWriter(cfg, prefill = {}) {
  return new Promise((resolve) => {
    let side = prefill.side || 'bride';
    let attending = true;
    let plusOnes = 0;
    let settled = false;

    const overlay = document.createElement('div');
    overlay.id = 'writer';
    overlay.innerHTML = `
      <div class="writer-card" role="dialog" aria-label="Sign the guestbook">
        <button id="writer-close" aria-label="Close">×</button>
        <div class="writer-title">Sign their guestbook</div>
        <div class="writer-sub">Reply before ${cfg.details.rsvp.deadline}: your wish will hang on the wall with the others.</div>
        <div class="rf-grid">
          <div class="rf-row">
            <label class="rf-label" for="rf-name">Your name</label>
            <input id="rf-name" type="text" maxlength="60" placeholder="Who's celebrating with us?" autocomplete="name">
          </div>
          <div class="rf-row rf-half">
            <label class="rf-label" for="rf-country">Writing from <em>(the stamp on your frame)</em></label>
            <input id="rf-country" type="text" maxlength="3" placeholder="ID, DE, …">
          </div>
          <div class="rf-row rf-half">
            <span class="rf-label">You're with</span>
            <div class="rf-pills" id="rf-side">
              <button type="button" data-side="bride">${cfg.couple.bride.name}'s side</button>
              <button type="button" data-side="groom">${cfg.couple.groom.name}'s side</button>
            </div>
          </div>
        </div>
        <div class="rf-row">
          <span class="rf-label">Will you be there?</span>
          <div class="rf-pills" id="rf-attending">
            <button type="button" data-val="yes">Joyfully yes</button>
            <button type="button" data-val="no">Sadly, no</button>
          </div>
        </div>
        <div class="rf-row" id="rf-plus-row">
          <span class="rf-label">Bringing anyone?</span>
          <div class="rf-stepper">
            <button type="button" id="rf-minus" aria-label="Fewer guests">−</button>
            <span id="rf-plus-count">Just me</span>
            <button type="button" id="rf-plus" aria-label="More guests">+</button>
          </div>
        </div>
        <div class="rf-row">
          <label class="rf-label" for="rf-message">Your wish <em>(it goes in the frame)</em></label>
          <textarea id="rf-message" rows="3" maxlength="280" placeholder="Leave them something to read on the morning of the wedding…"></textarea>
        </div>
        <div class="rf-submit-row">
          <button id="rf-submit" type="button">Sign &amp; hang it up</button>
          <p class="rf-submit-note">It joins the wall the moment you let go.</p>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const card = overlay.querySelector('.writer-card');
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo(card, { y: 36, scale: 0.96 }, { y: 0, scale: 1, duration: 0.5, ease: 'power3.out' });

    const nameEl = overlay.querySelector('#rf-name');
    const countryEl = overlay.querySelector('#rf-country');
    const msgEl = overlay.querySelector('#rf-message');
    const sideBtns = [...overlay.querySelectorAll('#rf-side button')];
    const attBtns = [...overlay.querySelectorAll('#rf-attending button')];
    const plusRow = overlay.querySelector('#rf-plus-row');
    const plusCount = overlay.querySelector('#rf-plus-count');

    if (prefill.guestName) nameEl.value = prefill.guestName;

    const syncSide = () => sideBtns.forEach((b) => b.classList.toggle('on', b.dataset.side === side));
    const syncAtt = () => {
      attBtns.forEach((b) => b.classList.toggle('on', (b.dataset.val === 'yes') === attending));
      plusRow.style.display = attending ? '' : 'none';
    };
    const syncPlus = () => {
      plusCount.textContent = plusOnes === 0 ? 'Just me' : `Me + ${plusOnes}`;
    };

    sideBtns.forEach((b) => b.addEventListener('click', () => { side = b.dataset.side; syncSide(); }));
    attBtns.forEach((b) => b.addEventListener('click', () => { attending = b.dataset.val === 'yes'; syncAtt(); }));
    overlay.querySelector('#rf-minus').addEventListener('click', () => { plusOnes = Math.max(0, plusOnes - 1); syncPlus(); });
    overlay.querySelector('#rf-plus').addEventListener('click', () => { plusOnes = Math.min(4, plusOnes + 1); syncPlus(); });
    syncSide(); syncAtt(); syncPlus();

    getOwnRsvp().then((own) => {
      if (!own) return;
      if (!nameEl.value) nameEl.value = own.name;
      if (own.country) countryEl.value = own.country;
      side = own.side; syncSide();
      attending = own.attending; syncAtt();
      plusOnes = own.plusOnes; syncPlus();
      if (own.message) msgEl.value = own.message;
    });

    const close = (entry) => {
      if (settled) return;
      settled = true;
      gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => overlay.remove() });
      resolve(entry);
    };

    overlay.querySelector('#writer-close').addEventListener('click', () => close(null));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });

    overlay.querySelector('#rf-submit').addEventListener('click', async () => {
      const name = nameEl.value.trim();
      if (!name) {
        gsap.fromTo(nameEl, { x: -7 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        nameEl.focus();
        return;
      }
      const entry = await submitRsvp({
        name,
        country: countryEl.value,
        side, attending, plusOnes,
        message: msgEl.value
      });
      await flyToWall(card, entry);
      close(entry);
    });
  });
}

/** the signed page folds into a little frame and flies up onto the wall */
function flyToWall(card, entry) {
  return new Promise((resolve) => {
    const r = card.getBoundingClientRect();
    const mini = document.createElement('div');
    mini.className = 'fly-frame';
    mini.textContent = entry.name.split(' ')[0];
    mini.style.left = `${r.left + r.width / 2 - 44}px`;
    mini.style.top = `${r.top + r.height * 0.3}px`;
    document.body.appendChild(mini);
    gsap.to(card, { y: 16, opacity: 0, duration: 0.45, ease: 'power2.in' });
    gsap.fromTo(mini,
      { opacity: 0, scale: 0.5, rotation: -6 },
      { opacity: 1, scale: 1, rotation: 0, duration: 0.3, ease: 'back.out(2)' });
    gsap.to(mini, {
      y: -innerHeight * 0.45,
      x: () => (Math.random() - 0.5) * 180,
      rotation: () => (Math.random() - 0.5) * 14,
      scale: 0.7,
      duration: 1.3,
      delay: 0.2,
      ease: 'power1.in',
      onComplete: () => { mini.remove(); resolve(); }
    });
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
