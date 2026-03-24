import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { audioManager } from '../../../audio/AudioManager';

export class BudapestTransportScene extends Phaser.Scene {
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super({ key: 'BudapestTransportScene' });
  }

  init(data: { returnX?: number; returnY?: number }) {
    this.returnX = data?.returnX;
    this.returnY = data?.returnY;
  }

  create() {
    audioManager.transitionToScene(this.scene.key);

    const { width, height } = this.scale;

    // Urban background
    this.add.rectangle(width / 2, height / 2, width, height, 0x5a6a7a);

    // Tram shelter
    this.add
      .rectangle(width / 2, height * 0.35, 200, 120, 0x444444)
      .setDepth(1);
    this.add
      .rectangle(width / 2, height * 0.28, 220, 10, 0x666666)
      .setDepth(2);

    // Sign
    this.add
      .text(width / 2, height * 0.2, 'Tram Stop', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#FFD700',
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Tracks
    this.add
      .rectangle(width / 2, height * 0.55, width, 4, 0x888888)
      .setDepth(1);
    this.add
      .rectangle(width / 2, height * 0.58, width, 4, 0x888888)
      .setDepth(1);

    // Tram arrives
    const tram = this.add
      .image(-100, height * 0.52, 'budapest-tram')
      .setDepth(3)
      .setScale(2);
    this.tweens.add({
      targets: tram,
      x: width / 2,
      duration: 2000,
      ease: 'Sine.easeOut',
      onComplete: () => this.showDestinationChoice(),
    });
  }

  private showDestinationChoice(): void {
    uiManager.showDialog({
      title: 'Where to?',
      message: 'Choose your destination',
      buttons: [
        {
          label: 'Jewish Quarter',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('JewishQuarterScene');
            });
          },
        },
        {
          label: 'Budapest Eye',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('BudapestOverworldScene', {
                returnFromInterior: true,
                returnX: 27 * 32 + 16,
                returnY: 21 * 32 + 16,
              });
            });
          },
        },
        {
          label: 'City Center',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('BudapestOverworldScene', {
                returnFromInterior: true,
                returnX: this.returnX,
                returnY: this.returnY,
              });
            });
          },
        },
        {
          label: 'Airport (Go Home)',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('AirplaneCutscene', { destination: 'home' });
            });
          },
        },
        {
          label: 'Go Back',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('BudapestOverworldScene', {
                returnFromInterior: true,
                returnX: this.returnX,
                returnY: this.returnY,
              });
            });
          },
        },
      ],
    });
  }
}
