import React, { useState } from 'react';
import { Send, Zap, BookOpen, ShieldCheck, ShoppingBag, Users } from 'lucide-react';

interface InputConsoleProps {
  onSubmit: (pitch: string, agentCount: number) => void;
  isLoading: boolean;
  maxAgents: number;
}

const templates = [
  {
    icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
    label: "Policy: UBI",
    title: "Universal Basic Income (Text)",
    pitch: "A federal policy implementing a Universal Basic Income of $1,200 per month for every legal US resident adult over 18, regardless of employment status. It is fully funded by a 2% wealth tax on households net worth exceeding $50 million, and a $50 per metric ton carbon fee on heavy industrial polluters."
  },
  {
    icon: <Zap className="w-4 h-4 text-indigo-500" />,
    label: "Startup: Solace AI",
    title: "Solace Anxiety Wearable (Text)",
    pitch: "An sleek, screenless biometric wrist wearable that continuously tracks blood volume, galvanic skin response, and skin temperatures. Using lightweight, on-chip privacy-first machine learning, it models and predicts panic or anxiety spikes up to 15 minutes before they happen, suggesting subtle haptic breathing rhythms to calm your nervous system."
  },
  {
    icon: <ShoppingBag className="w-4 h-4 text-purple-400" />,
    label: "Product Link: Vision Pro",
    title: "Apple Vision Pro listed on Amazon (URL)",
    pitch: "https://www.amazon.com/dp/B0D1MDTW9Y"
  },
  {
    icon: <Zap className="w-4 h-4 text-rose-400" />,
    label: "YouTube Link: Devin AI",
    title: "YouTube Video details (URL)",
    pitch: "https://www.youtube.com/watch?v=fjHq89a9Lxo"
  },
  {
    icon: <BookOpen className="w-4 h-4 text-amber-500" />,
    label: "Wiki Link: clean energy",
    title: "Wikipedia: US High-Speed Rail policy (URL)",
    pitch: "https://en.wikipedia.org/wiki/High-speed_rail_in_the_United_States"
  }
];

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

  const handleSelectTemplate = (p: string) => {
    setPitchText(p);
  };

  const handleAgentCountChange = (value: number) => {
    // Snap to nearest 100
    const snapped = Math.round(value / 100) * 100;
    setAgentCount(Math.max(100, Math.min(maxAgents, snapped)));
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-light text-slate-100 tracking-tight">Introduce Your Pitch, Proposal, or Web Link</h2>
          <p className="text-xs text-slate-400 mt-1">Submit your copy or paste any general links, product links, or YouTube videos to analyze simulated reactions.</p>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>{agentCount.toLocaleString()} Agents Selected</span>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <textarea
          value={pitchText}
          onChange={(e) => setPitchText(e.target.value)}
          placeholder="Paste a product page link, YouTube link, policy URL, or type a startup elevator pitch here..."
          className="w-full min-h-[120px] max-h-[220px] p-4 text-sm text-slate-100 bg-slate-950 border border-slate-800 rounded-xl focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-500 font-mono"
          disabled={isLoading}
        />

        {hasUrl && (
          <div className="flex items-center space-x-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 font-mono animate-pulse">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span>Web Link Detected: The Stance Engine will live fetch, scrape, and analyze the page text to simulate US target reactions.</span>
          </div>
        )}

        {/* Agent Count Configurator */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">Population Sample Size</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={agentCount}
                onChange={(e) => handleAgentCountChange(parseInt(e.target.value) || 100)}
                min={100}
                max={maxAgents}
                step={100}
                className="w-24 px-2 py-1 text-xs text-right text-slate-100 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
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
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            disabled={isLoading}
          />

          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>100</span>
            <span>{Math.round(maxAgents * 0.25).toLocaleString()}</span>
            <span>{Math.round(maxAgents * 0.5).toLocaleString()}</span>
            <span>{Math.round(maxAgents * 0.75).toLocaleString()}</span>
            <span>{maxAgents.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1 uppercase tracking-wider text-[10px]">Try a template:</span>
            {templates.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectTemplate(tpl.pitch)}
                disabled={isLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 hover:border-slate-750 hover:text-white transition-colors cursor-pointer"
                title={tpl.title}
              >
                {tpl.icon}
                <span className="font-mono text-[11px]">{tpl.label}</span>
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isValidInput}
            className={`flex items-center justify-center space-x-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded transition-all shadow-md w-full xl:w-auto ${
              isLoading || !isValidInput
                ? 'bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Reacting in Parallel...</span>
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
