// src/game/scenes/minigames/PaprikaSortScene.ts
// Drag-and-drop spice sorting — sort jars into Hot / Warm / Mild baskets

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';
import { audioManager } from '../../../audio/AudioManager';

const SPICES: Array<{ name: string; color: number; category: string }> = [
  { name: 'Paprika', color: 0xCC2222, category: 'Hot' },
  { name: 'Pepper', color: 0x222222, category: 'Hot' },
  { name: 'Chili', color: 0xDD4400, category: 'Hot' },
  { name: 'Saffron', color: 0xFFCC00, category: 'Warm' },
  { name: 'Cumin', color: 0xBB8844, category: 'Warm' },
  { name: 'Cinnamon', color: 0x8B4513, category: 'Warm' },
  { name: 'Caraway', color: 0x886633, category: 'Mild' },
  { name: 'Garlic', color: 0xEEEEDD, category: 'Mild' },
  { name: 'Parsley', color: 0x44AA44, category: 'Mild' },
];
const CATEGORIES = ['Hot', 'Warm', 'Mild'];
const CATEGORY_COLORS: Record<string, number> = { Hot: 0xCC2222, Warm: 0xDDAA00, Mild: 0x66AA66 };
const TOTAL_ROUNDS = 18;

export class PaprikaSortScene extends Phaser.Scene {
  private checkpointId!: string;
  private score = 0;
  private round = 0;
  private streak = 0;
  private dragging = false;
  private selectedBasket = 1;
  private currentJar: Phaser.GameObjects.Rectangle | null = null;
  private currentJarLabel: Phaser.GameObjects.Text | null = null;
  private currentSpice: typeof SPICES[0] | null = null;
  private jarTimerBar: Phaser.GameObjects.Rectangle | null = null;
  private jarTimeLeft = 4;
  private jarTimerEvent: Phaser.Time.TimerEvent | null = null;
  private baskets: Array<{
    rect: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    category: string;
    x: number;
    y: number;
  }> = [];
  private streakText!: Phaser.GameObjects.Text;
  private selectionRing: Phaser.GameObjects.Rectangle | null = null;
  private gameOver = false;
  private jarOriginX = 0;
  private jarOriginY = 0;
  private spiceQueue: typeof SPICES[0][] = [];
  private processing = false;

