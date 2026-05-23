import React from 'react';
import { EvaluationResult } from '../types';
import { Award, Flame, Lightbulb, Users, Activity } from 'lucide-react';

interface ExecutionSummaryProps {
  result: EvaluationResult;
  agentScores: Record<string, number>;
  agentCount?: number;
}

export const ExecutionSummary: React.FC<ExecutionSummaryProps> = ({ result, agentScores, agentCount }) => {
  const scores = Object.values(agentScores) as number[];
  const total = scores.length;
  if (total === 0) return null;

  // Calculate statistics from the individual agent scores
  const sum = scores.reduce((acc, cur) => acc + cur, 0);
  const avg = Math.round(sum / total);

  // Calculated Standard Deviation for Polarization Index
  const variance = scores.reduce((acc, cur) => acc + Math.pow(cur - avg, 2), 0) / total;
  const stdDev = Math.sqrt(variance);

  // Stance classification
  let stanceText = "Cohesive Outlook";
  let stanceColor = "text-sky-400 bg-sky-950/20 border-sky-900/50";
  let stanceDesc = "The population shows soft, aligned views with very little intense internal disagreement.";

  if (stdDev >= 60) {
    stanceText = "Deeply Polarized";
    stanceColor = "text-rose-450 bg-rose-950/30 border-rose-900/60";
    stanceDesc = "Significant rival camps of intense supporters and fierce opponents exist. There is high debate.";
  } else if (stdDev >= 45) {
    stanceText = "Segmented Alignment";
    stanceColor = "text-amber-400 bg-amber-950/30 border-amber-900/60";
    stanceDesc = "The population splits into distinct demographic subgroups with noticeably different outlooks.";
  } else if (stdDev < 25) {
    stanceText = "Broad Consensus";
    stanceColor = "text-emerald-400 bg-emerald-950/30 border-emerald-900/50";
    stanceDesc = "The population is highly unified. Opinion is shared very evenly across demographic lines.";
  }

  // Count positive, neutral, negative agents
  const positiveCount = scores.filter(s => s >= 20).length;
  const neutralCount = scores.filter(s => s > -20 && s < 20).length;
  const negativeCount = scores.filter(s => s <= -20).length;

  const positivePercent = Math.round((positiveCount / total) * 100);
  const neutralPercent = Math.round((neutralCount / total) * 100);
  const negativePercent = Math.round((negativeCount / total) * 100);

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 30) return 'text-emerald-450';
    if (score <= -30) return 'text-rose-450';
    return 'text-amber-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 30) return 'bg-emerald-555';
    if (score <= -30) return 'bg-rose-555';
    return 'bg-amber-500';
  };

  return (
    <div className="space-y-6">
      {/* Visual KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Metric 1: Overall Sentiment Score */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Net Population Sentiment</span>
            <span className="p-1.5 bg-slate-950 border border-slate-850 rounded text-indigo-405"><Users className="w-3.5 h-3.5" /></span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-4xl font-extrabold tracking-tight ${getScoreColor(avg)}`}>
              {avg > 0 ? `+${avg}` : avg}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Index value (-100 to +100)</span>
          </div>
          {/* Progress gauge */}
          <div className="w-full bg-slate-950 rounded border border-slate-850 h-2.5 mt-4 overflow-hidden relative">
            <div 
              className={`h-full ${getScoreBg(avg)} rounded-r`} 
              style={{ width: `${((avg + 100) / 200) * 100}%` }}
            ></div>
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-700"></div>
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 mt-1.5 font-mono">
            <span>-100 OPPOSITION</span>
            <span>NEUTRAL</span>
            <span>+100 SUPPORT</span>
          </div>
        </div>

        {/* Metric 2: Polarization Index */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Social Polarizing Variance</span>
            <span className="p-1.5 bg-slate-950 border border-slate-850 rounded text-indigo-405"><Activity className="w-3.5 h-3.5" /></span>
          </div>
          <div className="flex items-center space-x-3 my-2">
            <div className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded border ${stanceColor}`}>
              {stanceText}
            </div>
            <span className="text-xs font-mono text-slate-400 font-bold">σ = {stdDev.toFixed(1)}</span>
          </div>
          <p className="text-xs text-slate-450 leading-relaxed mt-1 flex-grow">{stanceDesc}</p>
          <div className="border-t border-slate-850 pt-2.5 mt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>UNIFICATION: {Math.max(0, Math.round(100 - stdDev * 1.3))}%</span>
            <span>VARIANCE RANK: {stdDev < 35 ? 'LOW' : stdDev < 50 ? 'MODERATE' : 'EXTREME'}</span>
          </div>
        </div>

        {/* Metric 3: Stance Division Breakdown */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Stance Segmentation</span>
            <span className="text-[10px] text-slate-500 font-mono uppercase">{total.toLocaleString()} Agents Cohort</span>
          </div>
          <div className="space-y-3 flex-grow flex flex-col justify-center">
            {/* Horizontal Bar Breakdown */}
            <div className="flex h-5 rounded overflow-hidden text-[10px] text-white font-bold shadow-inner">
              {positivePercent > 0 && (
                <div className="bg-emerald-500 hover:bg-emerald-450 flex items-center justify-center transition-all border-r border-slate-950" style={{ width: `${positivePercent}%` }} title={`Support: ${positiveCount} agents`}>
                  {positivePercent}%
                </div>
              )}
              {neutralPercent > 0 && (
                <div className="bg-amber-500 text-amber-950 hover:bg-amber-450 flex items-center justify-center transition-all border-r border-slate-950" style={{ width: `${neutralPercent}%` }} title={`Neutral: ${neutralCount} agents`}>
                  {neutralPercent}%
                </div>
              )}
              {negativePercent > 0 && (
                <div className="bg-rose-500 hover:bg-rose-450 flex items-center justify-center transition-all" style={{ width: `${negativePercent}%` }} title={`Oppose: ${negativeCount} agents`}>
                  {negativePercent}%
                </div>
              )}
            </div>
            <div className="flex justify-between text-[10px] font-mono mt-1 text-slate-400">
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-emerald-500 mr-1.5"></span>SUPPORT ({positiveCount})</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-amber-500 mr-1.5"></span>NEUTRAL ({neutralCount})</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-rose-500 mr-1.5"></span>OPPOSE ({negativeCount})</span>
            </div>
          </div>
        </div>

      </div>

      {/* Synthesis Details Grid */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Social Executive Summary */}
        <div className="md:col-span-1 space-y-3.5 pr-0 md:pr-4 md:border-r border-slate-800">
          <div className="flex items-center space-x-2 text-indigo-400">
            <div className="p-1.5 bg-slate-950 border border-slate-850 rounded"><Award className="w-3.5 h-3.5 text-indigo-400" /></div>
            <h3 className="font-bold text-xs uppercase tracking-widest font-mono text-slate-300">Executive Stance</h3>
          </div>
          <p className="text-xs text-emerald-300 font-medium leading-relaxed italic border-l-2 border-emerald-500 bg-emerald-500/5 p-3 rounded">
            "{result.tagline}"
          </p>
          <p className="text-xs text-slate-450 leading-relaxed font-mono">
            {result.synthesis.summary}
          </p>
        </div>

        {/* Middle Column: Winners / Losers Segmentation details */}
        <div className="md:col-span-1 space-y-4 pr-0 md:pr-4 md:border-r border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5 rounded">
              <Award className="w-3.5 h-3.5 flex-shrink-0" />
              <div className="text-[10px] font-bold uppercase tracking-widest font-mono">Strongest Alignment</div>
            </div>
            <p className="text-xs text-slate-400 leading-normal font-mono">
              {result.synthesis.winners}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-rose-400 bg-rose-500/5 border border-rose-500/20 px-3 py-1.5 rounded">
              <Flame className="w-3.5 h-3.5 flex-shrink-0" />
              <div className="text-[10px] font-bold uppercase tracking-widest font-mono">Major Resistance</div>
            </div>
            <p className="text-xs text-slate-400 leading-normal font-mono">
              {result.synthesis.losers}
            </p>
          </div>
        </div>

        {/* Right Column: Strategic Key Takeaway / Advice */}
        <div className="md:col-span-1 space-y-3.5">
          <div className="flex items-center space-x-2 text-indigo-400">
            <div className="p-1.5 bg-slate-950 border border-slate-850 rounded"><Lightbulb className="w-3.5 h-3.5 text-indigo-400" /></div>
            <h3 className="font-bold text-xs uppercase tracking-widest font-mono text-slate-300">Strategic Alignment Advice</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed bg-indigo-500/5 p-4 rounded border border-indigo-500/20 font-mono shadow-inner">
            {result.synthesis.keyTakeaway}
          </p>
        </div>

      </div>
    </div>
  );;
};
