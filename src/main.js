import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './styles/base.css';
import Theme from './theme/index.js';

import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import SCENES from './scenes/index.js';
import PostProcessing from './systems/PostProcessing.js';
import AdaptiveResolution from './systems/AdaptiveResolution.js';
import AudioManager from './systems/AudioManager.js';
import DecaySystem from './systems/DecaySystem.js';
import Cursor from './ui/Cursor.js';
import Telemetry from './ui/Telemetry.js';
import TextScramble from './ui/TextScramble.js';
import AppState from './state/AppState.js';
import LensManager from './lenses/index.js';
import { quality, isWebGLAvailable } from './utils/Quality.js';

gsap.registerPlugin(ScrollTrigger);

class PortfolioApp {
  constructor() {
    this.lens = LensManager.active;
    this.renderer = null;
    this.camera = null;
    this.scene = null;
    this.post = null;
    this.audioManager = null;
    this.decaySystem = null;
    this.cursor = null;
    this.telemetry = null;
    this.panelTitleScramble = null;

    this.clock = new THREE.Clock();
    this.isRunning = false;

    this.smoothedScroll = 0;
    this.lastRawScroll = 0;
    this.scrollVelocity = 0;
    this.mouse = new THREE.Vector2();
    this.currentSection = -1;
    this.hiddenAt = 0;

    this.sections = [];
    this.projects = [];

    this.init();
  }

  async init() {
    // Paint the active lens's copy over the (DevSecOps-default) static DOM
    LensManager.applyCopy(this.lens);
    this.applyLensChrome();
    this.setupLensSwitch();
    // Before the WebGL check: the no-WebGL fallback carries contact links too
    this.contacts = this.loadIdentity();

    if (!isWebGLAvailable()) {
      document.getElementById('loading-screen')?.classList.add('hidden');
      document.getElementById('webgl-fallback')?.classList.add('visible');
      return;
    }

    const bootPromise = this.runBootSequence();

    // Each lens owns its scene; the registry maps lens.scene → class.
    // Resolved before the renderer so the scene's render profile (e.g.
    // the loom's internal-resolution cap) can shape the renderer.
    this.SceneClass = SCENES[this.lens.scene] || SCENES.specimen;

    this.setupRenderer();
    this.setupCamera();

    this.decaySystem = new DecaySystem();
    this.audioManager = new AudioManager();
    this.cursor = new Cursor();
    this.telemetry = new Telemetry();

    this.scene = new this.SceneClass(this.camera, this.lens);

    if (quality.postProcessing) {
      this.post = new PostProcessing(this.renderer, this.camera);
    }

    // Downward-only resolution governor: only scenes whose profile opts in
    const adaptive = this.SceneClass.renderProfile?.adaptive;
    if (adaptive && this.post) {
      this.adaptiveRes = new AdaptiveResolution(
        this.renderer, this.post, this.basePixelRatio, adaptive);
    }

    // Scenes can request a glitch tick on impactful moments (e.g. a snip)
    this.scene.onImpact = (strength) => this.post?.triggerGlitch(strength);

    // Content
    await this.loadContent();
    this.restoreScars();

    // UI
    this.sections = Array.from(document.querySelectorAll('main section'));
    this.buildSectionNav();
    this.setupReveals();
    this.setupPanel();
    this.setupUI();
    this.refreshSectionAnchors();

    // Mouse for parallax
    window.addEventListener('mousemove', (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      AppState.recordInteraction();
    }, { passive: true });

    window.addEventListener('scroll', () => AppState.recordInteraction(), { passive: true });

    this._onResize = this.onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this.setupVisibilityHandling();

    await bootPromise;
    this.hideLoadingScreen();

    // Dev-only handle for debugging/inspection from the console
    if (import.meta.env.DEV) window.__app = this;

    this.isRunning = true;
    this.animate();
  }

  /* ---------------- Boot / loading ---------------- */

