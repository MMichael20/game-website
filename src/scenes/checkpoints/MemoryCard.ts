import Phaser from 'phaser';
import { markCheckpointVisited, loadGameState } from '../../utils/storage';
import checkpointData from '../../data/checkpoints.json';

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
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setInteractive(); // Block clicks through

    // Card background
    const cardW = 420;
    const cardH = 480;
    const cardX = width / 2;
    const cardY = height / 2;

    this.add.rectangle(cardX, cardY, cardW, cardH, 0x1e1b2e)
      .setStrokeStyle(2, 0x7c3aed);

    // Photo (placeholder for now)
    const photoKey = this.textures.exists(cp.memory.photo)
      ? cp.memory.photo
      : 'placeholder-photo';
    const photo = this.add.image(cardX, cardY - 100, photoKey);
    photo.setDisplaySize(380, 180);

    // Location name
    this.add.text(cardX, cardY + 10, cp.name, {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // Message
    this.add.text(cardX, cardY + 50, `"${cp.memory.message}"`, {
      fontSize: '14px',
      color: '#94a3b8',
      fontStyle: 'italic',
      wordWrap: { width: 360 },
      align: 'center',
    }).setOrigin(0.5, 0);

    // Date
    if (cp.memory.date) {
      this.add.text(cardX, cardY + 110, cp.memory.date, {
        fontSize: '12px',
        color: '#64748b',
      }).setOrigin(0.5);
    }

    // Mini-game button (if available)
    if (cp.miniGame) {
      const playBtn = this.add.text(cardX, cardY + 160, '[ Play Mini-Game! ]', {
        fontSize: '18px',
        color: '#7c3aed',
        padding: { x: 16, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      playBtn.on('pointerover', () => playBtn.setColor('#a78bfa'));
      playBtn.on('pointerout', () => playBtn.setColor('#7c3aed'));
      playBtn.on('pointerdown', () => {
        const sceneKey = this.getMiniGameSceneKey(cp.miniGame!.type);
        this.scene.stop(); // Stop MemoryCard overlay
        this.scene.launch(sceneKey, { // Launch mini-game (WorldScene stays paused underneath)
          checkpointId: this.checkpointId,
          config: cp.miniGame!.config,
        });
      });
    }

    // Close button (44px+ touch target)
    const closeBtn = this.add.text(cardX + cardW / 2 - 24, cardY - cardH / 2 + 24, 'X', {
      fontSize: '20px',
      color: '#ef4444',
      backgroundColor: '#1e1b2e',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.closeCard());

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
