/**
 * Breach lens — incident-response / forensics reading of the specimen.
 * This is the site's original design, expressed as a lens. Locked by
 * default; unlocked as an easter egg (type its codename: "breach").
 */
export default {
  id: 'breach',
  label: 'Breach',
  codename: 'breach',
  locked: true,

  scene: 'specimen',

  theme: {
    accent: '#c43a2f',
    accentInk: '#b23127'
  },

  site: {
    title: 'Anatomy of a Breach',
    file: 'Case File 0001',
    home: 'Case File',
    words: ['BREACH', 'SIGNAL', 'DECAY', 'PULSE', 'STATIC']
  },

  palette: {
    background: 0x0a0a0b,
    fog: [0x0a0a0b, 7, 18],
    baseColor: 0x0e1014,
    veinColor: 0xc43a2f,
    rimColor: 0xb8c4d4,
    lightWarm: 0xc43a2f,
    payloadHot: [1.0, 0.42, 0.3],
    payloadDeep: [0.55, 0.06, 0.05],
    scarTint: [0.13, 0.05, 0.045],
  },

  physics: {
    explodeKeys: [0.02, 0.15, 0.8, 0.45, 0.05],
    payloadKeys: [0.0, 0.12, 1.0, 0.7, 0.22],
  },

  centerpiece: 'decay',

  persistScalar: {
    label: 'Decay',
    inverse: false,
    decayWhileAway: true,
    statusStable: 'STABLE',
    statusActive: 'DEGRADING',
  },

  bootHeader: 'Forensic Runtime v3.0.0',
  bootLines: [
    'CASE FILE 0001 · SUBJECT: COMPROMISED SYSTEM',
    'MOUNTING EVIDENCE VOLUME .......... <span class="ok">OK</span>',
    'COMPILING SHADERS ................. <span class="ok">OK</span>',
    'PARTITIONING SPECIMEN ............. <span class="ok">OK</span>',
    'RESTORING PRIOR EXAMINATION ....... <span class="ok">OK</span>',
    'CHAIN OF CUSTODY VERIFIED',
  ],

  titleAway: '⚠ SPECIMEN UNATTENDED',
  flashAway: 'DEGRADED WHILE AWAY',
  flashReturn: 'DECAYED SINCE LAST VISIT',
  footerClose: (pct, visited, total) =>
    `Decay at close: ${pct}% · ${visited}/${total || 0} cases examined`,

  console: {
    title: 'INCIDENT 0000 · VISITOR INSPECTING THE INSPECTOR',
    body:
      'Naturally, you opened the console.\n' +
      'No frameworks beyond three.js + GSAP. No 3D assets, the specimen is pure math.\n' +
      'The artifact remembers you (localStorage), and it rots while you are gone.\n' +
      'Case files: ./data/projects.json',
  },

  copy: {
    caseId: 'Case File 0001 · Open Incident',
    telScalarLabel: 'Decay',
    telSpecimenLabel: 'Specimen',
    heroEyebrow: 'Case File 0001 · Open Incident',
    heroTitle: 'Anatomy<br>of a <span class="accent">Breach</span>',
    heroLede:
      'The case file of a security engineer. Every system I touch is already ' +
      'compromised: the work is deciding how far it spreads.',
    heroMeta:
      '<span><b>Role</b> · Security / Infrastructure</span>' +
      '<span><b>Specimen</b> · Live, decaying</span>' +
      '<span><b>Status</b> · Accepting incidents</span>',
    scrollCue: 'Begin examination ↓',

    specimenEyebrow: '01 · The Specimen',
    specimenTitle: 'The specimen never resets.',
    specimenBody1:
      'The artifact behind this text is the system under examination: ' +
      'fractured, instrumented, decaying in real time. It rots while you ' +
      'read. It rots while you are away. Every case you open leaves a ' +
      'permanent scar that will still be here when you return.',
    specimenBody2:
      'That is the honest shape of security work. Nothing returns to ' +
      'pristine. Systems accumulate consequence, and the job is not to ' +
      'prevent every wound: it is to decide which damage you can live ' +
      'with, and contain the rest.',

    incidentsEyebrow: '02 · Incidents',
    incidentsTitle: 'Five contained breaches.',
    incidentsHint:
      'Hover to isolate the fragment · Open a case to read the report · What you examine stays marked',

    doctrineEyebrow: '03 · Doctrine',

    contactEyebrow: '04 · Contact',
    contactLink: 'Open a<br>channel <span class="arrow">→</span>',
    contactMoreHint: 'Further evidence',
    contactFooterNote: 'Examination complete · specimen retains all damage',

    panelLabelContext: 'Context',
    panelLabelThreat: 'Threat',
    panelLabelAction: 'Action',
    panelLabelTradeoff: 'Tradeoff',

    fallbackTitle: 'Evidence Unavailable',
    fallbackBody:
      'This examination requires WebGL, which your browser does not support or has disabled.',
  },
};
