import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createProgressBar();
    this.generatePlaceholderTextures();
  }

  private createProgressBar(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const barBg = this.add.rectangle(width / 2, height / 2, 320, 20, 0x333333);
    const bar = this.add.rectangle(width / 2 - 158, height / 2, 0, 16, 0x7c3aed);
    bar.setOrigin(0, 0.5);

    const loadingText = this.add.text(width / 2, height / 2 - 30, 'Loading...', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = 316 * value;
    });

    this.load.on('complete', () => {
      barBg.destroy();
      bar.destroy();
      loadingText.destroy();
    });
  }

  private generatePlaceholderTextures(): void {
    // Grass tile
    const grass = this.make.graphics({ add: false });
    grass.fillStyle(0x4a7c3f).fillRect(0, 0, 32, 32);
    grass.fillStyle(0x3d6b35).fillRect(4, 4, 4, 4);
    grass.fillStyle(0x3d6b35).fillRect(20, 14, 4, 4);
    grass.fillStyle(0x3d6b35).fillRect(10, 24, 4, 4);
    grass.generateTexture('grass-tile', 32, 32);
    grass.destroy();

    // Dirt tile
    const dirt = this.make.graphics({ add: false });
    dirt.fillStyle(0x8b7355).fillRect(0, 0, 32, 32);
    dirt.generateTexture('dirt-tile', 32, 32);
    dirt.destroy();

    // Building placeholder
    const building = this.make.graphics({ add: false });
    building.fillStyle(0x888888).fillRect(0, 0, 64, 64);
    building.fillStyle(0x666666).fillRect(0, 0, 64, 8);
    building.fillStyle(0xaaaa55).fillRect(24, 40, 16, 24);
    building.generateTexture('building', 64, 64);
    building.destroy();

    // Tree placeholder
    const tree = this.make.graphics({ add: false });
    tree.fillStyle(0x8b6914).fillRect(12, 24, 8, 16);
    tree.fillStyle(0x2d5a1b).fillCircle(16, 16, 14);
    tree.generateTexture('tree', 32, 40);
    tree.destroy();

    // Character placeholder (48x48, simple body)
    const charGfx = this.make.graphics({ add: false });
    charGfx.fillStyle(0xffcc99).fillCircle(24, 12, 10); // head
    charGfx.fillStyle(0x4488cc).fillRect(14, 22, 20, 20); // body
    charGfx.fillStyle(0x333366).fillRect(14, 42, 8, 6); // left leg
    charGfx.fillStyle(0x333366).fillRect(26, 42, 8, 6); // right leg
    charGfx.generateTexture('character', 48, 48);
    charGfx.destroy();

    // Checkpoint glow
    const glow = this.make.graphics({ add: false });
    glow.fillStyle(0xffd700, 0.3).fillCircle(32, 32, 32);
    glow.fillStyle(0xffd700, 0.6).fillCircle(32, 32, 16);
    glow.generateTexture('checkpoint-glow', 64, 64);
    glow.destroy();

    // Checkmark badge
    const check = this.make.graphics({ add: false });
    check.fillStyle(0x22c55e).fillCircle(8, 8, 8);
    check.lineStyle(2, 0xffffff);
    check.beginPath();
    check.moveTo(4, 8);
    check.lineTo(7, 11);
    check.lineTo(12, 5);
    check.strokePath();
    check.generateTexture('checkmark', 16, 16);
    check.destroy();

    // Photo placeholder
    const photo = this.make.graphics({ add: false });
    const gradient = photo;
    gradient.fillGradientStyle(0x667eea, 0x764ba2, 0x667eea, 0x764ba2);
    gradient.fillRect(0, 0, 600, 400);
    gradient.fillStyle(0xffffff, 0.3);
    gradient.fillCircle(300, 200, 60);
    photo.generateTexture('placeholder-photo', 600, 400);
    photo.destroy();
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