  runBootSequence() {
    const log = document.getElementById('boot-log');
    const fill = document.getElementById('boot-progress-fill');
    if (!log || !fill) return Promise.resolve();

    const bootLines = this.lens.bootLines;
    const stepMs = quality.reducedMotion ? 60 : 200;

    return new Promise((resolve) => {
      bootLines.forEach((line, index) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.innerHTML = line;
          log.appendChild(el);
          fill.style.width = `${((index + 1) / bootLines.length) * 100}%`;
          if (index === bootLines.length - 1) {
            setTimeout(resolve, 350);
          }
        }, stepMs * (index + 1));
      });
    });
  }

  /**
   * Lens-specific chrome that isn't a plain [data-lens-copy] element.
   * Accent colors are already applied site-wide by src/theme.
   */
  applyLensChrome() {
    const header = document.querySelector('.boot-header');
    if (header) header.textContent = this.lens.bootHeader;

    const fallbackTitle = document.querySelector('#webgl-fallback h1');
    if (fallbackTitle && this.lens.copy.fallbackTitle) {
      fallbackTitle.textContent = this.lens.copy.fallbackTitle;
    }
    document.title = this._baseTitle();
  }

  _baseTitle() {
    const title = this.lens.copy.heroTitle.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return `${this.lens.label} · ${title}`;
  }

  /**
   * Easter egg: type a lens codename anywhere to switch lenses (src/theme
   * listens on every page). The Breach design is unlocked this way (type
   * "breach"); "harden" returns to DevSecOps. Home's scene is bound to its
   * lens, so here a switch — typed, or made in another tab — reloads.
   */
  setupLensSwitch() {
    Theme.setSwitchHandler((id) => this.switchLens(id));
  }

  switchLens(id) {
    LensManager.setActive(id);
    this.telemetry?.flash('RECONFIGURING LENS', 3);
    this.post?.triggerGlitch(0.7);
    this.audioManager?.glitchBurst?.();

    // Fade to black over the glitch, then reload into the new lens
    const veil = document.createElement('div');
    veil.style.cssText =
      'position:fixed;inset:0;z-index:9999;background:#050506;opacity:0;' +
      'transition:opacity 0.55s ease;pointer-events:none';
    document.body.appendChild(veil);
    requestAnimationFrame(() => { veil.style.opacity = '1'; });
    AppState.save();
    setTimeout(() => window.location.reload(), 620);
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      setTimeout(() => loadingScreen.classList.add('hidden'), 250);
    }
  }

  /* ---------------- Renderer / camera ---------------- */

  setupRenderer() {
    const container = document.getElementById('canvas-container');

    this.renderer = new THREE.WebGLRenderer({
      // With the composer, every visible pixel comes from render targets —
      // default-framebuffer MSAA would antialias nothing at double the
      // backbuffer memory. Direct-render (low tier) keeps it.
      antialias: !quality.postProcessing,
      alpha: false,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // The scene's render profile may cap the internal resolution below the
    // global ceiling (ray-marched scenes pay per pixel). The composer,
    // constructed after this, inherits the ratio automatically.
    const profile = this.SceneClass.renderProfile;
    this.basePixelRatio = Math.min(
      window.devicePixelRatio,
      profile?.maxPixelRatio ?? quality.maxPixelRatio
    );
    this.renderer.setPixelRatio(this.basePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    container.appendChild(this.renderer.domElement);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
  }

  /* ---------------- Content rendering ---------------- */

  /**
   * Name + contact links come from the dossier's cv.json (single source of
   * truth); the static HTML carries the same values for no-JS visitors.
   * Resolves to { email, linkedin } hrefs, or {} if the record is missing.
   */
  loadIdentity() {
    return fetch(`${import.meta.env.BASE_URL}data/cv.json`)
      .then((r) => r.json())
      .then((cv) => {
        const links = { email: `mailto:${cv.contact.email}`, linkedin: cv.contact.linkedin };
        document.querySelectorAll('[data-contact]').forEach((a) => {
          if (links[a.dataset.contact]) a.href = links[a.dataset.contact];
        });
        const name = document.getElementById('portfolio-name');
        if (name && cv.identity?.name) name.textContent = `Engineer: ${cv.identity.name}`;
        return links;
      })
      .catch(() => ({}));
  }

  async loadContent() {
    const base = import.meta.env.BASE_URL;
    const [projects, philosophy, socials, contacts] = await Promise.all([
      fetch(`${base}data/projects.json`).then((r) => r.json()).catch(() => []),
      fetch(`${base}data/philosophy.json`).then((r) => r.json()).catch(() => []),
      fetch(`${base}data/socials.json`).then((r) => r.json()).catch(() => []),
      this.contacts
    ]);

    this.projects = projects;
    AppState.totalWounds = projects.length;

    this.renderCaseRows(projects);
    this.renderQuotes(philosophy);
    this.renderSocials(socials, contacts);
  }

  renderCaseRows(projects) {
    const list = document.getElementById('case-list');
    if (!list) return;

    projects.forEach((project, index) => {
      const row = document.createElement('button');
      row.className = 'case-row';
      row.dataset.index = index;
      row.dataset.reveal = '';
      if (AppState.hasVisitedWound(project.id)) row.classList.add('examined');

      row.innerHTML = `
        <span class="c-idx">${String(index + 1).padStart(3, '0')}</span>
        <span class="c-title">${project.title}</span>
        <span class="c-class">${project.type || ''}</span>
        <span class="c-year">${project.year || ''}</span>
        <span class="c-arrow">→</span>
      `;

      row.addEventListener('mouseenter', () => {
        this.scene.setHighlight(index, true);
        this.audioManager?.hoverTick();
      });
      row.addEventListener('mouseleave', () => {
        this.scene.setHighlight(index, false);
      });
      row.addEventListener('click', () => this.openCase(index));

      list.appendChild(row);
    });
  }

  renderQuotes(quotes) {
    const list = document.getElementById('quote-list');
    if (!list) return;

    quotes.forEach((quote, index) => {
      const el = document.createElement('blockquote');
      el.className = 'quote';
      el.dataset.reveal = '';
      el.innerHTML = `
        <span class="q-idx">0${index + 1}</span>
        <span>${quote.text}</span>
      `;
      list.appendChild(el);
    });
  }

  renderSocials(socials, contacts = {}) {
    const list = document.getElementById('socials');
    if (!list) return;

    socials.forEach((social) => {
      const a = document.createElement('a');
      a.href = contacts[social.id] || social.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = social.label || social.id;
      list.appendChild(a);
    });
  }

  restoreScars() {
    this.projects.forEach((project, index) => {
      if (AppState.hasVisitedWound(project.id)) {
        this.scene.setMark(index, true);
      }
    });
  }

  /* ---------------- Case panel ---------------- */

  setupPanel() {
    document.getElementById('panel-close')?.addEventListener('click', () => this.closeCase());
    document.getElementById('panel-scrim')?.addEventListener('click', () => this.closeCase());
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.closeCase();
    });
  }

  openCase(index) {
    const project = this.projects[index];
    if (!project) return;

    const meta = document.getElementById('panel-meta');
    if (meta) {
      meta.textContent = `Case ${project.id.toUpperCase()} // Class: ${(project.type || 'unknown').toUpperCase()}${project.year ? ` // ${project.year}` : ''}`;
    }

    const titleEl = document.getElementById('panel-title');
    if (!this.panelTitleScramble) this.panelTitleScramble = new TextScramble(titleEl);
    this.panelTitleScramble.setText(project.title);

    document.getElementById('panel-context').textContent = project.context;
    document.getElementById('panel-threat').textContent = project.threat;
    document.getElementById('panel-action').textContent = project.action;
    document.getElementById('panel-tradeoff').textContent = project.tradeoff;

    document.body.classList.add('panel-open');

    // Examination leaves a permanent mark
    AppState.markWoundVisited(project.id, { examined: true });
    this.scene.setMark(index);
    document.querySelector(`.case-row[data-index="${index}"]`)?.classList.add('examined');

    this.audioManager?.click();
    this.post?.triggerGlitch(0.45);
  }

  closeCase() {
    document.body.classList.remove('panel-open');
  }

  /* ---------------- Sections / nav / reveals ---------------- */

  buildSectionNav() {
    const nav = document.getElementById('section-nav');
    if (!nav) return;

    this.sections.forEach((section, index) => {
      const button = document.createElement('button');
      button.innerHTML = `
        <span class="nav-label">${section.dataset.name || ''}</span>
        <span>0${index}</span>
      `;
      button.addEventListener('click', () => {
        section.scrollIntoView({ behavior: quality.reducedMotion ? 'auto' : 'smooth' });
      });
      nav.appendChild(button);
    });

    this.navButtons = Array.from(nav.children);
  }

  setupReveals() {
    if (quality.reducedMotion) return;

    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        y: 34,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true
        }
      });
    });
  }

  refreshSectionAnchors() {
    const vh = window.innerHeight;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);

    const anchors = this.sections.map((section) => {
      const center = section.offsetTop + section.offsetHeight / 2 - vh / 2;
      return Math.min(1, Math.max(0, center / maxScroll));
    });

    this.scene.setSectionAnchors(anchors);
  }

  updateCurrentSection() {
    const probe = window.scrollY + window.innerHeight * 0.5;
    let current = 0;

    for (let i = 0; i < this.sections.length; i++) {
      if (probe >= this.sections[i].offsetTop) current = i;
    }

    if (current !== this.currentSection) {
      this.currentSection = current;
      this.post?.setSection(current);
      this.post?.triggerGlitch(0.5);
      this.audioManager?.setSection(current);
      this.audioManager?.glitchBurst();

      this.navButtons?.forEach((button, index) => {
        button.classList.toggle('active', index === current);
      });

      // Closing the file: report the damage done
      if (current === this.sections.length - 1) {
        const footer = document.getElementById('footer-decay');
        if (footer) {
          const pct = (AppState.getDecayLevel() * 100).toFixed(1);
          footer.textContent = this.lens.footerClose(
            pct,
            AppState.visitedWounds.size,
            AppState.totalWounds
          );
        }
      }
    }
  }

  /* ---------------- Misc UI ---------------- */

  setupUI() {
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', async () => {
        const enable = !soundToggle.classList.contains('on');
        soundToggle.classList.toggle('on', enable);
        soundToggle.textContent = enable ? 'Sound: On' : 'Sound: Off';
        await this.audioManager.setMuted(!enable);
        if (enable) this.audioManager.setSection(Math.max(0, this.currentSection));
      });
      this.magnetize(soundToggle);
    }

    if (this.lens.flashReturn && AppState.decayedWhileAway > 0.002) {
      this.telemetry?.flash(this.lens.flashReturn, 6);
    }

    console.log(
      `%c${this.lens.console.title}`,
      `color:${this.lens.theme.accent}; font-family:monospace; font-size:13px; font-weight:bold;`
    );
    console.log(
      `%c${this.lens.console.body}`,
      'color:#8a8a8a; font-family:monospace; font-size:11px;'
    );
  }

  magnetize(el, range = 80, strength = 0.35) {
    if (quality.reducedMotion || quality.isMobile) return;

    window.addEventListener('mousemove', (event) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < range) {
        const pull = 1 - dist / range;
        el.style.transform = `translate(${dx * pull * strength}px, ${dy * pull * strength}px)`;
      } else if (el.style.transform) {
        el.style.transform = '';
      }
    }, { passive: true });
  }

  setupVisibilityHandling() {
    this._onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        AppState.save();
        this.hiddenAt = performance.now();
        this._savedTitle = document.title;
        document.title = this.lens.titleAway;
      } else {
        document.title = this._savedTitle || this._baseTitle();
        // post-resume hitch frames must not trigger a resolution rung
        this.adaptiveRes?.reset();
        // Only lenses whose scalar rots while unattended take a penalty
        if (this.hiddenAt && this.lens.persistScalar.decayWhileAway) {
          const secondsAway = (performance.now() - this.hiddenAt) / 1000;
          const penalty = Math.min(0.02, secondsAway * 0.0002);
          if (penalty > 0.0005) {
            this.decaySystem.forceDecay(penalty);
            if (this.lens.flashAway) this.telemetry?.flash(this.lens.flashAway);
            this.post?.triggerGlitch(0.5);
          }
        }
        this.hiddenAt = 0;
      }
    };
    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener('beforeunload', () => AppState.save());
  }

  /* ---------------- Frame loop ---------------- */

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.post?.resize(width, height);
    this.refreshSectionAnchors();
  }

  animate() {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate.bind(this));

    // clamp: a background tab or GC hitch must not become a physics jump
    const deltaTime = Math.min(this.clock.getDelta(), 0.05);

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const rawProgress = Math.min(1, window.scrollY / maxScroll);
    this.smoothedScroll += (rawProgress - this.smoothedScroll) * 0.08;

    if (deltaTime > 0) {
      const instVelocity = Math.abs(rawProgress - this.lastRawScroll) / deltaTime;
      this.scrollVelocity += (Math.min(1, instVelocity * 2.5) - this.scrollVelocity) * 0.1;
    }
    this.lastRawScroll = rawProgress;
    this.post?.setScrollVelocity(this.scrollVelocity);
    this.audioManager?.setScrollVelocity(this.scrollVelocity);
    this.scene.setAgitation(this.scrollVelocity);

    this.updateCurrentSection();

    this.decaySystem.update(deltaTime);
    this.scene.update(deltaTime, this.smoothedScroll, this.mouse);
    this.telemetry?.update(deltaTime);

    if (this.post) {
      this.post.render(deltaTime, this.scene.getScene());
    } else {
      this.renderer.render(this.scene.getScene(), this.camera);
    }

    this.adaptiveRes?.update(deltaTime);
  }

  dispose() {
    this.isRunning = false;
    AppState.save();
    this.scene?.dispose();
    this.post?.dispose();
    this.cursor?.dispose();
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibility);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PortfolioApp();
  });
} else {
  new PortfolioApp();
}
