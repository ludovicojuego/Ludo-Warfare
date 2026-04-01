
import { PlayerColor, Point, CELL_SIZE, BASE_POSITIONS, getPlayerPath } from './constants';

export enum SoldierState {
  IDLE = 'IDLE',
  MARCHING = 'MARCHING',
  ATTACKING = 'ATTACKING',
  DEFEATED = 'DEFEATED',
  VICTORY = 'VICTORY'
}

export enum AttackType {
  SWORD = 'SWORD',
  GUN = 'GUN',
  TICKLE = 'TICKLE',
  BOMB = 'BOMB',
  LASER = 'LASER',
  KICK = 'KICK'
}

export class Soldier {
  id: string;
  color: PlayerColor;
  state: SoldierState = SoldierState.IDLE;
  
  // Position in grid coordinates
  gridX: number;
  gridY: number;
  
  // Visual position in pixels (for smooth movement)
  x: number;
  y: number;
  
  // Game state
  pathIndex: number = -1; // -1 means in base
  path: Point[];
  baseIndex: number;
  
  // Animation properties
  animationFrame: number = 0;
  animationTimer: number = 0;
  targetX: number;
  targetY: number;
  offsetX: number = 0;
  offsetY: number = 0;
  moveSpeed: number = 0.15;
  
  // Capture/Combat properties
  combatTimer: number = 0;
  currentAttackType: AttackType = AttackType.SWORD;
  victimOfAttackType: AttackType | null = null;
  
  constructor(color: PlayerColor, index: number) {
    this.id = `${color}-${index}`;
    this.color = color;
    this.baseIndex = index;
    const basePos = BASE_POSITIONS[color][index];
    this.gridX = basePos.x;
    this.gridY = basePos.y;
    this.offsetX = 0;
    this.offsetY = 0;
    this.updateTarget();
    this.x = this.targetX;
    this.y = this.targetY;
    this.path = getPlayerPath(color);
  }

  update(dt: number) {
    this.animationTimer += dt;
    if (this.animationTimer > 100) {
      this.animationFrame = (this.animationFrame + 1) % 4;
      this.animationTimer = 0;
    }

    // Smooth movement logic
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Faster speed for defeated soldiers (retreating in panic)
    const currentSpeed = this.state === SoldierState.DEFEATED ? this.moveSpeed * 2 : this.moveSpeed;

    if (dist > 1) {
      this.x += dx * currentSpeed;
      this.y += dy * currentSpeed;
      if (this.state !== SoldierState.DEFEATED && this.state !== SoldierState.ATTACKING && this.state !== SoldierState.VICTORY) {
        this.state = SoldierState.MARCHING;
      }
    } else {
      this.x = this.targetX;
      this.y = this.targetY;
      if (this.state === SoldierState.MARCHING || this.state === SoldierState.DEFEATED) {
        this.state = SoldierState.IDLE;
        this.victimOfAttackType = null;
        this.combatTimer = 0;
      }
    }

    // Combat animation timer
    if (this.state === SoldierState.ATTACKING || this.state === SoldierState.DEFEATED) {
      this.combatTimer += dt;
      if (this.combatTimer > 3000 && this.state === SoldierState.ATTACKING) {
        this.state = SoldierState.IDLE;
        this.combatTimer = 0;
      }
    }
  }

  moveToGrid(gx: number, gy: number) {
    this.gridX = gx;
    this.gridY = gy;
    this.updateTarget();
  }

  updateTarget() {
    const centerX = Number.isInteger(this.gridX) ? this.gridX + 0.5 : this.gridX;
    const centerY = Number.isInteger(this.gridY) ? this.gridY + 0.5 : this.gridY;
    this.targetX = centerX * CELL_SIZE + this.offsetX;
    this.targetY = centerY * CELL_SIZE + this.offsetY;
  }

  moveToBase() {
    this.pathIndex = -1;
    const basePos = BASE_POSITIONS[this.color][this.baseIndex];
    this.state = SoldierState.DEFEATED;
    this.moveToGrid(basePos.x, basePos.y);
  }

