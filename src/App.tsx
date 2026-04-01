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
  
  // Sync ref with state
  useEffect(() => {
    isStatsOpenRef.current = isStatsOpen;
  }, [isStatsOpen]);

  // Dynamic Resizing Logic (Crucial for TV Layout)
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      const isLandscape = clientWidth > clientHeight;
      let size;
      
      if (isLandscape) {
        // Height is the limiting factor in landscape
        size = Math.min(clientHeight * 0.8, clientWidth * 0.55);
      } else {
        // Width is the limiting factor in portrait
        size = clientWidth * 0.9;
      }
      
      const limitedSize = Math.max(300, Math.floor(size));
      setCanvasSize(limitedSize);
      
      if (gameManagerRef.current) {
        gameManagerRef.current.resize(limitedSize, limitedSize);
      }
    };

    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    updateSize();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [gameMode]);

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
    const gamepad = new GamepadManager((action) => {
      if (gameMode === 'menu') {
        if (action === GamepadAction.SELECT) startGame('ai', 4);
        return;
      }
      if (isStatsOpenRef.current) {
        if (action === GamepadAction.BACK || action === GamepadAction.SELECT) setIsStatsOpen(false);
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
      gamepad.update();
      gm.update(dt);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      gm.draw(ctx);

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
    if (gameManagerRef.current && !gameState.hasRolled && !gameState.isRolling) {
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
    <div ref={containerRef} className="h-screen w-screen bg-neutral-900 flex flex-col items-center justify-center p-2 md:p-8 font-sans relative overflow-hidden">
      <AnimatePresence>
        {gameMode === 'menu' && (
          <StartMenu onStart={startGame} />
        )}
      </AnimatePresence>

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

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full max-w-7xl mx-auto overflow-hidden">
        {/* Header - Compact for TV */}
        <div className="mb-2 md:mb-6 text-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase italic flex items-center justify-center gap-2 md:gap-4">
            <Swords className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
            Ludo / Parchís
            <span className="text-red-500 italic">Warfare</span>
          </h1>
          <p className="text-neutral-400 text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-bold">Animated Soldier Edition</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start justify-center w-full h-full max-h-[85vh]">
          {/* Board Area (Left Side in Landscape) */}
          <div className="relative bg-neutral-800 p-2 md:p-4 rounded-2xl md:rounded-3xl shadow-2xl border-2 md:border-4 border-neutral-700 flex-shrink-0">
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              onClick={handleCanvasClick}
              className="rounded-xl cursor-crosshair shadow-inner"
              style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}
            />
          </div>

          {/* Sidebar Area (Right Side in Landscape) */}
          <div className="flex flex-col gap-3 md:gap-4 w-full max-w-xs md:max-w-sm h-full justify-start overflow-y-auto pr-2 no-scrollbar">
            {/* Turn Message */}
            <div className="min-h-[48px] md:min-h-[56px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={gameState.message}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-neutral-800/80 backdrop-blur-md p-3 md:p-4 rounded-xl md:rounded-2xl border border-neutral-700 text-center shadow-lg"
                >
                  <p className={`text-xs md:text-sm lg:text-base font-black uppercase italic tracking-wider ${playerTextColors[gameState.currentPlayer]}`}>
                    {gameState.message}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Current Player Card */}
            <div className="bg-neutral-800 p-3 md:p-4 rounded-xl md:rounded-2xl border border-neutral-700 shadow-xl flex items-center gap-3">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${playerColors[gameState.currentPlayer]} flex items-center justify-center shadow-lg`}>
                <User className="text-white w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-neutral-400 text-[10px] md:text-xs uppercase font-bold tracking-widest">Current Turn</p>
                <p className="text-white text-base md:text-xl font-black uppercase italic">{gameState.currentPlayer}</p>
              </div>
            </div>

            {/* Dice and Button Section */}
            <div className="bg-neutral-800 p-3 md:p-4 rounded-xl md:rounded-2xl border border-neutral-700 shadow-xl space-y-3">
               <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                 <p className="text-neutral-400 text-[10px] md:text-xs font-bold uppercase">Result</p>
                 <p className="text-white text-2xl md:text-3xl font-black italic underline decoration-red-500">{gameState.diceValue || '-'}</p>
               </div>

               <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRoll}
                disabled={gameState.hasRolled || gameState.isRolling || gameState.isGameOver}
                className={`w-full py-4 rounded-xl font-black text-sm md:text-lg uppercase italic tracking-tighter flex items-center justify-center gap-2 shadow-lg transition-all ${
                  gameState.hasRolled || gameState.isRolling || gameState.isGameOver
                    ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed opacity-50'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                <Dices className={`w-4 h-4 md:w-5 md:h-5 ${gameState.isRolling ? 'animate-spin' : ''}`} />
                {gameState.isRolling ? 'Rolling...' : 'Roll Dice'}
              </motion.button>
            </div>

            {/* Menu Tabs */}
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <button onClick={() => setIsStatsOpen(true)} className="bg-neutral-800 hover:bg-neutral-700 p-3 rounded-xl border border-neutral-700 text-white font-bold flex items-center justify-center gap-2 text-[10px] md:text-xs uppercase">
                <BarChart3 className="w-4 h-4" /> Stats
              </button>
              <button onClick={() => setGameMode('menu')} className="bg-neutral-800 hover:bg-neutral-700 p-3 rounded-xl border border-neutral-700 text-white font-bold flex items-center justify-center gap-2 text-[10px] md:text-xs uppercase">
                <Home className="w-4 h-4" /> Menu
              </button>
            </div>

            {/* Rules Section (Very Compact) */}
            <div className="bg-neutral-800/40 p-3 md:p-4 rounded-xl border border-neutral-700/50">
              <h4 className="text-white text-[10px] md:text-xs font-black uppercase italic mb-2 flex items-center gap-2">
                <Trophy className="w-3 h-3 text-yellow-500" /> Rules
              </h4>
              <ul className="text-[9px] md:text-[10px] text-neutral-400 space-y-1">
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500" /> Roll 6 to deploy</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500" /> Captures = Bonus roll</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500" /> Safe zones prevent capture</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500" /> Reach center to win!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <StatsModal 
        isOpen={isStatsOpen} 
        onClose={() => setIsStatsOpen(false)} 
        stats={gameManagerRef.current?.stats.stats || []}
        players={gameManagerRef.current?.players || []}
      />
    </div>
  );
}
