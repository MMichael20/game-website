import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';

interface CatchConfig {
  items: string[];
  speed: number;
  spawnRate: number;
}

interface CatchData {
  checkpointId: string;
  config: CatchConfig;
}

export class CatchGame extends Phaser.Scene {
  private checkpointId!: string;
  private config!: CatchConfig;
  private basket!: Phaser.GameObjects.Rectangle;
  private score = 0;
  private misses = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private missText!: Phaser.GameObjects.Text;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private gameOver = false;

  constructor() {
    super({ key: 'CatchGame' });
  }

  init(data: CatchData): void {
    this.checkpointId = data.checkpointId;
    this.config = data.config;
    this.score = 0;
    this.misses = 0;
    this.gameOver = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Basket
    this.basket = this.add.rectangle(width / 2, height - 40, 60, 20, 0x8B4513);
    this.physics.add.existing(this.basket);
    (this.basket.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.basket.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    // UI
    this.scoreText = this.add.text(10, 10, 'Caught: 0', {
      fontSize: '16px', color: '#22c55e',
    }).setScrollFactor(0);

    this.missText = this.add.text(10, 30, 'Missed: 0/3', {
      fontSize: '16px', color: '#ef4444',
    }).setScrollFactor(0);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Spawn items
    this.spawnTimer = this.time.addEvent({
      delay: this.config.spawnRate,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true,
    });
  }

  private spawnItem(): void {
    if (this.gameOver) return;
    const { width } = this.cameras.main;
    const x = Phaser.Math.Between(30, width - 30);
    const item = this.add.circle(x, -10, 10, 0xffd700);
    this.physics.add.existing(item);
    (item.body as Phaser.Physics.Arcade.Body).setVelocityY(this.config.speed * 60);
  }

  update(): void {
    if (this.gameOver) return;

    const body = this.basket.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    if (this.cursors.left.isDown) body.setVelocityX(-300);
    else if (this.cursors.right.isDown) body.setVelocityX(300);

    // Check catches and misses
    const { height } = this.cameras.main;
    this.children.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Arc && child.body) {
        const itemBody = child.body as Phaser.Physics.Arcade.Body;
        const basketBody = this.basket.body as Phaser.Physics.Arcade.Body;

        if (Phaser.Geom.Intersects.RectangleToRectangle(
          itemBody.getBounds(new Phaser.Geom.Rectangle()),
          basketBody.getBounds(new Phaser.Geom.Rectangle())
        )) {
          this.score++;
          this.scoreText.setText(`Caught: ${this.score}`);
          child.destroy();
        } else if (child.y > height + 10) {
          this.misses++;
          this.missText.setText(`Missed: ${this.misses}/3`);
          child.destroy();
          if (this.misses >= 3) this.endGame();
        }
      }
    });
  }

  private endGame(): void {
    this.gameOver = true;
    this.spawnTimer.destroy();
    saveMiniGameScore(this.checkpointId, this.score);

    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, 300, 200, 0x1e1b2e)
      .setStrokeStyle(2, 0x7c3aed);

    this.add.text(width / 2, height / 2 - 40, `Caught ${this.score}!`, {
      fontSize: '28px', color: '#ffd700',
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
