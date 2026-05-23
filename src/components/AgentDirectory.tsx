import React, { useState, useMemo } from 'react';
import { Agent, EvaluationResult } from '../types';
import { Search, Filter, RefreshCw, User, Mail, MapPin, Book, Heart, Smile, HelpCircle } from 'lucide-react';
import { generateAgentQuote } from '../utils/evaluationMapper';

interface AgentDirectoryProps {
  agents: Agent[];
  agentScores: Record<string, number>;
  result: EvaluationResult;
}

export const AgentDirectory: React.FC<AgentDirectoryProps> = ({ agents, agentScores, result }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMarital, setFilterMarital] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterAge, setFilterAge] = useState<string>('all');
  const [filterEducation, setFilterEducation] = useState<string>('all');
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Filter handlers
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterMarital('all');
    setFilterRegion('all');
    setFilterAge('all');
    setFilterEducation('all');
  };

  // Perform filtering across all agents in memory
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      // Search matches name or job
      const matchesSearch = 
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.occupation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMarital = filterMarital === 'all' || agent.maritalStatus === filterMarital;
      const matchesRegion = filterRegion === 'all' || agent.region === filterRegion;
      const matchesAge = filterAge === 'all' || agent.ageGroup === filterAge;
      const matchesEducation = filterEducation === 'all' || agent.education === filterEducation;

      return matchesSearch && matchesMarital && matchesRegion && matchesAge && matchesEducation;
    });
  }, [agents, searchTerm, filterMarital, filterRegion, filterAge, filterEducation]);

  const scoreTags = (score: number) => {
    if (score >= 35) return { text: "Strong Support", class: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" };
    if (score >= 10) return { text: "Lean Support", class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" };
    if (score <= -35) return { text: "Strong Oppose", class: "bg-rose-500/20 text-rose-300 border border-rose-500/30" };
    if (score <= -10) return { text: "Lean Oppose", class: "bg-rose-500/10 text-rose-400 border border-rose-500/20" };
    return { text: "Neutral Stance", class: "bg-slate-800 text-slate-400 border border-slate-700" };
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <User className="w-3.5 h-3.5 text-indigo-400" /> Agent census explorer
          </span>
          <h2 className="text-xl font-extrabold text-slate-105 tracking-tight mt-1">Stance Directory & Transcript Logs</h2>
          <p className="text-xs text-slate-400 mt-1">Filter and navigate through {agents.length.toLocaleString()} Nemotron personas representing simulated USA opinion.</p>
        </div>
        <button
          onClick={handleResetFilters}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer self-start md:self-auto font-mono"
        >
          <RefreshCw className="w-3 h-3 text-indigo-400" />
          <span>Reset Census Search</span>
        </button>
      </div>

      {/* Filters Control Center Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6 bg-slate-950 p-4 rounded-xl border border-slate-850">
        
        {/* Search Searchbar */}
        <div className="relative col-span-1 lg:col-span-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, job, city..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-555 font-mono"
          />
        </div>

        {/* Education Selector */}
        <div className="flex flex-col">
          <select
            value={filterEducation}
            onChange={(e) => setFilterEducation(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium cursor-pointer"
          >
            <option value="all">Education: All Levels</option>
            <option value="High School or less">High School or less</option>
            <option value="Some College / Associate">Some College / Associate</option>
            <option value="Bachelor's Degree">Bachelor's Degree</option>
            <option value="Postgraduate / Advanced">Postgraduate / Advanced</option>
          </select>
        </div>

        {/* Marital Status Selector */}
        <div className="flex flex-col">
          <select
            value={filterMarital}
            onChange={(e) => setFilterMarital(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium cursor-pointer"
          >
            <option value="all">Marital Status: All</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
          </select>
        </div>

        {/* Region Selector */}
        <div className="flex flex-col">
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium cursor-pointer"
          >
            <option value="all">Region: All states</option>
            <option value="Northeast">Northeast Region</option>
            <option value="Midwest">Midwest Region</option>
            <option value="South">Southern Region</option>
            <option value="West">Western Region</option>
          </select>
        </div>

        {/* Age Selector */}
        <div className="flex flex-col">
          <select
            value={filterAge}
            onChange={(e) => setFilterAge(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium cursor-pointer"
          >
            <option value="all">Age Profile: All</option>
            <option value="18-24">18 - 24 years</option>
            <option value="25-34">25 - 34 years</option>
            <option value="35-44">35 - 44 years</option>
            <option value="45-54">45 - 54 years</option>
            <option value="55-64">55 - 64 years</option>
            <option value="65+">65 years and older</option>
          </select>
        </div>

      </div>

      {/* Directory Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left List Pane (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono uppercase tracking-wider border-b border-slate-850 pb-2">
            <span>Query hits: {filteredAgents.length} agents</span>
            <span>Displaying up to 80</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredAgents.slice(0, 80).map(agent => {
              const score = agentScores[agent.id] ?? 0;
              const isSelected = selectedAgent?.id === agent.id;
              const borderClass = isSelected 
                ? 'border-indigo-500/60 bg-indigo-950/25 ring-1 ring-indigo-500/20 shadow-sm' 
                : 'border-slate-850 bg-slate-950/40 hover:border-slate-800 hover:bg-slate-900';
              const sTag = scoreTags(score);

              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`flex flex-col justify-between p-3.5 border rounded-xl text-left bg-slate-950/40 transition-all cursor-pointer min-w-0 ${borderClass}`}
                >
                  <div className="min-w-0 w-full mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold text-slate-505">{agent.id}</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${sTag.class}`}>
                        {score > 0 ? `+${score}` : score}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 block truncate mt-1">
                      {agent.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono tracking-wide block truncate mt-1">
                      {agent.age} • {agent.occupation}
                    </p>
                  </div>
                  <div className="border-t border-slate-850/60 pt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono w-full uppercase">
                    <span>{agent.education}</span>
                    <span>{agent.city}, {agent.state}</span>
                  </div>
                </button>
              );
            })}

            {filteredAgents.length === 0 && (
              <div className="col-span-2 py-16 text-center text-slate-500 flex flex-col items-center justify-center">
                <Search className="w-10 h-10 stroke-1 mb-2 text-slate-600" />
                <p className="text-xs font-mono lowercase tracking-wide">No representative citizens matched your criteria.</p>
                <p className="text-[10px] mt-1 text-slate-600 font-mono lowercase">Try widening your census search inputs.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Details Panel Sheet (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 rounded-2xl p-6 border border-slate-850 lg:sticky lg:top-24 min-h-[415px] flex flex-col justify-between">
          {selectedAgent ? (
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Selected Resident File</span>
                  <span className="text-[10px] text-slate-505 font-mono">{selectedAgent.id}</span>
                </div>

                <div className="flex items-center space-x-3 mt-4">
                  <div className="w-11 h-11 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-indigo-400 shadow-sm text-sm uppercase">
                    {selectedAgent.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-20s text-sm leading-tight">{selectedAgent.name}</h3>
                    <p className="text-[10px] text-slate-450 font-mono uppercase tracking-wider mt-0.5">{selectedAgent.occupation}</p>
                  </div>
                </div>

                {/* Structured details sheet */}
                <div className="space-y-1.5 mt-4 text-xs font-mono">
                  <div className="flex items-center space-x-2 text-slate-400 border-b border-slate-850/60 py-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-500 block w-20">Demography:</span>
                    <span className="text-slate-300 font-bold">{selectedAgent.gender} • {selectedAgent.age} years old ({selectedAgent.ageGroup})</span>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-400 border-b border-slate-850/60 py-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-500 block w-20">Location:</span>
                    <span className="text-slate-300 font-bold">{selectedAgent.city}, {selectedAgent.state} ({selectedAgent.region})</span>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-400 border-b border-slate-850/60 py-1.5">
                    <Heart className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-500 block w-20">Status:</span>
                    <span className="text-slate-300 font-bold">{selectedAgent.maritalStatus}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-400 border-b border-slate-850/60 py-1.5">
                    <Book className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-500 block w-20">Education:</span>
                    <span className="text-slate-300 font-bold">{selectedAgent.education}</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-850 p-3 rounded text-[10.5px] text-slate-400 italic font-mono leading-relaxed mt-2 block shadow-inner">
                    "{selectedAgent.persona.slice(0, 250)}{selectedAgent.persona.length > 250 ? '...' : ''}"
                  </div>
                </div>

                {/* Stance visual bar */}
                <div className="mt-4 flex items-center justify-between bg-slate-900 border border-slate-850 rounded p-3">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Simulated Reaction</span>
                    <span className="text-xs font-mono block text-slate-300 uppercase mt-0.5">{scoreTags(agentScores[selectedAgent.id] ?? 0).text}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded border flex-shrink-0 ${scoreTags(agentScores[selectedAgent.id] ?? 0).class}`}>
                    {(agentScores[selectedAgent.id] ?? 0) > 0 ? `+${agentScores[selectedAgent.id]}` : agentScores[selectedAgent.id]}
                  </span>
                </div>

                {/* Transcribed personal quote speaking of needs */}
                <div className="mt-4 bg-indigo-950/10 border border-indigo-505/20 text-indigo-300 p-4 rounded text-xs leading-relaxed">
                  <span className="text-[8px] uppercase tracking-widest text-indigo-400 font-mono font-bold block">Interview Quote Transcript</span>
                  <p className="leading-relaxed font-mono italic text-indigo-205 mt-1">
                    "{generateAgentQuote(selectedAgent, result, agentScores[selectedAgent.id] ?? 0)}"
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-slate-550 mt-4 border-t border-slate-850 pt-2.5 font-mono uppercase tracking-wider">
                Nemotron Persona {selectedAgent.id} • Sourced from NVIDIA Nemotron-Personas-USA
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full py-24 text-slate-600">
              <RefreshCw className="w-10 h-10 stroke-1 text-slate-705 mb-2 rotate-180 animate-pulse" />
              <p className="text-xs font-mono lowercase tracking-wide">Select representative dossier to open interview transcript logs.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
