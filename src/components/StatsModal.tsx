
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Swords, Skull, Timer, Dice5, Zap, Target, AlertTriangle, Cpu, Loader2, TrendingUp, BarChart, Activity } from 'lucide-react';
import { PlayerColor } from '../game/constants';
import { PlayerStats } from '../game/StatsManager';
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell
} from 'recharts';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Record<PlayerColor, PlayerStats>;
  players: PlayerColor[];
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats, players }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const playerColors: Record<string, string> = {
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#eab308',
    blue: '#3b82f6'
  };

  const getAverageTime = (color: PlayerColor) => {
    const times = stats[color].turnTimes;
    if (times.length === 0) return 0;
    const sum = times.reduce((a, b) => a + b, 0);
    return sum / times.length;
  };

  const getTotalRolls = (color: PlayerColor): number => {
    return Object.values(stats[color].diceRolls).reduce((a: number, b: number) => a + b, 0) as number;
  };

  // Derived Interesting Stats
  const derivedStats = useMemo(() => {
    const results: Record<string, {
      luckFactor: number;
      luckRating: string;
      efficiency: string;
      survival: string;
      totalRolls: number;
    }> = {};
    players.forEach(p => {
      const pStats = stats[p] as PlayerStats;
      const totalRolls = getTotalRolls(p);
      const sixes = pStats.diceRolls[6] || 0;
      const expectedSixes = totalRolls / 6;
      const luckFactor = totalRolls > 0 ? (sixes - expectedSixes) / (expectedSixes || 1) : 0;
      
      const efficiency = totalRolls > 0 ? pStats.totalCaptures / totalRolls : 0;
      const survival = pStats.totalDefeated > 0 ? pStats.totalCaptures / pStats.totalDefeated : pStats.totalCaptures;

      results[p] = {
        luckFactor,
        luckRating: luckFactor > 0.5 ? 'Blessed' : luckFactor > 0.1 ? 'Lucky' : luckFactor < -0.5 ? 'Cursed' : luckFactor < -0.1 ? 'Unlucky' : 'Neutral',
        efficiency: (efficiency * 100).toFixed(1) + '%',
        survival: survival.toFixed(2),
        totalRolls
      };
    });
    return results;
  }, [stats, players]);

  // Radar Data
  const radarData = useMemo(() => {
    const metrics = [
      { name: 'Aggression', key: 'totalCaptures' },
      { name: 'Resilience', key: 'resilience' },
      { name: 'Speed', key: 'speed' },
      { name: 'Luck', key: 'luck' },
      { name: 'Consistency', key: 'consistency' }
    ];

    // Normalize values 0-100
    const maxVals: Record<string, number> = {
      totalCaptures: Math.max(...players.map(p => (stats[p] as PlayerStats).totalCaptures), 1),
      resilience: Math.max(...players.map(p => 1 / ((stats[p] as PlayerStats).totalDefeated + 1)), 1),
      speed: Math.max(...players.map(p => 1 / (getAverageTime(p) || 100)), 1),
      luck: Math.max(...players.map(p => (stats[p] as PlayerStats).diceRolls[6] / (getTotalRolls(p) || 1)), 1),
      consistency: Math.max(...players.map(p => {
        const times = (stats[p] as PlayerStats).turnTimes;
        if (times.length < 2) return 0.1;
        const avg = getAverageTime(p);
        const variance = times.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / times.length;
        return 1 / (Math.sqrt(variance) + 1);
      }), 0.1)
    };

    return metrics.map(m => {
      const entry: any = { subject: m.name };
      players.forEach(p => {
        let val = 0;
        if (m.key === 'totalCaptures') val = (stats[p].totalCaptures / maxVals.totalCaptures) * 100;
        if (m.key === 'resilience') val = ((1 / (stats[p].totalDefeated + 1)) / maxVals.resilience) * 100;
        if (m.key === 'speed') val = ((1 / (getAverageTime(p) || 100)) / maxVals.speed) * 100;
        if (m.key === 'luck') val = ((stats[p].diceRolls[6] / (getTotalRolls(p) || 1)) / maxVals.luck) * 100;
        if (m.key === 'consistency') {
          const times = stats[p].turnTimes;
          if (times.length < 2) {
            val = 50;
          } else {
            const avg = getAverageTime(p);
            const variance = times.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / times.length;
            const consistency = 1 / (Math.sqrt(variance) + 1);
            val = (consistency / maxVals.consistency) * 100;
          }
        }
        entry[p] = val;
      });
      return entry;
    });
  }, [stats, players]);

  // Calculate Highlights
  const highlights = useMemo(() => {
    let mvp = players[0];
    let aggressive = players[0];
    let unlucky = players[0];
    let speedster = players[0];

    players.forEach(p => {
      if (stats[p].totalCaptures > stats[mvp].totalCaptures) mvp = p;
      if (stats[p].maxConsecutiveCaptures > stats[aggressive].maxConsecutiveCaptures) aggressive = p;
      if (stats[p].totalDefeated > stats[unlucky].totalDefeated) unlucky = p;
      if (getAverageTime(p) < getAverageTime(speedster) && getAverageTime(p) > 0) speedster = p;
    });

    return { mvp, aggressive, unlucky, speedster };
  }, [stats, players]);

  useEffect(() => {
    if (isOpen && !aiAnalysis && !isAnalyzing) {
      generateAnalysis();
    }
  }, [isOpen]);

  const generateAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        As a high-ranking Warfare Intelligence Officer, analyze the following Ludo game statistics and provide a brief, thematic, and slightly humorous "Tactical Intelligence Report". 
        Use military jargon and address the players as "Armies".
        
        Statistics:
        ${players.map(p => `
          - ${p.toUpperCase()} Army:
            * Total Captures: ${stats[p].totalCaptures}
            * Times Defeated: ${stats[p].totalDefeated}
            * Max Capture Streak: ${stats[p].maxConsecutiveCaptures}
            * Average Turn Time: ${getAverageTime(p).toFixed(1)}s
            * Luck Rating: ${derivedStats[p].luckRating}
            * Combat Efficiency: ${derivedStats[p].efficiency}
            * Dice Rolls: ${JSON.stringify(stats[p].diceRolls)}
        `).join('\n')}

        Highlights:
        - MVP (Most Captures): ${highlights.mvp}
        - Most Aggressive: ${highlights.aggressive}
        - Most Casualties: ${highlights.unlucky}
        - Fastest Response: ${highlights.speedster}

        Keep the report under 150 words. Focus on the most interesting patterns (e.g., someone rolling many 1s, or a massive capture streak).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAiAnalysis(response.text || 'Intelligence report unavailable.');
    } catch (error) {
      console.error('AI Analysis Error:', error);
      setAiAnalysis('Failed to establish connection with Intelligence Command.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-neutral-900 border border-neutral-800 w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div>
                  <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Warfare Statistics</h2>
                  <p className="text-neutral-500 text-xs uppercase tracking-widest font-bold">Tactical Performance Report</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analyzing Data...
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
              
              {/* Tactical Highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-800/80 p-4 rounded-2xl border border-yellow-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy className="w-12 h-12" />
                  </div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">MVP</p>
                  <h4 className="text-lg font-black uppercase italic" style={{ color: playerColors[highlights.mvp] }}>
                    {highlights.mvp} Army
                  </h4>
                  <p className="text-[9px] text-neutral-400 uppercase mt-1">Most Confirmed Captures</p>
                </div>

                <div className="bg-neutral-800/80 p-4 rounded-2xl border border-red-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Target className="w-12 h-12" />
                  </div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Aggressor</p>
                  <h4 className="text-lg font-black uppercase italic" style={{ color: playerColors[highlights.aggressive] }}>
                    {highlights.aggressive} Army
                  </h4>
                  <p className="text-[9px] text-neutral-400 uppercase mt-1">Highest Combat Streak</p>
                </div>

                <div className="bg-neutral-800/80 p-4 rounded-2xl border border-neutral-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertTriangle className="w-12 h-12" />
                  </div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Casualties</p>
                  <h4 className="text-lg font-black uppercase italic" style={{ color: playerColors[highlights.unlucky] }}>
                    {highlights.unlucky} Army
                  </h4>
                  <p className="text-[9px] text-neutral-400 uppercase mt-1">Most Forces Defeated</p>
                </div>

                <div className="bg-neutral-800/80 p-4 rounded-2xl border border-blue-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-12 h-12" />
                  </div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Speedster</p>
                  <h4 className="text-lg font-black uppercase italic" style={{ color: playerColors[highlights.speedster] }}>
                    {highlights.speedster} Army
                  </h4>
                  <p className="text-[9px] text-neutral-400 uppercase mt-1">Fastest Turn Response</p>
                </div>
              </div>

              {/* Visual Analysis Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Radar Chart: Tactical Comparison */}
                <div className="lg:col-span-1 bg-neutral-800/30 rounded-3xl border border-neutral-800 p-6 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-6 w-full">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <h3 className="text-white text-xs font-bold uppercase tracking-[0.2em]">Tactical Comparison</h3>
                  </div>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        {players.map(p => (
                          <Radar
                            key={p}
                            name={`${p} Army`}
                            dataKey={p}
                            stroke={playerColors[p]}
                            fill={playerColors[p]}
                            fillOpacity={0.3}
                          />
                        ))}
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '12px' }}
                          itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Analysis Report */}
                <div className="lg:col-span-2 bg-neutral-800/30 rounded-3xl border border-neutral-800 p-6 relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Cpu className="w-32 h-32" />
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-white text-xs font-bold uppercase tracking-[0.2em]">Warfare Intelligence Report</h3>
                  </div>
                  <div className="relative z-10 flex-1 flex flex-col justify-center">
                    {isAnalyzing ? (
                      <div className="space-y-4">
                        <div className="h-4 bg-neutral-800 rounded w-3/4 animate-pulse" />
                        <div className="h-4 bg-neutral-800 rounded w-full animate-pulse" />
                        <div className="h-4 bg-neutral-800 rounded w-5/6 animate-pulse" />
                        <div className="h-4 bg-neutral-800 rounded w-2/3 animate-pulse" />
                      </div>
                    ) : (
                      <p className="text-neutral-300 text-sm leading-relaxed font-medium italic font-serif">
                        "{aiAnalysis}"
                      </p>
                    )}
                  </div>
                  <div className="mt-6 pt-6 border-t border-neutral-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Battle Momentum: High</span>
                    </div>
                    <span className="text-[9px] text-neutral-600 uppercase font-bold">Encrypted Channel 04-A</span>
                  </div>
                </div>
              </div>

              {/* Detailed Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {players.map((color) => {
                  const pStats = stats[color];
                  const avgTime = getAverageTime(color);
                  const dStats = derivedStats[color];
                  
                  // Prepare chart data for dice distribution
                  const diceData = [1, 2, 3, 4, 5, 6].map(num => ({
                    name: num.toString(),
                    rolls: pStats.diceRolls[num]
                  }));

                  return (
                    <div key={color} className="bg-neutral-800/50 rounded-2xl border border-neutral-700/50 overflow-hidden flex flex-col">
                      {/* Player Header */}
                      <div className="p-4 flex items-center justify-between" style={{ backgroundColor: playerColors[color] }}>
                        <h3 className="text-white font-black uppercase italic text-lg">{color} Army</h3>
                        <div className="bg-black/20 px-3 py-1 rounded-full text-xs font-bold text-white uppercase">
                          {dStats.luckRating}
                        </div>
                      </div>

                      <div className="p-6 space-y-6 flex-1">
                        {/* Interesting Insights Row */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-black/20 p-2 rounded-xl text-center border border-white/5">
                            <p className="text-[8px] text-neutral-500 uppercase font-bold mb-1">Efficiency</p>
                            <p className="text-sm font-black text-white">{dStats.efficiency}</p>
                          </div>
                          <div className="bg-black/20 p-2 rounded-xl text-center border border-white/5">
                            <p className="text-[8px] text-neutral-500 uppercase font-bold mb-1">K/D Ratio</p>
                            <p className="text-sm font-black text-white">{dStats.survival}</p>
                          </div>
                          <div className="bg-black/20 p-2 rounded-xl text-center border border-white/5">
                            <p className="text-[8px] text-neutral-500 uppercase font-bold mb-1">Total Rolls</p>
                            <p className="text-sm font-black text-white">{dStats.totalRolls}</p>
                          </div>
                        </div>

                        {/* Dice Chart */}
                        <div>
                          <div className="flex items-center gap-2 mb-3 text-neutral-400">
                            <BarChart className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Dice Distribution</span>
                          </div>
                          <div className="h-[120px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <ReBarChart data={diceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip 
                                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                  contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                  itemStyle={{ fontSize: '10px', color: '#fff' }}
                                />
                                <Bar dataKey="rolls" radius={[4, 4, 0, 0]}>
                                  {diceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={playerColors[color]} opacity={0.8} />
                                  ))}
                                </Bar>
                              </ReBarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Combat Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-1 text-red-400">
                              <Swords className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Captures</span>
                            </div>
                            <div className="flex justify-between items-end">
                              <span className="text-xl font-black text-white">{pStats.totalCaptures}</span>
                              <span className="text-[9px] text-neutral-500 uppercase font-bold mb-1">Max: {pStats.maxConsecutiveCaptures}</span>
                            </div>
                          </div>
                          
                          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-1 text-neutral-400">
                              <Skull className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Defeated</span>
                            </div>
                            <div className="flex justify-between items-end">
                              <span className="text-xl font-black text-white">{pStats.totalDefeated}</span>
                              <span className="text-[9px] text-neutral-500 uppercase font-bold mb-1">Max: {pStats.maxConsecutiveDefeated}</span>
                            </div>
                          </div>
                        </div>

                        {/* Timing Stats */}
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-blue-400">
                            <Timer className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Avg Turn Time</span>
                          </div>
                          <span className="text-lg font-black text-white">{avgTime.toFixed(1)}s</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-neutral-900/50 border-t border-neutral-800 text-center">
              <p className="text-neutral-600 text-[10px] uppercase tracking-[0.2em] font-bold">
                Data analyzed by Warfare Intelligence Unit &bull; AI Command Active
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
