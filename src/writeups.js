import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './styles/base.css';
import './theme/index.js';

import { marked } from 'marked';
import Cursor from './ui/Cursor.js';

/**
 * Writeups index: markdown-driven.
 *
 * Drop a .md file in src/writeups-content/ (copy _template.md), put its
 * screenshots in public/writeups/<slug>/, done. Files starting with "_"
 * are ignored. No manifest to maintain.
 */

const BOOT_LINES = [
  'OPENING EVIDENCE LOCKER ........... <span class="ok">OK</span>',
  'PARSING FIELD NOTES ............... <span class="ok">OK</span>',
  'INDEX READY'
];

const modules = import.meta.glob('./writeups-content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
});

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { meta: {}, body: raw };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase();
      let value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      meta[key] = value;
    }
  }
  return { meta, body: raw.slice(match[0].length) };
}

function dateValue(s) {
  const t = Date.parse(s || '');
  return Number.isNaN(t) ? 0 : t;
}

function loadWriteups() {
  const list = [];

  for (const [path, raw] of Object.entries(modules)) {
    const file = path.split('/').pop();
    if (file.startsWith('_')) continue;

    const slug = file.replace(/\.md$/, '');
    const { meta, body } = parseFrontmatter(raw);

    list.push({
      slug,
      name: meta.name || slug,
      platform: (meta.platform || 'CTF').toUpperCase(),
      os: meta.os || '··',
      difficulty: (meta.difficulty || 'medium').toLowerCase(),
      date: meta.date || '',
      tags: (meta.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      status: meta.status || '',
      body
    });
  }

  list.sort((a, b) => dateValue(b.date) - dateValue(a.date));
  return list;
}

class WriteupsApp {
  constructor() {
    this.writeups = loadWriteups();
    this.filter = 'ALL';

    this.listEl = document.getElementById('wu-list');
    this.filtersEl = document.getElementById('wu-filters');
    this.metaEl = document.getElementById('art-meta');
    this.bodyEl = document.getElementById('art-body');

    this.configureMarked();
    this.cursor = new Cursor();

    this.renderFilters();
    this.renderList();
    this.bindRouting();
    this.runBoot();

    document.getElementById('wu-back').addEventListener('click', () => {
      window.location.hash = '';
    });
    this.setupLightbox();

    // The locker is intentionally empty — greet visitors in-character.
    if (this.writeups.length === 0) {
      this.filtersEl.style.display = 'none';
      this.buildPurgeModal();
      setTimeout(() => this.showPurge(), 850);
    }
  }

  buildPurgeModal() {
    const scrim = document.createElement('div');
    scrim.id = 'purge-scrim';
    scrim.innerHTML = `
      <div id="purge-modal" role="dialog" aria-modal="true" aria-labelledby="pm-title">
        <div class="pm-stamp" aria-hidden="true">REDACTED</div>
        <div class="pm-tag">
          <span>Notice</span>
          <span class="pm-code">ERR 0x1A · LOCKER EMPTY</span>
        </div>
        <h2 class="pm-title" id="pm-title">The writeups are gone.</h2>
        <div class="pm-body">
          <p>You came looking for the field notes. They were here. I pulled them.</p>
          <p>Turns out a step-by-step of how I walked into someone's box is a lovely gift for the next person who tries it. So the methodology stays in my head, the specifics stay under NDA, and the good war stories I'll tell you over coffee.</p>
          <p>Nothing was lost. It's just filed somewhere you can't <code>cat</code>.</p>
        </div>
        <div class="pm-sign">signed // V</div>
        <div class="pm-actions">
          <a class="pm-cta" href="../cv/">Read the dossier instead →</a>
          <button class="pm-dismiss" id="pm-dismiss" type="button">Poke around anyway</button>
        </div>
      </div>`;
    document.body.appendChild(scrim);
    this.purgeScrim = scrim;

    scrim.querySelector('#pm-dismiss').addEventListener('click', () => this.hidePurge());
    scrim.addEventListener('click', (e) => { if (e.target === scrim) this.hidePurge(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hidePurge(); });
  }

  showPurge() { this.purgeScrim?.classList.add('open'); }
  hidePurge() { this.purgeScrim?.classList.remove('open'); }

  configureMarked() {
    marked.setOptions({ breaks: false, gfm: true });
  }

  /**
   * Resolve bare image filenames to public/writeups/<slug>/ and wrap each
   * in a forensic <figure> with an EXHIBIT caption from its alt text.
   * Done on the DOM so it is independent of the marked renderer API.
   */
  enhanceImages() {
    this.bodyEl.querySelectorAll('img').forEach((img) => {
      const raw = img.getAttribute('src') || '';
      if (!/^https?:|^\//.test(raw)) {
        img.setAttribute('src', `./${this.currentSlug}/${raw.replace(/^\.?\//, '')}`);
      }
      img.loading = 'lazy';

      if (img.parentElement.tagName !== 'FIGURE') {
        const figure = document.createElement('figure');
        img.replaceWith(figure);
        figure.appendChild(img);
        const cap = img.getAttribute('alt');
        if (cap) {
          const fc = document.createElement('figcaption');
          fc.textContent = cap;
          figure.appendChild(fc);
        }
      }
    });
  }

  runBoot() {
    const log = document.getElementById('boot-log');
    const fill = document.getElementById('boot-progress-fill');
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => {
        const el = document.createElement('div');
        el.innerHTML = line;
        log.appendChild(el);
        fill.style.width = `${((i + 1) / BOOT_LINES.length) * 100}%`;
        if (i === BOOT_LINES.length - 1) {
          setTimeout(() => document.getElementById('loading-screen').classList.add('hidden'), 250);
        }
      }, 160 * (i + 1));
    });
  }

  renderFilters() {
    const platforms = ['ALL', ...new Set(this.writeups.map((w) => w.platform))];
    this.filtersEl.innerHTML = '';

    platforms.forEach((p) => {
      const btn = document.createElement('button');
      btn.textContent = p === 'ALL' ? `All (${this.writeups.length})` : p;
      btn.classList.toggle('active', p === this.filter);
      btn.addEventListener('click', () => {
        this.filter = p;
        this.renderFilters();
        this.renderList();
      });
      this.filtersEl.appendChild(btn);
    });
  }

  renderList() {
    const items = this.filter === 'ALL'
      ? this.writeups
      : this.writeups.filter((w) => w.platform === this.filter);

    this.listEl.innerHTML = '';

    if (items.length === 0) {
      if (this.writeups.length === 0) {
        const locker = document.createElement('div');
        locker.className = 'wu-locker';
        locker.innerHTML = `
          <div class="wl-bars" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
          <div class="wl-line">EVIDENCE LOCKER · SEALED</div>
          <p class="wl-note">Records pulled for confidentiality. The index is empty by choice, not by accident.</p>
          <button class="wl-reopen" id="wl-reopen" type="button">Read the notice</button>`;
        this.listEl.appendChild(locker);
        locker.querySelector('#wl-reopen').addEventListener('click', () => this.showPurge());
      } else {
        const empty = document.createElement('div');
        empty.className = 'wu-empty';
        empty.textContent = 'No writeups under this filter.';
        this.listEl.appendChild(empty);
      }
      return;
    }

    items.forEach((w, i) => {
      const row = document.createElement('button');
      row.className = 'wu-row';
      row.innerHTML = `
        <span class="wu-idx">${String(i + 1).padStart(3, '0')}</span>
        <span class="wu-name">${w.name}</span>
        <span class="wu-meta-cell os">${w.os}</span>
        <span class="wu-diff" data-d="${w.difficulty}">${w.difficulty}</span>
        <span class="wu-meta-cell date">${w.date}</span>
        <span class="wu-arrow">→</span>
      `;
      row.addEventListener('click', () => { window.location.hash = w.slug; });
      this.listEl.appendChild(row);
    });
  }

  bindRouting() {
    window.addEventListener('hashchange', () => this.route());
    this.route();
  }

  route() {
    const slug = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    const writeup = this.writeups.find((w) => w.slug === slug);

    if (writeup) {
      this.openArticle(writeup);
    } else {
      document.body.classList.remove('article-mode');
      window.scrollTo(0, 0);
    }
  }

  openArticle(w) {
    this.currentSlug = w.slug;
    const tags = w.tags.map((t) => `<span><b>#</b>${t}</span>`).join('');
    this.metaEl.innerHTML = `
      <span class="pill-platform">${w.platform}</span>
      <span><b>OS</b>${w.os}</span>
      <span><b>Difficulty</b>${w.difficulty.toUpperCase()}</span>
      ${w.date ? `<span><b>Date</b>${w.date}</span>` : ''}
      ${w.status ? `<span><b>Status</b>${w.status.toUpperCase()}</span>` : ''}
      ${tags}
    `;

    this.bodyEl.innerHTML = marked.parse(w.body);
    this.enhanceImages();
    this.enhanceCodeBlocks();

    document.body.classList.add('article-mode');
    window.scrollTo(0, 0);
  }

  enhanceCodeBlocks() {
    this.bodyEl.querySelectorAll('pre').forEach((pre) => {
      const btn = document.createElement('button');
      btn.className = 'code-copy';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code');
        navigator.clipboard?.writeText(code ? code.innerText : pre.innerText);
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
      pre.appendChild(btn);
    });
  }

  setupLightbox() {
    const lb = document.getElementById('lightbox');
    const lbImg = lb.querySelector('img');

    this.bodyEl.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG') {
        lbImg.src = e.target.src;
        lb.classList.add('open');
      }
    });
    lb.addEventListener('click', () => lb.classList.remove('open'));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') lb.classList.remove('open');
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new WriteupsApp());
} else {
  new WriteupsApp();
}
