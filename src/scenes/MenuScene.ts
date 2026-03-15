import Phaser from 'phaser';
import { hasSavedGame } from '../utils/storage';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Title
    this.add.text(width / 2, height / 3, 'Our Places', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 3 + 50, 'A little world of us', {
      fontSize: '16px',
      color: '#94a3b8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // New Game button
    const newGameBtn = this.add.text(width / 2, height / 2 + 40, '[ New Game ]', {
      fontSize: '24px',
      color: '#7c3aed',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    newGameBtn.on('pointerover', () => newGameBtn.setColor('#a78bfa'));
    newGameBtn.on('pointerout', () => newGameBtn.setColor('#7c3aed'));
    newGameBtn.on('pointerdown', () => this.scene.start('AvatarScene'));

    // Continue button (only if saved game exists)
    if (hasSavedGame()) {
      const continueBtn = this.add.text(width / 2, height / 2 + 80, '[ Continue ]', {
        fontSize: '24px',
        color: '#22c55e',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      continueBtn.on('pointerover', () => continueBtn.setColor('#4ade80'));
      continueBtn.on('pointerout', () => continueBtn.setColor('#22c55e'));
      continueBtn.on('pointerdown', () => this.scene.start('WorldScene'));
    }
  }
}
