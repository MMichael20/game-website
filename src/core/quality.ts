// Graphics-quality presets + a tiny persisted store. The Engine owns the actual
// render levers (resolution, shadows, draw distance); this module decides the
// numbers per tier, remembers the player's choice, and lets any UI change it
// without threading the Engine through every component.

export type QualityLevel = "low" | "medium" | "high";

export interface QualityPreset {
  pixelRatio: number;   // cap on devicePixelRatio (fragments scale with its square)
  shadows: boolean;     // sun shadow pass on/off (a second draw of every caster)
  shadowSize: number;   // sun shadow-map resolution
  shadowEvery: number;  // refresh shadows every Nth rendered frame
  antialias: boolean;   // MSAA — set at renderer creation, so it only changes on reload
  far: number;          // camera far plane (and fog end); lower = more distant geometry culled
  fog: number | null;   // fog start distance, or null for no fog (crisp to the far plane)
}

export const QUALITY: Record<QualityLevel, QualityPreset> = {
  // Max-FPS phone default: 0.75x resolution, no shadows, no AA, and a short draw
  // distance with fog so distant districts/airliners are culled instead of drawn.
  low: { pixelRatio: 0.75, shadows: false, shadowSize: 512, shadowEvery: 4, antialias: false, far: 700, fog: 320 },
  medium: { pixelRatio: 1.0, shadows: true, shadowSize: 1024, shadowEvery: 3, antialias: true, far: 2400, fog: null },
  // Current desktop look.
  high: { pixelRatio: 1.5, shadows: true, shadowSize: 2048, shadowEvery: 2, antialias: true, far: 2400, fog: null },
};

export const FOG_COLOR = 0xcfe1f5; // pale daytime sky-blue, used only on the low tier

const KEY = "r3d-quality";

function isLevel(v: unknown): v is QualityLevel {
  return v === "low" || v === "medium" || v === "high";
}

// Phones (primary pointer is coarse) default to low; everything else to high.
function deviceDefault(): QualityLevel {
  try {
    return matchMedia("(pointer: coarse)").matches ? "low" : "high";
  } catch {
    return "high";
  }
}

function load(): QualityLevel {
  try {
    const v = localStorage.getItem(KEY);
    if (isLevel(v)) return v;
  } catch { /* private mode / no storage */ }
  return deviceDefault();
}

// --- Tiny store: current level + a single registered applier (the Engine). ---
let current: QualityLevel = load();
let applier: (q: QualityLevel) => void = () => {};

export function getQuality(): QualityLevel { return current; }

// main() registers `engine.setQuality` here so any UI can change quality by name.
export function registerQualityApplier(fn: (q: QualityLevel) => void): void {
  applier = fn;
}

export function setQuality(q: QualityLevel): void {
  current = q;
  try { localStorage.setItem(KEY, q); } catch { /* ignore */ }
  applier(q);
}
