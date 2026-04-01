
export enum GamepadAction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  SELECT = 'SELECT',
  BACK = 'BACK',
  ROLL = 'ROLL'
}

export class GamepadManager {
  private lastButtons: boolean[] = [];
  private lastAxes: number[] = [];
  private onAction: (action: GamepadAction) => void;
  private deadzone = 0.5;

  constructor(onAction: (action: GamepadAction) => void) {
    this.onAction = onAction;
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp': this.onAction(GamepadAction.UP); break;
      case 'ArrowDown': this.onAction(GamepadAction.DOWN); break;
      case 'ArrowLeft': this.onAction(GamepadAction.LEFT); break;
      case 'ArrowRight': this.onAction(GamepadAction.RIGHT); break;
      case 'Enter':
      case ' ':
      case 'Select':
        this.onAction(GamepadAction.SELECT);
        break;
      case 'Escape':
      case 'Back':
      case 'Backspace':
        this.onAction(GamepadAction.BACK);
        break;
      case 'r':
      case 'R':
        this.onAction(GamepadAction.ROLL);
        break;
    }
  };

  update() {
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (!gp) continue;

      // Buttons
      gp.buttons.forEach((btn, i) => {
        const pressed = btn.pressed;
        if (pressed && !this.lastButtons[i]) {
          this.handleButton(i);
        }
        this.lastButtons[i] = pressed;
      });

      // Axes (DPAD-like behavior)
      gp.axes.forEach((axis, i) => {
        const val = axis;
        const lastVal = this.lastAxes[i] || 0;

        if (Math.abs(val) > this.deadzone && Math.abs(lastVal) <= this.deadzone) {
          if (i === 0) { // Horizontal
            this.onAction(val > 0 ? GamepadAction.RIGHT : GamepadAction.LEFT);
          } else if (i === 1) { // Vertical
            this.onAction(val > 0 ? GamepadAction.DOWN : GamepadAction.UP);
          }
        }
        this.lastAxes[i] = val;
      });
    }
  }

  private handleButton(index: number) {
    // Standard Gamepad Mapping
    switch (index) {
      case 0: // A / Cross
      case 11: // Enter / Select
        this.onAction(GamepadAction.SELECT);
        break;
      case 1: // B / Circle
      case 9: // Start
        this.onAction(GamepadAction.ROLL);
        break;
      case 8: // Select / Share
      case 2: // X / Square
        this.onAction(GamepadAction.BACK);
        break;
      case 12: this.onAction(GamepadAction.UP); break;
      case 13: this.onAction(GamepadAction.DOWN); break;
      case 14: this.onAction(GamepadAction.LEFT); break;
      case 15: this.onAction(GamepadAction.RIGHT); break;
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}
