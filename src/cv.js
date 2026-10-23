import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './styles/base.css';
import './theme/index.js';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Cursor from './ui/Cursor.js';
import TextScramble from './ui/TextScramble.js';
import { quality, isWebGLAvailable } from './utils/Quality.js';
import Field from './cv/field.js';
import Portrait from './cv/portrait.js';

gsap.registerPlugin(ScrollTrigger);

// This page lives at <deploy-base>/cv/, so root-relative assets resolve via '../'.
// (import.meta.env.BASE_URL is './', which would wrongly resolve to /cv/data from here.)
const ROOT = '../';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- render helpers ---------------- */

function fillIdentity(cv) {
  const id = cv.identity;
  document.getElementById('id-name').textContent = id.name;
  document.getElementById('frame-name').textContent = id.name;
  document.getElementById('id-role').textContent = id.role;
  document.getElementById('id-disc').textContent = id.discipline;
  document.getElementById('print-portrait').src = `${ROOT}${id.portrait}`;
  document.getElementById('print-portrait-light').src = `${ROOT}${id.portrait}`;

  document.getElementById('id-meta').innerHTML = [
    `Based · ${esc(id.location)}`,
    `Clearance · ${esc(id.clearance)}`
  ].map((t) => `<span>${t}</span>`).join('');

  const years = new Date().getFullYear() - id.since;
  document.getElementById('id-stats').innerHTML = `
    <div><div class="n">${String(years).padStart(2, '0')}</div><div class="k">Years Active</div></div>
    <div><div class="n">${String(cv.certifications.length).padStart(2, '0')}</div><div class="k">Certifications</div></div>`;

  document.getElementById('id-clearance').innerHTML =
    cv.certifications.map((c) => `<span>${esc(c.code)}</span>`).join('');

  document.getElementById('id-contact').innerHTML = `
    <a href="mailto:${esc(cv.contact.email)}"><span class="ck">Email</span>${esc(cv.contact.email)}</a>
    <a href="${esc(cv.contact.linkedin)}" target="_blank" rel="noopener"><span class="ck">LinkedIn</span>${esc(cv.contact.linkedinLabel)}</a>`;

  // telemetry
  document.getElementById('t-clear').textContent = id.clearance.split(' ')[0];
  document.getElementById('t-years').textContent = `${years}Y`;
}

function block(n, label, inner) {
  return `
    <section class="rec-block" data-reveal>
      <div class="sec-label">${n} / ${label}</div>
      ${inner}
    </section>`;
}

function renderRecord(cv) {
  const host = document.getElementById('cv-record');
  const parts = [];

  parts.push(block('01', 'Profile', `<p class="lede">${esc(cv.profile)}</p>`));

  parts.push(block('02', 'Service Record', `
    <div class="roles">
      ${cv.experience.map((r) => `
        <div class="role" data-cursor>
          <div class="period">${esc(r.period)}</div>
          <div class="org">${esc(r.org)}</div>
          <div class="title">${esc(r.title)}</div>
          <ul>${r.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        </div>`).join('')}
    </div>`));

  parts.push(block('03', 'Clearances', `
    <div class="certs">
      ${cv.certifications.map((c) => {
        const ref = c.url
          ? `<a class="cref" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.ref)} ↗</a>`
          : `<span class="cref">${esc(c.ref)}</span>`;
        return `
          <div class="cert" data-cursor>
            <div class="code">${esc(c.code)}</div>
            <div><div class="cname">${esc(c.name)}</div><div class="cissuer">${esc(c.issuer)}</div></div>
            ${ref}
          </div>`;
      }).join('')}
    </div>`));

  parts.push(block('04', 'Capabilities', `
    <div class="skill-grid">
      ${cv.skills.map((g) => `
        <div class="skill-grp">
          <div class="gk">${esc(g.group)}</div>
          <div class="chips">${g.items.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
        </div>`).join('')}
    </div>`));

  const miniList = (rows) => `<div>${rows.join('')}</div>`;
  const eduRows = cv.education.map((e) =>
    `<div class="mini-row"><div><div class="mt">${esc(e.org)}</div><div class="ms">${esc(e.title)}</div></div><div class="mr">${esc(e.period)}</div></div>`);
  const langRows = cv.languages.map((l) =>
    `<div class="mini-row"><div class="mt">${esc(l.name)}</div><div class="mr">${esc(l.level)}</div></div>`);
  const recRows = (cv.highlights || []).map((h) =>
    `<div class="mini-row"><div><div class="mt">${esc(h.label)}</div><div class="ms">${esc(h.text)}</div></div></div>`);

  parts.push(block('05', 'Record', `
    <div class="two-up">
      <div class="skill-grp"><div class="gk">Education</div>${miniList(eduRows)}</div>
      <div class="skill-grp"><div class="gk">Languages</div>${miniList(langRows)}</div>
      ${recRows.length ? `<div class="skill-grp"><div class="gk">Recognition</div>${miniList(recRows)}</div>` : ''}
    </div>`));

  host.innerHTML = parts.join('');

  const now = new Date();
  const stamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const footer = document.createElement('div');
  footer.className = 'doc-footer';
  footer.innerHTML = `<span>End of file · Personnel 0002</span><span>Compiled ${stamp}</span>`;
  host.appendChild(footer); // inside the record column so it never overlaps the sticky aside
}

