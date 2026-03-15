import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';

interface MatchConfig {
  pairs: Array<{ a: string; b: string }>;
}

interface MatchData {
  checkpointId: string;
  config: MatchConfig;
}

export class MatchGame extends Phaser.Scene {
  private checkpointId!: string;
  private cards: Array<{ text: string; pairIndex: number; revealed: boolean; matched: boolean; obj: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }> = [];
  private flipped: number[] = [];
  private moves = 0;
  private movesText!: Phaser.GameObjects.Text;
  private canFlip = true;

  constructor() {
    super({ key: 'MatchGame' });
  }

  init(data: MatchData): void {
    this.checkpointId = data.checkpointId;
    this.cards = [];
    this.flipped = [];
    this.moves = 0;
    this.canFlip = true;

    // Build card deck from pairs
    const items: Array<{ text: string; pairIndex: number }> = [];
    const pairs = data.config.pairs || [
      { a: 'Movie 1', b: 'Quote 1' },
      { a: 'Movie 2', b: 'Quote 2' },
      { a: 'Movie 3', b: 'Quote 3' },
      { a: 'Movie 4', b: 'Quote 4' },
    ];
    pairs.forEach((pair, i) => {
      items.push({ text: pair.a, pairIndex: i });
      items.push({ text: pair.b, pairIndex: i });
    });
    Phaser.Utils.Array.Shuffle(items);

    // Store for create
    (this as any).__items = items;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const items = (this as any).__items as Array<{ text: string; pairIndex: number }>;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, 20, 'Match the Pairs!', {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    this.movesText = this.add.text(width / 2, 50, 'Moves: 0', {
      fontSize: '14px', color: '#94a3b8',
    }).setOrigin(0.5);

    // Grid layout
    const cols = 4;
    const rows = Math.ceil(items.length / cols);
    const cardW = 140;
    const cardH = 60;
    const gap = 10;
    const startX = width / 2 - ((cols * (cardW + gap)) - gap) / 2 + cardW / 2;
    const startY = 90 + cardH / 2;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const card = this.add.rectangle(x, y, cardW, cardH, 0x2a2a4a)
        .setStrokeStyle(1, 0x444466)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(x, y, '?', {
        fontSize: '14px', color: '#666',
      }).setOrigin(0.5);

      const cardData = {
        text: item.text,
        pairIndex: item.pairIndex,
        revealed: false,
        matched: false,
        obj: card,
        label,
      };
      this.cards.push(cardData);

      card.on('pointerdown', () => this.flipCard(i));
    });
  }

  private flipCard(index: number): void {
    if (!this.canFlip) return;
    const card = this.cards[index];
    if (card.revealed || card.matched) return;

    card.revealed = true;
    card.obj.setFillStyle(0x3a3a5a);
    card.label.setText(card.text).setColor('#ffffff');
    this.flipped.push(index);

    if (this.flipped.length === 2) {
      this.moves++;
      this.movesText.setText(`Moves: ${this.moves}`);
      this.canFlip = false;

      const [i1, i2] = this.flipped;
      if (this.cards[i1].pairIndex === this.cards[i2].pairIndex) {
        // Match!
        this.cards[i1].matched = true;
        this.cards[i2].matched = true;
        this.cards[i1].obj.setFillStyle(0x22c55e);
        this.cards[i2].obj.setFillStyle(0x22c55e);
        this.flipped = [];
        this.canFlip = true;

        // Check win
        if (this.cards.every((c) => c.matched)) {
          this.time.delayedCall(500, () => this.showResults());
        }
      } else {
        // No match — flip back
        this.time.delayedCall(800, () => {
          this.cards[i1].revealed = false;
          this.cards[i2].revealed = false;
          this.cards[i1].obj.setFillStyle(0x2a2a4a);
          this.cards[i2].obj.setFillStyle(0x2a2a4a);
          this.cards[i1].label.setText('?').setColor('#666');
          this.cards[i2].label.setText('?').setColor('#666');
          this.flipped = [];
          this.canFlip = true;
        });
      }
    }
  }

  private showResults(): void {
    const { width, height } = this.cameras.main;
    saveMiniGameScore(this.checkpointId, this.moves, true); // lower moves = better

    this.add.rectangle(width / 2, height / 2, 300, 200, 0x1e1b2e, 0.95)
      .setStrokeStyle(2, 0x7c3aed);

    this.add.text(width / 2, height / 2 - 40, `Done in ${this.moves} moves!`, {
      fontSize: '24px', color: '#ffd700',
    }).setOrigin(0.5);

    const backBtn = this.add.text(width / 2, height / 2 + 30, '[ Back to Map ]', {
      fontSize: '18px', color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    });
  }
}
