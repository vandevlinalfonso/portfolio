import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './styles/base.css';
import './theme/index.js';

import * as THREE from 'three';

import Cursor from './ui/Cursor.js';
import PostProcessing from './systems/PostProcessing.js';
import AudioManager from './systems/AudioManager.js';
import { quality, isWebGLAvailable } from './utils/Quality.js';

import ArtPanel from './scenes/exhibits/ArtPanel.js';
import { makeDust, makeBokeh } from './scenes/exhibits/common.js';

const FOV = 45;

const BOOT_LINES = [
  'CALIBRATING GALLERY OPTICS ........ <span class="ok">OK</span>',
  'MOUNTING PLATES ................... <span class="ok">OK</span>',
  'DOORS OPEN'
];

const EXHIBIT_DATA = [
  {
    file: '1.jpeg',
    no: 'Plate I',
    title: 'Temptation',
    desc: 'The fall caught mid-decision, salvation and ruin breathing on either side of a single red choice.',
    meta: ['Photomanipulation', 'Composite'],
    tint: 0xff5a44
  },
  {
    file: '2-1.jpeg',
    no: 'Plate II',
    title: 'Descent',
    desc: 'An angel suspended over a sea of cloud, wings caught at the top of the beat, feathers let go.',
    meta: ['Photomanipulation', 'Motion study'],
    tint: 0x8aa0ff
  },
  {
    file: '3.jpeg',
    no: 'Plate III',
    title: 'The Cast',
    desc: 'A die the size of a verdict meets the earth, chance made colossal, the figure already weightless.',
    meta: ['Photomanipulation', 'Light study'],
    tint: 0x9a6cff
  }
];

class VisionsApp {
  constructor() {
    this.panels = [];
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2();
    this.targetMouse = new THREE.Vector2();
    this.activeIndex = -1;
    this.isRunning = false;

    this.init();
  }

