// src/game/scenes/minigames/TramDashScene.ts
// Dodge trams and cars while crossing Budapest streets

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

const GAME_DURATION = 30;
const LANE_COUNT = 5;

interface Vehicle extends Phaser.GameObjects.Rectangle {
  speed: number;
  dir: number;
}

export class TramDashScene extends Phaser.Scene {
  private checkpointId!: string;
  private score = 0;
  private timeLeft = GAME_DURATION;
  private player!: Phaser.GameObjects.Rectangle;
  private vehicles: Vehicle[] = [];
  private spawnTimer!: Phaser.Time.TimerEvent;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private gameOver = false;
  private laneHeight = 0;
  private lanesStartY = 0;
  private safeZoneY = 0;
  private crossings = 0;

  constructor() {
    super({ key: 'TramDashScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.vehicles = [];
    this.gameOver = false;
    this.crossings = 0;
  }

  create(): void {
    const { width, height } = this.scale;
    this.laneHeight = (height - 100) / (LANE_COUNT + 2);
    this.lanesStartY = 50 + this.laneHeight;
    this.safeZoneY = 50;

    // Sky
    this.add.rectangle(width / 2, 25, width, 50, 0x87CEEB);
    // Bottom sidewalk
    this.add.rectangle(width / 2, height - 25, width, 50, 0x999999);
    // Top sidewalk (safe zone)
    this.add.rectangle(width / 2, this.safeZoneY, width, this.laneHeight, 0x999999);

    // Road lanes
    for (let i = 0; i < LANE_COUNT; i++) {
      const ly = this.lanesStartY + i * this.laneHeight + this.laneHeight / 2;
      const color = i === 2 ? 0x444444 : 0x555555; // tram track darker
      this.add.rectangle(width / 2, ly, width, this.laneHeight - 2, color);

      // Lane markings
      if (i < LANE_COUNT - 1) {
        for (let x = 0; x < width; x += 30) {
          this.add.rectangle(x + 10, ly + this.laneHeight / 2, 15, 2, 0xFFFFFF, 0.3);
        }
      }
    }

    // Tram track highlight on middle lane
    const tramY = this.lanesStartY + 2 * this.laneHeight + this.laneHeight / 2;
    this.add.rectangle(width / 2, tramY - this.laneHeight * 0.3, width, 2, 0xCCCC00, 0.5);
    this.add.rectangle(width / 2, tramY + this.laneHeight * 0.3, width, 2, 0xCCCC00, 0.5);

    // Player — small square at bottom
    this.player = this.add.rectangle(width / 2, height - 40, 16, 16, 0x44FF44).setDepth(10);

    // Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < this.player.y - 10) this.player.y -= this.laneHeight;
      else if (pointer.y > this.player.y + 10) this.player.y += this.laneHeight;
      else if (pointer.x < this.player.x) this.player.x -= 20;
      else this.player.x += 20;
    });

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Tram Dash!',
      score: 0,
      timer: GAME_DURATION,
      progress: 'Cross the road!',
      onExit: () => this.endGame(),
    });

    // Countdown 3-2-1-GO then start
    this.showCountdown(() => {
      this.spawnTimer = this.time.addEvent({
        delay: 600,
        callback: () => this.spawnVehicle(),
        loop: true,
      });

      this.countdownTimer = this.time.addEvent({
        delay: 1000,
        callback: () => {
          this.timeLeft--;
          uiManager.updateMinigameOverlay({ timer: this.timeLeft });
          if (this.timeLeft === 5) audioManager.playSFX('mg_timer_warning');
          if (this.timeLeft <= 0) this.endGame();
        },
        loop: true,
      });
    });
  }

  private spawnVehicle(): void {
    if (this.gameOver) return;
    const { width } = this.scale;

    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const ly = this.lanesStartY + lane * this.laneHeight + this.laneHeight / 2;
    const dir = lane % 2 === 0 ? 1 : -1;
    const isTram = lane === 2;
    const vw = isTram ? 80 : 30 + Math.random() * 20;
    const vh = this.laneHeight * 0.5;
    const color = isTram ? 0xFFDD00 : [0xCC3333, 0x3366CC, 0xEEEEEE, 0x666666][Phaser.Math.Between(0, 3)];
    const speed = (isTram ? 2.5 : 1.5 + Math.random() * 2) * (1 + this.crossings * 0.1);

    const x = dir > 0 ? -vw : width + vw;
    const v = this.add.rectangle(x, ly, vw, vh, color).setDepth(5) as Vehicle;
    v.speed = speed * dir;
    v.dir = dir;
    this.vehicles.push(v);
  }

  update(): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;

    // Keyboard movement
    if (this.cursors) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.player.y -= this.laneHeight;
      if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) this.player.y += this.laneHeight;
      if (this.cursors.left.isDown) this.player.x -= 3;
      if (this.cursors.right.isDown) this.player.x += 3;
    }

    // Clamp player
    this.player.x = Phaser.Math.Clamp(this.player.x, 10, width - 10);
    this.player.y = Phaser.Math.Clamp(this.player.y, 30, height - 30);

    // Move vehicles and check collision
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.x += v.speed;

      // Off screen
      if ((v.dir > 0 && v.x > width + 100) || (v.dir < 0 && v.x < -100)) {
        v.destroy();
        this.vehicles.splice(i, 1);
        continue;
      }

      // Collision
      const dx = Math.abs(v.x - this.player.x);
      const dy = Math.abs(v.y - this.player.y);
      if (dx < (v.width / 2 + 8) && dy < (v.height / 2 + 8)) {
        // Hit! Reset to bottom
        audioManager.playSFX('mg_wrong');
        this.cameras.main.shake(150, 0.008);
        this.player.y = height - 40;
        this.player.x = width / 2;
        this.score = Math.max(0, this.score - 10);
        uiManager.updateMinigameOverlay({ score: this.score });

        const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xFF0000, 0.2).setDepth(20);
        this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
      }
    }

    // Check if reached safe zone
    if (this.player.y <= this.safeZoneY + this.laneHeight / 2) {
      audioManager.playSFX('mg_correct');
      this.crossings++;
      this.score += 50;
      uiManager.updateMinigameOverlay({ score: this.score, progress: `${this.crossings} crossings!` });

      // Score popup
      const popup = this.add.text(this.player.x, this.player.y - 10, '+50', {
        fontSize: '14px', color: '#FFD700', fontStyle: 'bold', fontFamily: 'monospace',
      }).setDepth(25).setOrigin(0.5);
      this.tweens.add({
        targets: popup, y: this.player.y - 40, alpha: 0, duration: 600,
        onComplete: () => popup.destroy(),
      });

      // Green flash
      const flash = this.add.rectangle(width / 2, height / 2, width, height, 0x00FF00, 0.15).setDepth(20);
      this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

      // Reset to bottom
      this.player.y = height - 40;
    }
  }

  private showCountdown(onComplete: () => void): void {
    const { width, height } = this.scale;
    const text = this.add.text(width / 2, height / 2, '3', {
      fontSize: '48px', color: '#FFFFFF', fontStyle: 'bold', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100);

    this.time.delayedCall(800, () => { text.setText('2'); });
    this.time.delayedCall(1600, () => { text.setText('1'); });
    this.time.delayedCall(2400, () => { text.setText('GO!'); text.setColor('#FFD700'); });
    this.time.delayedCall(3000, () => { text.destroy(); onComplete(); });
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.spawnTimer.destroy();
    this.countdownTimer.destroy();
    for (const v of this.vehicles) v.destroy();
    this.vehicles = [];

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult(`${this.crossings} Crossings!`, this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
