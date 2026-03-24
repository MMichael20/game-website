import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { BUDAPEST_AIRBNB_LOBBY_LAYOUT } from './budapestAirbnbLobbyLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';

export class BudapestAirbnbLobbyScene extends InteriorScene {
  constructor() {
    super({ key: 'BudapestAirbnbLobbyScene' });
  }

  getLayout(): InteriorLayout {
    return BUDAPEST_AIRBNB_LOBBY_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('BudapestAirbnbLobbyScene');
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