  constructor() {
    super({ key: 'PaprikaSortScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.score = 0;
    this.round = 0;
    this.streak = 0;
    this.dragging = false;
    this.selectedBasket = 1;
    this.currentJar = null;
    this.currentJarLabel = null;
    this.currentSpice = null;
    this.jarTimerBar = null;
    this.jarTimeLeft = 4;
    this.jarTimerEvent = null;
    this.baskets = [];
    this.selectionRing = null;
    this.gameOver = false;
    this.processing = false;
    this.spiceQueue = [];
  }

  create(): void {
    const { width, height } = this.scale;

    // Warm market background
    this.add.rectangle(width / 2, height / 2, width, height, 0x3A2A1A);

    audioManager.transitionToScene(this.scene.key);
    audioManager.playSFX('mg_start');

    uiManager.showMinigameOverlay({
      title: 'Paprika Sort!',
      score: 0,
      progress: `0/${TOTAL_ROUNDS}`,
      onExit: () => this.endGame(),
    });

    // Build spice queue — 18 rounds, each spice appears twice, shuffled
    const pool = [...SPICES, ...SPICES];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.spiceQueue = pool;

    // Create baskets at bottom
    const basketY = height - 50;
    const basketSpacing = width / (CATEGORIES.length + 1);
    CATEGORIES.forEach((cat, i) => {
      const bx = basketSpacing * (i + 1);
      const rect = this.add.rectangle(bx, basketY, 70, 50, 0x2A1A0A);
      rect.setStrokeStyle(3, CATEGORY_COLORS[cat]);

      const label = this.add.text(bx, basketY + 35, cat, {
        fontSize: '12px',
        color: '#FFFFFF',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5);

      this.baskets.push({ rect, label, category: cat, x: bx, y: basketY });
    });

    // Selection ring for keyboard
    this.selectionRing = this.add.rectangle(
      this.baskets[this.selectedBasket].x,
      this.baskets[this.selectedBasket].y,
      80, 60
    );
    this.selectionRing.setStrokeStyle(2, 0xFFFFFF);
    this.selectionRing.setFillStyle(0x000000, 0);
    this.selectionRing.setAlpha(0.5);

    // Streak text
    this.streakText = this.add.text(width / 2, height / 2, '', {
      fontSize: '18px',
      color: '#FFD700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Input: drag
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver || this.processing || !this.currentJar) return;
      const jar = this.currentJar;
      const dx = Math.abs(pointer.x - jar.x);
      const dy = Math.abs(pointer.y - jar.y);
      if (dx < 30 && dy < 35) {
        this.dragging = true;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging || !this.currentJar || !this.currentJarLabel) return;
      this.currentJar.setPosition(pointer.x, pointer.y);
      this.currentJarLabel.setPosition(pointer.x, pointer.y);
      this.highlightNearbyBasket(pointer.x, pointer.y);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging || !this.currentJar) return;
      this.dragging = false;
      this.resetBasketGlow();

      // Check overlap with baskets
      const basket = this.getOverlappingBasket(pointer.x, pointer.y);
      if (basket) {
        this.resolveSort(basket.category);
      } else {
        // Snap back to origin
        if (this.currentJar && this.currentJarLabel) {
          this.tweens.add({
            targets: [this.currentJar, this.currentJarLabel],
            x: this.jarOriginX,
            y: this.jarOriginY,
            duration: 150,
            ease: 'Back.easeOut',
          });
        }
      }
    });

    // Keyboard input
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => {
        if (this.gameOver || this.processing) return;
        this.selectedBasket = Math.max(0, this.selectedBasket - 1);
        this.updateSelectionRing();
      });
      this.input.keyboard.on('keydown-RIGHT', () => {
        if (this.gameOver || this.processing) return;
        this.selectedBasket = Math.min(CATEGORIES.length - 1, this.selectedBasket + 1);
        this.updateSelectionRing();
      });
      this.input.keyboard.on('keydown-SPACE', () => {
        if (this.gameOver || this.processing || !this.currentJar) return;
        this.resolveSort(CATEGORIES[this.selectedBasket]);
      });
      this.input.keyboard.on('keydown-ENTER', () => {
        if (this.gameOver || this.processing || !this.currentJar) return;
        this.resolveSort(CATEGORIES[this.selectedBasket]);
      });
    }

