/**
 * Lens → CSS custom properties. Pure (no DOM), shared by the runtime
 * theme and the build-time boot script so both emit identical values.
 *
 * Every page styles itself only through these variables:
 *   --accent        brand accent (hex)
 *   --accent-rgb    "r, g, b" for alpha variants: rgba(var(--accent-rgb), 0.4)
 *   --accent-ink    accent that holds contrast on white paper (print/PDF)
 */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function themeVars(lens) {
  const theme = lens.theme;
  return {
    '--accent': theme.accent,
    '--accent-rgb': hexToRgb(theme.accent).join(', '),
    '--accent-ink': theme.accentInk || theme.accent
  };
}
