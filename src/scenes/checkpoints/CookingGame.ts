import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';

interface CookingConfig {
  orders: Array<{ name: string; items: string[] }>;
  timeLimit: number;
}

interface CookingData {
  checkpointId: string;
  config: CookingConfig;
}

export class CookingGame extends Phaser.Scene {
  private checkpointId!: string;
  private config!: CookingConfig;
  private currentOrderIndex = 0;
  private selectedItems: string[] = [];
  private score = 0;
  private timeLeft = 30;
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private orderText!: Phaser.GameObjects.Text;
  private selectedText!: Phaser.GameObjects.Text;
  private gameOver = false;
  private timerEvent!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'CookingGame' });
  }

  init(data: CookingData): void {
    this.checkpointId = data.checkpointId;
    this.config = data.config;
    this.currentOrderIndex = 0;
    this.selectedItems = [];
    this.score = 0;
    this.timeLeft = data.config.timeLimit;
    this.gameOver = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, 20, 'Fill the Orders!', {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    // Quit button
    const quitBtn = this.add.text(width - 16, 10, 'X', {
      fontSize: '18px',
      color: '#ef4444',
      backgroundColor: '#1e1b2e',
      padding: { x: 12, y: 8 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(999);

    quitBtn.on('pointerdown', () => {
      if (!this.gameOver) this.timerEvent.destroy();
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    });

    // Timer
    this.timerText = this.add.text(width - 20, 20, `Time: ${this.timeLeft}s`, {
      fontSize: '16px', color: '#ef4444',
    }).setOrigin(1, 0);

    this.scoreText = this.add.text(20, 20, `Orders: ${this.score}`, {
      fontSize: '16px', color: '#22c55e',
    });

    // Current order display
    this.orderText = this.add.text(width / 2, 70, '', {
      fontSize: '16px', color: '#ffd700', align: 'center',
    }).setOrigin(0.5);

    // Selected items display
    this.selectedText = this.add.text(width / 2, height - 120, 'Your tray: (empty)', {
      fontSize: '14px', color: '#94a3b8',
    }).setOrigin(0.5);

    // Gather all unique items from all orders
    const allItems = new Set<string>();
    this.config.orders.forEach((o) => o.items.forEach((item) => allItems.add(item)));
    const itemList = Array.from(allItems);

    // Item shelf
    const shelfY = height / 2 + 40;
    itemList.forEach((item, i) => {
      const btn = this.add.text(
        width / 2 - ((itemList.length - 1) * 70) / 2 + i * 70,
        shelfY,
        item.replace(/-/g, ' '),
        {
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: '#2a2a4a',
          padding: { x: 14, y: 14 },
        }
      ).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setBackgroundColor('#3a3a5a'));
      btn.on('pointerout', () => btn.setBackgroundColor('#2a2a4a'));
      btn.on('pointerdown', () => this.selectItem(item));
    });

    // Submit button
    const submitBtn = this.add.text(width / 2, height - 60, '[ Submit Order ]', {
      fontSize: '18px', color: '#7c3aed',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    submitBtn.on('pointerdown', () => this.submitOrder());

    // Clear button
    const clearBtn = this.add.text(width / 2, height - 30, '[ Clear ]', {
      fontSize: '14px', color: '#ef4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    clearBtn.on('pointerdown', () => {
      this.selectedItems = [];
      this.selectedText.setText('Your tray: (empty)');
    });

    this.showCurrentOrder();

    // Timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`Time: ${this.timeLeft}s`);
        if (this.timeLeft <= 0) this.endGame();
      },
      loop: true,
    });
  }

  private showCurrentOrder(): void {
    if (this.currentOrderIndex >= this.config.orders.length) {
      // Cycle orders
      this.currentOrderIndex = 0;
    }
    const order = this.config.orders[this.currentOrderIndex];
    this.orderText.setText(`Order: "${order.name}"\nNeed: ${order.items.map((i) => i.replace(/-/g, ' ')).join(', ')}`);
  }

  private selectItem(item: string): void {
    if (this.gameOver) return;
    this.selectedItems.push(item);
    this.selectedText.setText(`Your tray: ${this.selectedItems.map((i) => i.replace(/-/g, ' ')).join(', ')}`);
  }

  private submitOrder(): void {
    if (this.gameOver) return;
    const order = this.config.orders[this.currentOrderIndex];

    // Check if selected items match order (same items, same order)
    const correct = order.items.length === this.selectedItems.length &&
      order.items.every((item, i) => item === this.selectedItems[i]);

    if (correct) {
      this.score++;
      this.scoreText.setText(`Orders: ${this.score}`);
      this.currentOrderIndex++;
      this.showCurrentOrder();
    }

    this.selectedItems = [];
    this.selectedText.setText('Your tray: (empty)');
  }

  private endGame(): void {
    this.gameOver = true;
    this.timerEvent.destroy();
    saveMiniGameScore(this.checkpointId, this.score);

    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, 300, 200, 0x1e1b2e, 0.95)
      .setStrokeStyle(2, 0x7c3aed).setDepth(200);

    this.add.text(width / 2, height / 2 - 40, `${this.score} orders filled!`, {
      fontSize: '24px', color: '#ffd700',
    }).setOrigin(0.5).setDepth(201);

    const backBtn = this.add.text(width / 2, height / 2 + 30, '[ Back to Map ]', {
      fontSize: '18px', color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(201);

    backBtn.on('pointerdown', () => {
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    });
  }
}
