import type { RishonMap } from "../world/rishonMap";
import { worldToMinimap, worldRectToMinimap } from "./minimapMath";

const SIZE = 180;

// A lightweight 2D minimap overlay. The static city layer (ground/roads/buildings)
// is rendered once to an offscreen canvas; each frame we blit it and draw the
// moving player/car dots on top.
export class Minimap {
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D | null;
  private base: HTMLCanvasElement | null = null;
  private worldSize: number;

  constructor(container: HTMLElement, private map: RishonMap) {
    this.worldSize = map.ground.size;
    // Backing store stays at SIZE (crisp); CSS scales the displayed size down to
    // game-UI scale (~138px desktop, responsive on narrow viewports).
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.canvas.style.cssText =
      "position:fixed;right:12px;top:12px;width:clamp(116px,12vw,144px);height:clamp(116px,12vw,144px);" +
      "border-radius:8px;" +
      "border:2px solid rgba(255,255,255,0.25);box-shadow:0 2px 8px rgba(0,0,0,0.5);z-index:6;";
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.renderBase();
  }

  private renderBase(): void {
    const base = document.createElement("canvas");
    base.width = SIZE;
    base.height = SIZE;
    const b = base.getContext("2d");
    if (!b) return;
    b.fillStyle = "#2e3b2a"; // ground tint
    b.fillRect(0, 0, SIZE, SIZE);
    b.fillStyle = "#5b5b66"; // roads
    for (const r of this.map.roads) {
      const w = r.horizontal ? r.length : 6;
      const d = r.horizontal ? 6 : r.length;
      const rect = worldRectToMinimap(r.x, r.z, w, d, this.worldSize, SIZE);
      b.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    b.fillStyle = "#9aa7b8"; // buildings
    for (const bl of this.map.buildings) {
      const rect = worldRectToMinimap(bl.x, bl.z, bl.width, bl.depth, this.worldSize, SIZE);
      b.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    this.base = base;
  }

  update(player: { x: number; z: number }, car: { x: number; z: number }, mode: "onFoot" | "driving"): void {
    const ctx = this.ctx;
    if (!ctx || !this.base) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(this.base, 0, 0);
    const dot = (p: { x: number; z: number }, color: string, radius: number) => {
      const m = worldToMinimap(p.x, p.z, this.worldSize, SIZE);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    dot(car, mode === "driving" ? "#ffd24a" : "#c0392b", mode === "driving" ? 4 : 3);
    dot(player, "#4ad6ff", mode === "onFoot" ? 4 : 3);
  }

  setVisible(v: boolean): void { this.canvas.style.display = v ? "block" : "none"; }
  toggle(): void { this.setVisible(this.canvas.style.display === "none"); }
}
