
export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Point {
  x: number;
  y: number;
}

export const GRID_SIZE = 15;
export const CELL_SIZE = 40; // Will be scaled based on canvas size
export const BOARD_SIZE = GRID_SIZE * CELL_SIZE;

// Base positions (center of the 4 circles in each base)
export const BASE_POSITIONS: Record<PlayerColor, Point[]> = {
  red: [
    { x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 },
    { x: 1.5, y: 3.5 }, { x: 3.5, y: 3.5 }
  ],
  green: [
    { x: 10.5, y: 1.5 }, { x: 12.5, y: 1.5 },
    { x: 10.5, y: 3.5 }, { x: 12.5, y: 3.5 }
  ],
  yellow: [
    { x: 10.5, y: 10.5 }, { x: 12.5, y: 10.5 },
    { x: 10.5, y: 12.5 }, { x: 12.5, y: 12.5 }
  ],
  blue: [
    { x: 1.5, y: 10.5 }, { x: 3.5, y: 10.5 },
    { x: 1.5, y: 12.5 }, { x: 3.5, y: 12.5 }
  ]
};

// Common path coordinates (0-51) starting from (6,0) and going clockwise
const COMMON_PATH: Point[] = [
  {x: 6, y: 0}, {x: 6, y: 1}, {x: 6, y: 2}, {x: 6, y: 3}, {x: 6, y: 4}, {x: 6, y: 5}, // 0-5
  {x: 5, y: 6}, {x: 4, y: 6}, {x: 3, y: 6}, {x: 2, y: 6}, {x: 1, y: 6}, {x: 0, y: 6}, // 6-11
  {x: 0, y: 7}, // 12
  {x: 0, y: 8}, {x: 1, y: 8}, {x: 2, y: 8}, {x: 3, y: 8}, {x: 4, y: 8}, {x: 5, y: 8}, // 13-18
  {x: 6, y: 9}, {x: 6, y: 10}, {x: 6, y: 11}, {x: 6, y: 12}, {x: 6, y: 13}, {x: 6, y: 14}, // 19-24
  {x: 7, y: 14}, // 25
  {x: 8, y: 14}, {x: 8, y: 13}, {x: 8, y: 12}, {x: 8, y: 11}, {x: 8, y: 10}, {x: 8, y: 9}, // 26-31
  {x: 9, y: 8}, {x: 10, y: 8}, {x: 11, y: 8}, {x: 12, y: 8}, {x: 13, y: 8}, {x: 14, y: 8}, // 32-37
  {x: 14, y: 7}, // 38
  {x: 14, y: 6}, {x: 13, y: 6}, {x: 12, y: 6}, {x: 11, y: 6}, {x: 10, y: 6}, {x: 9, y: 6}, // 39-44
  {x: 8, y: 5}, {x: 8, y: 4}, {x: 8, y: 3}, {x: 8, y: 2}, {x: 8, y: 1}, {x: 8, y: 0}, // 45-50
  {x: 7, y: 0} // 51
];

// Home paths
const HOME_PATHS: Record<PlayerColor, Point[]> = {
  red: [{x: 7, y: 1}, {x: 7, y: 2}, {x: 7, y: 3}, {x: 7, y: 4}, {x: 7, y: 5}, {x: 7, y: 6}],
  blue: [{x: 1, y: 7}, {x: 2, y: 7}, {x: 3, y: 7}, {x: 4, y: 7}, {x: 5, y: 7}, {x: 6, y: 7}],
  yellow: [{x: 7, y: 13}, {x: 7, y: 12}, {x: 7, y: 11}, {x: 7, y: 10}, {x: 7, y: 9}, {x: 7, y: 8}],
  green: [{x: 13, y: 7}, {x: 12, y: 7}, {x: 11, y: 7}, {x: 10, y: 7}, {x: 9, y: 7}, {x: 8, y: 7}]
};

// Start indices in COMMON_PATH
export const START_INDICES: Record<PlayerColor, number> = {
  red: 1,
  blue: 14,
  yellow: 27,
  green: 40
};

// Safe spots (indices in COMMON_PATH)
export const SAFE_SPOTS: number[] = [1, 9, 14, 22, 27, 35, 40, 48];

export function getPlayerPath(color: PlayerColor): Point[] {
  const startIdx = START_INDICES[color];
  const path: Point[] = [];
  
  // 51 steps around the board
  for (let i = 0; i < 51; i++) {
    path.push(COMMON_PATH[(startIdx + i) % 52]);
  }
  
  // 6 steps into home
  path.push(...HOME_PATHS[color]);
  
  return path;
}
