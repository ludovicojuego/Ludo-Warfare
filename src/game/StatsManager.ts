
import { PlayerColor } from './constants';

export interface PlayerStats {
  diceRolls: Record<number, number>;
  totalCaptures: number;
  maxConsecutiveCaptures: number;
  currentConsecutiveCaptures: number;
  totalDefeated: number;
  maxConsecutiveDefeated: number;
  currentConsecutiveDefeated: number;
  turnTimes: number[];
}

export class StatsManager {
  stats: Record<PlayerColor, PlayerStats>;
  private turnStartTime: number = 0;

  constructor() {
    this.stats = {
      red: this.createEmptyStats(),
      green: this.createEmptyStats(),
      yellow: this.createEmptyStats(),
      blue: this.createEmptyStats(),
    };
  }

  private createEmptyStats(): PlayerStats {
    return {
      diceRolls: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      totalCaptures: 0,
      maxConsecutiveCaptures: 0,
      currentConsecutiveCaptures: 0,
      totalDefeated: 0,
      maxConsecutiveDefeated: 0,
      currentConsecutiveDefeated: 0,
      turnTimes: [],
    };
  }

  recordDiceRoll(color: PlayerColor, value: number) {
    this.stats[color].diceRolls[value]++;
  }

  recordCapture(attackerColor: PlayerColor, victimColors: PlayerColor[]) {
    // Attacker stats
    const attacker = this.stats[attackerColor];
    attacker.totalCaptures += victimColors.length;
    attacker.currentConsecutiveCaptures += victimColors.length;
    if (attacker.currentConsecutiveCaptures > attacker.maxConsecutiveCaptures) {
      attacker.maxConsecutiveCaptures = attacker.currentConsecutiveCaptures;
    }
    // Reset defeated streak for attacker since they are on the offensive
    attacker.currentConsecutiveDefeated = 0;

    // Victim stats
    victimColors.forEach(color => {
      const victim = this.stats[color];
      victim.totalDefeated++;
      victim.currentConsecutiveDefeated++;
      if (victim.currentConsecutiveDefeated > victim.maxConsecutiveDefeated) {
        victim.maxConsecutiveDefeated = victim.currentConsecutiveDefeated;
      }
      // Reset capture streak for victim
      victim.currentConsecutiveCaptures = 0;
    });
  }

  startTurn() {
    this.turnStartTime = performance.now();
  }

  endTurn(color: PlayerColor) {
    const duration = (performance.now() - this.turnStartTime) / 1000; // in seconds
    if (duration < 60) {
      this.stats[color].turnTimes.push(duration);
    }
  }

  getAverageTurnTime(color: PlayerColor): number {
    const times = this.stats[color].turnTimes;
    if (times.length === 0) return 0;
    const sum = times.reduce((a, b) => a + b, 0);
    return sum / times.length;
  }
}
