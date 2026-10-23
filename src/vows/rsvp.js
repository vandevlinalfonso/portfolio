import { gsap } from 'gsap';
import { submitRsvp, getOwnRsvp } from './store.js';

/**
 * The diegetic RSVP. There is no form section — guests write a letter
 * in an overlay and it literally becomes one of the lanterns in the
 * finale sky. All data still flows through store.js, so swapping the
 * mock backend for a real one never touches this file's caller.
 */

let popEl = null;
let popTimer = 0;

/** Tap a lantern → read the wish where it floats */
export function showWishPop(wish, x, y, cfg) {
  hideWishPop();
  popEl = document.createElement('div');
  popEl.className = 'wish-pop';
  const sideName = wish.side === 'bride' ? cfg.couple.bride.name : cfg.couple.groom.name;
  popEl.innerHTML = `
    <p>${escapeHtml(wish.message || '(a quiet wish, kept private)')}</p>
    <div class="wp-meta">
      <span class="wp-name">${escapeHtml(wish.name)}</span>
      <span class="wp-side">${sideName}'s side${wish.mine ? ' · yours' : ''}</span>
    </div>`;
  document.body.appendChild(popEl);
  const pad = 12;
  const xx = Math.min(innerWidth - 170 - pad, Math.max(170 + pad, x));
  popEl.style.left = `${xx}px`;
  popEl.style.top = `${Math.max(160, y)}px`;
  gsap.fromTo(popEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' });
  clearTimeout(popTimer);
  popTimer = setTimeout(hideWishPop, 4200);
}

export function hideWishPop() {
  if (!popEl) return;
  const el = popEl;
  popEl = null;
  gsap.to(el, { opacity: 0, y: 8, duration: 0.25, onComplete: () => el.remove() });
}

/**
 * Open the letter-writing overlay.
 * @returns {Promise<object|null>} the stored entry, or null if dismissed
 */
export function openWriter(cfg, prefill = {}) {
  return new Promise((resolve) => {
    let side = prefill.side || 'groom';
    let attending = true;
    let plusOnes = 0;
    let settled = false;

    const overlay = document.createElement('div');
    overlay.id = 'writer';
    overlay.innerHTML = `
      <div class="writer-card" role="dialog" aria-label="Write your reply">
        <button id="writer-close" aria-label="Close">×</button>
        <div class="writer-title">Your lantern, your words</div>
        <div class="writer-sub">Reply before ${cfg.rsvp.deadline}: your wish will float in the sky with the others.</div>
        <div class="rf-row">
          <label class="rf-label" for="rf-name">Your name</label>
          <input id="rf-name" type="text" maxlength="60" placeholder="Who's celebrating with us?" autocomplete="name">
        </div>
        <div class="rf-row">
          <span class="rf-label">You're with</span>
          <div class="rf-pills" id="rf-side">
            <button type="button" data-side="groom">${cfg.couple.groom.name}'s side</button>
            <button type="button" data-side="bride">${cfg.couple.bride.name}'s side</button>
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
          <label class="rf-label" for="rf-message">Your wish <em>(it rides the lantern)</em></label>
          <textarea id="rf-message" rows="3" maxlength="280" placeholder="Leave them something to read on the morning of the wedding…"></textarea>
        </div>
        <div class="rf-submit-row">
          <button id="rf-submit" type="button">Light it &amp; let go</button>
          <p class="rf-submit-note">It rises the moment you release it.</p>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const card = overlay.querySelector('.writer-card');
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo(card, { y: 36, scale: 0.96 }, { y: 0, scale: 1, duration: 0.5, ease: 'power3.out' });

    const nameEl = overlay.querySelector('#rf-name');
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

    // returning guests pick up where they left off
    getOwnRsvp().then((own) => {
      if (!own) return;
      if (!nameEl.value) nameEl.value = own.name;
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
      const entry = await submitRsvp({ name, side, attending, plusOnes, message: msgEl.value });
      await launchFromCard(card);
      close(entry);
    });
  });
}

/** The letter releases a small lantern that floats up off-screen */
function launchFromCard(card) {
  return new Promise((resolve) => {
    const r = card.getBoundingClientRect();
    const lan = document.createElement('div');
    lan.className = 'launch-lantern';
    lan.style.left = `${r.left + r.width / 2 - 23}px`;
    lan.style.top = `${r.top + r.height * 0.3}px`;
    document.body.appendChild(lan);
    gsap.to(card, { y: 16, opacity: 0, duration: 0.45, ease: 'power2.in' });
    gsap.fromTo(lan,
      { opacity: 0, scale: 0.4 },
      { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' });
    gsap.to(lan, {
      y: -innerHeight * 0.8,
      x: () => (Math.random() - 0.5) * 120,
      rotation: () => (Math.random() - 0.5) * 14,
      duration: 1.6,
      delay: 0.25,
      ease: 'power1.in',
      onComplete: () => { lan.remove(); resolve(); }
    });
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