    // Start first round
    this.time.delayedCall(400, () => this.spawnJar());
  }

  private getTimerDuration(): number {
    if (this.round < 6) return 4;
    if (this.round < 12) return 3;
    return 2.5;
  }

  private spawnJar(): void {
    if (this.gameOver || this.round >= TOTAL_ROUNDS) {
      this.endGame();
      return;
    }

    const { width } = this.scale;
    const spice = this.spiceQueue[this.round];
    this.currentSpice = spice;

    this.jarOriginX = width / 2;
    this.jarOriginY = 55;

    // Jar rectangle
    this.currentJar = this.add.rectangle(this.jarOriginX, this.jarOriginY, 40, 50, spice.color);
    this.currentJar.setStrokeStyle(2, 0xFFFFFF);
    this.currentJar.setDepth(5);

    // Jar label
    const textColor = spice.color === 0x222222 || spice.color === 0x8B4513 ? '#FFFFFF' : '#000000';
    this.currentJarLabel = this.add.text(this.jarOriginX, this.jarOriginY, spice.name, {
      fontSize: '9px',
      color: textColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(6);

    // Entrance tween
    this.currentJar.setScale(0);
    this.currentJarLabel.setScale(0);
    this.tweens.add({
      targets: [this.currentJar, this.currentJarLabel],
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Timer bar
    const timerDuration = this.getTimerDuration();
    this.jarTimeLeft = timerDuration;
    const barWidth = 60;
    this.jarTimerBar = this.add.rectangle(this.jarOriginX, this.jarOriginY - 35, barWidth, 5, 0x44DD44);
    this.jarTimerBar.setDepth(6);

    // Timer countdown via scene update tracked by jarTimeLeft
    if (this.jarTimerEvent) {
      this.jarTimerEvent.remove(false);
    }
    this.jarTimerEvent = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (this.gameOver || this.processing) return;
        this.jarTimeLeft -= 0.05;
        if (this.jarTimerBar) {
          const frac = Math.max(0, this.jarTimeLeft / timerDuration);
          this.jarTimerBar.width = 60 * frac;
          // Color shift: green -> yellow -> red
          if (frac > 0.5) {
            this.jarTimerBar.fillColor = 0x44DD44;
          } else if (frac > 0.25) {
            this.jarTimerBar.fillColor = 0xDDDD44;
          } else {
            this.jarTimerBar.fillColor = 0xDD4444;
          }
          // Follow jar if being dragged
          if (this.currentJar) {
            this.jarTimerBar.setPosition(this.currentJar.x, this.currentJar.y - 35);
          }
        }
        if (this.jarTimeLeft <= 0) {
          this.onTimeout();
        }
      },
    });

    this.processing = false;
  }

  private resolveSort(chosenCategory: string): void {
    if (this.processing || this.gameOver || !this.currentSpice || !this.currentJar) return;
    this.processing = true;

    if (this.jarTimerEvent) {
      this.jarTimerEvent.remove(false);
      this.jarTimerEvent = null;
    }

    const correct = chosenCategory === this.currentSpice.category;
    const basket = this.baskets.find(b => b.category === chosenCategory)!;

    if (correct) {
      this.onCorrectSort(basket);
    } else {
      this.onWrongSort(basket);
    }
  }

  private onCorrectSort(basket: { x: number; y: number; category: string }): void {
    this.streak++;
    const multiplier = Math.min(3, 1 + this.streak * 0.25);
    const timeBonus = Math.round(Math.max(0, this.jarTimeLeft) * 15);
    const points = Math.round((50 + timeBonus) * multiplier);
    this.score += points;
    this.round++;

    audioManager.playSFX('mg_correct');

    // Streak milestones
    if (this.streak === 5 || this.streak === 10) {
      audioManager.playSFX('mg_score_up');
      this.flashScreen(0xFFD700, 0.3, 200);
    }

    // Update streak display
    if (this.streak >= 3) {
      const mult = Math.min(3, 1 + this.streak * 0.25);
      this.streakText.setText(`x${mult.toFixed(1)} Streak!`);
      this.tweens.add({
        targets: this.streakText,
        alpha: 1,
        duration: 150,
        yoyo: true,
        hold: 600,
        onComplete: () => { if (this.streakText) this.streakText.setAlpha(0); },
      });
    }

    // Animate jar into basket
    const jar = this.currentJar!;
    const label = this.currentJarLabel!;
    this.tweens.add({
      targets: [jar, label],
      x: basket.x,
      y: basket.y,
      scaleX: 0,
      scaleY: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        jar.destroy();
        label.destroy();
        this.currentJar = null;
        this.currentJarLabel = null;

        // Sparkle burst — 6 gold particles
        this.spawnParticles(basket.x, basket.y, 6, 0xFFD700, 300);

        // Green flash
        this.flashScreen(0x44DD44, 0.15, 100);

        // Floating score text
        this.showFloatingText(basket.x, basket.y - 30, `+${points}`, '#44FF44');
      },
    });

    this.cleanupTimerBar();
    this.updateOverlay();

    this.time.delayedCall(500, () => this.spawnJar());
  }

  private onWrongSort(basket: { x: number; y: number; category: string }): void {
    this.score = Math.max(0, this.score - 20);
    this.streak = 0;
    this.round++;

    audioManager.playSFX('mg_wrong');

    const jar = this.currentJar!;
    const label = this.currentJarLabel!;

    // Move into basket briefly, then bounce out and shatter
    const bounceX = basket.x + Phaser.Math.Between(-60, 60);
    this.tweens.add({
      targets: [jar, label],
      x: basket.x,
      y: basket.y,
      duration: 100,
      ease: 'Power1',
      onComplete: () => {
        this.tweens.add({
          targets: [jar, label],
          x: bounceX,
          y: basket.y - 50,
          duration: 150,
          ease: 'Power2',
          onComplete: () => {
            // Shatter particles
            this.spawnParticles(bounceX, basket.y - 50, 4, 0x8B6633, 250);
            jar.destroy();
            label.destroy();
            this.currentJar = null;
            this.currentJarLabel = null;
          },
        });
      },
    });

    // Red flash + camera shake
    this.flashScreen(0xFF0000, 0.2, 150);
    this.cameras.main.shake(150, 0.006);

    // Floating penalty text
    this.showFloatingText(basket.x, basket.y - 40, '-20', '#FF4444');

    this.cleanupTimerBar();
    this.updateOverlay();

    this.time.delayedCall(600, () => this.spawnJar());
  }

  private onTimeout(): void {
    if (this.processing || this.gameOver) return;
    this.processing = true;

    if (this.jarTimerEvent) {
      this.jarTimerEvent.remove(false);
      this.jarTimerEvent = null;
    }

    this.streak = 0;
    this.round++;

    audioManager.playSFX('mg_wrong');

    const jar = this.currentJar;
    const label = this.currentJarLabel;
    const { height } = this.scale;

    if (jar && label) {
      const fallX = jar.x;
      this.tweens.add({
        targets: [jar, label],
        y: height + 40,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => {
          // Puff particles at bottom
          this.spawnParticles(fallX, height - 10, 4, 0xAA8855, 200);
          jar.destroy();
          label.destroy();
          this.currentJar = null;
          this.currentJarLabel = null;
        },
      });
    }

    // Orange flash
    this.flashScreen(0xFF8800, 0.2, 150);

    // "Too slow!" text
    const { width } = this.scale;
    this.showFloatingText(width / 2, height / 2, 'Too slow!', '#FF8800');

    this.cleanupTimerBar();
    this.updateOverlay();

    this.time.delayedCall(600, () => this.spawnJar());
  }

  private updateOverlay(): void {
    uiManager.updateMinigameOverlay({
      score: this.score,
      progress: `${this.round}/${TOTAL_ROUNDS}`,
    });
  }

  private cleanupTimerBar(): void {
    if (this.jarTimerBar) {
      this.jarTimerBar.destroy();
      this.jarTimerBar = null;
    }
  }

  private highlightNearbyBasket(px: number, py: number): void {
    this.baskets.forEach(b => {
      const dist = Phaser.Math.Distance.Between(px, py, b.x, b.y);
      if (dist < 60) {
        b.rect.setAlpha(1);
        b.rect.setStrokeStyle(4, 0xFFFFFF);
      } else {
        b.rect.setAlpha(0.8);
        b.rect.setStrokeStyle(3, CATEGORY_COLORS[b.category]);
      }
    });
  }

  private resetBasketGlow(): void {
    this.baskets.forEach(b => {
      b.rect.setAlpha(1);
      b.rect.setStrokeStyle(3, CATEGORY_COLORS[b.category]);
    });
  }

  private getOverlappingBasket(px: number, py: number) {
    for (const b of this.baskets) {
      if (Math.abs(px - b.x) < 45 && Math.abs(py - b.y) < 35) {
        return b;
      }
    }
    return null;
  }

  private updateSelectionRing(): void {
    if (!this.selectionRing) return;
    const b = this.baskets[this.selectedBasket];
    this.selectionRing.setPosition(b.x, b.y);
  }

  private flashScreen(color: number, alpha: number, duration: number): void {
    const { width, height } = this.scale;
    const flash = this.add.rectangle(width / 2, height / 2, width, height, color)
      .setAlpha(alpha).setDepth(20);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      onComplete: () => flash.destroy(),
    });
  }

  private spawnParticles(x: number, y: number, count: number, color: number, lifetime: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.add.rectangle(
        x + Phaser.Math.Between(-5, 5),
        y + Phaser.Math.Between(-5, 5),
        Phaser.Math.Between(3, 6),
        Phaser.Math.Between(3, 6),
        color
      ).setDepth(15);

      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-40, 10),
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: lifetime,
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  private showFloatingText(x: number, y: number, msg: string, color: string): void {
    const txt = this.add.text(x, y, msg, {
      fontSize: '16px',
      color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: txt,
      y: y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;

    if (this.jarTimerEvent) {
      this.jarTimerEvent.remove(false);
      this.jarTimerEvent = null;
    }

    // Clean up active jar
    if (this.currentJar) { this.currentJar.destroy(); this.currentJar = null; }
    if (this.currentJarLabel) { this.currentJarLabel.destroy(); this.currentJarLabel = null; }
    this.cleanupTimerBar();

    // Determine tier
    let tier: string;
    if (this.score >= 700) tier = 'Spice Master!';
    else if (this.score >= 400) tier = 'Market Regular!';
    else if (this.score >= 200) tier = 'Still Learning';
    else tier = 'Tourist Prices';

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    audioManager.playSFX('mg_complete');
    uiManager.showMinigameResult(tier, this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }
}
