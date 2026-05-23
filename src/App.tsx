import { useState, useMemo } from 'react';
import { getAgents, getTotalAgentCount } from './data/personaGenerator';
import { calculateAgentScore } from './utils/evaluationMapper';
import { Agent, EvaluationResult } from './types';
import { InputConsole } from './components/InputConsole';
import { ExecutionSummary } from './components/ExecutionSummary';
import { ArchetypeHeatmap } from './components/ArchetypeHeatmap';
import { AgentDirectory } from './components/AgentDirectory';
import { StanceDistribution } from './components/StanceDistribution';
import { AlertCircle, MessageSquare } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 selection:bg-indigo-600 selection:text-white">
      {/* Main Core View Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

        {/* Core Description Hero Block */}
        <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
              Demographic Reaction Engine
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              Test your startup pitches, product copies, advertising headlines, or national policy proposals across the diverse demographic distributions of the USA population. Powered by a seed-based replica of the <strong>NVIDIA Nemotron-Personas-USA</strong> framework.
            </p>
          </div>
        </div>

        {/* Console Console Grid */}
        <InputConsole onSubmit={handlePitchSubmit} isLoading={isLoading} maxAgents={maxAgents} />

        {/* Core Loading Room feedback */}
        {isLoading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center w-16 h-16">
                <span className="absolute inline-flex h-full w-full rounded-full bg-slate-200 animate-ping opacity-75"></span>
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin text-indigo-500"></div>
              </div>
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Synthesizing Demographic Profiles...</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gemini is evaluating your copy across political spectra, income levels, state regions, and occupations to output a segmented matrix analysis.
              </p>
            </div>
          </div>
        )}

        {/* Safe Error viewport */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start space-x-3.5 text-rose-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <h4 className="font-bold text-rose-800">Stance Engine Interrupted</h4>
              <p className="mt-1 text-rose-600">{error}</p>
              <p className="text-[10px] mt-2 font-mono text-rose-500/80">
                Ensure process.env.GEMINI_API_KEY is configured correctly in your project developer Secrets settings menu.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Stance View is Rendered Statically when simulation results arrive */}
        {result && !isLoading && (
          <div className="space-y-8 animate-fadeIn">

            {/* Stance distribution histogram + per-agent spectrum */}
            <StanceDistribution agents={agents} agentScores={agentScores} />

            {/* Overall Executive Summary KPI metrics */}
            <ExecutionSummary result={result} agentScores={agentScores} agentCount={agentCount} />

            {/* Verbatim Server-retrieved quotes grid visual showcase */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Live Verbatim Stream (Simulated samples)
                </span>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1">Representative Verbatim Transcripts</h2>
                <p className="text-xs text-slate-600">Direct transcribed testimonials generated by Gemini representing core target perspectives.</p>
              </div>

              {/* Grid of the 6 verbatims */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.verbatims.slice(0, 6).map((item, idx) => {
                  const isPos = item.sentiment >= 20;
                  const isNeg = item.sentiment <= -20;
                  const quoteBorder = isPos
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : isNeg
                      ? 'border-rose-200 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700';

                  return (
                    <div key={idx} className={`border p-4.5 rounded-xl transition-all flex flex-col justify-between ${quoteBorder}`}>
                      <p className="text-xs text-slate-700 leading-relaxed italic mb-4">
                        "{item.quote}"
                      </p>
                      <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between text-[11px] text-slate-600">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 block truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{item.age} • {item.occupation} ({item.state})</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isPos
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : isNeg
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
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

      </main>

      {/* Humble Footer */}
      <footer className="text-center text-xs text-slate-500 mt-16 font-mono max-w-7xl mx-auto px-4">
        <p className="border-t border-slate-200 pt-6">
          Demographic Reaction Engine • Modeling US population reactions via US Census & Nemotron USA parameters
        </p>
      </footer>
    </div>
  );
}