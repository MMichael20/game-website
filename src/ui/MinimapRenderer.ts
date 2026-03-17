// src/ui/MinimapRenderer.ts
import type Phaser from 'phaser';
import type { OverworldConfig } from '../game/scenes/OverworldScene';
import { TILE_SIZE } from '../utils/constants';
import { getVisitedCheckpoints } from '../game/systems/SaveSystem';

const MAX_CANVAS_SIZE = 320;
const UPDATE_INTERVAL = 250;

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

      // Marker
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      if (isVisited) {
        ctx.fillStyle = '#d4a574';
        ctx.fill();
      } else {
        ctx.strokeStyle = '#7b5ea7';
        ctx.lineWidth = 1.5;
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
      <span class="legend-item legend-item--visited">Visited</span>
      <span class="legend-item legend-item--unvisited">Unvisited</span>
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
