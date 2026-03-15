import Phaser from 'phaser';

/**
 * WorldRenderer generates all environment/world textures using offscreen
 * Canvas 2D API, then registers them as Phaser textures.
 */
export class WorldRenderer {

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private static makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    return [canvas, ctx];
  }

  private static register(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
    scene.textures.addCanvas(key, canvas);
  }

  private static rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private static randInt(min: number, max: number): number {
    return Math.floor(WorldRenderer.rand(min, max + 1));
  }

  // ---------------------------------------------------------------------------
  // 1. Grass Tile
  // ---------------------------------------------------------------------------

  static generateGrassTile(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(32, 32);

    // Base green fill
    ctx.fillStyle = '#4a7c3f';
    ctx.fillRect(0, 0, 32, 32);

    // Organic texture: 8-12 semi-transparent circles in varying greens
    const greens = ['#3d6b35', '#5a8f4f', '#4a7c3f'];
    const count = this.randInt(8, 12);
    for (let i = 0; i < count; i++) {
      const x = this.rand(0, 32);
      const y = this.rand(0, 32);
      const r = this.rand(2, 6);
      ctx.globalAlpha = this.rand(0.2, 0.4);
      ctx.fillStyle = greens[this.randInt(0, greens.length - 1)];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Darker dots for depth
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#2e5a28';
    for (let i = 0; i < 5; i++) {
      const x = this.rand(0, 32);
      const y = this.rand(0, 32);
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    this.register(scene, 'grass-tile', canvas);
  }

  // ---------------------------------------------------------------------------
  // 2. Dirt Tile
  // ---------------------------------------------------------------------------

  static generateDirtTile(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(32, 32);

    // Linear gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 32);
    grad.addColorStop(0, '#8b7355');
    grad.addColorStop(1, '#7a6245');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    // Subtle noise: tiny darker/lighter dots
    for (let i = 0; i < 30; i++) {
      const x = this.rand(0, 32);
      const y = this.rand(0, 32);
      ctx.globalAlpha = this.rand(0.1, 0.25);
      ctx.fillStyle = Math.random() > 0.5 ? '#6a5235' : '#9c8465';
      ctx.fillRect(x, y, 1, 1);
    }

    ctx.globalAlpha = 1;
    this.register(scene, 'dirt-tile', canvas);
  }

  // ---------------------------------------------------------------------------
  // 3. Grass-Dirt Edge
  // ---------------------------------------------------------------------------

  static generateGrassDirtEdge(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(32, 32);

    // Left half grass
    ctx.fillStyle = '#4a7c3f';
    ctx.fillRect(0, 0, 16, 32);

    // Right half dirt
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(16, 0, 16, 32);

    // Gradient blend in the middle
    const grad = ctx.createLinearGradient(10, 0, 22, 0);
    grad.addColorStop(0, 'rgba(74,124,63,1)');
    grad.addColorStop(0.5, 'rgba(74,124,63,0.5)');
    grad.addColorStop(1, 'rgba(74,124,63,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(10, 0, 12, 32);

    this.register(scene, 'grass-dirt-edge', canvas);
  }

  // ---------------------------------------------------------------------------
  // 4. Buildings
  // ---------------------------------------------------------------------------

  static generateBuilding(scene: Phaser.Scene, type: string): void {
    const [canvas, ctx] = this.makeCanvas(256, 256);

    switch (type) {
      case 'restaurant':
        this.drawRestaurant(ctx);
        break;
      case 'cafe':
        this.drawCafe(ctx);
        break;
      case 'park':
        this.drawPark(ctx);
        break;
      case 'cinema':
        this.drawCinema(ctx);
        break;
      case 'home':
        this.drawHome(ctx);
        break;
      case 'pizzeria':
        this.drawPizzeria(ctx);
        break;
    }

    this.register(scene, 'building-' + type, canvas);
  }

  // ---- Restaurant ----

  private static drawRestaurant(ctx: CanvasRenderingContext2D): void {
    const W = 256, H = 256;

    // Brick facade
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(20, 40, W - 40, H - 50);

    // Horizontal brick lines
    ctx.strokeStyle = '#6d3310';
    ctx.lineWidth = 1;
    for (let y = 50; y < H - 10; y += 12) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(W - 20, y);
      ctx.stroke();
    }

    // Vertical brick offsets
    for (let y = 50; y < H - 10; y += 24) {
      for (let x = 40; x < W - 20; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 12);
        ctx.stroke();
      }
      for (let x = 56; x < W - 20; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y + 12);
        ctx.lineTo(x, y + 24);
        ctx.stroke();
      }
    }

    // Striped awning with bezier arcs
    const awningY = 40;
    const segW = (W - 40) / 6;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#cc2222' : '#ffffff';
      ctx.beginPath();
      const sx = 20 + i * segW;
      ctx.moveTo(sx, awningY);
      ctx.bezierCurveTo(sx + segW * 0.25, awningY + 20, sx + segW * 0.75, awningY + 20, sx + segW, awningY);
      ctx.lineTo(sx + segW, awningY);
      ctx.fill();
    }

    // Windows with glow
    for (const wx of [60, 160]) {
      // Glow
      const glow = ctx.createRadialGradient(wx + 20, 120, 2, wx + 20, 120, 30);
      glow.addColorStop(0, 'rgba(255,215,0,0.6)');
      glow.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(wx - 10, 90, 60, 60);

      // Window
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(wx, 100, 40, 40);
      ctx.strokeStyle = '#4a3000';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, 100, 40, 40);
    }

    // Door
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(108, 170, 40, 46);
    ctx.fillStyle = '#d4a830';
    ctx.beginPath();
    ctx.arc(140, 195, 3, 0, Math.PI * 2);
    ctx.fill();

    // "OPEN" sign
    ctx.fillStyle = '#22aa22';
    ctx.fillRect(113, 175, 30, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OPEN', 128, 185);

    // Flower boxes below windows
    for (const wx of [60, 160]) {
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(wx, 145, 40, 6);
      const colors = ['#ff69b4', '#ff4444', '#ffcc00', '#ff69b4'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(wx + 5 + i * 10, 143, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ---- Cafe ----

  private static drawCafe(ctx: CanvasRenderingContext2D): void {
    const W = 256, H = 256;

    // Storefront base
    ctx.fillStyle = '#654321';
    ctx.fillRect(20, 40, W - 40, H - 50);

    // Wooden plank lines
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 1;
    for (let x = 20; x < W - 20; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, H - 10);
      ctx.stroke();
    }

    // Warm interior glow behind windows
    for (const wx of [55, 155]) {
      const glow = ctx.createRadialGradient(wx + 25, 120, 5, wx + 25, 120, 40);
      glow.addColorStop(0, 'rgba(255,220,120,0.5)');
      glow.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(wx - 15, 80, 80, 80);

      // Window
      ctx.fillStyle = '#ffd870';
      ctx.fillRect(wx, 95, 50, 50);
      ctx.strokeStyle = '#3a2010';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, 95, 50, 50);
    }

    // Chalkboard sign
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(100, 70, 56, 30);
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 70, 56, 30);
    ctx.fillStyle = '#88cc88';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COFFEE', 128, 90);

    // Coffee cup logo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(118, 160, 20, 18);
    // Handle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(140, 168, 6, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    // Steam
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const sx = 122 + i * 6;
      ctx.beginPath();
      ctx.moveTo(sx, 158);
      ctx.quadraticCurveTo(sx - 3, 150, sx, 145);
      ctx.stroke();
    }

    // Door
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(108, 190, 40, 26);
    ctx.fillStyle = '#d4a830';
    ctx.beginPath();
    ctx.arc(140, 203, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Park ----

  private static drawPark(ctx: CanvasRenderingContext2D): void {
    const W = 256, H = 256;

    // Ground
    ctx.fillStyle = '#4a7c3f';
    ctx.fillRect(0, 0, W, H);

    // Small pond
    const pondGrad = ctx.createRadialGradient(180, 180, 5, 180, 180, 35);
    pondGrad.addColorStop(0, '#7ec8e3');
    pondGrad.addColorStop(1, '#3a8fbf');
    ctx.fillStyle = pondGrad;
    ctx.beginPath();
    ctx.ellipse(180, 185, 40, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wave lines
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(160, 180 + i * 6);
      ctx.quadraticCurveTo(180, 177 + i * 6, 200, 180 + i * 6);
      ctx.stroke();
    }

    // Large tree
    // Trunk with gradient
    const trunkGrad = ctx.createLinearGradient(68, 100, 88, 100);
    trunkGrad.addColorStop(0, '#6a5010');
    trunkGrad.addColorStop(1, '#8b6914');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(68, 100, 20, 70);

    // Canopy: 5-7 overlapping circles
    const canopyCircles = [
      { x: 78, y: 75, r: 30 },
      { x: 60, y: 85, r: 25 },
      { x: 95, y: 85, r: 25 },
      { x: 70, y: 60, r: 22 },
      { x: 88, y: 60, r: 22 },
      { x: 78, y: 50, r: 18 },
    ];
    for (const c of canopyCircles) {
      const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.r);
      g.addColorStop(0, '#5a9f4f');
      g.addColorStop(1, '#2e6b28');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Park bench
    ctx.fillStyle = '#6d4c2a';
    ctx.fillRect(130, 130, 45, 8);
    ctx.fillRect(130, 126, 45, 4);
    // Legs
    ctx.fillRect(133, 138, 4, 8);
    ctx.fillRect(168, 138, 4, 8);

    // Flower clusters
    const flowerColors = ['#ff69b4', '#ffcc00', '#9966cc', '#ff4444'];
    const flowerPositions = [
      { cx: 30, cy: 200 }, { cx: 220, cy: 60 },
      { cx: 200, cy: 230 }, { cx: 40, cy: 40 },
    ];
    for (const fp of flowerPositions) {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = flowerColors[this.randInt(0, flowerColors.length - 1)];
        ctx.beginPath();
        ctx.arc(fp.cx + this.rand(-10, 10), fp.cy + this.rand(-8, 8), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ---- Cinema ----

  private static drawCinema(ctx: CanvasRenderingContext2D): void {
    const W = 256, H = 256;

    // Facade
    ctx.fillStyle = '#2a1030';
    ctx.fillRect(20, 40, W - 40, H - 50);

    // Marquee border
    ctx.fillStyle = '#ddd';
    ctx.fillRect(20, 40, W - 40, 35);
    ctx.fillStyle = '#2a1030';
    ctx.fillRect(25, 45, W - 50, 25);

    // Bulb lights on marquee
    const bulbCount = 14;
    const spacing = (W - 50) / (bulbCount + 1);
    for (let i = 1; i <= bulbCount; i++) {
      const bx = 25 + i * spacing;
      ctx.fillStyle = '#ffdd44';
      ctx.beginPath();
      ctx.arc(bx, 42, 3, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(bx, 42, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // "MOVIES" text
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MOVIES', W / 2, 63);

    // Screen area
    ctx.fillStyle = '#111';
    ctx.fillRect(50, 90, W - 100, 80);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 90, W - 100, 80);

    // Film reel icons
    for (const rx of [80, 176]) {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx, 200, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rx, 200, 5, 0, Math.PI * 2);
      ctx.stroke();
      // Spokes
      for (let a = 0; a < 6; a++) {
        const angle = (a * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(rx + Math.cos(angle) * 5, 200 + Math.sin(angle) * 5);
        ctx.lineTo(rx + Math.cos(angle) * 15, 200 + Math.sin(angle) * 15);
        ctx.stroke();
      }
    }

    // Door
    ctx.fillStyle = '#1a0a20';
    ctx.fillRect(108, 195, 40, 21);
    ctx.fillStyle = '#d4a830';
    ctx.beginPath();
    ctx.arc(140, 207, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Home (happy place) ----

  private static drawHome(ctx: CanvasRenderingContext2D): void {
    const W = 256, H = 256;

    // Warm background
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(30, 80, W - 60, H - 90);

    // Triangular roof
    ctx.fillStyle = '#c47a3a';
    ctx.beginPath();
    ctx.moveTo(20, 80);
    ctx.lineTo(W / 2, 20);
    ctx.lineTo(W - 20, 80);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8b5a20';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pillars
    ctx.fillStyle = '#f5e6d0';
    for (const px of [40, W - 55]) {
      ctx.fillRect(px, 80, 15, H - 90);
    }

    // Walls outline
    ctx.strokeStyle = '#c4a67a';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 80, W - 60, H - 90);

    // Windows
    for (const wx of [70, 165]) {
      ctx.fillStyle = '#ffd870';
      ctx.fillRect(wx, 110, 35, 35);
      ctx.strokeStyle = '#c4a67a';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, 110, 35, 35);
      // Cross bar
      ctx.beginPath();
      ctx.moveTo(wx + 17, 110);
      ctx.lineTo(wx + 17, 145);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wx, 127);
      ctx.lineTo(wx + 35, 127);
      ctx.stroke();
    }

    // Door
    ctx.fillStyle = '#8b5a20';
    ctx.fillRect(108, 170, 40, 46);
    ctx.fillStyle = '#d4a830';
    ctx.beginPath();
    ctx.arc(140, 195, 3, 0, Math.PI * 2);
    ctx.fill();

    // Heart on door
    ctx.fillStyle = '#e74c6f';
    ctx.beginPath();
    ctx.moveTo(128, 180);
    ctx.bezierCurveTo(128, 176, 122, 174, 122, 178);
    ctx.bezierCurveTo(122, 182, 128, 186, 128, 186);
    ctx.bezierCurveTo(128, 186, 134, 182, 134, 178);
    ctx.bezierCurveTo(134, 174, 128, 176, 128, 180);
    ctx.fill();

    // Fairy lights along roofline
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(200,180,100,0.5)';
    ctx.beginPath();
    ctx.moveTo(30, 80);
    ctx.lineTo(W / 2, 25);
    ctx.lineTo(W - 30, 80);
    ctx.stroke();

    const lightColors = ['#ffee88', '#fffae0', '#ffdd44', '#fffae0'];
    // Left side lights
    for (let i = 0; i < 6; i++) {
      const t = (i + 1) / 7;
      const lx = 30 + (W / 2 - 30) * t;
      const ly = 80 + (25 - 80) * t;
      ctx.fillStyle = lightColors[i % lightColors.length];
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(lx, ly, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Right side lights
    for (let i = 0; i < 6; i++) {
      const t = (i + 1) / 7;
      const lx = W / 2 + (W - 30 - W / 2) * t;
      const ly = 25 + (80 - 25) * t;
      ctx.fillStyle = lightColors[i % lightColors.length];
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(lx, ly, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---- Pizzeria ----

  private static drawPizzeria(ctx: CanvasRenderingContext2D): void {
    const W = 256, H = 256;

    // Cream base
    ctx.fillStyle = '#FFF5E1';
    ctx.fillRect(20, 40, W - 40, H - 50);

    // Italian flag stripe at top
    const stripeW = (W - 40) / 3;
    ctx.fillStyle = '#008C45';
    ctx.fillRect(20, 40, stripeW, 15);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20 + stripeW, 40, stripeW, 15);
    ctx.fillStyle = '#CD212A';
    ctx.fillRect(20 + stripeW * 2, 40, stripeW, 15);

    // Chimney on roof
    ctx.fillStyle = '#8b6b4a';
    ctx.fillRect(190, 20, 20, 30);
    ctx.fillStyle = '#6a5030';
    ctx.fillRect(186, 18, 28, 6);

    // "LUIGI'S" sign
    ctx.fillStyle = '#CD212A';
    ctx.fillRect(70, 62, 116, 28);
    ctx.strokeStyle = '#8b1a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 62, 116, 28);
    ctx.fillStyle = '#FFF5E1';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("LUIGI'S", W / 2, 82);

    // Windows
    for (const wx of [55, 170]) {
      ctx.fillStyle = '#ffd870';
      ctx.fillRect(wx, 105, 35, 35);
      ctx.strokeStyle = '#8b6b4a';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, 105, 35, 35);
    }

    // Pizza logo
    ctx.fillStyle = '#e8a030';
    ctx.beginPath();
    ctx.arc(128, 130, 18, 0, Math.PI * 2);
    ctx.fill();
    // Slices
    ctx.strokeStyle = '#a06820';
    ctx.lineWidth = 2;
    for (let a = 0; a < 6; a++) {
      const angle = (a * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(128, 130);
      ctx.lineTo(128 + Math.cos(angle) * 18, 130 + Math.sin(angle) * 18);
      ctx.stroke();
    }
    // Pepperoni
    ctx.fillStyle = '#cc3333';
    const pepPositions = [
      [120, 125], [135, 122], [128, 138], [122, 134], [133, 132],
    ];
    for (const [px, py] of pepPositions) {
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Door
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(108, 180, 40, 36);
    ctx.fillStyle = '#d4a830';
    ctx.beginPath();
    ctx.arc(140, 200, 3, 0, Math.PI * 2);
    ctx.fill();

    // Checkered pattern border at bottom
    const sqSize = 8;
    for (let x = 20; x < W - 20; x += sqSize) {
      const idx = (x - 20) / sqSize;
      ctx.fillStyle = idx % 2 === 0 ? '#CD212A' : '#ffffff';
      ctx.fillRect(x, H - 18, sqSize, sqSize);
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#CD212A';
      ctx.fillRect(x, H - 10, sqSize, sqSize);
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Tree
  // ---------------------------------------------------------------------------

  static generateTree(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(64, 80);

    // Shadow at base
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(32, 76, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk with gradient and slight taper
    const trunkGrad = ctx.createLinearGradient(26, 45, 38, 45);
    trunkGrad.addColorStop(0, '#6a5010');
    trunkGrad.addColorStop(1, '#8b6914');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.moveTo(28, 45);
    ctx.lineTo(26, 78);
    ctx.lineTo(38, 78);
    ctx.lineTo(36, 45);
    ctx.closePath();
    ctx.fill();

    // Canopy: 4-5 overlapping circles with radial gradients
    const circles = [
      { x: 32, y: 28, r: 18 },
      { x: 20, y: 35, r: 14 },
      { x: 44, y: 35, r: 14 },
      { x: 26, y: 20, r: 13 },
      { x: 38, y: 20, r: 13 },
    ];
    for (const c of circles) {
      const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.r);
      g.addColorStop(0, '#5a9f4f');
      g.addColorStop(1, '#2e6b28');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    this.register(scene, 'tree', canvas);
  }

  // ---------------------------------------------------------------------------
  // 6. Lamp Post
  // ---------------------------------------------------------------------------

  static generateLampPost(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(24, 64);

    // Warm glow
    const glow = ctx.createRadialGradient(12, 8, 2, 12, 8, 16);
    glow.addColorStop(0, 'rgba(255,220,100,0.6)');
    glow.addColorStop(1, 'rgba(255,220,100,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(12, 8, 16, 0, Math.PI * 2);
    ctx.fill();

    // Pole
    ctx.fillStyle = '#444';
    ctx.fillRect(10, 10, 4, 52);

    // Base
    ctx.fillStyle = '#333';
    ctx.fillRect(6, 58, 12, 4);

    // Lamp top (trapezoid)
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(8, 4);
    ctx.lineTo(16, 4);
    ctx.lineTo(18, 12);
    ctx.closePath();
    ctx.fill();

    // Bulb glow inside lamp
    ctx.fillStyle = '#ffee88';
    ctx.beginPath();
    ctx.arc(12, 8, 3, 0, Math.PI * 2);
    ctx.fill();

    this.register(scene, 'lamp-post', canvas);
  }

  // ---------------------------------------------------------------------------
  // 7. Flower Patch
  // ---------------------------------------------------------------------------

  static generateFlowerPatch(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(32, 24);

    const colors = ['#ff69b4', '#ffcc00', '#9966cc', '#ff4444', '#ff69b4'];
    const stemPositions = [5, 10, 16, 22, 27];

    for (let i = 0; i < stemPositions.length; i++) {
      const x = stemPositions[i];
      // Stem
      ctx.strokeStyle = '#3a7a30';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.lineTo(x, 8);
      ctx.stroke();

      // Flower head
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(x, 7, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Center dot
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    this.register(scene, 'flower-patch', canvas);
  }

  // ---------------------------------------------------------------------------
  // 8. Fence
  // ---------------------------------------------------------------------------

  static generateFence(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(64, 32);

    // Hedge: rounded green rectangle
    ctx.fillStyle = '#3a7a30';
    const r = 6;
    const x = 2, y = 4, w = 60, h = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();

    // Darker outline
    ctx.strokeStyle = '#2a6020';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Leaf texture
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#2a6020';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(this.rand(6, 58), this.rand(8, 26), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#5aaf4f';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(this.rand(6, 58), this.rand(8, 26), 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.register(scene, 'fence', canvas);
  }

  // ---------------------------------------------------------------------------
  // 9. Checkpoint Glow
  // ---------------------------------------------------------------------------

  static generateCheckpointGlow(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(128, 128);

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,215,0,0.6)');
    grad.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    this.register(scene, 'checkpoint-glow', canvas);
  }

  // ---------------------------------------------------------------------------
  // 10. Checkmark
  // ---------------------------------------------------------------------------

  static generateCheckmark(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(24, 24);

    // Green circle background
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(12, 12, 11, 0, Math.PI * 2);
    ctx.fill();

    // White checkmark
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(10, 17);
    ctx.lineTo(18, 7);
    ctx.stroke();

    this.register(scene, 'checkmark', canvas);
  }

  // ---------------------------------------------------------------------------
  // 11. Generate All
  // ---------------------------------------------------------------------------

  static generateAllTextures(scene: Phaser.Scene): void {
    this.generateGrassTile(scene);
    this.generateDirtTile(scene);
    this.generateGrassDirtEdge(scene);
    this.generateTree(scene);
    this.generateLampPost(scene);
    this.generateFlowerPatch(scene);
    this.generateFence(scene);
    this.generateCheckpointGlow(scene);
    this.generateCheckmark(scene);

    // All 6 building types
    const buildingTypes = ['restaurant', 'cafe', 'park', 'cinema', 'home', 'pizzeria'];
    for (const type of buildingTypes) {
      this.generateBuilding(scene, type);
    }
  }
}
