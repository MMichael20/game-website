import Phaser from 'phaser';

export class BudapestEyeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BudapestEyeScene' });
  }

  create() {
    const w = Number(this.cameras.main.width);
    const h = Number(this.cameras.main.height);

    // Sky
    const sky = this.add.rectangle(w / 2, h / 2, w, h, 0x87ceeb).setDepth(0);

    // Skyline silhouette
    this.add
      .image(w / 2, h * 0.85, 'budapest-skyline')
      .setDepth(1)
      .setDisplaySize(w, h * 0.3);

    // Danube
    const river = this.add
      .rectangle(w / 2, h * 0.92, w, h * 0.16, 0x2255aa)
      .setDepth(1)
      .setAlpha(0.6);

    // Ferris Wheel
    const wheelCX = w / 2;
    const wheelCY = h * 0.45;
    const wheelR = Math.min(w, h) * 0.28;

    const wheel = this.add
      .image(wheelCX, wheelCY, 'budapest-eye-wheel')
      .setDepth(2)
      .setDisplaySize(wheelR * 2, wheelR * 2);

    // Player cabin at bottom
    const cabin = this.add
      .image(wheelCX, wheelCY + wheelR, 'budapest-eye-cabin')
      .setDepth(4)
      .setScale(2);

    let cabinAngle = Math.PI / 2;

    // Sunset overlays
    const sunsetOrange = this.add
      .rectangle(w / 2, h * 0.3, w, h * 0.6, 0xff6b35)
      .setAlpha(0)
      .setDepth(0);
    const sunsetPink = this.add
      .rectangle(w / 2, h * 0.2, w, h * 0.4, 0xcc3366)
      .setAlpha(0)
      .setDepth(0);
    const sunsetPurple = this.add
      .rectangle(w / 2, h * 0.15, w, h * 0.3, 0x663399)
      .setAlpha(0)
      .setDepth(0);

    // Phase 1: Boarding (0-3s)
    const playerSprite = this.add
      .rectangle(w / 2 - 20, h * 0.8, 8, 16, 0x4488ff)
      .setDepth(5);
    const partnerSprite = this.add
      .rectangle(w / 2 + 20, h * 0.8, 8, 16, 0xff6688)
      .setDepth(5);

    this.tweens.add({
      targets: [playerSprite, partnerSprite],
      y: wheelCY + wheelR - 10,
      duration: 2000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        playerSprite.setVisible(false);
        partnerSprite.setVisible(false);
      },
    });

    // Phase 2: Ascending (3-10s)
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: wheel,
        angle: -180,
        duration: 17000,
        ease: 'Linear',
      });

      const startTime = this.time.now;
      const ascendEvent = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          const elapsed = this.time.now - startTime;
          cabinAngle = Math.PI / 2 - (elapsed / 17000) * Math.PI;
          cabin.x = wheelCX + Math.cos(cabinAngle) * wheelR;
          cabin.y = wheelCY + Math.sin(cabinAngle) * wheelR;
          if (elapsed >= 17000) ascendEvent.destroy();
        },
      });
    });

    // Phase 3: Sunset at top (10-18s)
    this.time.delayedCall(10000, () => {
      this.tweens.add({
        targets: sunsetOrange,
        alpha: 0.6,
        duration: 3000,
        ease: 'Sine.easeInOut',
      });
      this.time.delayedCall(2000, () => {
        this.tweens.add({
          targets: sunsetPink,
          alpha: 0.4,
          duration: 3000,
          ease: 'Sine.easeInOut',
        });
      });
      this.time.delayedCall(4000, () => {
        this.tweens.add({
          targets: sunsetPurple,
          alpha: 0.3,
          duration: 3000,
          ease: 'Sine.easeInOut',
        });
      });
      this.tweens.add({
        targets: river,
        fillColor: 0xff6644,
        alpha: 0.5,
        duration: 5000,
      });

      // Golden particles
      for (let i = 0; i < 15; i++) {
        this.time.delayedCall(i * 400, () => {
          const px = Math.random() * w;
          const py = Math.random() * h * 0.5;
          const particle = this.add
            .circle(px, py, 2, 0xffdd88)
            .setAlpha(0.7)
            .setDepth(3);
          this.tweens.add({
            targets: particle,
            y: py - 30,
            alpha: 0,
            duration: 2000,
            ease: 'Sine.easeIn',
            onComplete: () => particle.destroy(),
          });
        });
      }
    });

    // Phase 4: Deepen to twilight (18-23s)
    this.time.delayedCall(18000, () => {
      this.tweens.add({ targets: sunsetPurple, alpha: 0.5, duration: 4000 });
    });

    // Phase 5: Exit (23-25s)
    this.time.delayedCall(23000, () => {
      skipBtn.remove();
      this.cameras.main.fadeOut(1500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BudapestOverworldScene', {
          returnFromInterior: true,
        });
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
        this.scene.start('BudapestOverworldScene', {
          returnFromInterior: true,
        });
      });
    });
    this.events.once('shutdown', () => {
      skipBtn.remove();
    });
  }
}
