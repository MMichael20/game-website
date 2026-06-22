type Listenable = {
  addEventListener: (type: string, fn: (e: any) => void) => void;
  removeEventListener?: (type: string, fn: (e: any) => void) => void;
};

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  // Analog movement from a virtual joystick (mobile). x = strafe (+ = right),
  // y = forward (+ = forward). Each in [-1,1]. Keyboard play leaves this at 0.
  readonly move = { x: 0, y: 0 };
  private readonly target: Listenable;
  private readonly onDown = (e: { code: string }) => this.handleKeyDown(e.code);
  private readonly onUp = (e: { code: string }) => this.handleKeyUp(e.code);

  constructor(target?: Listenable) {
    this.target = target ?? (window as unknown as Listenable);
    this.target.addEventListener("keydown", this.onDown);
    this.target.addEventListener("keyup", this.onUp);
  }

  handleKeyDown(code: string): void {
    if (!this.down.has(code)) this.pressed.add(code); // fresh press only
    this.down.add(code);
  }

  handleKeyUp(code: string): void {
    this.down.delete(code);
  }

  isDown(code: string): boolean { return this.down.has(code); }
  justPressed(code: string): boolean { return this.pressed.has(code); }
  endFrame(): void { this.pressed.clear(); }
  clear(): void { this.down.clear(); this.pressed.clear(); this.move.x = 0; this.move.y = 0; }

  dispose(): void {
    this.target.removeEventListener?.("keydown", this.onDown);
    this.target.removeEventListener?.("keyup", this.onUp);
  }
}
