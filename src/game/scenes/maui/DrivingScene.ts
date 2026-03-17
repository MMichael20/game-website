import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';

export class DrivingScene extends Phaser.Scene {
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super({ key: 'DrivingScene' });
  }

  init(data: { returnX?: number; returnY?: number }) {
    this.returnX = data?.returnX;
    this.returnY = data?.returnY;
  }

  create() {
    const { width, height } = this.scale;

    // Green background (grass/jungle)
    this.add.rectangle(width / 2, height / 2, width, height, 0x4a7c2e);

    // Jungle foliage strips along edges
    for (let i = 0; i < Math.ceil(width / 64); i++) {
      this.add.image(i * 64 + 32, 30, 'deco-jungle-foliage').setDepth(0);
      this.add.image(i * 64 + 32, height - 30, 'deco-jungle-foliage').setDepth(0);
    }

    // Road parameters
    const roadColor = 0x555555;
    const roadW = 80;
    const forkY = height * 0.35;

    // Main road trunk (bottom to fork)
    this.add.rectangle(width / 2, (forkY + height) / 2, roadW, height - forkY, roadColor).setDepth(1);

    // Center line dashes (yellow)
    for (let y = height; y > forkY; y -= 30) {
      this.add.rectangle(width / 2, y, 4, 15, 0xffcc00).setDepth(2);
    }

    // Left branch (Airport) — angled road segments toward top-left
    const leftEndX = width * 0.15;
    const leftEndY = 60;
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = width / 2 + (leftEndX - width / 2) * t;
      const y = forkY + (leftEndY - forkY) * t;
      this.add.rectangle(x, y, roadW * 0.9, 30, roadColor).setDepth(1).setAngle(-20);
    }

    // Center branch (Hana) — straight up
    this.add.rectangle(width / 2, forkY / 2, roadW, forkY, roadColor).setDepth(1);
    for (let y = forkY; y > 0; y -= 30) {
      this.add.rectangle(width / 2, y, 4, 15, 0xffcc00).setDepth(2);
    }

    // Right branch (Beach) — angled road segments toward top-right
    const rightEndX = width * 0.85;
    const rightEndY = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = width / 2 + (rightEndX - width / 2) * t;
      const y = forkY + (rightEndY - forkY) * t;
      this.add.rectangle(x, y, roadW * 0.9, 30, roadColor).setDepth(1).setAngle(20);
    }

    // Road signs at each branch
    this.add.image(leftEndX + 70, leftEndY + 30, 'deco-road-sign-airport').setDepth(5);
    this.add.image(width / 2 + 65, 55, 'deco-road-sign-hana').setDepth(5);
    this.add.image(rightEndX - 70, rightEndY + 30, 'deco-road-sign-beach').setDepth(5);

    // Roadside trees
    const treePositions = [
      [50, 160], [width - 50, 160], [50, 350], [width - 50, 350],
      [160, 80], [width - 160, 80], [width / 2 - 120, 450], [width / 2 + 120, 450],
    ];
    treePositions.forEach(([x, y]) => {
      this.add.image(x, y, 'deco-road-tree').setDepth(3);
    });

    // Player car starts off-screen at bottom
    const car = this.add.image(width / 2, height + 30, 'car-player').setDepth(10);

    // Auto-drive car from bottom to fork
    this.tweens.add({
      targets: car,
      y: forkY + 80,
      duration: 2000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.showDestinationChoice();
      },
    });
  }

  private showDestinationChoice(): void {
    uiManager.showDialog({
      title: 'Where to?',
      message: 'Choose your destination',
      buttons: [
        {
          label: 'Airport (Go Home)',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('AirplaneCutscene', { destination: 'home' });
            });
          },
        },
        {
          label: 'Road to Hana',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('HanaDrivingScene', {
                resumeSegment: 0,
                returnX: this.returnX,
                returnY: this.returnY,
              });
            });
          },
        },
        {
          label: 'Paia Beach',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('SunBeachScene', {
                returnX: this.returnX,
                returnY: this.returnY,
              });
            });
          },
        },
        {
          label: 'Go Back',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('MauiOverworldScene', {
                returnFromInterior: true,
                returnX: this.returnX,
                returnY: this.returnY,
              });
            });
          },
        },
      ],
    });
  }
}