  async init() {
    if (!isWebGLAvailable()) {
      document.getElementById('loading-screen')?.classList.add('hidden');
      document.getElementById('webgl-fallback')?.classList.add('visible');
      return;
    }

    const bootPromise = this.runBoot();

    this.setupRenderer();
    this.cursor = new Cursor();
    this.audio = new AudioManager();

    await this.loadTextures();
    this.buildPanels();
    this.buildAtmosphere();
    this.buildPlaques();
    this.buildProgress();

    if (quality.postProcessing) {
      this.post = new PostProcessing(this.renderer, this.camera);
      this.post.setSection(1);
    }

    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }, { passive: true });

    this._onResize = this.onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    await bootPromise;
    document.getElementById('loading-screen')?.classList.add('hidden');

    this.isRunning = true;
    this.animate();
  }

  runBoot() {
    const log = document.getElementById('boot-log');
    const fill = document.getElementById('boot-progress-fill');
    const step = quality.reducedMotion ? 60 : 170;
    return new Promise((resolve) => {
      BOOT_LINES.forEach((line, i) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.innerHTML = line;
          log.appendChild(el);
          fill.style.width = `${((i + 1) / BOOT_LINES.length) * 100}%`;
          if (i === BOOT_LINES.length - 1) setTimeout(resolve, 300);
        }, step * (i + 1));
      });
    });
  }

  setupRenderer() {
    const container = document.getElementById('canvas-container');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxPixelRatio));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060608);
    this.scene.fog = new THREE.FogExp2(0x060608, 0.045);
    this.camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 0);
  }

  loadTextures() {
    const loader = new THREE.TextureLoader();
    return Promise.all(EXHIBIT_DATA.map((d) =>
      new Promise((resolve) => {
        loader.load(`./${d.file}`, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
          resolve(tex);
        }, undefined, () => resolve(null));
      })
    )).then((textures) => { this.textures = textures; });
  }

  buildPanels() {
    this.textures.forEach((tex) => {
      const panel = new ArtPanel(tex, FOV);
      this.panels.push(panel);
      this.scene.add(panel.mesh);
    });
  }

  buildAtmosphere() {
    this.dust = makeDust(quality.isMobile ? 90 : 220);
    this.bokeh = makeBokeh(quality.isMobile ? 10 : 26);
    this.scene.add(this.dust, this.bokeh);

    // A soft tint light that recolours the haze per active plate
    this.tint = new THREE.Color(EXHIBIT_DATA[0].tint);
  }

  buildPlaques() {
    const host = document.getElementById('plaques');
    this.plaques = EXHIBIT_DATA.map((d) => {
      const el = document.createElement('div');
      el.className = 'plaque';
      el.innerHTML = `
        <div class="p-no">${d.no}</div>
        <div class="p-title">${d.title}</div>
        <div class="p-desc">${d.desc}</div>
        <div class="p-meta">${d.meta.map((m) => `<span>${m}</span>`).join('')}</div>
      `;
      host.appendChild(el);
      return el;
    });
  }

  buildProgress() {
    const host = document.getElementById('v-progress');
    this.progressRows = EXHIBIT_DATA.map((d, i) => {
      const row = document.createElement('div');
      row.className = 'vp';
      row.innerHTML = `<span>${d.title}</span><span class="bar"><i></i></span><span>0${i + 1}</span>`;
      host.appendChild(row);
      return row;
    });
  }

  /**
   * Continuous travel parameter P across the three plate runways.
   * Panel i is centred (fully presented) at P = i + 0.5.
   */
  computeP() {
    const sections = document.querySelectorAll('.v-exhibit');
    if (sections.length < 3) return -0.25;
    const firstTop = sections[0].offsetTop;
    const lastBottom = sections[2].offsetTop + sections[2].offsetHeight;
    const span = Math.max(1, lastBottom - firstTop);
    const localTotal = THREE.MathUtils.clamp((window.scrollY + window.innerHeight * 0.5 - firstTop) / span, 0, 1);
    // Lead-in (-0.45) keeps the first plate dark behind the hero; 3.5 lets the last fully enter
    return localTotal * 3.95 - 0.45;
  }

  setActive(index) {
    if (index === this.activeIndex) return;
    const prev = this.activeIndex;
    this.activeIndex = index;

    this.plaques.forEach((p, i) => p.classList.toggle('visible', i === index));
    this.progressRows.forEach((r, i) => r.classList.toggle('active', i === index));

    if (index >= 0) {
      this.post?.setSection(index + 1);
      this.audio?.setSection(index + 1);
      if (prev >= 0) {
        this.post?.triggerGlitch(0.35);
        this.audio?.glitchBurst();
      }
      this.targetTint = new THREE.Color(EXHIBIT_DATA[index].tint);
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.post?.resize(window.innerWidth, window.innerHeight);
  }

  animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate.bind(this));

    const dt = Math.min(0.05, this.clock.getDelta());
    const time = this.clock.elapsedTime;

    this.mouse.lerp(this.targetMouse, 0.06);

    const P = this.computeP();
    const reduced = quality.reducedMotion;

    let active = -1;
    let best = 1e9;
    this.panels.forEach((panel, i) => {
      const t = P - (i + 0.5);
      panel.update(t, this.mouse, time, reduced);
      const fill = THREE.MathUtils.clamp((t + 1) / 2, 0, 1);
      const bar = this.progressRows[i].querySelector('.bar i');
      if (bar) bar.style.transform = `scaleX(${fill})`;
      if (Math.abs(t) < best) { best = Math.abs(t); active = i; }
    });
    const inGallery = P > 0.05 && P < 3.45;
    this.setActive(inGallery ? active : -1);

    // Camera breathes forward subtly + drifts with the mouse for parallax
    if (!reduced) {
      this.camera.position.x += (this.mouse.x * 0.35 - this.camera.position.x) * 0.04;
      this.camera.position.y += (this.mouse.y * 0.25 - this.camera.position.y) * 0.04;
      this.camera.lookAt(0, 0, -3);
    }

    // Atmosphere
    if (this.dust) {
      const pos = this.dust.geometry.attributes.position.array;
      const speeds = this.dust.userData.speeds;
      for (let i = 0; i < speeds.length; i++) {
        pos[i * 3 + 1] -= speeds[i] * dt;
        pos[i * 3] += Math.sin(time * 0.3 + i) * 0.002;
        if (pos[i * 3 + 1] < -5.5) pos[i * 3 + 1] = 5.5;
      }
      this.dust.geometry.attributes.position.needsUpdate = true;
    }
    if (this.bokeh) this.bokeh.material.uniforms.time.value = time;

    // Recolour haze toward the active plate's tint
    if (this.targetTint) {
      this.tint.lerp(this.targetTint, 0.02);
      if (this.bokeh) this.bokeh.material.uniforms.color.value.copy(this.tint);
    }

    if (this.post) this.post.render(dt, this.scene);
    else this.renderer.render(this.scene, this.camera);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new VisionsApp());
} else {
  new VisionsApp();
}
