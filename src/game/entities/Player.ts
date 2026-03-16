// src/game/entities/Player.ts
import Phaser from 'phaser';
import { worldToTile } from '../data/mapLayout';

const SPEED = 120; // pixels per second

export type WalkCheck = (tileX: number, tileY: number) => boolean;

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private currentOutfit = 0;
  private facing: 'down' | 'left' | 'right' | 'up' = 'down';
  private walkCheck: WalkCheck;

  constructor(scene: Phaser.Scene, x: number, y: number, outfit: number, walkCheck?: WalkCheck) {
    this.walkCheck = walkCheck ?? (() => true);
    this.currentOutfit = outfit;
    const key = `player-outfit-${outfit}`;
    this.sprite = scene.physics.add.sprite(x, y, key, 0);
    this.sprite.setSize(36, 36);
    this.sprite.setOffset(14, 22);
    this.sprite.setDepth(10);

    this.createAnimations(scene);
  }

  private createAnimations(scene: Phaser.Scene): void {
    const key = `player-outfit-${this.currentOutfit}`;
    const directions = ['down', 'left', 'right', 'up'];
    directions.forEach((dir, row) => {
      const animKey = `player-${dir}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: [
            { key, frame: row * 3 },
            { key, frame: row * 3 + 1 },
            { key, frame: row * 3 + 2 },
            { key, frame: row * 3 + 1 },
          ],
          frameRate: 8,
          repeat: -1,
        });
      }
    });
  }

  update(direction: { x: number; y: number }): void {
    const vx = direction.x * SPEED;
    const vy = direction.y * SPEED;

    // Collision check against walkability grid
    const nextX = this.sprite.x + vx * (1 / 60);
    const nextY = this.sprite.y + vy * (1 / 60);

    let finalVx = vx;
    let finalVy = vy;

    if (!this.walkCheck(worldToTile(nextX, this.sprite.y).x, worldToTile(nextX, this.sprite.y).y)) {
      finalVx = 0;
    }
    if (!this.walkCheck(worldToTile(this.sprite.x, nextY).x, worldToTile(this.sprite.x, nextY).y)) {
      finalVy = 0;
    }

    this.sprite.setVelocity(finalVx, finalVy);

    // Animation
    if (finalVx !== 0 || finalVy !== 0) {
      if (Math.abs(finalVx) > Math.abs(finalVy)) {
        this.facing = finalVx < 0 ? 'left' : 'right';
      } else {
        this.facing = finalVy < 0 ? 'up' : 'down';
      }
      this.sprite.anims.play(`player-${this.facing}`, true);
    } else {
      this.sprite.anims.stop();
    }
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setOutfit(outfit: number, scene: Phaser.Scene): void {
    this.currentOutfit = outfit;
    this.sprite.setTexture(`player-outfit-${outfit}`);
    // Re-create anims if needed
    this.createAnimations(scene);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
