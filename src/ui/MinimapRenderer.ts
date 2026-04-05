// src/ui/MinimapRenderer.ts
import type Phaser from 'phaser';
import type { OverworldConfig } from '../game/scenes/OverworldScene';
import { TILE_SIZE } from '../utils/constants';
import { getVisitedCheckpoints } from '../game/systems/SaveSystem';

const MAX_CANVAS_SIZE = 320;
const UPDATE_INTERVAL = 250;

/** Checkpoint category colors for minimap rendering */
const CATEGORY_STYLES: Record<string, { fill: string; dim: string }> = {
  landmark:   { fill: '#FFD700', dim: '#806B00' },
  minigame:   { fill: '#DA70D6', dim: '#6D3868' },
  attraction: { fill: '#00CED1', dim: '#006566' },
  transport:  { fill: '#4A90D9', dim: '#24486C' },
  food:       { fill: '#66BB6A', dim: '#335D35' },
  default:    { fill: '#AAAAAA', dim: '#555555' },
};

const CHECKPOINT_CATEGORY_MAP: Record<string, string> = {};
[
  'bp_parliament', 'bp_chain_bridge', 'bp_fishermans_bastion',
  'bp_liberty_bridge', 'bp_margaret_bridge', 'bp_gellert_hill',
  'bp_opera', 'bp_gellert_baths', 'bp_szechenyi_baths',
  'bp_heroes_square', 'bp_st_stephens', 'bp_great_market',
].forEach(id => { CHECKPOINT_CATEGORY_MAP[id] = 'landmark'; });
[
  'bp_indian_restaurant', 'bp_langos_stand', 'bp_ruin_bar_quiz',
  'bp_tram_dash', 'bp_spice_market', 'bp_guard_escape',
  'bp_jazz_seat', 'bp_rooftop_chase', 'bp_danube_kayak', 'bp_chimney_cake',
].forEach(id => { CHECKPOINT_CATEGORY_MAP[id] = 'minigame'; });
[
  'bp_eye', 'bp_jewish_quarter', 'bp_danube_cruise', 'bp_airbnb',
].forEach(id => { CHECKPOINT_CATEGORY_MAP[id] = 'attraction'; });
[
  'bp_tram_stop_north', 'bp_tram_stop_south', 'bp_fast_travel',
].forEach(id => { CHECKPOINT_CATEGORY_MAP[id] = 'transport'; });
[
  'bp_restaurant_1', 'bp_restaurant_2',
].forEach(id => { CHECKPOINT_CATEGORY_MAP[id] = 'food'; });

function getCheckpointStyle(id: string, visited: boolean): string {
  const cat = CHECKPOINT_CATEGORY_MAP[id] ?? 'default';
  const style = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.default;
  return visited ? style.dim : style.fill;
}

export class MinimapRenderer {
  private scene: Phaser.Scene;
  private config: OverworldConfig;
  private labelMap: Record<string, string>;
  private getPlayerPos: () => { x: number; y: number };

  private mapPxWidth: number;
  private mapPxHeight: number;
  private canvasWidth: number;
  private canvasHeight: number;

  private overlay: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private playerDot: HTMLElement | null = null;
  private staticCanvas: HTMLCanvasElement | null = null;
  private updateTimer: Phaser.Time.TimerEvent | null = null;

  private _isOpen = false;
  private suggestedId: string | null = null;

