
import { PlayerColor, Point, CELL_SIZE, GRID_SIZE, BOARD_SIZE, BASE_POSITIONS, START_INDICES, SAFE_SPOTS, getPlayerPath } from './constants';

export class Board {
  width: number;
  height: number;
  scale: number = 1;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.scale = Math.min(width, height) / BOARD_SIZE;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.scale = Math.min(width, height) / BOARD_SIZE;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const sSize = CELL_SIZE * this.scale;
    const colors = {
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      blue: '#3b82f6',
      white: '#ffffff',
      gray: '#f3f4f6',
      darkGray: '#9ca3af'
    };

    // Draw Grid Background
    ctx.fillStyle = colors.gray;
    ctx.fillRect(0, 0, BOARD_SIZE * this.scale, BOARD_SIZE * this.scale);

    // Draw Bases
    this.drawBase(ctx, 0, 0, colors.red);
    this.drawBase(ctx, 9 * sSize, 0, colors.green);
    this.drawBase(ctx, 9 * sSize, 9 * sSize, colors.yellow);
    this.drawBase(ctx, 0, 9 * sSize, colors.blue);

    // Draw Center Goal
    ctx.beginPath();
    ctx.moveTo(6 * sSize, 6 * sSize);
    ctx.lineTo(9 * sSize, 6 * sSize);
    ctx.lineTo(7.5 * sSize, 7.5 * sSize);
    ctx.closePath();
    ctx.fillStyle = colors.red; // Top triangle (Red arrives from top)
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(9 * sSize, 6 * sSize);
    ctx.lineTo(9 * sSize, 9 * sSize);
    ctx.lineTo(7.5 * sSize, 7.5 * sSize);
    ctx.closePath();
    ctx.fillStyle = colors.green; // Right triangle (Green arrives from right)
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(9 * sSize, 9 * sSize);
    ctx.lineTo(6 * sSize, 9 * sSize);
    ctx.lineTo(7.5 * sSize, 7.5 * sSize);
    ctx.closePath();
    ctx.fillStyle = colors.yellow; // Bottom triangle (Yellow arrives from bottom)
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(6 * sSize, 9 * sSize);
    ctx.lineTo(6 * sSize, 6 * sSize);
    ctx.lineTo(7.5 * sSize, 7.5 * sSize);
    ctx.closePath();
    ctx.fillStyle = colors.blue; // Left triangle (Blue arrives from left)
    ctx.fill();

    // Draw Paths and Cells
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        // Skip base areas and center
        if ((x < 6 && y < 6) || (x > 8 && y < 6) || (x > 8 && y > 8) || (x < 6 && y > 8) || (x >= 6 && x <= 8 && y >= 6 && y <= 8)) {
          continue;
        }

        const cellX = x * sSize;
        const cellY = y * sSize;

        ctx.strokeStyle = colors.darkGray;
        ctx.lineWidth = 1;
        ctx.strokeRect(cellX, cellY, sSize, sSize);

        // Safe spots (Stars)
        const commonPathIdx = this.getCommonPathIndex(x, y);
        const isSafe = commonPathIdx !== -1 && SAFE_SPOTS.includes(commonPathIdx);

        // Highlight home tracks
        if (x === 7 && y > 0 && y < 6) ctx.fillStyle = colors.red;
        else if (x === 7 && y > 8 && y < 14) ctx.fillStyle = colors.yellow;
        else if (y === 7 && x > 0 && x < 6) ctx.fillStyle = colors.blue;
        else if (y === 7 && x > 8 && x < 14) ctx.fillStyle = colors.green;
        // Highlight start tiles
        else if (x === 6 && y === 1) ctx.fillStyle = colors.red;
        else if (x === 13 && y === 6) ctx.fillStyle = colors.green;
        else if (x === 8 && y === 13) ctx.fillStyle = colors.yellow;
        else if (x === 1 && y === 8) ctx.fillStyle = colors.blue;
        // Safe spots (non-start)
        else if (isSafe) ctx.fillStyle = colors.darkGray;
        // Normal cells
        else ctx.fillStyle = colors.white;
        
        ctx.fillRect(cellX + 1, cellY + 1, sSize - 2, sSize - 2);

        if (isSafe) {
          this.drawStar(ctx, cellX + sSize / 2, cellY + sSize / 2, sSize / 4, colors.white);
        }
      }
    }
  }

  drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
    ctx.save();
    ctx.beginPath();
    ctx.translate(cx, cy);
    ctx.moveTo(0, -r);
    for (let i = 0; i < 5; i++) {
      ctx.rotate(Math.PI / 5);
      ctx.lineTo(0, -r * 0.5);
      ctx.rotate(Math.PI / 5);
      ctx.lineTo(0, -r);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  getCommonPathIndex(x: number, y: number): number {
    // Find the index in COMMON_PATH for a given grid coordinate
    // This is a bit slow but only used during drawing
    const COMMON_PATH: Point[] = [
      {x: 6, y: 0}, {x: 6, y: 1}, {x: 6, y: 2}, {x: 6, y: 3}, {x: 6, y: 4}, {x: 6, y: 5},
      {x: 5, y: 6}, {x: 4, y: 6}, {x: 3, y: 6}, {x: 2, y: 6}, {x: 1, y: 6}, {x: 0, y: 6},
      {x: 0, y: 7},
      {x: 0, y: 8}, {x: 1, y: 8}, {x: 2, y: 8}, {x: 3, y: 8}, {x: 4, y: 8}, {x: 5, y: 8},
      {x: 6, y: 9}, {x: 6, y: 10}, {x: 6, y: 11}, {x: 6, y: 12}, {x: 6, y: 13}, {x: 6, y: 14},
      {x: 7, y: 14},
      {x: 8, y: 14}, {x: 8, y: 13}, {x: 8, y: 12}, {x: 8, y: 11}, {x: 8, y: 10}, {x: 8, y: 9},
      {x: 9, y: 8}, {x: 10, y: 8}, {x: 11, y: 8}, {x: 12, y: 8}, {x: 13, y: 8}, {x: 14, y: 8},
      {x: 14, y: 7},
      {x: 14, y: 6}, {x: 13, y: 6}, {x: 12, y: 6}, {x: 11, y: 6}, {x: 10, y: 6}, {x: 9, y: 6},
      {x: 8, y: 5}, {x: 8, y: 4}, {x: 8, y: 3}, {x: 8, y: 2}, {x: 8, y: 1}, {x: 8, y: 0},
      {x: 7, y: 0}
    ];
    return COMMON_PATH.findIndex(p => p.x === x && p.y === y);
  }

  drawBase(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    const sSize = CELL_SIZE * this.scale;
    const baseSize = 6 * sSize;
    
    ctx.fillStyle = color;
    ctx.fillRect(x, y, baseSize, baseSize);
    
    ctx.fillStyle = 'white';
    ctx.fillRect(x + sSize, y + sSize, 4 * sSize, 4 * sSize);
    
    // Draw 4 circles for pieces
    ctx.fillStyle = color;
    const circleRadius = sSize * 0.6;
    const offsets = [
      { dx: 1.5 * sSize, dy: 1.5 * sSize },
      { dx: 3.5 * sSize, dy: 1.5 * sSize },
      { dx: 1.5 * sSize, dy: 3.5 * sSize },
      { dx: 3.5 * sSize, dy: 3.5 * sSize }
    ];
    
    offsets.forEach(offset => {
      ctx.beginPath();
      ctx.arc(x + offset.dx, y + offset.dy, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.stroke();
    });
  }
}
