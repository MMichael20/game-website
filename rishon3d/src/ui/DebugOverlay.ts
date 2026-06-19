// rishon3d/src/ui/DebugOverlay.ts
//
// A small dev HUD that makes bug screenshots self-documenting: it prints the
// player's world coords, the camera facing (compass + yaw), and the nearest POI
// (name @ coords + distance). Toggle with F3; default ON in dev builds. Knowing
// "+z = SOUTH, -z = NORTH, +x = EAST, -x = WEST" lets a screenshot pin exactly
// where an object/bug is.

export interface DebugInfo {
  player: { x: number; z: number };
  /** camera look direction on the XZ plane (normalized-ish is fine) */
  look: { x: number; z: number };
  nearest?: { label: string; x: number; z: number; dist: number } | null;
  mode?: string;
}

// +z is SOUTH in this world (street north, houses south). Map a look vector to a
// readable 8-way compass label.
export function compass(dx: number, dz: number): string {
  if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return "-";
  const ns = dz > 0.38 ? "S" : dz < -0.38 ? "N" : "";
  const ew = dx > 0.38 ? "E" : dx < -0.38 ? "W" : "";
  return (ns + ew) || (Math.abs(dz) > Math.abs(dx) ? (dz > 0 ? "S" : "N") : (dx > 0 ? "E" : "W"));
}

export class DebugOverlay {
  private el = document.createElement("div");
  private visible: boolean;

  constructor(container: HTMLElement, startVisible = true) {
    this.visible = startVisible;
    this.el.style.cssText =
      "position:fixed;left:10px;top:10px;z-index:7;pointer-events:none;" +
      "font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;color:#d6f5ff;" +
      "background:rgba(10,16,22,0.72);border:1px solid rgba(120,200,255,0.35);" +
      "border-radius:6px;padding:6px 9px;white-space:pre;text-shadow:0 1px 2px #000;";
    this.el.style.display = this.visible ? "block" : "none";
    container.appendChild(this.el);
  }

  toggle(): void { this.visible = !this.visible; this.el.style.display = this.visible ? "block" : "none"; }

  update(info: DebugInfo): void {
    if (!this.visible) return;
    const f = (n: number) => n.toFixed(1).padStart(6);
    const dir = compass(info.look.x, info.look.z);
    const yaw = ((Math.atan2(info.look.x, info.look.z) * 180) / Math.PI + 360) % 360;
    const lines = [
      `player  x ${f(info.player.x)}  z ${f(info.player.z)}`,
      `camera  facing ${dir.padEnd(2)}  (${yaw.toFixed(0)}°)`,
      info.mode ? `mode    ${info.mode}` : "",
      info.nearest
        ? `near    ${info.nearest.label} @ ${info.nearest.x.toFixed(0)},${info.nearest.z.toFixed(0)}  ${info.nearest.dist.toFixed(1)}m`
        : `near    -`,
      `axes    +z=S  -z=N  +x=E  -x=W   [F3]`,
    ];
    this.el.textContent = lines.filter(Boolean).join("\n");
  }

  // Static caption for the #view dev camera (no game running): shows what the
  // shot is framed on so static assessment screenshots are self-documenting.
  static viewCaption(container: HTMLElement, tx: number, tz: number, h: number, dist: number): void {
    const el = document.createElement("div");
    const side = dist < 0 ? "N (looking S)" : "S (looking N)";
    el.style.cssText =
      "position:fixed;left:10px;top:10px;z-index:7;pointer-events:none;" +
      "font:12px ui-monospace,Consolas,monospace;color:#d6f5ff;" +
      "background:rgba(10,16,22,0.72);border:1px solid rgba(120,200,255,0.35);" +
      "border-radius:6px;padding:6px 9px;white-space:pre;";
    el.textContent =
      `#view target  x ${tx}  z ${tz}\ncamera  height ${h}  dist ${dist} on ${side}\naxes  +z=S -z=N +x=E -x=W`;
    container.appendChild(el);
  }
}
