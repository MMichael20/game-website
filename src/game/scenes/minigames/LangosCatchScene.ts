// src/game/scenes/minigames/LangosCatchScene.ts
// Catch falling toppings (sour cream, cheese, garlic) onto a lángos
// Features: difficulty ramp, combo system, golden toppings, visual juice

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

const GAME_DURATION = 30;
const TOPPING_TYPES = ['sour-cream', 'cheese', 'garlic', 'ketchup'];
const BAD_ITEMS = ['rock', 'shoe'];
const GOLDEN_SPAWN_INTERVAL = 8000;
const GOLDEN_POINTS = 50;
const LANGOS_TINT_STAGES = [0xFFFFFF, 0xFFEECC, 0xFFDD99, 0xFFCC66, 0xFFBB33, 0xFFAA00];
const COMBO_MILESTONES = [5, 10, 15];

interface PhaseConfig {
  spawnDelay: number;
  fallDuration: number;
  badChance: number;
}

const PHASES: PhaseConfig[] = [
  { spawnDelay: 700, fallDuration: 1500, badChance: 0.15 },  // Phase 1: 0-10s
  { spawnDelay: 500, fallDuration: 1200, badChance: 0.20 },  // Phase 2: 10-20s
  { spawnDelay: 350, fallDuration: 1000, badChance: 0.30 },  // Phase 3: 20-30s
];

interface FallingItem extends Phaser.GameObjects.Sprite {
  isBad: boolean;
  isGolden: boolean;
}

export class LangosCatchScene extends Phaser.Scene {
  private checkpointId!: string;
  private score = 0;
  private timeLeft = GAME_DURATION;
  private elapsed = 0;
  private items: FallingItem[] = [];
  private langos!: Phaser.GameObjects.Sprite;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private goldenTimer!: Phaser.Time.TimerEvent;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private gameOver = false;

  // Combo system
  private combo = 0;
  private comboText!: Phaser.GameObjects.Text;
  private totalGoodCatches = 0;

