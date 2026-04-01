
import { sounds } from './SoundManager';

export class Dice {
  value: number = 1;
  isRolling: boolean = false;
  rollTimer: number = 0;
  rollDuration: number = 1000;
  onRollComplete: (value: number) => void;
  private lastSoundTime: number = 0;

  constructor(onRollComplete: (value: number) => void) {
    this.onRollComplete = onRollComplete;
  }

  roll() {
    if (this.isRolling) return;
    this.isRolling = true;
    this.rollTimer = 0;
    this.lastSoundTime = 0;
  }

  update(dt: number) {
    if (!this.isRolling) return;

    this.rollTimer += dt;
    if (this.rollTimer < this.rollDuration) {
      // Randomly change value during roll
      if (Math.random() > 0.8) {
        this.value = Math.floor(Math.random() * 6) + 1;
      }

      // Play clatter sound at intervals
      if (this.rollTimer - this.lastSoundTime > 100 + Math.random() * 100) {
        sounds.playDiceRoll();
        this.lastSoundTime = this.rollTimer;
      }
    } else {
      this.isRolling = false;
      this.value = Math.floor(Math.random() * 6) + 1;
      sounds.playDiceLand();
      this.onRollComplete(this.value);
    }
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.save();
    ctx.translate(x, y);

    // Dice body
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, 10);
    ctx.fill();
    ctx.stroke();

    // Dice dots
    ctx.fillStyle = '#1f2937';
    const dotRadius = size * 0.08;
    const offset = size * 0.25;

    const drawDot = (dx: number, dy: number) => {
      ctx.beginPath();
      ctx.arc(dx, dy, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    };

    if (this.value === 1) {
      drawDot(0, 0);
    } else if (this.value === 2) {
      drawDot(-offset, -offset);
      drawDot(offset, offset);
    } else if (this.value === 3) {
      drawDot(-offset, -offset);
      drawDot(0, 0);
      drawDot(offset, offset);
    } else if (this.value === 4) {
      drawDot(-offset, -offset);
      drawDot(offset, -offset);
      drawDot(-offset, offset);
      drawDot(offset, offset);
    } else if (this.value === 5) {
      drawDot(-offset, -offset);
      drawDot(offset, -offset);
      drawDot(0, 0);
      drawDot(-offset, offset);
      drawDot(offset, offset);
    } else if (this.value === 6) {
      drawDot(-offset, -offset);
      drawDot(offset, -offset);
      drawDot(-offset, 0);
      drawDot(offset, 0);
      drawDot(-offset, offset);
      drawDot(offset, offset);
    }

    // Rolling effect
    if (this.isRolling) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.rotate(this.rollTimer / 50);
    }

    ctx.restore();
  }
}
