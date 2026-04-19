import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { RUIN_BAR_LAYOUT } from './ruinBarLayout';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { TILE_SIZE } from '../../../utils/constants';
import { BP_PROP_KEYS } from '../../rendering/BudapestWorldProps';

const RUIN_BAR_NPCS: NPCDef[] = [
  {
    id: 'rb-bartender', tileX: 5, tileY: 3, behavior: 'idle',
    texture: 'npc-bp-bartender', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['What\'ll it be?', 'We have pálinka, spritzer, or craft beer!'] },
  },
  {
    id: 'rb-local', tileX: 14, tileY: 6, behavior: 'idle',
    texture: 'npc-bp-local', interactable: true, onInteract: 'dialog',
    facingDirection: 'left',
    interactionData: { lines: ['Ruin bars started in abandoned buildings in the early 2000s.', 'Now they\'re the heart of Budapest nightlife!'] },
  },
  { id: 'rb-patron-1', tileX: 12, tileY: 4, behavior: 'sit', texture: 'npc-bp-tourist' },
  { id: 'rb-patron-2', tileX: 16, tileY: 4, behavior: 'sit', texture: 'npc-bp-local-2' },
  { id: 'rb-dancer', tileX: 7, tileY: 11, behavior: 'walk', texture: 'npc-bp-tourist-2',
    walkPath: [{ x: 7, y: 11 }, { x: 9, y: 11 }, { x: 9, y: 13 }, { x: 7, y: 13 }] },
  { id: 'rb-photo-tourist', tileX: 14, tileY: 12, behavior: 'idle', texture: 'npc-bp-tourist' },
];

export class RuinBarScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() { super({ key: 'RuinBarScene' }); }

  getLayout(): InteriorLayout { return RUIN_BAR_LAYOUT; }

  create(): void {
    super.create();
    saveCurrentScene('RuinBarScene');
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, RUIN_BAR_NPCS);
    this.npcSystem.onDwellTrigger = (npc) => {
      if (!npc.interactionData?.lines) return;
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        uiManager.hideNPCDialog();
        this.inputSystem.unfreeze();
        this.npcSystem.onDialogueEnd(npc.id);
      });
    };

    this.addRuinBarAmbiance();
  }

  private addRuinBarAmbiance(): void {
    const layout = this.getLayout();
    const tileToPixel = (tx: number, ty: number) => ({
      x: tx * TILE_SIZE + TILE_SIZE / 2,
      y: ty * TILE_SIZE + TILE_SIZE / 2,
    });

    // Neon sign color-cycling glow (near top-right of bar)
    const neonPos = tileToPixel(17, 3);
    const neonGlow = this.add.circle(neonPos.x, neonPos.y, 16, 0xFF44AA)
      .setAlpha(0.2).setDepth(-1);
    const neonColors = [0xFF44AA, 0x4488FF, 0xAA44FF];
    let neonIdx = 0;
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        neonIdx = (neonIdx + 1) % neonColors.length;
        neonGlow.fillColor = neonColors[neonIdx];
        this.tweens.add({
          targets: neonGlow,
          alpha: { from: 0.15, to: 0.3 },
          duration: 800,
          yoyo: true,
        });
      },
    });

    // Dance floor colored light overlay (dance area ~x=4-10, y=9-13).
    // Radial gradient texture tinted/cycled through the same pink/cyan/etc palette.
    const dancePos = tileToPixel(7, 11);
    const danceLight = this.add.image(dancePos.x, dancePos.y, BP_PROP_KEYS.ruinbarDanceLight)
      .setAlpha(0.5).setDepth(-2).setTint(0xFF4488);
    // Scale the 64×64 texture to cover the 6×4 tile dance area
    danceLight.setDisplaySize(6 * TILE_SIZE, 4 * TILE_SIZE);
    const danceColors = [0xFF4488, 0x4488FF, 0x44FF88, 0xFFAA44, 0xAA44FF];
    let danceIdx = 0;
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        danceIdx = (danceIdx + 1) % danceColors.length;
        danceLight.setTint(danceColors[danceIdx]);
      },
    });

    // Music notes from dance area
    this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        const notePos = tileToPixel(7 + Math.floor(Math.random() * 4), 10);
        const note = this.add.image(notePos.x, notePos.y, 'deco-bp-music-note')
          .setDepth(5).setAlpha(0.6);
        this.tweens.add({
          targets: note,
          y: notePos.y - 25,
          x: notePos.x + (Math.random() - 0.5) * 20,
          alpha: 0,
          duration: 2000,
          onComplete: () => note.destroy(),
        });
      },
    });

    // Ambient chatter bubbles above sitting NPCs
    const chatterTexts = ['...', 'ha!', '!!!', '?!', '~'];
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        const sitters = RUIN_BAR_NPCS.filter(n => n.behavior === 'sit' || n.behavior === 'idle');
        const pick = sitters[Math.floor(Math.random() * sitters.length)];
        const chatPos = tileToPixel(pick.tileX, pick.tileY);
        const chat = this.add.text(chatPos.x, chatPos.y - 20, chatterTexts[Math.floor(Math.random() * chatterTexts.length)], {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '6px',
          color: '#AAAAAA',
        }).setOrigin(0.5).setDepth(5).setAlpha(0);

        this.tweens.add({
          targets: chat,
          alpha: 0.6,
          y: chatPos.y - 28,
          duration: 600,
          yoyo: true,
          hold: 800,
          onComplete: () => chat.destroy(),
        });
      },
    });
  }

  // CRITICAL: Override to return to JewishQuarterScene, not WorldScene
  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam, alpha: 0, duration: 300, ease: 'Linear',
      onComplete: () => {
        this.scene.start('JewishQuarterScene', {
          returnFromInterior: true,
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      },
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
  }
}
