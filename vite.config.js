import { resolve } from 'path';
import { defineConfig } from 'vite';
import { LENSES, DEFAULT_ID } from './src/lenses/registry.js';
import { themeVars } from './src/theme/tokens.js';

/**
 * Pre-paint lens boot: a tiny classic <script> at the top of every page's
 * <head> that applies the visitor's cached lens tokens (written by
 * src/theme) before CSS paints, falling back to the default lens baked in
 * here at build time. New pages get it automatically; the Vows invitations
 * carry their own palettes and are skipped.
 */
function lensBoot() {
  const fallbackLens = LENSES.find((lens) => lens.id === DEFAULT_ID);
  const fallback = JSON.stringify({ id: fallbackLens.id, vars: themeVars(fallbackLens) });
  const script =
    '(function(){var d=document.documentElement,c=null;' +
    "try{c=JSON.parse(localStorage.getItem('aob-theme'))}catch(e){}" +
    `if(!c||!c.vars)c=${fallback};` +
    'for(var k in c.vars)d.style.setProperty(k,c.vars[k]);' +
    "d.setAttribute('data-lens',c.id)})();";

  return {
    name: 'lens-boot',
    transformIndexHtml(html, ctx) {
      if (ctx.path.includes('/projects/vows/')) return html;
      return [{ tag: 'script', children: script, injectTo: 'head-prepend' }];
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [lensBoot()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        writeups: resolve(__dirname, 'writeups/index.html'),
        projects: resolve(__dirname, 'projects/index.html'),
        visions: resolve(__dirname, 'projects/visions/index.html'),
        vows: resolve(__dirname, 'projects/vows/index.html'),
        vowsThread: resolve(__dirname, 'projects/vows/thread/index.html'),
        vowsHome: resolve(__dirname, 'projects/vows/home/index.html'),
        lab: resolve(__dirname, 'projects/lab/index.html'),
        range: resolve(__dirname, 'projects/range/index.html'),
        rangeResonance: resolve(__dirname, 'projects/range/resonance/index.html'),
        cv: resolve(__dirname, 'cv/index.html')
      },
      output: {
        manualChunks: {
          'three-core': ['three'],
          'gsap-core': ['gsap']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three', 'gsap']
  }
});
