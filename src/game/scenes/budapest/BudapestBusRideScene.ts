import Phaser from 'phaser';

export class BudapestBusRideScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BudapestBusRideScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Background — starts green (suburban), shifts to gray-blue (urban)
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x6a9a4e);

    // Road (horizontal)
    const roadW = 100;
    this.add.rectangle(width / 2, height * 0.7, width, roadW, 0x555555).setDepth(1);
    this.add.rectangle(width / 2, height * 0.7 - roadW / 2, width, 4, 0x888888).setDepth(2);
    this.add.rectangle(width / 2, height * 0.7 + roadW / 2, width, 4, 0x888888).setDepth(2);

    // Scrolling center dashes
    const lines: Phaser.GameObjects.Rectangle[] = [];
    for (let x = -30; x < width + 60; x += 40) {
      lines.push(this.add.rectangle(x, height * 0.7, 20, 4, 0xffcc00).setDepth(2));
    }
    this.tweens.add({ targets: lines, x: '-=40', duration: 400, ease: 'Linear', repeat: -1 });

    // Bus window frame (darkened edges)
    this.add.rectangle(width / 2, 25, width, 50, 0x444444).setDepth(15);
    this.add.rectangle(width / 2, height - 25, width, 50, 0x444444).setDepth(15);
    this.add.rectangle(25, height / 2, 50, height, 0x444444).setDepth(15);
    this.add.rectangle(width - 25, height / 2, 50, height, 0x444444).setDepth(15);

    // Scrolling buildings
    const buildings: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 12; i++) {
      const bWidth = 40 + Math.random() * 40;
      const bHeight = 60 + Math.random() * 80;
      const x = width + 100 + i * 120;
      const y = height * 0.7 - roadW / 2 - bHeight / 2;
      const color = [0x8A7A6A, 0x7A8A7A, 0x6A7A8A, 0x9A8A7A][i % 4];
      const b = this.add.rectangle(x, y, bWidth, bHeight, color).setDepth(3);
      // Windows
      for (let wy = 0; wy < Math.floor(bHeight / 20); wy++) {
        for (let wx = 0; wx < Math.floor(bWidth / 15); wx++) {
          const win = this.add.rectangle(
            x - bWidth / 2 + 8 + wx * 15,
            y - bHeight / 2 + 10 + wy * 20,
            8, 10, 0xDDCC88
          ).setDepth(4);
          buildings.push(win);
        }
      }
      buildings.push(b);
    }

    this.tweens.add({
      targets: buildings,
      x: `-=${width + 1600}`,
      duration: 10000,
      ease: 'Linear',
    });

    // Background color transitions
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: bg,
        fillColor: { from: 0x6a9a4e, to: 0x7a8a8e },
        duration: 3000,
      });
    });

    this.time.delayedCall(6000, () => {
      this.tweens.add({
        targets: bg,
        fillColor: { from: 0x7a8a8e, to: 0x5a7a8e },
        duration: 2000,
      });
    });

    // Arrival text
    this.time.delayedCall(7000, () => {
      const text = this.add.text(width / 2, height * 0.3, 'Arriving in Budapest...', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(25).setAlpha(0);
      this.tweens.add({ targets: text, alpha: 1, duration: 1000 });
    });

    // Transition to overworld
    this.time.delayedCall(9500, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BudapestOverworldScene');
      });
    });

    // Skip button
    const skipBtn = document.createElement('div');
    skipBtn.className = 'skip-cutscene';
    skipBtn.textContent = 'Skip \u25B6\u25B6';
    document.getElementById('ui-layer')!.appendChild(skipBtn);

    skipBtn.addEventListener('click', () => {
      skipBtn.remove();
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BudapestOverworldScene');
      });
    });

    this.events.once('shutdown', () => { skipBtn.remove(); });
  }
}
