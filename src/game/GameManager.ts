
import { PlayerColor, Point, START_INDICES, SAFE_SPOTS, getPlayerPath } from './constants';
import { Soldier, SoldierState, AttackType } from './Soldier';
import { Board } from './Board';
import { Dice } from './Dice';
import { sounds } from './SoundManager';
import { music } from './MusicManager';
import { StatsManager } from './StatsManager';
import { GamepadAction } from './GamepadManager';

export class GameManager {
  players: PlayerColor[] = [];
  currentPlayerIndex: number = 0;
  soldiers: Soldier[] = [];
  board: Board;
  dice: Dice;
  stats: StatsManager;
  aiPlayers: Set<PlayerColor> = new Set();
  
  // Game state
  diceValue: number = 0;
  hasRolled: boolean = false;
  isMoving: boolean = false;
  message: string = "";
  isGameOver: boolean = false;
  selectedSoldierIndex: number = -1;
  musicIntensity: number = 0;
  private isAIThinking: boolean = false;
  
  // Config
  leaveBaseRoll: number = 6; // Configurable: 5 for Parchís, 6 for Ludo
  
  constructor(width: number, height: number, playerCount: number = 4, aiPlayers: PlayerColor[] = []) {
    this.board = new Board(width, height);
    this.dice = new Dice((val) => this.handleRollComplete(val));
    this.stats = new StatsManager();
    this.aiPlayers = new Set(aiPlayers);
    
    // Define players based on count
    const allColors: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];
    this.players = allColors.slice(0, playerCount);
    
    // Initialize soldiers only for active players
    this.players.forEach(color => {
      for (let i = 0; i < 4; i++) {
        this.soldiers.push(new Soldier(color, i));
      }
    });

    this.message = `${this.players[0].toUpperCase()}'S TURN`;
    this.stats.startTurn();

