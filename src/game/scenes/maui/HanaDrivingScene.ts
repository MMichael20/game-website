import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';

const SEGMENT_NAMES = ['Waterfall', 'Bamboo Forest', 'Black Sand Beach'];
const SEGMENT_STOPS = ['waterfall', 'bamboo', 'blacksand'] as const;
const SEGMENT_COLORS = [0x4a7c2e, 0x2d5a1c, 0x3a3a3a];
const SEGMENT_DURATION = 6000;

export class HanaDrivingScene extends Phaser.Scene {
  private resumeSegment = 0;
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super({ key: 'HanaDrivingScene' });
  }

  init(data: { resumeSegment?: number; returnX?: number; returnY?: number }) {
    this.resumeSegment = data?.resumeSegment ?? 0;
    this.returnX = data?.returnX;
    this.returnY = data?.returnY;
  }

  create() {
    const { width, height } = this.scale;

    // If all segments done, return to driving hub
    if (this.resumeSegment >= SEGMENT_STOPS.length) {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('DrivingScene', {
          returnX: this.returnX,
          returnY: this.returnY,
        });
      });
      return;
    }

    const segIdx = this.resumeSegment;
    const bgColor = SEGMENT_COLORS[segIdx] ?? 0x4a7c2e;

    // Background changes per segment (green → jungle → volcanic)
    this.add.rectangle(width / 2, height / 2, width, height, bgColor);

    // Road (vertical center strip)
    const roadW = 100;
    this.add.rectangle(width / 2, height / 2, roadW, height, 0x555555).setDepth(1);

    // Road edges (lighter gray)
    this.add.rectangle(width / 2 - roadW / 2, height / 2, 4, height, 0x888888).setDepth(2);
    this.add.rectangle(width / 2 + roadW / 2, height / 2, 4, height, 0x888888).setDepth(2);

    // Scrolling center line dashes
    const lines: Phaser.GameObjects.Rectangle[] = [];
    for (let y = -30; y < height + 60; y += 40) {
      const line = this.add.rectangle(width / 2, y, 4, 20, 0xffcc00).setDepth(2);
      lines.push(line);
    }

    this.tweens.add({
      targets: lines,
      y: '+=40',
      duration: 500,
      ease: 'Linear',
      repeat: -1,
    });

    // Scenery trees scroll down on both sides
    const sceneryItems: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? width / 2 - roadW / 2 - 50 : width / 2 + roadW / 2 + 50;
      const y = -80 - i * 70;
      const tree = this.add.image(side + (Math.random() - 0.5) * 20, y, 'deco-road-tree').setDepth(3);
      sceneryItems.push(tree);
    }

    this.tweens.add({
      targets: sceneryItems,
      y: `+=${height + 300}`,
      duration: SEGMENT_DURATION,
      ease: 'Linear',
    });

    // Player car (bottom center, static)
    this.add.image(width / 2, height * 0.75, 'car-player').setDepth(10);

    // Segment name label at top
    const segName = SEGMENT_NAMES[segIdx];
    this.add.text(width / 2, 20, `Road to Hana`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(20);

    // After driving duration, show pullover prompt
    this.time.delayedCall(SEGMENT_DURATION * 0.75, () => {
      // Slow down scrolling
      this.tweens.killAll();

      uiManager.showDialog({
        title: `${segName} Ahead`,
        message: 'Would you like to pull over and explore?',
        buttons: [
          {
            label: `Pull Over at ${segName}`,
            onClick: () => {
              uiManager.hideDialog();
              this.cameras.main.fadeOut(500, 0, 0, 0);
              this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('HanaPulloverScene', {
                  stop: SEGMENT_STOPS[segIdx],
                  resumeSegment: segIdx,
                  returnX: this.returnX,
                  returnY: this.returnY,
                });
              });
            },
          },
          {
            label: 'Keep Driving',
            onClick: () => {
              uiManager.hideDialog();
              this.cameras.main.fadeOut(300, 0, 0, 0);
              this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('HanaDrivingScene', {
                  resumeSegment: segIdx + 1,
                  returnX: this.returnX,
                  returnY: this.returnY,
                });
              });
            },
          },
        ],
      });
    });
  }
}