  constructor() {
    super({ key: 'LangosCatchScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.elapsed = 0;
    this.items = [];
    this.gameOver = false;
    this.combo = 0;
    this.totalGoodCatches = 0;
  }

  create(): void {
    const { width, height } = this.scale;

    // Warm kitchen background
    this.add.rectangle(width / 2, height / 2, width, height, 0x8B6914);
    // Counter at bottom
    this.add.rectangle(width / 2, height - 20, width, 40, 0x5C3A1E);

    // Langos (plate/basket) at bottom
    this.langos = this.add.sprite(width / 2, height - 50, 'langos-plate');
    this.langos.setDisplaySize(72, 48);

    // Combo text (hidden until combo >= 3)
    this.comboText = this.add.text(width / 2, height - 90, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(5);

    // Pointer control
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.gameOver) {
        this.langos.x = Phaser.Math.Clamp(pointer.x, 36, width - 36);
      }
    });

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Langos Catch!',
      score: 0,
      timer: GAME_DURATION,
      onExit: () => this.endGame(),
    });

    // Start self-scheduling spawn loop
    this.scheduleNextSpawn();

    // Golden topping timer — every 8 seconds
    this.goldenTimer = this.time.addEvent({
      delay: GOLDEN_SPAWN_INTERVAL,
      callback: () => this.spawnGoldenItem(),
      loop: true,
    });

    // Countdown
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.elapsed++;
        uiManager.updateMinigameOverlay({ timer: this.timeLeft });
        if (this.timeLeft === 5) audioManager.playSFX('mg_timer_warning');
        if (this.timeLeft <= 0) this.endGame();
      },
      loop: true,
    });
  }

  private getCurrentPhase(): PhaseConfig {
    if (this.elapsed < 10) return PHASES[0];
    if (this.elapsed < 20) return PHASES[1];
    return PHASES[2];
  }

  private scheduleNextSpawn(): void {
    if (this.gameOver) return;
    const phase = this.getCurrentPhase();
    this.time.delayedCall(phase.spawnDelay, () => {
      this.spawnItem();
      this.scheduleNextSpawn();
    });
  }

  private spawnItem(): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;
    const phase = this.getCurrentPhase();

    const isBad = Math.random() < phase.badChance;
    const type = isBad
      ? Phaser.Utils.Array.GetRandom(BAD_ITEMS)
      : Phaser.Utils.Array.GetRandom(TOPPING_TYPES);

    const x = Phaser.Math.Between(32, width - 32);
    const item = this.add.sprite(x, -20, `langos-${type}`) as unknown as FallingItem;
    item.setDisplaySize(28, 28);
    item.isBad = isBad;
    item.isGolden = false;
    this.items.push(item);

    const fallDuration = phase.fallDuration + Math.random() * 300;

    this.tweens.add({
      targets: item,
      y: height + 20,
      duration: fallDuration,
      onComplete: () => this.onItemMissed(item),
    });
  }

  private spawnGoldenItem(): void {
    if (this.gameOver) return;
    const { width, height } = this.scale;
    const phase = this.getCurrentPhase();

    const type = Phaser.Utils.Array.GetRandom(TOPPING_TYPES);
    const x = Phaser.Math.Between(32, width - 32);
    const item = this.add.sprite(x, -20, `langos-${type}`) as unknown as FallingItem;
    item.setDisplaySize(32, 32);
    item.setTint(0xFFD700);
    item.isBad = false;
    item.isGolden = true;
    this.items.push(item);

    // Pulsing alpha tween for golden visibility
    this.tweens.add({
      targets: item,
      alpha: { from: 1, to: 0.5 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    // Falls slightly faster than current phase
    const fallDuration = phase.fallDuration * 0.8;

    this.tweens.add({
      targets: item,
      y: height + 20,
      duration: fallDuration,
      onComplete: () => this.onItemMissed(item),
    });
  }

  private onItemMissed(item: FallingItem): void {
    if (!item.active) return;
    const idx = this.items.indexOf(item);
    if (idx === -1) return;
    this.items.splice(idx, 1);

    // Only good items count as a miss for combo purposes
    if (!item.isBad) {
      this.resetCombo();
      audioManager.playSFX('mg_miss');
      this.spawnMissPuff(item.x, this.scale.height);
    }

    item.destroy();
  }

  private removeItem(item: FallingItem): void {
    const idx = this.items.indexOf(item);
    if (idx !== -1) this.items.splice(idx, 1);
    // Kill any tweens on this item before destroying
    this.tweens.killTweensOf(item);
    item.destroy();
  }

  private getComboMultiplier(): number {
    return Math.min(3, 1 + this.combo * 0.2);
  }

  private resetCombo(): void {
    this.combo = 0;
    this.comboText.setAlpha(0);
  }

  private incrementCombo(): void {
    this.combo++;

    // Update combo display
    if (this.combo >= 3) {
      this.comboText.setText(`x${this.combo} Combo!`);
      this.comboText.setAlpha(1);

      // Brief scale pop on combo text
      this.tweens.add({
        targets: this.comboText,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 80,
        yoyo: true,
      });
    }

    // Combo milestones
    if (COMBO_MILESTONES.includes(this.combo)) {
      audioManager.playSFX('mg_score_up');
      this.showGoldenFlash();
    }
  }

  private updateLangosTint(): void {
    const stageIndex = Math.min(
      LANGOS_TINT_STAGES.length - 1,
      Math.floor(this.totalGoodCatches / 5)
    );
    this.langos.setTint(LANGOS_TINT_STAGES[stageIndex]);
  }

  // --- Visual feedback helpers ---

  private showFloatingScore(x: number, y: number, text: string, color: string): void {
    const floater = this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: floater,
      y: y - 50,
      alpha: 0,
      duration: 700,
      ease: 'Power2',
      onComplete: () => floater.destroy(),
    });
  }

  private showGoodCatchFeedback(item: FallingItem, pointsAwarded: number): void {
    const x = item.x;
    const y = item.y;

    // Scale-down tween into langos
    this.tweens.add({
      targets: item,
      scaleX: 0,
      scaleY: 0,
      x: this.langos.x,
      y: this.langos.y,
      duration: 100,
      onComplete: () => {
        if (item.active) item.destroy();
      },
    });

    // Floating score text
    const displayPoints = `+${Math.round(pointsAwarded)}`;
    const color = this.combo >= 3 ? '#FFD700' : '#FFFFFF';
    this.showFloatingScore(x, y - 10, displayPoints, color);

    // Brief white flash on langos
    const prevTint = this.langos.tintTopLeft;
    this.langos.setTint(0xFFFFFF);
    this.time.delayedCall(80, () => {
      this.updateLangosTint();
    });
  }

  private showBadCatchFeedback(item: FallingItem): void {
    const x = item.x;
    const y = item.y;

    // Camera shake
    this.cameras.main.shake(150, 0.008);

    // Red flash overlay
    const flash = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height,
      0xFF0000, 0.2
    ).setDepth(10);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Langos shake (x offset yoyo)
    const origX = this.langos.x;
    this.tweens.add({
      targets: this.langos,
      x: origX + 4,
      duration: 40,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.langos.x = origX;
      },
    });

    // Floating red score text
    this.showFloatingScore(x, y - 10, '-20', '#FF4444');
  }

  private showGoldenFlash(): void {
    const { width, height } = this.scale;
    const flash = this.add.rectangle(
      width / 2, height / 2, width, height,
      0xFFD700, 0.2
    ).setDepth(10);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });
  }

  private showGoldenCatchSparkle(x: number, y: number): void {
    // 8 particles radiating outward
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particle = this.add.circle(x, y, 3, 0xFFD700, 1).setDepth(10);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private spawnMissPuff(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const offsetX = Phaser.Math.Between(-15, 15);
      const particle = this.add.circle(x + offsetX, y, 4, 0xAAAAAA, 0.6).setDepth(10);
      this.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(15, 30),
        alpha: 0,
        duration: 350,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  // --- Main update loop ---

  update(): void {
    if (this.gameOver) return;
    const { width } = this.scale;

    // Keyboard movement
    if (this.cursors) {
      if (this.cursors.left.isDown) {
        this.langos.x = Phaser.Math.Clamp(this.langos.x - 5, 36, width - 36);
      }
      if (this.cursors.right.isDown) {
        this.langos.x = Phaser.Math.Clamp(this.langos.x + 5, 36, width - 36);
      }
    }

    // Keep combo text above langos
    this.comboText.x = this.langos.x;
    this.comboText.y = this.langos.y - 40;

    // Collision detection
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (!item.active) continue;

      const dx = Math.abs(item.x - this.langos.x);
      const dy = Math.abs(item.y - this.langos.y);

      if (dx < 40 && dy < 24) {
        if (item.isBad) {
          // Bad item caught
          this.score = Math.max(0, this.score - 20);
          this.resetCombo();
          audioManager.playSFX('mg_miss');
          this.showBadCatchFeedback(item);
          this.items.splice(i, 1);
          this.tweens.killTweensOf(item);
          // Delay destroy slightly so feedback can reference position
          this.time.delayedCall(10, () => {
            if (item.active) item.destroy();
          });
        } else {
          // Good item caught
          this.incrementCombo();
          this.totalGoodCatches++;
          this.updateLangosTint();

          const multiplier = this.getComboMultiplier();
          const basePoints = item.isGolden ? GOLDEN_POINTS : 10;
          const pointsAwarded = Math.round(basePoints * multiplier);
          this.score += pointsAwarded;

          audioManager.playSFX('mg_catch');

          if (item.isGolden) {
            this.showGoldenCatchSparkle(item.x, item.y);
            this.showGoldenFlash();
          }

          this.showGoodCatchFeedback(item, pointsAwarded);
          this.items.splice(i, 1);
          this.tweens.killTweensOf(item);
          // item destruction handled by showGoodCatchFeedback scale tween
        }

        uiManager.updateMinigameOverlay({ score: this.score });
      }
    }
  }

  private getEndgameTitle(): string {
    if (this.score >= 300) return 'Master Chef!';
    if (this.score >= 200) return 'Tasty Langos!';
    if (this.score >= 100) return 'Needs More Toppings';
    return 'Hungry Tourist';
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.countdownTimer.destroy();
    this.goldenTimer.destroy();
    for (const item of [...this.items]) {
      this.tweens.killTweensOf(item);
      item.destroy();
    }
    this.items = [];
    this.tweens.killAll();

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    const title = this.getEndgameTitle();
    uiManager.showMinigameResult(title, this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
