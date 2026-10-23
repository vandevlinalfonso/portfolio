/**
 * DevSecOps lens — the default. Its scene is The Loom: the system is woven
 * into existence in real time, and flawed threads are snipped by inspector
 * nodes before they ever join the fabric. Continuous creation with
 * inspection built into the act of making. Nothing here references real
 * tooling.
 */
export default {
  id: 'devsecops',
  label: 'DevSecOps',
  codename: 'harden',
  locked: false,

  scene: 'loom',

  // Site-wide UI tokens: every page (not just Home) paints from these.
  theme: {
    accent: '#2fb6c4',
    accentInk: '#16757f' // holds contrast on the white-paper PDF
  },

  // Identity strings shared by every page, filled into [data-lens-tpl]
  // templates as {title} / {file} / {home}.
  site: {
    title: 'Security as Code',
    file: 'System 0001',
    home: 'Home',
    words: ['HARDEN', 'SIGNAL', 'VERIFY', 'PULSE', 'STATIC'] // Lab type wall
  },

  palette: {
    background: 0x0a0b0d,
    fog: [0x0a0b0d, 7, 18],
    veinColor: 0x2fb6c4, // UI accent
    // Aperture Loom colors — teal machine, warm golden core
    ringColor: 0x2fb6c4,   // the aperture machinery
    strandColor: 0x2fa8c4, // raw incoming strands
    braidColor: 0x7fe8dc,  // the ordered output braid
    coreColor: 0xffb45e,   // the golden heart of the gate
    faultColor: 0xe05537,  // flawed strands / rejection sparks
    starColor: 0x9fb4c4    // far void stars
  },

  persistScalar: {
    label: 'Coverage',
    inverse: true, // high is good — never flags "critical"
    decayWhileAway: false, // coverage doesn't rot while unattended
    statusStable: 'STABLE',
    statusActive: 'HARDENING',
  },

  bootHeader: 'Pipeline Runtime v3.0.0',
  bootLines: [
    'SYSTEM 0001 · SUBJECT: PROTECTED PIPELINE',
    'MOUNTING POLICY VOLUME ............ <span class="ok">OK</span>',
    'COMPILING SHADERS ................. <span class="ok">OK</span>',
    'ARMING SECURITY GATES ............. <span class="ok">OK</span>',
    'RESTORING COVERAGE STATE .......... <span class="ok">OK</span>',
    'DEFENSE POSTURE VERIFIED',
  ],

  titleAway: '◇ PIPELINE UNMONITORED',
  flashAway: '',
  flashReturn: '',
  footerClose: (pct, visited, total) =>
    `Coverage at close: ${pct}% · ${visited}/${total || 0} disciplines reviewed`,

  console: {
    title: 'SYSTEM 0000 · INSPECTING THE INSPECTOR',
    body:
      'Naturally, you opened the console.\n' +
      'No frameworks beyond three.js + GSAP. No 3D assets, the system is pure math.\n' +
      'Threats arrive constantly; the gates catch them early, far from the core.\n' +
      'Disciplines: ./data/projects.json\n' +
      'A prior discipline is sealed on file. Type its name to unseal it.',
  },

  copy: {
    caseId: 'System 0001 · Continuous Defense',
    telScalarLabel: 'Coverage',
    telSpecimenLabel: 'System',
    heroEyebrow: 'System 0001 · Under Continuous Defense',
    heroTitle: 'Security<br>as <span class="accent">Code</span>',
    heroLede:
      'The working notes of a DevSecOps engineer. Security is not a gate at ' +
      'the end: it is built into the pipeline, enforced early, and holds the ' +
      'line before anything ships.',
    heroMeta:
      '<span><b>Role</b> · DevSecOps / Platform Security</span>' +
      '<span><b>Posture</b> · Shift-left, automated</span>' +
      '<span><b>Status</b> · Guarding the pipeline</span>',
    scrollCue: 'Trace the pipeline ↓',

    specimenEyebrow: '01 · The System',
    specimenTitle: 'Defense that never sleeps.',
    specimenBody1:
      'The machine behind this text is the gate every change must pass. Raw ' +
      'strands stream in from the void, chaotic and untested, and the aperture ' +
      'aligns them into one ordered braid. A flawed strand is severed at the ' +
      'rim before it ever enters. Nothing flawed ships.',
    specimenBody2:
      'That is the honest shape of DevSecOps. You do not chase a perfect, ' +
      'finished state: you build the machine that catches problems ' +
      'automatically, every commit, every day, so the humans can sleep.',

    incidentsEyebrow: '02 · Disciplines',
    incidentsTitle: 'Where security meets the pipeline.',
    incidentsHint:
      'Hover to ignite a sector of the aperture · Open one to read the approach · What you review is sealed onto the ring',

    doctrineEyebrow: '03 · Doctrine',

    contactEyebrow: '04 · Contact',
    contactLink: 'Open a<br>channel <span class="arrow">→</span>',
    contactMoreHint: 'Further work',
    contactFooterNote: 'Review complete · coverage holds',

    panelLabelContext: 'Context',
    panelLabelThreat: 'Risk',
    panelLabelAction: 'Control',
    panelLabelTradeoff: 'Tradeoff',

    fallbackTitle: 'Interface Unavailable',
    fallbackBody:
      'This view requires WebGL, which your browser does not support or has disabled.',
  },
};
