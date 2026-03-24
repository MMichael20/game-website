// src/game/scenes/minigames/ChimneyCakeScene.ts
// Stack layers of chimney cake! Drop swinging layers accurately to build the tallest cake.

import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore, markCheckpointVisited } from '../../systems/SaveSystem';

const TOTAL_ROUNDS = 10;
const BASE_WIDTH = 60;
const LAYER_HEIGHT = 15;
const BASE_SWING_SPEED = 2.0;
const SWING_SPEED_INCREMENT = 0.3;
const PERFECT_THRESHOLD = 3;
const GOOD_THRESHOLD = 8;
const OK_THRESHOLD = 15;

// Golden-brown shades per layer for visual depth
const LAYER_COLORS = [
  0xD4A043, 0xC89838, 0xBE902E, 0xD2A850, 0xC49535,
  0xB88A2A, 0xD6AD58, 0xCA9D40, 0xC09030, 0xD8B060,
];

export class ChimneyCakeScene extends Phaser.Scene {
  private checkpointId!: string;
  private score = 0;
  private currentRound = 0;
  private gameOver = false;

  // Stack state
  private stackLayers: Phaser.GameObjects.Rectangle[] = [];
  private stackX = 0; // center X of the stack top
  private stackWidth = BASE_WIDTH; // current width of the stack top

  // Moving layer
  private movingLayer!: Phaser.GameObjects.Rectangle | null;
  private swingSpeed = BASE_SWING_SPEED;
  private swingDirection = 1;
  private canDrop = false;

