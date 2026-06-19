import type { RishonMap } from "../world/rishonMap";
import { POIS } from "../world/districtPois";
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
  // The V1 block is framed off-origin (ground.center ~ (95,104)); minimapMath maps
  // an origin-centered world, so we translate every world point by `center` first.
  private center: { x: number; z: number };

  constructor(container: HTMLElement, private map: RishonMap) {
    this.worldSize = map.ground.size;
    this.center = map.ground.center ?? { x: 0, z: 0 };
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
      const rect = worldRectToMinimap(r.x - this.center.x, r.z - this.center.z, w, d, this.worldSize, SIZE);
      b.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    b.fillStyle = "#9aa7b8"; // buildings
    for (const bl of this.map.buildings) {
      const rect = worldRectToMinimap(bl.x - this.center.x, bl.z - this.center.z, bl.width, bl.depth, this.worldSize, SIZE);
      b.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    this.drawPois(b);
    this.base = base;
  }

  // POI markers are static (anchored to fixed world points), so they live on the
  // base layer beneath the moving player/car dots drawn each frame in update().
  private drawPois(b: CanvasRenderingContext2D): void {
    const half = 4; // marker half-size in minimap pixels
    b.textAlign = "center";
    b.textBaseline = "middle";
    b.font = "bold 6px sans-serif";
    b.lineWidth = 1;
    for (const poi of POIS) {
      const m = worldToMinimap(poi.x - this.center.x, poi.z - this.center.z, this.worldSize, SIZE);
      b.fillStyle = poi.color;
      b.strokeStyle = "rgba(0,0,0,0.6)";
      // Rounded square keeps adjacent promenade markers distinct at small size.
      this.roundedRect(b, m.x - half, m.y - half, half * 2, half * 2, 2);
      b.fill();
      b.stroke();
      b.fillStyle = "#10141a"; // dark glyph reads on the bright marker fills
      b.fillText(poi.glyph, m.x, m.y + 0.5);
    }
  }

  private roundedRect(
    b: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
  ): void {
    b.beginPath();
    b.moveTo(x + r, y);
    b.arcTo(x + w, y, x + w, y + h, r);
    b.arcTo(x + w, y + h, x, y + h, r);
    b.arcTo(x, y + h, x, y, r);
    b.arcTo(x, y, x + w, y, r);
    b.closePath();
  }

  update(player: { x: number; z: number }, car: { x: number; z: number }, mode: "onFoot" | "driving"): void {
    const ctx = this.ctx;
    if (!ctx || !this.base) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(this.base, 0, 0);
    const dot = (p: { x: number; z: number }, color: string, radius: number) => {
      const m = worldToMinimap(p.x - this.center.x, p.z - this.center.z, this.worldSize, SIZE);
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
