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
import { AirbnbCompoundScene } from './game/scenes/maui/AirbnbCompoundScene';
import { DrivingScene } from './game/scenes/maui/DrivingScene';
import { HanaPulloverScene } from './game/scenes/maui/HanaPulloverScene';
import { HanaDrivingScene } from './game/scenes/maui/HanaDrivingScene';
import { SunBeachScene } from './game/scenes/maui/SunBeachScene';
import { TennisScene } from './game/scenes/minigames/TennisScene';
import { ChaseBabyScene } from './game/scenes/minigames/ChaseBabyScene';
import { TurtleRescueScene } from './game/scenes/minigames/TurtleRescueScene';
import { CurryHuntScene } from './game/scenes/minigames/CurryHuntScene';
import { LangosCatchScene } from './game/scenes/minigames/LangosCatchScene';
import { RuinBarQuizScene } from './game/scenes/minigames/RuinBarQuizScene';
import { TramDashScene } from './game/scenes/minigames/TramDashScene';
import { PaprikaSortScene } from './game/scenes/minigames/PaprikaSortScene';
import { GuardEscapeScene } from './game/scenes/minigames/GuardEscapeScene';
import { JazzSeatScene } from './game/scenes/minigames/JazzSeatScene';
import { RooftopChaseScene } from './game/scenes/minigames/RooftopChaseScene';
import { DanubeKayakScene } from './game/scenes/minigames/DanubeKayakScene';
import { ChimneyCakeScene } from './game/scenes/minigames/ChimneyCakeScene';
import { AirbnbShowerScene } from './game/scenes/budapest/AirbnbShowerScene';
import { BudapestAirportScene } from './game/scenes/budapest/BudapestAirportScene';
import { BudapestBusRideScene } from './game/scenes/budapest/BudapestBusRideScene';
import { BudapestOverworldScene } from './game/scenes/budapest/BudapestOverworldScene';
import { JewishQuarterScene } from './game/scenes/budapest/JewishQuarterScene';
import { RuinBarScene } from './game/scenes/budapest/RuinBarScene';
import { BudapestEyeScene } from './game/scenes/budapest/BudapestEyeScene';
import { BudapestAirbnbScene } from './game/scenes/budapest/BudapestAirbnbScene';
import { BudapestAirbnbLobbyScene } from './game/scenes/budapest/BudapestAirbnbLobbyScene';
import { BudapestTransportScene } from './game/scenes/budapest/BudapestTransportScene';
import { DanubeCruiseScene } from './game/scenes/budapest/DanubeCruiseScene';
import { ThermalBathScene } from './game/scenes/budapest/ThermalBathScene';
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
  scene: [BootScene, DressingRoomScene, WorldScene, MichaelsHouseScene, HadarsHouseScene, AirportInteriorScene, AirplaneCutscene, MauiOverworldScene, MauiHotelScene, AirbnbCompoundScene, DrivingScene, HanaPulloverScene, HanaDrivingScene, SunBeachScene, QuizScene, CatchScene, MatchScene, TennisScene, ChaseBabyScene, TurtleRescueScene, CurryHuntScene, LangosCatchScene, RuinBarQuizScene, TramDashScene, PaprikaSortScene, AirbnbShowerScene, BudapestAirportScene, BudapestBusRideScene, BudapestOverworldScene, JewishQuarterScene, RuinBarScene, BudapestEyeScene, BudapestAirbnbLobbyScene, BudapestAirbnbScene, BudapestTransportScene, DanubeCruiseScene, ThermalBathScene, GuardEscapeScene, JazzSeatScene, RooftopChaseScene, DanubeKayakScene, ChimneyCakeScene],
};

new Phaser.Game(config);
