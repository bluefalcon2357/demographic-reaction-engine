import React, { useState } from 'react';
import { Send, Users } from 'lucide-react';

interface InputConsoleProps {
  onSubmit: (pitch: string, agentCount: number) => void;
  isLoading: boolean;
  maxAgents: number;
}

export const InputConsole: React.FC<InputConsoleProps> = ({ onSubmit, isLoading, maxAgents }) => {
  const [pitchText, setPitchText] = useState('');
  const [agentCount, setAgentCount] = useState(1000);

  const isUrl = (text: string) => {
    return /https?:\/\/[^\s]+/i.test(text.trim());
  };

  const hasUrl = isUrl(pitchText);
  const isValidInput = pitchText.trim().length >= 5 && (pitchText.trim().length >= 20 || hasUrl);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidInput) return;
    onSubmit(pitchText, agentCount);
  };

  const handleAgentCountChange = (value: number) => {
    // Snap to nearest 100
    const snapped = Math.round(value / 100) * 100;
    setAgentCount(Math.max(100, Math.min(maxAgents, snapped)));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition-all">
      <div className="mb-4">
        <h2 className="text-lg font-light text-slate-900 tracking-tight">Introduce Your Pitch, Proposal, or Web Link</h2>
        <p className="text-xs text-slate-600 mt-1">Submit your copy or paste any general links, product links, or YouTube videos to analyze simulated reactions.</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <textarea
          value={pitchText}
          onChange={(e) => setPitchText(e.target.value)}
          placeholder="Paste a product page link, YouTube link, policy URL, or type a startup elevator pitch here..."
          className="w-full min-h-[120px] max-h-[220px] p-4 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-mono"
          disabled={isLoading}
        />

        {hasUrl && (
          <div className="flex items-center space-x-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500"></span>
            <span>Web link detected — the page text will be fetched and analyzed.</span>
          </div>
        )}

        {/* Agent Count Configurator */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">Population Sample Size</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={agentCount}
                onChange={(e) => handleAgentCountChange(parseInt(e.target.value) || 100)}
                min={100}
                max={maxAgents}
                step={100}
                className="w-24 px-2 py-1 text-xs text-right text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                disabled={isLoading}
              />
              <span className="text-[10px] text-slate-500 font-mono">agents</span>
            </div>
          </div>

          <input
            type="range"
            value={agentCount}
            onChange={(e) => handleAgentCountChange(parseInt(e.target.value))}
            min={100}
            max={maxAgents}
            step={100}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            disabled={isLoading}
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>100</span>
            <span>{Math.round(maxAgents * 0.25).toLocaleString()}</span>
            <span>{Math.round(maxAgents * 0.5).toLocaleString()}</span>
            <span>{Math.round(maxAgents * 0.75).toLocaleString()}</span>
            <span>{maxAgents.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !isValidInput}
            className={`flex items-center justify-center space-x-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded transition-all shadow-md w-full xl:w-auto ${
              isLoading || !isValidInput
                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Simulate {agentCount.toLocaleString()} Stances</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};