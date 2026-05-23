import { useState, useMemo } from 'react';
import { getAgents, getTotalAgentCount } from './data/personaGenerator';
import { calculateAgentScore } from './utils/evaluationMapper';
import { Agent, EvaluationResult } from './types';
import { InputConsole } from './components/InputConsole';
import { ExecutionSummary } from './components/ExecutionSummary';
import { ArchetypeHeatmap } from './components/ArchetypeHeatmap';
import { AgentDirectory } from './components/AgentDirectory';
import { motion } from 'motion/react';
import { 
  Users, 
  Activity, 
  Sparkle, 
  Target, 
  AlertCircle, 
  Database, 
  MessageSquare,
  Flame,
  ChevronRight,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

export default function App() {
  const [pitch, setPitch] = useState('');
  const [agentCount, setAgentCount] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const maxAgents = useMemo(() => getTotalAgentCount(), []);

  // Get the selected subset of agents for this simulation
  const agents = useMemo(() => getAgents(agentCount), [agentCount]);

  // Compute individual client scores for each agent based on Gemini's segment results
  const agentScores = useMemo(() => {
    if (!result) return {} as Record<string, number>;
    const scoreMap: Record<string, number> = {};
    agents.forEach(agent => {
      scoreMap[agent.id] = calculateAgentScore(agent, result);
    });
    return scoreMap;
  }, [result, agents]);

  // Handle submitting pitch copy to our server-side Express API
  const handlePitchSubmit = async (submittedPitch: string, selectedAgentCount: number) => {
    setAgentCount(selectedAgentCount);
    setIsLoading(true);
    setError(null);
    setPitch(submittedPitch);

    try {
      const response = await fetch('/api/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pitch: submittedPitch, agentCount: selectedAgentCount })
      });

      if (!response.ok) {
        const errDetail = await response.json().catch(() => ({ error: 'Simulating failed' }));
        throw new Error(errDetail.error || `Server returned error status ${response.status}`);
      }

      const evalData: EvaluationResult = await response.json();
      setResult(evalData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while running the simulation. Make sure you settings secrets are set.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick stats computed on current scores map
  const aggregateStats = useMemo(() => {
    if (!result) return null;
    const scores = Object.values(agentScores) as number[];
    const len = scores.length;
    if (len === 0) return null;

    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    const avg = Math.round(sum / len);
    const supportRate = Math.round((scores.filter(s => s >= 20).length / len) * 100);
    const opposeRate = Math.round((scores.filter(s => s <= -20).length / len) * 100);
    const polarization = scores.reduce((acc, cur) => acc + Math.pow(cur - avg, 2), 0) / len;

    return {
      avg,
      supportRate,
      opposeRate,
      polarizationIndex: Math.sqrt(polarization)
    };
  }, [agentScores, result]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 selection:bg-indigo-600 selection:text-white">
      {/* Visual Navigation Header Banner */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-md">
              <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-widest leading-none uppercase block">Nemotron Personas</span>
              <h1 className="text-sm font-black text-slate-105 tracking-tight leading-none mt-1">
                Stance Engine USA <span className="text-slate-550 font-mono text-[10px] font-normal ml-1">v1.0.4</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <div className="hidden sm:flex items-center space-x-2 text-slate-400 font-mono border-r border-slate-800 pr-4">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>1,000 Digital Agents Simulated</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300 font-semibold uppercase tracking-widest text-[9px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>1,000 Agents Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Core View Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Core Description Hero Block */}
        <div className="bg-slate-900/40 border border-slate-800 text-slate-100 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-505/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
              <Sparkle className="w-3 h-3 text-indigo-400 animate-spin duration-1000" />
              <span>Representative Population Simulation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
              Simulate 1,000 Representative Reactions
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
              Test your startup pitches, product copies, advertising headlines, or national policy proposals across the diverse demographic distributions of the USA population. Powered by a seed-based replica of the <strong>NVIDIA Nemotron-Personas-USA</strong> framework.
            </p>
          </div>
          {/* Subtle background abstract shapes */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-indigo-650/5 rounded-full blur-3xl opacity-80 pointer-events-none"></div>
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        </div>

        {/* Console Console Grid */}
        <InputConsole onSubmit={handlePitchSubmit} isLoading={isLoading} maxAgents={maxAgents} />

        {/* Core Loading Room feedback */}
        {isLoading && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center shadow-sm space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center w-16 h-16">
                <span className="absolute inline-flex h-full w-full rounded-full bg-slate-800 animate-ping opacity-75"></span>
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin text-indigo-500"></div>
              </div>
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider">Synthesizing Demographic Profiles...</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini is evaluating your copy across political spectra, income levels, state regions, and occupations to output a segmented matrix analysis.
              </p>
            </div>
          </div>
        )}

        {/* Safe Error viewport */}
        {error && (
          <div className="bg-rose-950/20 border border-rose-900/60 rounded-2xl p-5 flex items-start space-x-3.5 text-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <h4 className="font-bold text-rose-200">Stance Engine Interrupted</h4>
              <p className="mt-1 text-rose-400">{error}</p>
              <p className="text-[10px] mt-2 font-mono text-rose-500/80">
                Ensure process.env.GEMINI_API_KEY is configured correctly in your project developer Secrets settings menu.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Stance View is Rendered Statically when simulation results arrive */}
        {result && !isLoading && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Visual breakdown divider */}
            <div className="flex items-center space-x-3 text-slate-500 text-xs font-mono py-2">
              <Target className="w-4 h-4 text-slate-400" />
              <span>Active Pitch Reaction Analytics Suite</span>
              <div className="flex-1 h-px bg-slate-800"></div>
            </div>

            {/* Overall Executive Summary KPI metrics */}
            <ExecutionSummary result={result} agentScores={agentScores} agentCount={agentCount} />

            {/* Verbatim Server-retrieved quotes grid visual showcase */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Live Verbatim Stream (Simulated samples)
                </span>
                <h2 className="text-lg font-bold text-slate-100 tracking-tight mt-1">Representative Verbatim Transcripts</h2>
                <p className="text-xs text-slate-400">Direct transcribed testimonials generated by Gemini representing core target perspectives.</p>
              </div>

              {/* Grid of the 6 verbatims */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.verbatims.slice(0, 6).map((item, idx) => {
                  const isPos = item.sentiment >= 20;
                  const isNeg = item.sentiment <= -20;
                  const quoteBorder = isPos 
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-100' 
                    : isNeg 
                      ? 'border-rose-500/20 bg-rose-500/5 text-rose-100' 
                      : 'border-slate-800 bg-slate-800/20 text-slate-300';
                  
                  return (
                    <div key={idx} className={`border p-4.5 rounded-xl transition-all flex flex-col justify-between ${quoteBorder}`}>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono italic mb-4">
                        "{item.quote}"
                      </p>
                      <div className="border-t border-slate-850 pt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-200 block truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{item.age} • {item.occupation} ({item.state})</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isPos 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-555/20' 
                            : isNeg 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-555/20' 
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {item.sentiment > 0 ? `+${item.sentiment}` : item.sentiment}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Heatmap Crosstab Panel */}
            <ArchetypeHeatmap agents={agents} agentScores={agentScores} result={result} />

            {/* Full 1000 Agent Directory Explorer */}
            <AgentDirectory agents={agents} agentScores={agentScores} result={result} />

          </div>
        )}

        {/* If no pitch simulated yet, display static educational onboarding tips */}
        {!result && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn py-6">
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3 hover:border-slate-700 transition-all">
              <div className="w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center text-indigo-400 border border-slate-800 shadow-inner">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">NVIDIA Nemotron US Profiles</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Applies the same statistical breakdowns (race, age, income range, political spectrum, state weight) used by industrial models to mirror average US voting and buying stance distributions.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3 hover:border-slate-700 transition-all">
              <div className="w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center text-indigo-400 border border-slate-800 shadow-inner">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">Dual-Axis Crosstab Matrices</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pivots the population scales across any two demographic variables layout. Dynamically averages individual stance scores in real-time to locate highly aligned and opposing buyer segments.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3 hover:border-slate-700 transition-all">
              <div className="w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center text-indigo-400 border border-slate-800 shadow-inner">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">Transcript-Style Citizen Audits</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Step inside the virtual interview room to read direct transcribed quotes explaining each citizen's concerns, worries, and alignments regarding your proposal.
              </p>
            </div>

          </div>
        )}

      </main>

      {/* Humble Footer */}
      <footer className="text-center text-xs text-slate-550 mt-16 font-mono max-w-7xl mx-auto px-4">
        <p className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>Demographic Reaction Engine • Modeling 1,000 Agents based on US Census & Nemotron USA parameters</span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-[10px] rounded uppercase text-indigo-400 font-bold tracking-widest">GPU CLUSTER: NVIDIA-H100-NODE-4</span>
        </p>
      </footer>
    </div>
  );
}
