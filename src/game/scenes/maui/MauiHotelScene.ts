// src/game/scenes/maui/MauiHotelScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';

const AIRBNB_ROOMS = [
  { x: 0, y: 0, w: 11, h: 8 },   // Kitchen (left-top)
  { x: 10, y: 0, w: 10, h: 8 },   // Bathroom (right-top)
  { x: 0, y: 7, w: 20, h: 6 },    // Bedroom (full-width bottom, includes exit row 11)
];

const AIRBNB_DOORWAYS = [
  { x: 4, y: 7, width: 2, height: 1 },   // Kitchen → Bedroom
  { x: 14, y: 7, width: 2, height: 1 },   // Bathroom → Bedroom
];

const AIRBNB_LAYOUT: InteriorLayout = {
  id: 'maui-hotel',
  widthInTiles: 20,
  heightInTiles: 12,
  wallGrid: buildWallGrid(20, 12, AIRBNB_ROOMS, AIRBNB_DOORWAYS),
  floors: [
    { tileX: 1, tileY: 1, width: 9, height: 6, floorType: 'tile_floor' },      // Kitchen
    { tileX: 11, tileY: 1, width: 8, height: 6, floorType: 'tile_floor' },      // Bathroom
    { tileX: 1, tileY: 8, width: 18, height: 3, floorType: 'carpet_beige' },    // Bedroom
  ],
  decorations: [
    // Kitchen
    { type: 'kitchen-counter', tileX: 1, tileY: 1 },
    { type: 'kitchen-counter', tileX: 2, tileY: 1 },
    { type: 'sink', tileX: 3, tileY: 1 },
    { type: 'fridge', tileX: 1, tileY: 3 },
    { type: 'table', tileX: 5, tileY: 4 },
    { type: 'table', tileX: 7, tileY: 4 },
    // Bathroom
    { type: 'bathroom-wall', tileX: 11, tileY: 1 },
    { type: 'bathroom-wall', tileX: 12, tileY: 1 },
    { type: 'sink', tileX: 14, tileY: 1 },
    { type: 'toilet', tileX: 16, tileY: 1 },
    // Bedroom
    { type: 'bed', tileX: 3, tileY: 8 },
    { type: 'tv', tileX: 8, tileY: 8 },
    { type: 'desk', tileX: 15, tileY: 8 },
  ],
  entrance: { tileX: 10, tileY: 10 },
  exit: { tileX: 10, tileY: 11, width: 2, height: 1, promptText: 'Tap to go out' },
  exitDoorStyle: 'beach',
};

export class MauiHotelScene extends InteriorScene {
  constructor() {
    super({ key: 'MauiHotelScene' });
  }

  getLayout(): InteriorLayout {
    return AIRBNB_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('MauiHotelScene');
  }

  // Override to return to Maui overworld, not home WorldScene
  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam, alpha: 0, duration: 300, ease: 'Linear',
      onComplete: () => {
        this.scene.start('MauiOverworldScene', {
          returnFromInterior: true,
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      },
    });
  }
}