  constructor(
    scene: Phaser.Scene,
    config: OverworldConfig,
    labelMap: Record<string, string>,
    getPlayerPos: () => { x: number; y: number },
  ) {
    this.scene = scene;
    this.config = config;
    this.labelMap = labelMap;
    this.getPlayerPos = getPlayerPos;

    this.mapPxWidth = config.mapWidth * TILE_SIZE;
    this.mapPxHeight = config.mapHeight * TILE_SIZE;

    // Fit map into MAX_CANVAS_SIZE preserving aspect ratio
    const aspect = this.mapPxWidth / this.mapPxHeight;
    if (aspect >= 1) {
      this.canvasWidth = MAX_CANVAS_SIZE;
      this.canvasHeight = Math.round(MAX_CANVAS_SIZE / aspect);
    } else {
      this.canvasHeight = MAX_CANVAS_SIZE;
      this.canvasWidth = Math.round(MAX_CANVAS_SIZE * aspect);
    }
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  setSuggested(id: string | null): void {
    this.suggestedId = id;
  }

  toggle(): void {
    if (this._isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this._isOpen) return;
    this._isOpen = true;

    this.buildStaticLayer();
    this.buildDOM();
    this.drawDynamicLayer();

    // Fade in
    requestAnimationFrame(() => {
      this.overlay?.classList.add('minimap-backdrop--visible');
    });

    // Start position update timer
    this.updateTimer = this.scene.time.addEvent({
      delay: UPDATE_INTERVAL,
      callback: () => this.updatePlayerDot(),
      callbackScope: this,
      loop: true,
    });
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;

    this.updateTimer?.destroy();
    this.updateTimer = null;
    this.overlay?.remove();
    this.overlay = null;
    this.canvas = null;
    this.playerDot = null;
    this.staticCanvas = null;
  }

  destroy(): void {
    this.close();
  }

  // --- Static layer: tilemap ---

  private buildStaticLayer(): void {
    this.staticCanvas = document.createElement('canvas');
    this.staticCanvas.width = this.canvasWidth;
    this.staticCanvas.height = this.canvasHeight;
    const ctx = this.staticCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const texture = this.scene.textures.get(this.config.terrainTextureKey);
    const sourceImage = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;

    const scaleX = this.canvasWidth / this.mapPxWidth;
    const scaleY = this.canvasHeight / this.mapPxHeight;

    for (let y = 0; y < this.config.mapHeight; y++) {
      for (let x = 0; x < this.config.mapWidth; x++) {
        const tileType = this.config.tileGrid[y][x];
        const frame = texture.get(tileType);

        const destX = Math.floor(x * TILE_SIZE * scaleX);
        const destY = Math.floor(y * TILE_SIZE * scaleY);
        const destW = Math.ceil(TILE_SIZE * scaleX) + 1; // +1 to avoid gaps
        const destH = Math.ceil(TILE_SIZE * scaleY) + 1;

        ctx.drawImage(
          sourceImage,
          frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
          destX, destY, destW, destH,
        );
      }
    }
  }

  // --- Dynamic layer: markers + labels ---

  private drawDynamicLayer(): void {
    if (!this.canvas || !this.staticCanvas) return;
    const ctx = this.canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Composite static tilemap
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.drawImage(this.staticCanvas, 0, 0);

    const visited = new Set(getVisitedCheckpoints());
    const scaleX = this.canvasWidth / this.mapPxWidth;
    const scaleY = this.canvasHeight / this.mapPxHeight;

    // Draw checkpoint markers + labels
    for (const zone of this.config.checkpointZones) {
      const cx = zone.centerX * scaleX;
      const cy = zone.centerY * scaleY;
      const isVisited = visited.has(zone.id);
      const label = this.labelMap[zone.id];

      // Marker — color-coded by category
      const markerColor = getCheckpointStyle(zone.id, isVisited);
      const radius = isVisited ? 4 : 5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = markerColor;
      ctx.fill();
      if (!isVisited) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Label
      if (label) {
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Outline for readability
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeText(label, cx, cy + 8);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, cx, cy + 8);
      }
    }

    // Draw "next suggested" highlight ring
    if (this.suggestedId) {
      const suggestedZone = this.config.checkpointZones.find(z => z.id === this.suggestedId);
      if (suggestedZone) {
        const sx = suggestedZone.centerX * scaleX;
        const sy = suggestedZone.centerY * scaleY;
        ctx.beginPath();
        ctx.arc(sx, sy, 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small arrow pointing down at the suggested dot
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 12);
        ctx.lineTo(sx - 3, sy - 16);
        ctx.lineTo(sx + 3, sy - 16);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // --- Player dot ---

  private updatePlayerDot(): void {
    if (!this.playerDot) return;
    const pos = this.getPlayerPos();
    const scaleX = this.canvasWidth / this.mapPxWidth;
    const scaleY = this.canvasHeight / this.mapPxHeight;
    this.playerDot.style.left = `${pos.x * scaleX}px`;
    this.playerDot.style.top = `${pos.y * scaleY}px`;
  }

  // --- DOM ---

  private buildDOM(): void {
    const hud = document.getElementById('hud');
    if (!hud) return;

    this.overlay = document.createElement('div');
    this.overlay.id = 'minimap-overlay';
    this.overlay.className = 'minimap-backdrop';

    const panel = document.createElement('div');
    panel.className = 'minimap-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'minimap-header';
    header.innerHTML = `
      <span class="minimap-title">Map</span>
      <button class="minimap-close btn btn--icon" title="Close map">&times;</button>
    `;
    header.querySelector('.minimap-close')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
    panel.appendChild(header);

    // Canvas wrap
    const wrap = document.createElement('div');
    wrap.className = 'minimap-canvas-wrap';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap-canvas';
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvas.style.width = `${this.canvasWidth}px`;
    this.canvas.style.height = `${this.canvasHeight}px`;
    wrap.appendChild(this.canvas);

    // Player dot (CSS-animated blink)
    this.playerDot = document.createElement('div');
    this.playerDot.className = 'minimap-player-dot';
    wrap.appendChild(this.playerDot);

    // Position dot immediately
    this.updatePlayerDot();

    panel.appendChild(wrap);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'minimap-legend';
    legend.innerHTML = `
      <span class="legend-item legend-item--landmark">Landmark</span>
      <span class="legend-item legend-item--minigame">Minigame</span>
      <span class="legend-item legend-item--attraction">Attraction</span>
      <span class="legend-item legend-item--transport">Transport</span>
      <span class="legend-item legend-item--food">Food</span>
    `;
    panel.appendChild(legend);

    this.overlay.appendChild(panel);

    // Click backdrop to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    hud.appendChild(this.overlay);
  }
}
