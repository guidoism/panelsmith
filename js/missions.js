// Missions, power-system architectures, and the live compliance check.
//
// The logic runs one direction, exactly as Bob Nuckolls' *The AeroElectric
// Connection* teaches it:
//
//   mission  ->  required equipment  ->  endurance load (ME²L)  ->  architecture
//
// A *mission* is a required-equipment profile (grounded in FAR 91.205 plus the
// survivability thinking from the book). It RECOMMENDS a Z-figure architecture
// but never forces one — the panel is a sketchpad with a knowledgeable critic,
// not a wizard. `evaluateMission()` is a pure function: given the chosen mission,
// the chosen architecture, and the placed instruments, it returns a structured
// pass/amber/fail report the inspector renders. No DOM, no naming here.

(function () {

/* --------------------------- capabilities -------------------------------- *
 * A "capability" is a function the panel must be able to perform. Each maps to
 * the set of catalog instrument ids that provide it. Kept here (not on each
 * catalog entry) so the requirement logic stays self-contained and instruments
 * stay pure-SVG data.                                                         */

const GLASS = ['gdu460', 'gdu450', 'gdu470', 'hdx1100', 'hdx800'];
const STANDBY_EFIS = ['g5', 'gi275', 'av30']; // self-contained, battery-backed

const CAPS = {
  airspeed:  { label: 'Airspeed',           providers: ['asi', ...STANDBY_EFIS, ...GLASS] },
  altimeter: { label: 'Altimeter',          providers: ['alt', ...STANDBY_EFIS, ...GLASS] },
  attitude:  { label: 'Attitude reference',  providers: ['ai', ...STANDBY_EFIS, ...GLASS] },
  standby:   { label: 'Battery-backed standby attitude', providers: [...STANDBY_EFIS] },
  heading:   { label: 'Heading reference',   providers: ['dg', 'compass', ...STANDBY_EFIS, ...GLASS] },
  compass:   { label: 'Magnetic compass',    providers: ['compass'] },
  com:       { label: 'COM radio',           providers: ['gtr205', 'gnc355', 'gtn650', 'gtn750'] },
  nav:       { label: 'IFR GPS navigator',   providers: ['gps175', 'gnc355', 'gnx375', 'gtn650', 'gtn750'] },
  adsb:      { label: 'ADS-B Out transponder', providers: ['gtx335', 'gtx345', 'gnx375'] },
  engine:    { label: 'Engine instrumentation', providers: ['tach', 'map', 'cgr30p', 'edm900'] },
  lighting:  { label: 'Panel lighting / dimmer', providers: ['knob-dim'] },
};

/* --------------------------- architectures ------------------------------- *
 * Nuckolls' "Z-figures." Ranked by redundancy so we can tell whether a chosen
 * architecture meets (or exceeds) what a mission asks for. Numbers/intent are
 * the well-established standard references; verify against a current revision of
 * the book before quoting specifics in print.                                */

const ARCHITECTURES = [
  { id: 'z11', rank: 1, name: 'Z-11 — single alternator',
    blurb: 'One battery, one alternator. Main bus plus a diode-fed endurance bus and an always-hot battery bus. Nuckolls’ baseline — covers the vast majority of day/VFR-to-light-IFR RVs.' },
  { id: 'z13-8', rank: 2, name: 'Z-13/8 — + SD-8 standby alternator',
    blurb: 'Z-11 plus a small SD-8 engine-driven standby alternator feeding the endurance bus. The standard answer for serious IFR on a single battery: the E-bus keeps running even if the main alternator quits.' },
  { id: 'z14', rank: 3, name: 'Z-14 — dual battery / dual alternator',
    blurb: 'Two batteries, two alternators, cross-feed contactor. Full redundancy with no single point of failure. More than most RVs need; the right call when you won’t accept a single source.' },
];
const ARCH_BY_ID = Object.fromEntries(ARCHITECTURES.map(a => [a.id, a]));

/* ------------------------------- missions -------------------------------- *
 * requirements: { cap, min=1, hard=true }
 *   hard  -> must be met (fail/red if missing)
 *   !hard -> recommended (amber if missing)
 *   min   -> count needed (>=2 = "two independent sources")                  */

const MISSIONS = [
  {
    id: 'vfr-local', name: 'Day VFR — local',
    arch: 'z11',
    blurb: 'Good-weather flying in the practice area. FAR 91.205(b) day-VFR minimums; the battery is dispensable — you can land with a dead bus.',
    requirements: [
      { cap: 'airspeed' }, { cap: 'altimeter' }, { cap: 'compass' }, { cap: 'engine' },
      { cap: 'com', hard: false },
    ],
  },
  {
    id: 'vfr-busy', name: 'Day VFR — busy airspace',
    arch: 'z11',
    blurb: 'Day VFR into/near Class B/C. Adds the ADS-B Out + transponder and a COM the airspace requires (91.225/91.215).',
    requirements: [
      { cap: 'airspeed' }, { cap: 'altimeter' }, { cap: 'compass' }, { cap: 'engine' },
      { cap: 'adsb' }, { cap: 'com' },
      { cap: 'nav', hard: false },
    ],
  },
  {
    id: 'vfr-night', name: 'Day + Night VFR',
    arch: 'z11',
    blurb: 'Adds night ops (FAR 91.205(c)): now electrically dependent, so panel lighting and a dependable source matter — and battery endurance starts to count.',
    requirements: [
      { cap: 'airspeed' }, { cap: 'altimeter' }, { cap: 'compass' }, { cap: 'engine' },
      { cap: 'adsb' }, { cap: 'com' }, { cap: 'lighting' },
      { cap: 'nav', hard: false }, { cap: 'attitude', hard: false },
    ],
  },
  {
    id: 'night-imc', name: 'Night VFR + IMC survivability',
    arch: 'z13-8',
    blurb: 'Instrument-rated pilot flying night VFR who wants enough to get down if they blunder into IMC. Not certified IFR — legal minimum plus a battery-backed attitude source and redundant power (→ Z-13/8).',
    requirements: [
      { cap: 'airspeed' }, { cap: 'altimeter' }, { cap: 'compass' }, { cap: 'engine' },
      { cap: 'adsb' }, { cap: 'com' }, { cap: 'lighting' }, { cap: 'standby' },
      { cap: 'nav', hard: false }, { cap: 'com', min: 2, hard: false },
    ],
  },
  {
    id: 'ifr', name: 'Full IFR',
    arch: 'z14',
    blurb: 'Hard IFR. FAR 91.205(d) "GRABCARD" plus real redundancy: two attitude sources, two COMs, a generous endurance bus, and dual power (→ Z-14).',
    requirements: [
      { cap: 'airspeed' }, { cap: 'altimeter' }, { cap: 'compass' }, { cap: 'heading' },
      { cap: 'engine' }, { cap: 'adsb' }, { cap: 'lighting' },
      { cap: 'attitude', min: 2 }, { cap: 'com', min: 2 }, { cap: 'nav' },
      { cap: 'nav', min: 2, hard: false },
    ],
  },
];
const MISSION_BY_ID = Object.fromEntries(MISSIONS.map(m => [m.id, m]));

/* ------------------------------ evaluation ------------------------------- */

function evaluateArch(mission, archId) {
  const rec = ARCH_BY_ID[mission.arch];
  const sel = ARCH_BY_ID[archId] || rec;
  if (sel.rank >= rec.rank) {
    return {
      recommended: rec, selected: sel, met: true,
      note: sel.id === rec.id
        ? `Matches the recommended ${rec.name.split(' —')[0]}.`
        : `Exceeds the recommended ${rec.name.split(' —')[0]} — more redundancy than this mission needs.`,
    };
  }
  return {
    recommended: rec, selected: sel, met: false,
    note: `This mission calls for ${rec.name.split(' —')[0]} or better; ${sel.name.split(' —')[0]} has less redundancy.`,
  };
}

// Pure: (missionId, archId, items[{instId}]) -> compliance report.
function evaluateMission(missionId, archId, items) {
  const m = MISSION_BY_ID[missionId] || MISSIONS[0];
  const ids = (items || []).map(it => it.instId);

  const requirements = m.requirements.map(r => {
    const cap = CAPS[r.cap] || { label: r.cap, providers: [] };
    const providers = new Set(cap.providers);
    const by = ids.filter(id => providers.has(id));
    const min = r.min || 1;
    return {
      cap: r.cap, label: cap.label, hard: r.hard !== false, min,
      count: by.length, met: by.length >= min, by,
    };
  });

  const hard = requirements.filter(r => r.hard);
  return {
    mission: m,
    architecture: evaluateArch(m, archId),
    requirements,
    hardMet: hard.filter(r => r.met).length,
    hardTotal: hard.length,
  };
}

APP.MISSIONS = MISSIONS;
APP.MISSION_BY_ID = MISSION_BY_ID;
APP.ARCHITECTURES = ARCHITECTURES;
APP.ARCH_BY_ID = ARCH_BY_ID;
APP.evaluateMission = evaluateMission;
APP.DEFAULT_MISSION = 'vfr-local';
})();
