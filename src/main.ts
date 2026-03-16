// src/main.ts
import Phaser from 'phaser';
import { uiManager } from './ui/UIManager';
import { BootScene } from './game/scenes/BootScene';
import { DressingRoomScene } from './game/scenes/DressingRoomScene';
import { WorldScene } from './game/scenes/WorldScene';
import { MichaelsHouseScene } from './game/scenes/MichaelsHouseScene';
import { HadarsHouseScene } from './game/scenes/HadarsHouseScene';
import { AirportInteriorScene } from './game/scenes/airport/AirportInteriorScene';
import { AirplaneCutscene } from './game/scenes/airport/AirplaneCutscene';
import { MauiOverworldScene } from './game/scenes/maui/MauiOverworldScene';
import { QuizScene } from './game/scenes/minigames/QuizScene';
import { CatchScene } from './game/scenes/minigames/CatchScene';
import { MatchScene } from './game/scenes/minigames/MatchScene';
import { MauiHotelScene } from './game/scenes/maui/MauiHotelScene';
import { TennisScene } from './game/scenes/minigames/TennisScene';
import { ChaseBabyScene } from './game/scenes/minigames/ChaseBabyScene';
import { GAME_WIDTH, GAME_HEIGHT } from './utils/constants';

// Initialize UI layer before Phaser
const uiLayer = document.getElementById('ui-layer');
if (uiLayer) {
  uiManager.init(uiLayer);
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  render: { pixelArt: true },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    fullscreenTarget: 'game-container',
  },
  input: {
    touch: { capture: true },
  },
  scene: [BootScene, DressingRoomScene, WorldScene, MichaelsHouseScene, HadarsHouseScene, AirportInteriorScene, AirplaneCutscene, MauiOverworldScene, MauiHotelScene, QuizScene, CatchScene, MatchScene, TennisScene, ChaseBabyScene],
};

new Phaser.Game(config);
