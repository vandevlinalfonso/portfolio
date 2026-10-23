import devsecops from './devsecops.js';
import breach from './breach.js';

/**
 * The lens list and the default landing lens. Pure data, no DOM or
 * storage access: vite.config.js imports this at build time to bake the
 * default theme into every page's pre-paint boot script.
 */
export const LENSES = [devsecops, breach];

// The default landing lens. Changing careers later = flip this one line.
export const DEFAULT_ID = 'devsecops';

export const ACTIVE_KEY = 'aob-lens';
export const UNLOCK_KEY = 'aob-lens-unlocked';