    // If first player is AI, start their turn
    setTimeout(() => this.checkAITurn(), 1000);
  }

  resize(width: number, height: number) {
    this.board.resize(width, height);
    this.soldiers.forEach(s => s.updateTarget()); // Sync soldier positions to new scale
  }

  private checkAITurn() {
    if (this.isGameOver) return;
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (this.aiPlayers.has(currentPlayer)) {
      this.processAITurn();
    }
  }

  private async processAITurn() {
    if (this.isGameOver || this.dice.isRolling || this.hasRolled || this.isMoving || this.isAIThinking) return;

    this.isAIThinking = true;
    // AI thinking delay
    await new Promise(r => setTimeout(r, 1000));
    this.isAIThinking = false;

    // Re-check state after delay
    if (this.isGameOver || this.dice.isRolling || this.hasRolled || this.isMoving) return;
    
    // Roll dice
    this.dice.roll();
  }

  handleGamepadAction(action: GamepadAction) {
    if (this.isGameOver) return;

    switch (action) {
      case GamepadAction.ROLL:
        if (!this.hasRolled && !this.dice.isRolling) {
          this.dice.roll();
        }
        break;
      case GamepadAction.SELECT:
        if (this.hasRolled && !this.isMoving) {
          const movable = this.getMovableSoldiers(this.players[this.currentPlayerIndex], this.diceValue);
          if (movable.length > 0) {
            if (this.selectedSoldierIndex === -1) {
              this.selectedSoldierIndex = 0;
            } else {
              this.moveSoldier(movable[this.selectedSoldierIndex], this.diceValue);
              this.selectedSoldierIndex = -1;
            }
          }
        } else if (!this.hasRolled && !this.dice.isRolling) {
          this.dice.roll();
        }
        break;
      case GamepadAction.LEFT:
      case GamepadAction.UP:
        this.cycleSelection(-1);
        break;
      case GamepadAction.RIGHT:
      case GamepadAction.DOWN:
        this.cycleSelection(1);
        break;
    }
  }

  cycleSelection(dir: number) {
    if (!this.hasRolled || this.isMoving) return;
    const movable = this.getMovableSoldiers(this.players[this.currentPlayerIndex], this.diceValue);
    if (movable.length === 0) return;

    if (this.selectedSoldierIndex === -1) {
      this.selectedSoldierIndex = 0;
    } else {
      this.selectedSoldierIndex = (this.selectedSoldierIndex + dir + movable.length) % movable.length;
    }
  }

  handleRollComplete(value: number) {
    this.diceValue = value;
    this.hasRolled = true;
    
    const currentPlayer = this.players[this.currentPlayerIndex];
    this.stats.recordDiceRoll(currentPlayer, value);
    
    if (value === 6) {
      sounds.playSix();
    }
    
    const movableSoldiers = this.getMovableSoldiers(currentPlayer, value);
    
    if (movableSoldiers.length === 0) {
      this.message = `${currentPlayer.toUpperCase()} has no moves!`;
      if (value === 6) {
        this.hasRolled = false;
        this.message = `${currentPlayer.toUpperCase()} rolled a 6 but has no moves! Bonus roll!`;
        setTimeout(() => this.checkAITurn(), 1500);
      } else {
        setTimeout(() => this.nextTurn(), 1500);
      }
    } else if (movableSoldiers.length === 1) {
      this.message = `${currentPlayer.toUpperCase()} rolled a ${value}! Moving automatically...`;
      this.selectedSoldierIndex = 0;
      setTimeout(() => {
        if (this.hasRolled && !this.isMoving) {
          this.moveSoldier(movableSoldiers[0], value);
          this.selectedSoldierIndex = -1;
        }
      }, 800);
    } else {
      this.message = `${currentPlayer.toUpperCase()} rolled a ${value}! Select a soldier.`;
      this.selectedSoldierIndex = 0; // Auto-select first movable soldier for gamepad users

      // AI Decision
      if (this.aiPlayers.has(currentPlayer)) {
        setTimeout(() => {
          this.aiMakeMove(movableSoldiers);
        }, 1000);
      }
    }
  }

  private aiMakeMove(movable: Soldier[]) {
    if (!this.hasRolled || this.isMoving) return;

    // AI Logic:
    // 1. Prioritize capturing an enemy
    // 2. Prioritize moving a soldier that is already on the board over leaving base
    // 3. Prioritize moving a soldier closest to home
    // 4. Otherwise random

    let bestSoldier = movable[0];
    let maxPriority = -1;

    movable.forEach(s => {
      let priority = 0;
      
      // Check if this move results in a capture
      const targetIdx = s.pathIndex + this.diceValue;
      const targetPoint = s.path[targetIdx];
      const wouldCapture = this.soldiers.some(other => 
        other.color !== s.color && 
        other.gridX === targetPoint.x && 
        other.gridY === targetPoint.y &&
        other.pathIndex !== -1 &&
        !SAFE_SPOTS.includes((START_INDICES[other.color] + other.pathIndex) % 52)
      );

      if (wouldCapture) priority += 100;
      if (s.pathIndex === -1) priority += 10; // Leaving base is good
      priority += s.pathIndex; // Further along the path is better

      if (priority > maxPriority) {
        maxPriority = priority;
        bestSoldier = s;
      }
    });

    this.moveSoldier(bestSoldier, this.diceValue);
  }

  getMovableSoldiers(color: PlayerColor, diceValue: number): Soldier[] {
    return this.soldiers.filter(s => {
      if (s.color !== color) return false;
      
      // In base
      if (s.pathIndex === -1) {
        return diceValue === this.leaveBaseRoll;
      }
      
      // On board
      return s.pathIndex + diceValue < s.path.length;
    });
  }

  handleCanvasClick(x: number, y: number, scale: number) {
    if (!this.hasRolled || this.isMoving) return;
    
    const currentPlayer = this.players[this.currentPlayerIndex];
    
    // Check if any movable soldier was clicked
    const clickedSoldier = this.soldiers.find(s => {
      if (s.color !== currentPlayer) return false;
      const dx = s.x * scale - x;
      const dy = s.y * scale - y;
      return Math.sqrt(dx * dx + dy * dy) < 20 * scale;
    });
    
    if (clickedSoldier) {
      const movable = this.getMovableSoldiers(currentPlayer, this.diceValue);
      if (movable.includes(clickedSoldier)) {
        this.moveSoldier(clickedSoldier, this.diceValue);
      }
    }
  }

  async moveSoldier(soldier: Soldier, steps: number) {
    this.isMoving = true;
    this.hasRolled = false;
    
    if (soldier.pathIndex === -1) {
      // Leave base
      soldier.pathIndex = 0;
      const target = soldier.path[0];
      soldier.moveToGrid(target.x, target.y);
      sounds.playMove();
      await new Promise(r => setTimeout(r, 500));
    } else {
      // Move step by step
      for (let i = 0; i < steps; i++) {
        soldier.pathIndex++;
        const target = soldier.path[soldier.pathIndex];
        soldier.moveToGrid(target.x, target.y);
        sounds.playMove();
        await new Promise(r => setTimeout(r, 300));
      }
    }
    
    // Check for capture
    const captureOccurred = this.checkCapture(soldier);
    
    // Wait for attack animation if it started
    if (captureOccurred) {
      await new Promise(r => setTimeout(r, 3200)); // Slightly longer than 3s to be safe
    }
    
    // Check for victory
    if (soldier.pathIndex === soldier.path.length - 1) {
      soldier.state = SoldierState.VICTORY;
      this.message = `${soldier.color.toUpperCase()} reached home!`;
      
      // Check if all soldiers of this color are home
      const allHome = this.soldiers
        .filter(s => s.color === soldier.color)
        .every(s => s.pathIndex === s.path.length - 1);
      
      if (allHome) {
        this.isGameOver = true;
        this.message = `GAME OVER: ${soldier.color.toUpperCase()} WINS!`;
      }
    }
    
    this.isMoving = false;
    
    if (this.isGameOver) return;
    
    // Bonus roll if 6 or capture
    if (this.diceValue === 6 || captureOccurred) {
      this.message = `${soldier.color.toUpperCase()} gets another roll!`;
      this.hasRolled = false;
      setTimeout(() => this.checkAITurn(), 500);
    } else {
      this.nextTurn();
    }
  }

  checkCapture(attacker: Soldier): boolean {
    // Don't capture in safe zones
    const commonPathIdx = (START_INDICES[attacker.color] + attacker.pathIndex) % 52;
    const isSafe = SAFE_SPOTS.includes(commonPathIdx) || attacker.pathIndex >= 51;
    
    if (isSafe) return false;

    const victims = this.soldiers.filter(s => 
      s.color !== attacker.color && 
      s.gridX === attacker.gridX && 
      s.gridY === attacker.gridY &&
      s.pathIndex !== -1
    );

    if (victims.length > 0) {
      attacker.state = SoldierState.ATTACKING;
      attacker.combatTimer = 0;
      
      // Record stats
      this.stats.recordCapture(attacker.color, victims.map(v => v.color));
      
      // Randomize attack type
      const attackTypes = Object.values(AttackType);
      attacker.currentAttackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
      
      // Set victims to defeated state and store the attack type they are suffering from
      victims.forEach(v => {
        v.state = SoldierState.DEFEATED;
        v.combatTimer = 0;
        v.victimOfAttackType = attacker.currentAttackType;
      });
      
      this.message = `COMBAT: ${attacker.color.toUpperCase()} uses ${attacker.currentAttackType}!`;
      
      // Play sound based on attack type
      switch (attacker.currentAttackType) {
        case AttackType.SWORD: sounds.playCapture(); break;
        case AttackType.GUN: sounds.playGunshot(); break;
        case AttackType.TICKLE: sounds.playTickle(); break;
        case AttackType.BOMB: sounds.playExplosion(); break;
        case AttackType.LASER: sounds.playLaser(); break;
        case AttackType.KICK: sounds.playKick(); break;
      }
      
      // Delay victim retreat so we can see the attack
      setTimeout(() => {
        victims.forEach(v => {
          v.moveToBase();
        });
      }, 1500); // Halfway through the 3s animation
      
      this.message = `${attacker.color.toUpperCase()} captured an enemy! Bonus roll!`;
      this.hasRolled = false; // Allow another roll
      return true;
    }
    return false;
  }

  nextTurn() {
    this.stats.endTurn(this.players[this.currentPlayerIndex]);
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.hasRolled = false;
    this.diceValue = 0;
    this.selectedSoldierIndex = -1;
    this.message = `${this.players[this.currentPlayerIndex].toUpperCase()}'s Turn`;
    this.stats.startTurn();

    // Check if next player is AI
    setTimeout(() => this.checkAITurn(), 500);
  }

  recalculateOffsets() {
    const groups: { [key: string]: Soldier[] } = {};
    
    // Only group soldiers that are not currently marching/moving between tiles
    // to avoid jittery movement when passing through occupied cells.
    this.soldiers.forEach(s => {
      if (s.state === SoldierState.MARCHING || s.state === SoldierState.DEFEATED) {
        s.offsetX = 0;
        s.offsetY = 0;
      }
      const key = `${s.gridX},${s.gridY}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    for (const key in groups) {
      const group = groups[key];
      const stationary = group.filter(s => s.state !== SoldierState.MARCHING && s.state !== SoldierState.DEFEATED);
      
      if (stationary.length <= 1) {
        group.forEach(s => {
          if (s.state !== SoldierState.MARCHING && s.state !== SoldierState.DEFEATED) {
            s.offsetX = 0;
            s.offsetY = 0;
            s.updateTarget();
          }
        });
      } else {
        const radius = 12; 
        stationary.forEach((s, i) => {
          const angle = (i / stationary.length) * Math.PI * 2;
          s.offsetX = Math.cos(angle) * radius;
          s.offsetY = Math.sin(angle) * radius;
          s.updateTarget();
        });
      }
    }
  }

  update(dt: number) {
    this.recalculateOffsets();
    this.soldiers.forEach(s => s.update(dt));
    this.dice.update(dt);
    this.updateMusicIntensity();
  }

  private updateMusicIntensity() {
    let maxRisk = 0;
    const currentPlayer = this.players[this.currentPlayerIndex];

    // Check if current player can capture someone with their roll
    if (this.hasRolled && !this.isMoving) {
      const movable = this.getMovableSoldiers(currentPlayer, this.diceValue);
      movable.forEach(s => {
        const targetIdx = s.pathIndex + this.diceValue;
        if (targetIdx < s.path.length) {
          const targetPoint = s.path[targetIdx];
          const canCapture = this.soldiers.some(other => 
            other.color !== s.color && 
            other.gridX === targetPoint.x && 
            other.gridY === targetPoint.y &&
            other.pathIndex !== -1 &&
            !SAFE_SPOTS.includes((START_INDICES[other.color] + other.pathIndex) % 52)
          );
          if (canCapture) maxRisk = 1.0;
        }
      });
    }

    // If no immediate capture, check proximity risk
    if (maxRisk < 1.0) {
      this.soldiers.forEach(s1 => {
        if (s1.pathIndex === -1) return;
        
        this.soldiers.forEach(s2 => {
          if (s1.color === s2.color || s2.pathIndex === -1) return;
          
          // Check if s1 is behind s2 within 6 steps on the board
          const dx = Math.abs(s1.gridX - s2.gridX);
          const dy = Math.abs(s1.gridY - s2.gridY);
          if (dx <= 2 && dy <= 2) {
            maxRisk = Math.max(maxRisk, 0.5);
          }
        });
      });
    }

    // Smoothly transition intensity
    this.musicIntensity += (maxRisk - this.musicIntensity) * 0.05;
    music.setIntensity(this.musicIntensity);
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.board.draw(ctx);
    
    // Draw soldiers (sort so moving ones are on top)
    const sortedSoldiers = [...this.soldiers].sort((a, b) => {
      if (a.state === SoldierState.MARCHING) return 1;
      if (b.state === SoldierState.MARCHING) return -1;
      return 0;
    });
    
    const currentPlayer = this.players[this.currentPlayerIndex];
    const movable = this.getMovableSoldiers(currentPlayer, this.diceValue);
    const selectedSoldier = this.selectedSoldierIndex !== -1 ? movable[this.selectedSoldierIndex] : null;

    sortedSoldiers.forEach(s => {
      const isSelected = s === selectedSoldier;
      
      if (isSelected) {
        // Draw selection highlight
        ctx.save();
        ctx.beginPath();
        ctx.arc(s.x * this.board.scale, s.y * this.board.scale, 25 * this.board.scale, 0, Math.PI * 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3 * this.board.scale;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        
        // Pulsing glow
        const glow = (Math.sin(performance.now() / 200) + 1) / 2;
        ctx.shadowBlur = 15 * glow * this.board.scale;
        ctx.shadowColor = 'white';
        ctx.stroke();
        ctx.restore();
      }

      s.draw(ctx, this.board.scale);
    });
    
    // Draw Dice
    const diceSize = 60 * this.board.scale;
    this.dice.draw(ctx, 7.5 * 40 * this.board.scale, 7.5 * 40 * this.board.scale, diceSize);
  }
}