  draw(ctx: CanvasRenderingContext2D, scale: number) {
    const sX = this.x * scale;
    const sY = this.y * scale;
    const sSize = CELL_SIZE * scale;
    const colorMap = {
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      blue: '#3b82f6'
    };
    const mainColor = colorMap[this.color];

    ctx.save();
    ctx.translate(sX, sY);

    // Placeholder Soldier Drawing Logic
    // This can be replaced with sprite sheet drawing
    
    // Bounce effect for idle
    let bounce = 0;
    if (this.state === SoldierState.IDLE) {
      bounce = Math.sin(Date.now() / 200) * 2;
    }
    
    // Shake and lunge effect for attacking
    if (this.state === SoldierState.ATTACKING) {
      const lunge = Math.sin(this.combatTimer / 100) * 10;
      ctx.translate(lunge, Math.random() * 4 - 2);
    }

    // Defeated reactions based on attack type
    if (this.state === SoldierState.DEFEATED && this.victimOfAttackType) {
      const t = this.combatTimer;
      switch (this.victimOfAttackType) {
        case AttackType.SWORD:
          // Shake and split effect
          ctx.translate(Math.sin(t / 20) * 5, 0);
          if (t > 500) ctx.rotate(Math.sin(t / 100) * 0.1);
          break;
        case AttackType.GUN:
          // Pushed back and jittery
          ctx.translate(-Math.min(20, t / 50), Math.random() * 4 - 2);
          break;
        case AttackType.TICKLE:
          // Wiggle and float
          ctx.translate(Math.sin(t / 30) * 10, -Math.min(15, t / 100));
          ctx.rotate(Math.sin(t / 50) * 0.2);
          break;
        case AttackType.BOMB:
          // Fly up and spin
          const height = Math.sin(Math.min(Math.PI, t / 500)) * 50;
          ctx.translate(0, -height);
          ctx.rotate(t / 100);
          break;
        case AttackType.LASER:
          // Melting effect (squash)
          const scale = Math.max(0.2, 1 - t / 2000);
          ctx.scale(1 + (1 - scale), scale);
          break;
        case AttackType.KICK:
          // Flattened
          const squash = Math.max(0.1, 1 - t / 300);
          if (t < 500) ctx.scale(1.5, squash);
          else ctx.rotate(t / 50); // Then spin away
          break;
      }
    }

    // Retreating in panic (spinning) - only if not actively being hit
    if (this.state === SoldierState.DEFEATED && !this.victimOfAttackType) {
      ctx.rotate(Date.now() / 50);
    }

    // Victory dance
    if (this.state === SoldierState.VICTORY) {
      ctx.rotate(Math.sin(Date.now() / 100) * 0.2);
      bounce = -Math.abs(Math.sin(Date.now() / 150) * 10);
    }

    // Draw Body
    ctx.fillStyle = this.state === SoldierState.DEFEATED && this.victimOfAttackType === AttackType.BOMB ? '#1a1a1a' : mainColor;
    if (this.state === SoldierState.DEFEATED && this.victimOfAttackType === AttackType.LASER) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ef4444';
    }
    
