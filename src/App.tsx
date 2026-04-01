/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameManager } from './game/GameManager';
import { Dices, Swords, Trophy, User, BarChart3, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StatsModal } from './components/StatsModal';
import { GamepadManager, GamepadAction } from './game/GamepadManager';
import { StartMenu } from './components/StartMenu';
import { music } from './game/MusicManager';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const gamepadRef = useRef<GamepadManager | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const isStatsOpenRef = useRef(false);
  const [gameMode, setGameMode] = useState<'menu' | 'local' | 'ai'>('menu');
  const [playerCount, setPlayerCount] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(600);
  
  // Dynamic Resizing Logic
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      // We want to keep the board a square. 
      // Leave space for padding and the sidebar on larger screens.
      const isLandscape = clientWidth > clientHeight;
      let size;
      
      if (isLandscape) {
        // Landscape (TV/Desktop): Height is usually the limiting factor
        // Leave room for header and padding
        size = Math.min(clientHeight * 0.85, clientWidth * 0.6);
      } else {
        // Portrait (Mobile): Width is the limiting factor
        size = clientWidth * 0.9;
      }
      
      setCanvasSize(Math.max(300, size)); // Min size of 300px
      
      if (gameManagerRef.current) {
        gameManagerRef.current.resize(size, size);
      }
    };

    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    updateSize(); // Initial call

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [gameMode]);
  useEffect(() => {
    isStatsOpenRef.current = isStatsOpen;
  }, [isStatsOpen]);

  // Global Music Management
  useEffect(() => {
    if (gameMode !== 'menu') {
      music.start();
    } else {
      music.stop();
    }
  }, [gameMode]);
  const [gameState, setGameState] = useState({
    currentPlayer: 'red',
    message: "RED'S TURN",
    diceValue: 0,
    isRolling: false,
    hasRolled: false,
    isGameOver: false
  });

  const startGame = (mode: 'local' | 'ai', count: number) => {
    setPlayerCount(count);
    setGameMode(mode);
  };

  useEffect(() => {
    // Initialize Gamepad Manager (always active)
    const gamepad = new GamepadManager((action) => {
      if (gameMode === 'menu') {
        if (action === GamepadAction.UP || action === GamepadAction.LEFT) {
          // In a real menu we'd cycle buttons, for now just a simple mapping
        }
        if (action === GamepadAction.SELECT) {
          startGame('ai', 4); // Default to AI with 4 players on select in menu for now
        }
        return;
      }

      if (isStatsOpenRef.current) {
        if (action === GamepadAction.BACK || action === GamepadAction.SELECT) {
          setIsStatsOpen(false);
        }
        return;
      }
      if (gameManagerRef.current) {
        gameManagerRef.current.handleGamepadAction(action);
      }
    });
    gamepadRef.current = gamepad;

    if (gameMode === 'menu' || !canvasRef.current) {
      let menuAnimId: number;
      const menuLoop = () => {
        gamepad.update();
        menuAnimId = requestAnimationFrame(menuLoop);
      };
      menuAnimId = requestAnimationFrame(menuLoop);
      return () => {
        cancelAnimationFrame(menuAnimId);
        gamepad.destroy();
      };
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize Game Manager
    const allColors: any[] = ['red', 'blue', 'yellow', 'green'];
    const aiPlayers = gameMode === 'ai' ? allColors.slice(1, playerCount) : [];
    const gm = new GameManager(canvas.width, canvas.height, playerCount, aiPlayers);
    gameManagerRef.current = gm;

    let lastTime = performance.now();
    let animationId: number;
    let wasGameOver = false;

    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      // Update gamepad
      gamepad.update();

      // Update game logic
      gm.update(dt);

      // Draw game
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      gm.draw(ctx);

      // Update React state for UI
      setGameState({
        currentPlayer: gm.players[gm.currentPlayerIndex],
        message: gm.message,
        diceValue: gm.dice.value,
        isRolling: gm.dice.isRolling,
        hasRolled: gm.hasRolled,
        isGameOver: gm.isGameOver
      });

      if (gm.isGameOver && !wasGameOver) {
        wasGameOver = true;
        setIsStatsOpen(true);
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      gamepad.destroy();
    };
  }, [gameMode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !gameManagerRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    gameManagerRef.current.handleCanvasClick(x, y, gameManagerRef.current.board.scale);
  };

  const handleRoll = () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.dice.roll();
    }
  };

  const playerColors: Record<string, string> = {
    red: 'bg-red-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500'
  };

  const playerTextColors: Record<string, string> = {
    red: 'text-red-500',
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    blue: 'text-blue-500'
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
      <AnimatePresence>
        {gameMode === 'menu' && (
          <StartMenu onStart={startGame} />
        )}
      </AnimatePresence>

      {/* Diffused Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <AnimatePresence>
          <motion.div
            key={gameState.currentPlayer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${
                gameState.currentPlayer === 'red' ? '#ef4444' :
                gameState.currentPlayer === 'green' ? '#22c55e' :
                gameState.currentPlayer === 'yellow' ? '#eab308' :
                '#3b82f6'
              } 0%, transparent 80%)`,
              filter: 'blur(100px)'
            }}
          />
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full max-w-7xl mx-auto">
        {/* Header */}
      <div className="mb-4 md:mb-8 text-center">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase italic flex items-center justify-center gap-4">
          <Swords className="w-8 h-8 md:w-12 md:h-12 text-red-500" />
          Ludo / Parchís
          <span className="text-red-500 italic">Warfare</span>
        </h1>
        <p className="text-neutral-400 text-[10px] md:text-xs uppercase tracking-[0.2em] mt-1 font-bold">Animated Soldier Edition</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-12 items-center lg:items-start justify-center w-full">
        {/* Game Board Container */}
        <div className="relative bg-neutral-800 p-2 md:p-4 rounded-3xl shadow-2xl border-4 border-neutral-700 flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            onClick={handleCanvasClick}
            className="rounded-xl cursor-crosshair shadow-inner"
            style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}
          />
        </div>

        {/* UI Controls */}
        <div className="flex flex-col gap-6 w-full max-w-xs">
          {/* Game Message */}
          <div className="min-h-[64px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={gameState.message}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-neutral-800 p-4 rounded-2xl border border-neutral-700 shadow-xl text-center"
              >
                <span className={`text-xs font-bold uppercase tracking-widest ${playerTextColors[gameState.currentPlayer]}`}>
                  {gameState.message}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Current Player Card */}
          <div className="bg-neutral-800 p-6 rounded-3xl border border-neutral-700 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl ${playerColors[gameState.currentPlayer]} flex items-center justify-center shadow-lg`}>
                <User className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-neutral-400 text-xs uppercase font-bold tracking-widest">Current Turn</p>
                <h2 className="text-white text-xl font-black uppercase italic">{gameState.currentPlayer}</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
                <span className="text-neutral-400 text-sm font-bold uppercase">Dice Result</span>
                <span className="text-white text-3xl font-black italic">{gameState.diceValue || '-'}</span>
              </div>

              <button
                onClick={handleRoll}
                disabled={gameState.isRolling || gameState.hasRolled || gameState.isGameOver || (gameManagerRef.current && gameManagerRef.current.aiPlayers.has(gameState.currentPlayer as any))}
                className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-tighter text-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl
                  ${gameState.isRolling || gameState.hasRolled || gameState.isGameOver || (gameManagerRef.current && gameManagerRef.current.aiPlayers.has(gameState.currentPlayer as any))
                    ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-500 text-white hover:-translate-y-1'}`}
              >
                <Dices className={`w-6 h-6 ${gameState.isRolling ? 'animate-spin' : ''}`} />
                {gameState.isRolling ? 'Rolling...' : 'Roll Dice'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsStatsOpen(true)}
                  className="py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all transform active:scale-95 bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700"
                >
                  <BarChart3 className="w-3 h-3" />
                  Stats
                </button>
                <button
                  onClick={() => setGameMode('menu')}
                  className="py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all transform active:scale-95 bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700"
                >
                  <Home className="w-3 h-3" />
                  Menu
                </button>
              </div>
            </div>
          </div>

          {/* Legend / Info */}
          <div className="bg-neutral-800/50 p-6 rounded-3xl border border-neutral-700/50">
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Game Rules
            </h3>
            <ul className="text-neutral-400 text-xs space-y-2 font-medium">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Roll a 6 to deploy from base
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Capture enemies to get a bonus roll
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Safe zones (stars) prevent capture
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Reach the center to win!
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-neutral-600 text-[10px] uppercase tracking-[0.3em] font-bold">
        &copy; 2026 Ludo Warfare &bull; Tactical Board Engine v1.0
      </div>

      {/* Stats Modal */}
      {gameManagerRef.current && (
        <StatsModal
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          stats={gameManagerRef.current.stats.stats}
          players={gameManagerRef.current.players}
        />
      )}
    </div>
    </div>
  );
}