  // Visuals
  private feedbackText!: Phaser.GameObjects.Text;
  private spitRod!: Phaser.GameObjects.Rectangle;
  private toppingDots: Phaser.GameObjects.Arc[] = [];
  private particleEmitters: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super({ key: 'ChimneyCakeScene' });
  }

  init(data: { checkpointId: string }): void {
    this.checkpointId = data.checkpointId;
    this.score = 0;
    this.currentRound = 0;
    this.gameOver = false;
    this.stackLayers = [];
    this.stackWidth = BASE_WIDTH;
    this.movingLayer = null;
    this.swingSpeed = BASE_SWING_SPEED;
    this.swingDirection = 1;
    this.canDrop = false;
    this.toppingDots = [];
    this.particleEmitters = [];
  }

  create(): void {
    const { width, height } = this.scale;

    // --- Background: warm bakery ---
    this.add.rectangle(width / 2, height / 2, width, height, 0x3A2A1A);

    // Floor / counter
    this.add.rectangle(width / 2, height - 20, width, 40, 0x5A4A3A);

    // Display case with pastries (background decoration, left side)
    this.drawDisplayCase(40, height - 100);

    // Display case right side
    this.drawDisplayCase(width - 60, height - 100);

    // Warm lighting overlay (subtle gradient feel)
    const warmOverlay = this.add.rectangle(width / 2, height * 0.3, width, height * 0.4, 0xFFAA44, 0.04);
    warmOverlay.setDepth(0);

    this.stackX = width / 2;

    // --- Base chimney cake cylinder ---
    const baseY = height - 60;
    const base = this.add.rectangle(this.stackX, baseY, BASE_WIDTH, LAYER_HEIGHT, 0x8B6914);
    base.setStrokeStyle(1, 0x6B4F10);
    this.stackLayers.push(base);

    // Chimney cake spit/rod (thin dark brown line through center)
    this.spitRod = this.add.rectangle(this.stackX, baseY - 60, 3, 140, 0x3E2A0A);
    this.spitRod.setDepth(0);

    // --- Feedback text ---
    this.feedbackText = this.add.text(width / 2, height / 2 - 40, '', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#FFD700',
      stroke: '#000',
      strokeThickness: 3,
      align: 'center',
    });
    this.feedbackText.setOrigin(0.5).setDepth(20).setAlpha(0);

    // --- Input ---
    this.input.on('pointerdown', () => this.dropLayer());
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.dropLayer());
    }

    // --- UI overlay ---
    uiManager.showMinigameOverlay({
      title: 'Chimney Cake!',
      score: 0,
      progress: 'Layer 1/10',
      onExit: () => this.endGame(),
    });

    // Start first round
    this.startNextRound();
  }

  update(): void {
    if (this.gameOver || !this.movingLayer || !this.canDrop) return;

    const { width } = this.scale;
    const halfWidth = this.stackWidth / 2;
    const minX = halfWidth + 10;
    const maxX = width - halfWidth - 10;

    // Swing the moving layer left-right
    this.movingLayer.x += this.swingSpeed * this.swingDirection;

    if (this.movingLayer.x >= maxX) {
      this.movingLayer.x = maxX;
      this.swingDirection = -1;
    } else if (this.movingLayer.x <= minX) {
      this.movingLayer.x = minX;
      this.swingDirection = 1;
    }
  }

  private dropLayer(): void {
    if (this.gameOver || !this.movingLayer || !this.canDrop) return;
    this.canDrop = false;

    const { width, height } = this.scale;
    const droppedLayer = this.movingLayer!;
    this.movingLayer = null;

    // Calculate target Y (on top of stack)
    const targetY = this.getStackTopY() - LAYER_HEIGHT;

    // Calculate overhang
    const droppedCenterX = droppedLayer.x;
    const offset = Math.abs(droppedCenterX - this.stackX);

    // Determine accuracy
    let points = 0;
    let feedbackMsg = '';
    let feedbackColor = '#FFFFFF';
    let newWidth = this.stackWidth;
    let isPerfect = false;

    if (offset <= PERFECT_THRESHOLD) {
      points = 100;
      feedbackMsg = 'Perfect!';
      feedbackColor = '#FFD700';
      isPerfect = true;
      // No width loss on perfect
    } else if (offset <= GOOD_THRESHOLD) {
      points = 60;
      feedbackMsg = 'Good!';
      feedbackColor = '#90EE90';
      newWidth = this.stackWidth - (offset - PERFECT_THRESHOLD) * 0.5;
    } else if (offset <= OK_THRESHOLD) {
      points = 30;
      feedbackMsg = 'OK';
      feedbackColor = '#FFAA44';
      newWidth = this.stackWidth - (offset - PERFECT_THRESHOLD) * 1.0;
    } else {
      points = 10;
      feedbackMsg = 'Bad...';
      feedbackColor = '#FF6666';
      newWidth = this.stackWidth - offset * 1.2;
    }

    newWidth = Math.max(0, Math.round(newWidth));

    // Check if stack is gone (complete miss)
    if (newWidth <= 0) {
      droppedLayer.destroy();
      this.showFeedback('Missed!', '#FF0000');
      this.time.delayedCall(600, () => this.endGame());
      return;
    }

    this.score += points;
    this.stackWidth = newWidth;

    // Update overlay
    uiManager.updateMinigameOverlay({
      score: this.score,
      progress: `Layer ${Math.min(this.currentRound + 1, TOTAL_ROUNDS)}/${TOTAL_ROUNDS}`,
    });

    // --- Animate the drop ---
    // Resize the layer to the new (possibly trimmed) width
    const layerColor = LAYER_COLORS[this.currentRound % LAYER_COLORS.length];

    // Snap to stack center X with the trimmed width
    const finalX = this.stackX;

    this.tweens.add({
      targets: droppedLayer,
      y: targetY,
      x: finalX,
      duration: 150,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        // Resize to trimmed width
        droppedLayer.setSize(this.stackWidth, LAYER_HEIGHT);
        droppedLayer.setFillStyle(layerColor);
        droppedLayer.setStrokeStyle(1, 0x8B6914);

        // Squish animation (scaleY squeeze then bounce back)
        this.tweens.add({
          targets: droppedLayer,
          scaleY: 0.6,
          duration: 60,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            droppedLayer.setScale(1, 1);
            this.stackLayers.push(droppedLayer);

            // Update spit rod height
            this.updateSpitRod();

            // Remove old topping dots
            this.clearToppingDots();

            // Add cinnamon sugar sparkles on top layer
            this.addToppingDots(finalX, targetY, this.stackWidth);

            // Perfect drop sparkle burst
            if (isPerfect) {
              this.spawnPerfectParticles(finalX, targetY);
            }

            // Show feedback text
            if (feedbackMsg) {
              this.showFeedback(feedbackMsg, feedbackColor);
            }

            // Next round or end
            this.currentRound++;
            if (this.currentRound >= TOTAL_ROUNDS) {
              this.time.delayedCall(800, () => this.endGame());
            } else {
              this.time.delayedCall(400, () => this.startNextRound());
            }
          },
        });
      },
    });
  }

  private startNextRound(): void {
    if (this.gameOver) return;

    const { width } = this.scale;

    // Increase swing speed
    this.swingSpeed = BASE_SWING_SPEED + this.currentRound * SWING_SPEED_INCREMENT;
    this.swingDirection = Math.random() < 0.5 ? 1 : -1;

    const layerColor = LAYER_COLORS[this.currentRound % LAYER_COLORS.length];
    const swingY = 40;

    // Create the moving layer at the top
    this.movingLayer = this.add.rectangle(
      width / 2,
      swingY,
      this.stackWidth,
      LAYER_HEIGHT,
      layerColor,
    );
    this.movingLayer.setStrokeStyle(1, 0x8B6914);
    this.movingLayer.setDepth(10);

    this.canDrop = true;

    uiManager.updateMinigameOverlay({
      progress: `Layer ${this.currentRound + 1}/${TOTAL_ROUNDS}`,
    });
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.canDrop = false;

    if (this.movingLayer) {
      this.movingLayer.destroy();
      this.movingLayer = null;
    }

    this.tweens.killAll();

    markCheckpointVisited(this.checkpointId);
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();

    // Determine result title based on score
    let title = 'Delicious!';
    if (this.score >= 800) title = 'Master Baker!';
    else if (this.score >= 500) title = 'Delicious!';
    else if (this.score >= 200) title = 'Not Bad!';
    else title = 'Keep Practicing!';

    uiManager.showMinigameResult(title, this.score, () => {
      uiManager.hideDialog();
      this.scene.start('BudapestOverworldScene');
    });
  }

  // --- Visual helpers ---

  private getStackTopY(): number {
    if (this.stackLayers.length === 0) {
      return this.scale.height - 60;
    }
    const topLayer = this.stackLayers[this.stackLayers.length - 1];
    return topLayer.y;
  }

  private updateSpitRod(): void {
    const topY = this.getStackTopY();
    const bottomY = this.scale.height - 60;
    const rodHeight = bottomY - topY + 40;
    this.spitRod.setPosition(this.stackX, topY - 20 + rodHeight / 2);
    this.spitRod.setSize(3, rodHeight);
  }

  private showFeedback(msg: string, color: string): void {
    this.feedbackText.setText(msg);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(1);
    this.feedbackText.setScale(0.5);
    this.feedbackText.y = this.scale.height / 2 - 40;

    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      y: this.feedbackText.y - 30,
      duration: 800,
      ease: 'Sine.easeOut',
    });
  }

  private addToppingDots(cx: number, cy: number, layerWidth: number): void {
    // Cinnamon sugar sparkles: small lighter dots scattered on the top layer
    const dotCount = Math.max(3, Math.floor(layerWidth / 8));
    for (let i = 0; i < dotCount; i++) {
      const dx = Phaser.Math.Between(-layerWidth / 2 + 3, layerWidth / 2 - 3);
      const dy = Phaser.Math.Between(-5, 3);
      const dotColor = Math.random() < 0.5 ? 0xF5DEB3 : 0xFFE4B5;
      const dot = this.add.circle(cx + dx, cy + dy, Phaser.Math.Between(1, 2), dotColor, 0.8);
      dot.setDepth(15);
      this.toppingDots.push(dot);
    }
  }

  private clearToppingDots(): void {
    for (const dot of this.toppingDots) {
      dot.destroy();
    }
    this.toppingDots = [];
  }

  private spawnPerfectParticles(cx: number, cy: number): void {
    // Golden sparkle burst for perfect drops
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = Phaser.Math.Between(20, 50);
      const px = cx + Math.cos(angle) * 5;
      const py = cy + Math.sin(angle) * 5;
      const sparkle = this.add.circle(px, py, Phaser.Math.Between(2, 4), 0xFFD700, 1);
      sparkle.setDepth(25);

      this.tweens.add({
        targets: sparkle,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 500 + Math.random() * 200,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  private drawDisplayCase(x: number, y: number): void {
    // Simple display case with pastry shapes
    const caseRect = this.add.rectangle(x, y, 50, 60, 0x4A3A2A, 0.6);
    caseRect.setStrokeStyle(1, 0x6B5B4B);
    caseRect.setDepth(0);

    // Glass front
    this.add.rectangle(x, y, 46, 56, 0x887766, 0.15).setDepth(0);

    // Pastry blobs inside
    const pastryColors = [0xD4A043, 0xC08030, 0xE8B84C];
    for (let i = 0; i < 3; i++) {
      const py = y - 15 + i * 18;
      const pastry = this.add.ellipse(x, py, 20, 10, pastryColors[i], 0.7);
      pastry.setDepth(0);
    }
  }
}
