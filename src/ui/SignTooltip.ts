import { TILE_SIZE } from '../utils/constants';

export interface SignDef {
  id: string;
  tileX: number;
  tileY: number;
  texture: string;
  tooltipText: string;
}

export class SignTooltip {
  private scene: Phaser.Scene;
  private signs: SignDef[];
  private tooltipEl: HTMLElement | null = null;
  private activeSign: SignDef | null = null;

  constructor(scene: Phaser.Scene, signs: SignDef[]) {
    this.scene = scene;
    this.signs = signs;

    // Place sign sprites in the scene
    signs.forEach(sign => {
      const x = sign.tileX * TILE_SIZE + TILE_SIZE / 2;
      const y = sign.tileY * TILE_SIZE + TILE_SIZE / 2;
      scene.add.image(x, y, `interior-${sign.texture}`).setDepth(5);
    });
  }

  update(playerTileX: number, playerTileY: number): void {
    let closest: SignDef | null = null;
    let closestDist = Infinity;

    for (const sign of this.signs) {
      const dx = Math.abs(playerTileX - sign.tileX);
      const dy = Math.abs(playerTileY - sign.tileY);
      const dist = dx + dy;
      if (dist <= 2 && dist < closestDist) {
        closest = sign;
        closestDist = dist;
      }
    }

    if (closest && closest !== this.activeSign) {
      this.showTooltip(closest);
    } else if (!closest && this.activeSign) {
      this.hideTooltip();
    }
  }

  private showTooltip(sign: SignDef): void {
    this.hideTooltip();
    this.activeSign = sign;
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'sign-tooltip';
    this.tooltipEl.id = 'sign-tooltip';
    this.tooltipEl.textContent = sign.tooltipText;
    document.getElementById('ui-layer')?.appendChild(this.tooltipEl);
  }

  private hideTooltip(): void {
    this.activeSign = null;
    document.getElementById('sign-tooltip')?.remove();
    this.tooltipEl = null;
  }

  destroy(): void {
    this.hideTooltip();
  }
}
