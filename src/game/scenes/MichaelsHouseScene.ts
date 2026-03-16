// src/game/scenes/MichaelsHouseScene.ts
import { InteriorScene } from './InteriorScene';
import { InteriorLayout, MICHAELS_HOUSE_LAYOUT } from '../data/interiorLayouts';

export class MichaelsHouseScene extends InteriorScene {
  constructor() {
    super({ key: 'MichaelsHouseScene' });
  }

  getLayout(): InteriorLayout {
    return MICHAELS_HOUSE_LAYOUT;
  }
}
