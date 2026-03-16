import Phaser from 'phaser';
import { markCheckpointVisited, loadGameState } from '../../utils/storage';
import checkpointData from '../../data/checkpoints.json';
import { createPanel, createStyledButton, createStyledText, createCloseButton, addFadeTransition, UI_COLORS } from '../../rendering/UIRenderer';

interface MemoryCardData {
  checkpointId: string;
}

export class MemoryCard extends Phaser.Scene {
  private checkpointId!: string;

  constructor() {
    super({ key: 'MemoryCard' });
  }

  init(data: MemoryCardData): void {
    this.checkpointId = data.checkpointId;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const cp = checkpointData.checkpoints.find((c) => c.id === this.checkpointId);
    if (!cp) {
      this.closeCard();
      return;
    }

    // Mark as visited
    markCheckpointVisited(this.checkpointId);

    // Dim overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    overlay.setInteractive(); // Block clicks through

    // Card dimensions
    const cardW = Math.min(420, width * 0.92);
    const cardH = Math.min(480, height * 0.75);
    const cardX = width / 2;
    const cardY = height / 2;

    // Container for entry animation (all card elements positioned relative to 0,0)
    const cardContainer = this.add.container(cardX, cardY);

    // Use createPanel for the card background
    const panel = createPanel(this, -cardW / 2, -cardH / 2, cardW, cardH, {
      color: UI_COLORS.cream,
      radius: 16,
      shadow: true,
      strokeColor: UI_COLORS.gold,
      strokeWidth: 2,
    });
    cardContainer.add(panel);

    // Ornate corner decorations
    const corners = this.add.graphics();
    corners.lineStyle(2, UI_COLORS.gold, 0.6);
    const cx = -cardW / 2, cy = -cardH / 2;
    const cLen = 20;
    // Top-left
    corners.moveTo(cx + 8, cy + 8); corners.lineTo(cx + 8, cy + 8 + cLen);
    corners.moveTo(cx + 8, cy + 8); corners.lineTo(cx + 8 + cLen, cy + 8);
    // Top-right
    corners.moveTo(cardW / 2 - 8, cy + 8); corners.lineTo(cardW / 2 - 8, cy + 8 + cLen);
    corners.moveTo(cardW / 2 - 8, cy + 8); corners.lineTo(cardW / 2 - 8 - cLen, cy + 8);
    // Bottom-left
    corners.moveTo(cx + 8, cardH / 2 - 8); corners.lineTo(cx + 8, cardH / 2 - 8 - cLen);
    corners.moveTo(cx + 8, cardH / 2 - 8); corners.lineTo(cx + 8 + cLen, cardH / 2 - 8);
    // Bottom-right
    corners.moveTo(cardW / 2 - 8, cardH / 2 - 8); corners.lineTo(cardW / 2 - 8, cardH / 2 - 8 - cLen);
    corners.moveTo(cardW / 2 - 8, cardH / 2 - 8); corners.lineTo(cardW / 2 - 8 - cLen, cardH / 2 - 8);
    corners.strokePath();
    cardContainer.add(corners);

    // Photo (placeholder for now)
    const photoKey = this.textures.exists(cp.memory.photo)
      ? cp.memory.photo
      : 'placeholder-photo';
    const photo = this.add.image(0, -100, photoKey);
    photo.setDisplaySize(Math.min(380, cardW - 40), Math.min(180, cardH * 0.35));
    cardContainer.add(photo);

    // Location name in gold
    const locationText = createStyledText(this, 0, 10, cp.name, {
      fontSize: '22px',
      color: UI_COLORS.goldHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    cardContainer.add(locationText);

    // Message in muted italic
    const messageText = createStyledText(this, 0, 50, `"${cp.memory.message}"`, {
      fontSize: '14px',
      color: UI_COLORS.mutedHex,
      fontStyle: 'italic',
      wordWrap: { width: Math.min(360, cardW - 60) },
      align: 'center',
    }).setOrigin(0.5, 0);
    cardContainer.add(messageText);

    // Date
    if (cp.memory.date) {
      const dateText = createStyledText(this, 0, 110, cp.memory.date, {
        fontSize: '12px',
        color: '#64748b',
      }).setOrigin(0.5);
      cardContainer.add(dateText);
    }

    // Mini-game button (if available)
    if (cp.miniGame) {
      const { container: playBtnContainer } = createStyledButton(this, 0, 160, 'Play Mini-Game!', {
        color: UI_COLORS.purple,
        textColor: UI_COLORS.textHex,
        fontSize: '18px',
        paddingX: 24,
        paddingY: 12,
      });
      playBtnContainer.on('pointerdown', () => {
        const sceneKey = this.getMiniGameSceneKey(cp.miniGame!.type);
        this.scene.stop(); // Stop MemoryCard overlay
        this.scene.launch(sceneKey, { // Launch mini-game (WorldScene stays paused underneath)
          checkpointId: this.checkpointId,
          config: cp.miniGame!.config,
        });
      });
      cardContainer.add(playBtnContainer);
    }

    // Close button using createCloseButton
    const closeBtn = createCloseButton(this, cardW / 2 - 24, -cardH / 2 + 24, () => this.closeCard());
    cardContainer.add(closeBtn);

    // Entry animation — scale in with bounce
    cardContainer.setScale(0);
    this.tweens.add({
      targets: cardContainer,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Escape key to close (guard for keyboard-less devices)
    if (this.input.keyboard) {
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
        this.closeCard();
      });
    }
  }

  private getMiniGameSceneKey(type: string): string {
    const map: Record<string, string> = {
      quiz: 'QuizGame',
      catch: 'CatchGame',
      match: 'MatchGame',
      puzzle: 'PuzzleGame',
      cooking: 'CookingGame',
    };
    return map[type] || 'QuizGame';
  }

  private closeCard(): void {
    const worldScene = this.scene.get('WorldScene') as any;
    if (worldScene?.refreshUI) {
      worldScene.refreshUI();
    }
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
