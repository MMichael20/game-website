import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { AvatarScene } from './scenes/AvatarScene';
import { WorldScene } from './scenes/WorldScene';
import { MemoryCard } from './scenes/checkpoints/MemoryCard';
import { QuizGame } from './scenes/checkpoints/QuizGame';
import { CatchGame } from './scenes/checkpoints/CatchGame';
import { MatchGame } from './scenes/checkpoints/MatchGame';
import { PuzzleGame } from './scenes/checkpoints/PuzzleGame';
import { CookingGame } from './scenes/checkpoints/CookingGame';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, AvatarScene, WorldScene, MemoryCard, QuizGame, CatchGame, MatchGame, PuzzleGame, CookingGame],
};

new Phaser.Game(config);