/* ---------------- boot sequence ---------------- */

function boot(lines, done) {
  const log = document.getElementById('boot-log');
  const fill = document.getElementById('boot-progress-fill');
  let i = 0;
  const tick = () => {
    if (i < lines.length) {
      const div = document.createElement('div');
      div.innerHTML = lines[i].replace('ok', '<span class="ok">ok</span>');
      log.appendChild(div);
      fill.style.width = `${Math.round(((i + 1) / lines.length) * 100)}%`;
      i++;
      setTimeout(tick, 190 + Math.random() * 120);
    } else {
      setTimeout(done, 340);
    }
  };
  tick();
}

/* ---------------- reveals ---------------- */

function wireReveals() {
  if (quality.reducedMotion) return;
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 34, opacity: 0, duration: 1.05, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });
}

/* ---------------- main ---------------- */

async function start() {
  const cv = await fetch(`${ROOT}data/cv.json`).then((r) => r.json()).catch(() => null);
  if (!cv) {
    boot([
      '&gt; mount /personnel/0002 … <span class="err">fail</span>',
      '&gt; record unavailable · aborting'
    ], () => {
      document.getElementById('loading-screen').classList.add('hidden');
      const fallback = document.getElementById('webgl-fallback');
      fallback.querySelector('.inner').innerHTML =
        '<h1>Record Unavailable</h1><p>The personnel file could not be retrieved. <a href="../">Return home</a>.</p>';
      fallback.classList.add('visible');
    });
    return;
  }

  fillIdentity(cv);
  renderRecord(cv);

  new Cursor();
  const field = new Field(document.getElementById('field-host'), quality);
  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };

  let portrait = null;
  const canvas = document.getElementById('portrait-canvas');
  if (isWebGLAvailable()) {
    portrait = new Portrait(canvas, quality, `${ROOT}${cv.identity.portrait}`);
  } else {
    canvas.style.display = 'none';
    const img = document.getElementById('print-portrait');
    img.style.display = 'block';
    img.style.width = img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.filter = 'grayscale(0.2) contrast(1.05)';
  }

  window.addEventListener('mousemove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    portrait?.setPointer(e.clientX, e.clientY);
  }, { passive: true });
  window.addEventListener('resize', () => { field.resize(); portrait?.resize(); ScrollTrigger.refresh(); });

  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    field.update(dt, t, pointer);
    portrait?.update(dt, t);
  })(last);

  // PDF export — dark (matches the screen) or light ("paper")
  const downloadPDF = (mode) => {
    if (portrait) { try { document.getElementById('print-portrait').src = portrait.captureDataURL(); } catch (e) { /* keep raw */ } }
    const cls = mode === 'light' ? 'pdf-light' : 'pdf-dark';
    document.documentElement.classList.add(cls);
    const cleanup = () => {
      document.documentElement.classList.remove('pdf-light', 'pdf-dark');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1200);
  };
  document.getElementById('dl-dark').addEventListener('click', () => downloadPDF('dark'));
  document.getElementById('dl-light').addEventListener('click', () => downloadPDF('light'));
  document.getElementById('fallback-download')?.addEventListener('click', (e) => { e.preventDefault(); downloadPDF('light'); });
  window.addEventListener('beforeprint', () => {
    gsap.set('[data-reveal]', { clearProps: 'all' });
    ScrollTrigger.getAll().forEach((s) => s.kill(false));
    if (portrait) { try { document.getElementById('print-portrait').src = portrait.captureDataURL(); } catch (e) { /* noop */ } }
  });

  boot([
    '&gt; mount /personnel/0002 … ok',
    '&gt; decrypt identity.key … ok',
    '&gt; verify clearances OSCP+ · eWPTX · eMAPT … ok',
    '&gt; compositing portrait … ok',
    '&gt; record ready'
  ], () => {
    document.getElementById('loading-screen').classList.add('hidden');
    const doc = document.getElementById('cv-doc');
    doc.hidden = false;
    ScrollTrigger.refresh();
    wireReveals();
    portrait?.reveal();
    // once the portrait has resolved, snapshot the keyed duotone into the
    // print-only <img> so the PDF shows the same treated portrait as the screen
    if (portrait) {
      setTimeout(() => {
        try { document.getElementById('print-portrait').src = portrait.captureDataURL(); } catch (e) { /* keep raw photo */ }
      }, 2200);
    }
    // scramble the name in on reveal
    const nameEl = document.getElementById('id-name');
    const scr = new TextScramble(nameEl);
    scr.setText(cv.identity.name);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
