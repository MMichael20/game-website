import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';

interface PuzzleData {
  checkpointId: string;
  config: {
    photo?: string;
    gridSize?: number;
  };
}

export class PuzzleGame extends Phaser.Scene {
  private checkpointId!: string;
  private gridSize = 3;
  private tiles: Phaser.GameObjects.Rectangle[] = [];
  private positions: Array<{ x: number; y: number }> = [];
  private correctOrder: number[] = [];
  private currentOrder: number[] = [];
  private startTime = 0;
  private dragTile: number | null = null;

  constructor() {
    super({ key: 'PuzzleGame' });
  }

  init(data: PuzzleData): void {
    this.checkpointId = data.checkpointId;
    this.gridSize = data.config.gridSize || 3;
    this.tiles = [];
    this.positions = [];
    this.correctOrder = [];
    this.currentOrder = [];
    this.dragTile = null;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, 20, 'Solve the Puzzle!', {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    const tileSize = 80;
    const gap = 4;
    const totalSize = this.gridSize * (tileSize + gap) - gap;
    const startX = width / 2 - totalSize / 2 + tileSize / 2;
    const startY = height / 2 - totalSize / 2 + tileSize / 2;

    // Create grid positions
    const indices: number[] = [];
    for (let i = 0; i < this.gridSize * this.gridSize; i++) {
      indices.push(i);
      const row = Math.floor(i / this.gridSize);
      const col = i % this.gridSize;
      this.positions.push({
        x: startX + col * (tileSize + gap),
        y: startY + row * (tileSize + gap),
      });
    }
    this.correctOrder = [...indices];

    // Shuffle
    const shuffled = [...indices];
    Phaser.Utils.Array.Shuffle(shuffled);
    this.currentOrder = shuffled;

    // Create tiles with colored segments to form a gradient pattern
    shuffled.forEach((tileIndex, posIndex) => {
      const pos = this.positions[posIndex];
      const hue = (tileIndex / (this.gridSize * this.gridSize)) * 360;
      const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.5).color;

      const tile = this.add.rectangle(pos.x, pos.y, tileSize, tileSize, color)
        .setStrokeStyle(1, 0x444466)
        .setInteractive({ useHandCursor: true, draggable: true });

      const label = this.add.text(pos.x, pos.y, `${tileIndex + 1}`, {
        fontSize: '20px', color: '#ffffff',
      }).setOrigin(0.5);

      (tile as any).__tileIndex = tileIndex;
      (tile as any).__posIndex = posIndex;
      (tile as any).__label = label;
      this.tiles.push(tile);
    });

    // Drag events
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle) => {
      obj.setDepth(100);
      (obj as any).__label.setDepth(101);
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle, dragX: number, dragY: number) => {
      obj.x = dragX;
      obj.y = dragY;
      (obj as any).__label.setPosition(dragX, dragY);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle) => {
      // Find closest position
      let closestPos = 0;
      let closestDist = Infinity;
      this.positions.forEach((pos, i) => {
        const dist = Phaser.Math.Distance.Between(obj.x, obj.y, pos.x, pos.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestPos = i;
        }
      });

      // Swap with tile at that position
      const myPosIndex = (obj as any).__posIndex;
      const otherTile = this.tiles.find((t) => (t as any).__posIndex === closestPos);

      if (otherTile && otherTile !== obj) {
        // Swap positions
        (otherTile as any).__posIndex = myPosIndex;
        (obj as any).__posIndex = closestPos;

        const otherPos = this.positions[myPosIndex];
        otherTile.setPosition(otherPos.x, otherPos.y);
        (otherTile as any).__label.setPosition(otherPos.x, otherPos.y);

        // Update current order
        this.currentOrder[myPosIndex] = (otherTile as any).__tileIndex;
        this.currentOrder[closestPos] = (obj as any).__tileIndex;
      }

      const snapPos = this.positions[closestPos];
      obj.setPosition(snapPos.x, snapPos.y);
      (obj as any).__label.setPosition(snapPos.x, snapPos.y);
      obj.setDepth(0);
      (obj as any).__label.setDepth(1);

      // Check win
      this.checkWin();
    });

    this.startTime = Date.now();
  }

  private checkWin(): void {
    const isCorrect = this.currentOrder.every((val, i) => val === this.correctOrder[i]);
    if (isCorrect) {
      const elapsed = Math.round((Date.now() - this.startTime) / 1000);
      this.showResults(elapsed);
    }
  }

  private showResults(seconds: number): void {
    const { width, height } = this.cameras.main;
    saveMiniGameScore(this.checkpointId, seconds, true); // lower time = better

    this.add.rectangle(width / 2, height / 2, 300, 200, 0x1e1b2e, 0.95)
      .setStrokeStyle(2, 0x7c3aed).setDepth(200);

    this.add.text(width / 2, height / 2 - 40, `Solved in ${seconds}s!`, {
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