    ctx.beginPath();
    ctx.roundRect(-sSize * 0.3, -sSize * 0.4 + bounce, sSize * 0.6, sSize * 0.7, 5);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Head
    ctx.fillStyle = this.state === SoldierState.DEFEATED ? '#374151' : '#ffdbac'; // Skin tone or dark helmet
    ctx.beginPath();
    ctx.arc(0, -sSize * 0.5 + bounce, sSize * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Helmet
    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.arc(0, -sSize * 0.5 + bounce, sSize * 0.2, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes
    if (this.state === SoldierState.DEFEATED) {
      // Dead/Shocked eyes (X X)
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(-sSize * 0.12, -sSize * 0.55 + bounce);
      ctx.lineTo(-sSize * 0.02, -sSize * 0.45 + bounce);
      ctx.moveTo(-sSize * 0.02, -sSize * 0.55 + bounce);
      ctx.lineTo(-sSize * 0.12, -sSize * 0.45 + bounce);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(sSize * 0.02, -sSize * 0.55 + bounce);
      ctx.lineTo(sSize * 0.12, -sSize * 0.45 + bounce);
      ctx.moveTo(sSize * 0.12, -sSize * 0.55 + bounce);
      ctx.lineTo(sSize * 0.02, -sSize * 0.45 + bounce);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(-sSize * 0.07, -sSize * 0.5 + bounce, 2, 0, Math.PI * 2);
      ctx.arc(sSize * 0.07, -sSize * 0.5 + bounce, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Weapon (if attacking)
    if (this.state === SoldierState.ATTACKING) {
      this.drawAttack(ctx, sSize);
    }

    ctx.restore();
  }

  private drawAttack(ctx: CanvasRenderingContext2D, sSize: number) {
    const t = this.combatTimer;
    
    // Center of the attack should be slightly offset from the soldier but overlapping the tile
    ctx.save();
    
    switch (this.currentAttackType) {
      case AttackType.SWORD: {
        // Multiple swings
        const swing = Math.sin(t / 100) * 1.2;
        ctx.rotate(swing);
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sSize * 0.8, -sSize * 0.5);
        ctx.stroke();
        // Sword hilt
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sSize * 0.2, -sSize * 0.1);
        ctx.stroke();
        break;
      }
      case AttackType.GUN: {
        // Draw Gun
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, -sSize * 0.2, sSize * 0.5, sSize * 0.25);
        ctx.fillRect(0, -sSize * 0.2, sSize * 0.2, sSize * 0.4);
        
        // Multiple shots
        const shotTime = t % 800;
        if (shotTime > 100 && shotTime < 300) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(sSize * 0.5, -sSize * 0.1, sSize * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Bullet trail - centered more
        const bulletProgress = (t % 800) / 800;
        if (bulletProgress > 0.2) {
          const bulletX = sSize * 0.5 + bulletProgress * sSize * 2;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(bulletX, -sSize * 0.1, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case AttackType.TICKLE: {
        const wiggle = Math.sin(t / 20) * 15;
        ctx.fillStyle = '#ffdbac';
        // Hands moving all over the center
        for (let j = 0; j < 2; j++) {
          const side = j === 0 ? 1 : -1;
          ctx.beginPath();
          ctx.arc(sSize * 0.2, side * sSize * 0.3 + wiggle, 6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = '#ffdbac';
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(sSize * 0.2, side * sSize * 0.3 + wiggle);
            ctx.lineTo(sSize * 0.5, side * sSize * 0.4 + wiggle + i * 6 - 9);
            ctx.stroke();
          }
        }
        break;
      }
      case AttackType.BOMB: {
        if (t < 1500) {
          // Slow falling bomb right on top
          const bombY = -sSize * 3 + (t / 1500) * (sSize * 3);
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(0, bombY, sSize * 0.3, 0, Math.PI * 2);
          ctx.fill();
          // Fuse sparking
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, bombY - sSize * 0.3);
          ctx.lineTo(Math.sin(t / 15) * 8, bombY - sSize * 0.6);
          ctx.stroke();
        } else {
          // Massive prolonged explosion at center
          const expProgress = (t - 1500) / 1500;
          const expSize = expProgress * sSize * 3;
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, expSize);
          grad.addColorStop(0, '#f59e0b');
          grad.addColorStop(0.3, '#ef4444');
          grad.addColorStop(0.7, '#7f1d1d');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, expSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Debris
          ctx.fillStyle = '#000';
          for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4 + t / 100;
            const dist = expSize * 0.8;
            ctx.fillRect(Math.cos(angle) * dist, Math.sin(angle) * dist, 4, 4);
          }
        }
        break;
      }
      case AttackType.LASER: {
        if (t > 400) {
          // Intense flickering laser from eyes
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 6 + Math.sin(t / 5) * 4;
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(0, -sSize * 0.5);
          ctx.lineTo(sSize * 3, -sSize * 0.5);
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          // Sparks at target area
          ctx.fillStyle = '#fbbf24';
          for (let i = 0; i < 5; i++) {
            const sx = sSize * 0.5 + Math.random() * sSize;
            ctx.fillRect(sx, -sSize * 0.5 + Math.random() * 10 - 5, 3, 3);
          }
        }
        break;
      }
      case AttackType.KICK: {
        // Wind up and multiple kicks
        const kickCycle = t % 1000;
        const kickProgress = Math.min(1, kickCycle / 400);
        const kickX = Math.sin(kickProgress * Math.PI) * sSize * 1.5;
        
        ctx.fillStyle = '#4b5563';
        ctx.beginPath();
        // Manual rounded rect for compatibility
        const r = 8;
        const w = sSize * 0.6;
        const h = sSize * 0.4;
        ctx.moveTo(kickX + r, -h/2);
        ctx.lineTo(kickX + w - r, -h/2);
        ctx.quadraticCurveTo(kickX + w, -h/2, kickX + w, -h/2 + r);
        ctx.lineTo(kickX + w, h/2 - r);
        ctx.quadraticCurveTo(kickX + w, h/2, kickX + w - r, h/2);
        ctx.lineTo(kickX + r, h/2);
        ctx.quadraticCurveTo(kickX, h/2, kickX, h/2 - r);
        ctx.lineTo(kickX, -h/2 + r);
        ctx.quadraticCurveTo(kickX, -h/2, kickX + r, -h/2);
        ctx.fill();
        ctx.stroke();
        
        // Impact effect
        if (kickProgress > 0.4 && kickProgress < 0.6) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(kickX + sSize * 0.3, 0, sSize * 0.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }
}
