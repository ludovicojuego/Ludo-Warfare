
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Users, Monitor, Trophy, ArrowLeft } from 'lucide-react';

interface StartMenuProps {
  onStart: (mode: 'local' | 'ai', playerCount: number) => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({ onStart }) => {
  const [step, setStep] = useState<'mode' | 'players'>('mode');
  const [selectedMode, setSelectedMode] = useState<'local' | 'ai' | null>(null);

  const handleModeSelect = (mode: 'local' | 'ai') => {
    setSelectedMode(mode);
    setStep('players');
  };

  const handlePlayerSelect = (count: number) => {
    if (selectedMode) {
      onStart(selectedMode, count);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-neutral-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              scale: 0,
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight 
            }}
            animate={{ 
              opacity: [0, 0.2, 0],
              scale: [0, 1.5, 0],
              y: [null, Math.random() * -200]
            }}
            transition={{ 
              duration: 3 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            className="absolute w-2 h-2 bg-red-500 rounded-full blur-sm"
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg p-8 mx-4 text-center"
      >
        <AnimatePresence mode="wait">
          {step === 'mode' ? (
            <motion.div
              key="mode-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Logo Animation */}
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.2
                }}
                className="flex justify-center mb-8"
              >
                <div className="relative">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="p-6 bg-red-600 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.5)]"
                  >
                    <Swords className="w-20 h-20 text-white" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 }}
                    className="absolute -top-4 -right-4 bg-yellow-500 p-2 rounded-xl shadow-lg"
                  >
                    <Trophy className="w-6 h-6 text-black" />
                  </motion.div>
                </div>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-2 text-6xl font-black tracking-tighter text-white uppercase italic"
              >
                Ludo <span className="text-red-600">Warfare</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mb-12 text-neutral-500 uppercase tracking-[0.3em] text-xs font-bold"
              >
                Tactical Board Engine v1.0
              </motion.p>

              <div className="grid gap-4">
                <motion.button
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect('ai')}
                  className="group relative flex items-center gap-6 p-6 overflow-hidden transition-all bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-red-600/50 hover:bg-neutral-800"
                >
                  <div className="p-4 bg-red-600/10 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-colors text-red-600">
                    <Monitor className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white uppercase italic">VS Computer</h3>
                    <p className="text-sm text-neutral-500">Test your tactics against the AI</p>
                  </div>
                  <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Swords className="w-6 h-6 text-red-600" />
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect('local')}
                  className="group relative flex items-center gap-6 p-6 overflow-hidden transition-all bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-blue-600/50 hover:bg-neutral-800"
                >
                  <div className="p-4 bg-blue-600/10 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-600">
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white uppercase italic">Local Multi</h3>
                    <p className="text-sm text-neutral-500">Battle with friends on one device</p>
                  </div>
                  <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Swords className="w-6 h-6 text-blue-600" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="player-selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button 
                onClick={() => setStep('mode')}
                className="absolute -top-12 left-0 flex items-center gap-2 text-neutral-500 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-widest"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Mode
              </button>

              <h2 className="mb-2 text-4xl font-black tracking-tighter text-white uppercase italic">
                Select <span className="text-red-600">Deployment</span>
              </h2>
              <p className="mb-12 text-neutral-500 uppercase tracking-[0.3em] text-xs font-bold">
                How many factions will engage?
              </p>

              <div className="grid grid-cols-3 gap-4">
                {[2, 3, 4].map((count) => (
                  <motion.button
                    key={count}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePlayerSelect(count)}
                    className="group flex flex-col items-center gap-4 p-8 bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-red-600/50 hover:bg-neutral-800 transition-all"
                  >
                    <div className="text-4xl font-black text-white italic group-hover:text-red-600 transition-colors">
                      {count}
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                      Players
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="mt-12 p-4 bg-red-600/5 border border-red-600/10 rounded-2xl">
                <p className="text-xs text-neutral-500 uppercase tracking-widest leading-relaxed">
                  {selectedMode === 'ai' 
                    ? "You will control RED. Remaining factions will be handled by the Tactical AI Engine."
                    : "All factions will be controlled locally by human commanders."
                  }
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12 text-neutral-600 text-[10px] uppercase tracking-widest"
        >
          Tactical Board Engine v1.0 &bull; 2026
        </motion.div>
      </motion.div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
};
