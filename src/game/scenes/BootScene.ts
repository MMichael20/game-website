// src/game/scenes/BootScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../ui/UIManager';
import { hasSavedGame } from '../systems/SaveSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // DOM-based loading bar
    const bar = document.createElement('div');
    bar.id = 'loading-bar';
    bar.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 200px; height: 20px; background: #333; border-radius: 10px;
      overflow: hidden; z-index: 100;
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      width: 0%; height: 100%; background: #d4a574;
      border-radius: 10px; transition: width 0.2s;
    `;
    bar.appendChild(fill);
    document.body.appendChild(bar);

    this.load.on('progress', (value: number) => {
      fill.style.width = `${value * 100}%`;
    });

    this.load.on('complete', () => {
      bar.remove();
    });

    // TODO: Load real sprite sheet assets here once created
    // For now, generate placeholder textures programmatically in create()
  }

  create(): void {
    this.generatePlaceholderTextures();
    this.generateProceduralTextures();

    // Show main menu
    const canContinue = hasSavedGame();
    uiManager.showMainMenu(
      () => {
        uiManager.hideMainMenu();
        this.scene.start('DressingRoomScene', { isNewGame: true });
      },
      canContinue ? () => {
        uiManager.hideMainMenu();
        this.scene.start('DressingRoomScene', { isNewGame: false });
      } : () => {},
    );
  }

  private generatePlaceholderTextures(): void {
    // Terrain tiles — 4 tile variants in a strip
    const terrainCanvas = this.textures.createCanvas('terrain', 32 * 4, 32);
    if (terrainCanvas) {
      const ctx = terrainCanvas.context;
      const colors = ['#4a7c4f', '#c4a265', '#8a8a8a', '#3a6b3f']; // grass, dirt, stone, dark grass
      colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(i * 32, 0, 32, 32);
      });
      terrainCanvas.refresh();
    }

    // Character placeholder — simple colored square per outfit
    const outfitColors = ['#4488cc', '#cc4444', '#44cc88', '#8844cc', '#333333', '#cc8844', '#cc44cc', '#cccc44'];
    for (let c = 0; c < 2; c++) {
      const prefix = c === 0 ? 'player' : 'partner';
      for (let o = 0; o < 8; o++) {
        const key = `${prefix}-outfit-${o}`;
        const canvas = this.textures.createCanvas(key, 32 * 3, 32 * 4);
        if (canvas) {
          const ctx = canvas.context;
          ctx.fillStyle = outfitColors[o];
          // 3 frames x 4 directions
          for (let d = 0; d < 4; d++) {
            for (let f = 0; f < 3; f++) {
              ctx.fillRect(f * 32 + 4, d * 32 + 4, 24, 24);
              // Border
              ctx.strokeStyle = c === 0 ? '#ff69b4' : '#4169e1';
              ctx.lineWidth = 2;
              ctx.strokeRect(f * 32 + 4, d * 32 + 4, 24, 24);
            }
          }
          canvas.refresh();
        }
      }
    }

    // NPC placeholder
    const npcCanvas = this.textures.createCanvas('npc-default', 32, 32);
    if (npcCanvas) {
      const ctx = npcCanvas.context;
      ctx.fillStyle = '#888888';
      ctx.fillRect(4, 4, 24, 24);
      npcCanvas.refresh();
    }

    // Building placeholders
    ['restaurant', 'park-entrance', 'cinema'].forEach((name, i) => {
      const colors = ['#cc6644', '#44aa44', '#4466cc'];
      const canvas = this.textures.createCanvas(`building-${name}`, 96, 96);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = colors[i];
        ctx.fillRect(0, 0, 96, 96);
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.fillText(name, 4, 50);
        canvas.refresh();
      }
    });

    // Decoration placeholders
    ['tree', 'bench', 'lamp', 'fence', 'flower', 'fountain'].forEach(name => {
      const canvas = this.textures.createCanvas(`deco-${name}`, 32, 32);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = '#556b2f';
        ctx.fillRect(8, 8, 16, 16);
        canvas.refresh();
      }
    });

    // Catch game items
    ['petal', 'leaf', 'butterfly'].forEach(name => {
      const canvas = this.textures.createCanvas(`catch-${name}`, 32, 32);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = '#ff88aa';
        ctx.beginPath();
        ctx.arc(16, 16, 12, 0, Math.PI * 2);
        ctx.fill();
        canvas.refresh();
      }
    });

    // Catch basket
    const basketCanvas = this.textures.createCanvas('catch-basket', 64, 32);
    if (basketCanvas) {
      const ctx = basketCanvas.context;
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(8, 8, 48, 24);
      basketCanvas.refresh();
    }

    // Match card back and icons
    const cardBack = this.textures.createCanvas('card-back', 64, 80);
    if (cardBack) {
      const ctx = cardBack.context;
      ctx.fillStyle = '#7b5ea7';
      ctx.fillRect(0, 0, 64, 80);
      ctx.fillStyle = '#d4a574';
      ctx.font = '24px sans-serif';
      ctx.fillText('?', 24, 48);
      cardBack.refresh();
    }

    const matchIcons = ['\uD83C\uDF7F', '\uD83C\uDFAC', '\uD83C\uDF9F', '\uD83C\uDFA5', '\u2B50', '\uD83C\uDFAD'];
    matchIcons.forEach((icon, i) => {
      const canvas = this.textures.createCanvas(`match-icon-${i}`, 64, 80);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = '#fdf6e3';
        ctx.fillRect(0, 0, 64, 80);
        ctx.font = '32px sans-serif';
        ctx.fillText(icon, 16, 52);
        canvas.refresh();
      }
    });
  }

  private generateProceduralTextures(): void {
    // Sky gradient — will be replaced by SkyRenderer
    const skyCanvas = this.textures.createCanvas('sky', 1, 256);
    if (skyCanvas) {
      const ctx = skyCanvas.context;
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#87CEEB');
      grad.addColorStop(1, '#E0F0FF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1, 256);
      skyCanvas.refresh();
    }
  }
}
