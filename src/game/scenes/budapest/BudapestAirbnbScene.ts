import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { BUDAPEST_AIRBNB_LAYOUT } from './budapestAirbnbLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import { worldToTile } from '../../data/mapLayout';

export class BudapestAirbnbScene extends InteriorScene {
  private showerTriggered = false;

  constructor() {
    super({ key: 'BudapestAirbnbScene' });
  }

  getLayout(): InteriorLayout {
    return BUDAPEST_AIRBNB_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('BudapestAirbnbScene');
    this.showerTriggered = false;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    // Shower trigger — when player enters bathroom area (tiles 11-12, 8-9)
    if (!this.showerTriggered) {
      const pos = this.player.getPosition();
      const tile = worldToTile(pos.x, pos.y);
      if (tile.x >= 11 && tile.x <= 12 && tile.y >= 8 && tile.y <= 9) {
        this.showerTriggered = true;
        this.inputSystem.freeze();
        uiManager.showInteractionPrompt('Take a shower?', () => {
          uiManager.hideInteractionPrompt();
          this.inputSystem.unfreeze();
          const cam = this.cameras.main;
          this.tweens.add({
            targets: cam, alpha: 0, duration: 300, ease: 'Linear',
            onComplete: () => {
              this.scene.start('AirbnbShowerScene');
            },
          });
        });
      }
    }
  }

  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start('BudapestOverworldScene', {
          returnFromInterior: true,
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      },
    });
  }
}
