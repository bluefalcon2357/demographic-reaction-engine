import React, { useState, useMemo } from 'react';
import { Agent, EvaluationResult } from '../types';
import { Layers, ChevronRight, UserPlus, HelpCircle } from 'lucide-react';
import { generateAgentQuote } from '../utils/evaluationMapper';

interface ArchetypeHeatmapProps {
  agents: Agent[];
  agentScores: Record<string, number>;
  result: EvaluationResult;
}

type DimensionType = 'gender' | 'ageGroup' | 'education' | 'region' | 'maritalStatus';

const dimensionLabels: Record<DimensionType, string> = {
  gender: 'Gender',
  ageGroup: 'Age Group',
  education: 'Education Level',
  region: 'Geographic Region',
  maritalStatus: 'Marital Status'
};

const dimensionOptions: Record<DimensionType, string[]> = {
  gender: ['Male', 'Female'],
  ageGroup: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  education: ['High School or less', 'Some College / Associate', 'Bachelor\'s Degree', 'Postgraduate / Advanced'],
  region: ['Northeast', 'Midwest', 'South', 'West'],
  maritalStatus: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated']
};

export const ArchetypeHeatmap: React.FC<ArchetypeHeatmapProps> = ({ agents, agentScores, result }) => {
  const [rowDim, setRowDim] = useState<DimensionType>('education');
  const [colDim, setColDim] = useState<DimensionType>('region');
  const [selectedCell, setSelectedCell] = useState<{ row: string; col: string } | null>(null);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);

  const rowValues = dimensionOptions[rowDim];
  const colValues = dimensionOptions[colDim];

  // Instantly compute cell statistics for our grid
  const cellData = useMemo(() => {
    const matrix: Record<string, Record<string, { count: number; sum: number; avg: number; agentsList: Agent[] }>> = {};
    
    rowValues.forEach(rVal => {
      matrix[rVal] = {};
      colValues.forEach(cVal => {
        matrix[rVal][cVal] = { count: 0, sum: 0, avg: 0, agentsList: [] };
      });
    });

    agents.forEach(agent => {
      const rVal = agent[rowDim] as string;
      const cVal = agent[colDim] as string;
      const score = agentScores[agent.id] ?? 0;

      // Safe checks in case of custom mapping anomalies
      if (matrix[rVal] && matrix[rVal][cVal]) {
        matrix[rVal][cVal].count += 1;
        matrix[rVal][cVal].sum += score;
        matrix[rVal][cVal].agentsList.push(agent);
      }
    });

    // Compute averages
    rowValues.forEach(rVal => {
      colValues.forEach(cVal => {
        const cell = matrix[rVal][cVal];
        if (cell.count > 0) {
          cell.avg = Math.round(cell.sum / cell.count);
        }
      });
    });

    return matrix;
  }, [agents, agentScores, rowDim, colDim, rowValues, colValues]);

  // Handle cell click
  const handleCellClick = (rowVal: string, colVal: string) => {
    setSelectedCell({ row: rowVal, col: colVal });
    setActiveAgent(null); // Reset detail views
  };

  // Extract selected cell detailed agent list and benefits/concerns list
  const selectedCellDetails = useMemo(() => {
    if (!selectedCell) return null;
    const { row, col } = selectedCell;
    const data = cellData[row]?.[col];
    if (!data || data.count === 0) return null;

    // Collate segment definitions for benefits/concerns to display contextually
    const extractSourceDetails = (dimType: DimensionType, val: string) => {
      if (dimType === 'ageGroup') {
        let ageKey: '18-34' | '35-54' | '55+' = '35-54';
        if (val === '18-24' || val === '25-34') ageKey = '18-34';
        else if (val === '35-44' || val === '45-54') ageKey = '35-54';
        else ageKey = '55+';
        return result.ageGroup[ageKey];
      }
      if (dimType === 'education') return result.education[val as keyof typeof result.education];
      if (dimType === 'region') return result.region[val as keyof typeof result.region];
      if (dimType === 'gender') return result.gender[val as keyof typeof result.gender];
      if (dimType === 'maritalStatus') return result.maritalStatus[val as keyof typeof result.maritalStatus];
      return null;
    };

    const rowDetails = extractSourceDetails(rowDim, row);
    const colDetails = extractSourceDetails(colDim, col);

    const concerns = Array.from(new Set([...(rowDetails?.concerns || []), ...(colDetails?.concerns || [])])).slice(0, 4);
    const benefits = Array.from(new Set([...(rowDetails?.benefits || []), ...(colDetails?.benefits || [])])).slice(0, 4);

    return {
      agents: data.agentsList,
      avgScore: data.avg,
      concerns,
      benefits
    };
  }, [selectedCell, cellData, rowDim, colDim, result]);

  // Color helper for average scores in the heatmap grid
  const getCellColorClass = (score: number) => {
    if (score >= 40) return 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40';
    if (score >= 15) return 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
    if (score <= -40) return 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40';
    if (score <= -15) return 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border-rose-500/20';
    return 'bg-slate-950 hover:bg-slate-800/80 text-slate-400 border-slate-850/80';
  };

  const getScoreTag = (score: number) => {
    if (score >= 35) return { text: "Highly Support", color: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" };
    if (score >= 10) return { text: "Lean Support", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-505/20" };
    if (score <= -35) return { text: "Highly Oppose", color: "bg-rose-500/20 text-rose-300 border border-rose-500/30" };
    if (score <= -10) return { text: "Lean Oppose", color: "bg-rose-500/10 text-rose-400 border border-rose-505/20" };
    return { text: "Undecided / Neutral", color: "bg-slate-850 text-slate-400 border border-slate-800" };
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Segmentation Matrix
            </span>
            <h2 className="text-xl font-extrabold text-slate-105 tracking-tight mt-1">Parallel Demographic Heatmap</h2>
            <p className="text-xs text-slate-400 mt-1">Cross-examine approval across {agents.length.toLocaleString()} agents. Select Row and Column dimensions to recalculate the US public stance grid.</p>
          </div>

          {/* Matrix Axis Controllers */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Row Pivot Area</span>
              <select
                value={rowDim}
                onChange={(e) => { setRowDim(e.target.value as DimensionType); setSelectedCell(null); }}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium cursor-pointer"
              >
                {Object.entries(dimensionLabels).map(([k, v]) => (
                  <option key={k} value={k} disabled={k === colDim} className="bg-slate-950 text-slate-100">{v}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Column Pivot Area</span>
              <select
                value={colDim}
                onChange={(e) => { setColDim(e.target.value as DimensionType); setSelectedCell(null); }}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium cursor-pointer"
              >
                {Object.entries(dimensionLabels).map(([k, v]) => (
                  <option key={k} value={k} disabled={k === rowDim} className="bg-slate-950 text-slate-100">{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Heatmap Grid itself */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[650px] space-y-2">
            
            {/* Column Headers */}
            <div className="flex items-center">
              <div className="w-40 flex-shrink-0 text-[10px] font-bold text-slate-500 uppercase text-right pr-4 tracking-wider">
                {dimensionLabels[rowDim]}
              </div>
              <div className="flex flex-1 justify-around">
                {colValues.map(cVal => (
                  <div key={cVal} className="flex-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 border-b border-slate-800">
                    {cVal}
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix Data Rows */}
            {rowValues.map(rVal => (
              <div key={rVal} className="flex items-center">
                
                {/* Row Header Label */}
                <div className="w-40 flex-shrink-0 text-xs font-bold text-slate-350 text-right pr-4 truncate font-mono">
                  {rVal}
                </div>

                {/* Grid Squares for Row */}
                <div className="flex flex-1 justify-around gap-2">
                  {colValues.map(cVal => {
                    const data = cellData[rVal]?.[cVal];
                    const isSelected = selectedCell?.row === rVal && selectedCell?.col === cVal;
                    const rating = isSelected ? "ring-2 ring-indigo-500 scale-[0.98] z-10 border-indigo-505" : "border border-slate-800/40";

                    return (
                      <button
                        key={cVal}
                        onClick={() => handleCellClick(rVal, cVal)}
                        className={`flex-1 h-20 p-2.5 rounded-xl flex flex-col justify-between text-left transition-all cursor-pointer ${getCellColorClass(data.avg)} ${rating}`}
                      >
                        <div className="flex items-baseline justify-between w-full">
                          <span className="text-lg font-extrabold tracking-tight">
                            {data.avg > 0 ? `+${data.avg}` : data.avg}
                          </span>
                          <span className="text-[9px] opacity-75 font-mono">
                            N={data.count}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono leading-none tracking-tight truncate w-full opacity-80 uppercase uppercase-wider">
                          {data.avg >= 35 ? 'Highly Support' : data.avg >= 10 ? 'Leans Support' : data.avg <= -35 ? 'Highly Oppose' : data.avg <= -10 ? 'Leans Oppose' : 'Neutral stance'}
                        </div>
                      </button>
                    );
                  })}
                </div>

              </div>
            ))}

          </div>
        </div>

        {/* Dynamic Map Legend and Quick Explanation info */}
        <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 mt-4 border-t border-slate-800 pt-3">
          <div className="flex items-center space-x-1.5 font-mono flex-wrap gap-y-1">
            <span>Grid scale:</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-955/20 text-rose-400 border border-rose-900/30 font-bold">OPPOSING (-100 to -15)</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-850">NEUTRAL (-14 to +14)</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-955/20 text-emerald-400 border border-emerald-900/30 font-bold">SUPPORTIVE (+15 to +100)</span>
          </div>
          <div className="text-slate-400 flex items-center gap-1.5 font-mono mt-2 xl:mt-0">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Click any cell to drill down into active segment profiles.</span>
          </div>
        </div>
      </div>

      {/* Selected cell details slideout row analysis */}
      {selectedCell && selectedCellDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Subsegment Analysis (Cons & Pros) card */}
          <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Segment Analysis</span>
                <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-850">Count: {selectedCellDetails.agents.length} Agents</span>
              </div>
              <h3 className="text-base font-bold text-slate-100 mt-2 truncate font-sans">
                {selectedCell.row} × {selectedCell.col}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Segment Average Score: <strong className={selectedCellDetails.avgScore >= 0 ? "text-emerald-400" : "text-rose-400"}>{selectedCellDetails.avgScore > 0 ? `+${selectedCellDetails.avgScore}` : selectedCellDetails.avgScore} / 100</strong>
              </p>

              {/* Benefits list */}
              <div className="space-y-2 mt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded inline-block">Key Drivers & Pulls</h4>
                {selectedCellDetails.benefits.length > 0 ? (
                  <ul className="space-y-1.5">
                    {selectedCellDetails.benefits.map((b, idx) => (
                      <li key={idx} className="text-xs text-slate-300 leading-normal flex items-start pl-1 font-mono">
                        <span className="text-emerald-450 mr-2">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic font-mono">No strong benefits profiled for this combination.</p>
                )}
              </div>

              {/* Concerns list */}
              <div className="space-y-2 mt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest font-mono text-rose-405 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded inline-block">Anxieties & Friction</h4>
                {selectedCellDetails.concerns.length > 0 ? (
                  <ul className="space-y-1.5">
                    {selectedCellDetails.concerns.map((c, idx) => (
                      <li key={idx} className="text-xs text-slate-300 leading-normal flex items-start pl-1 font-mono">
                        <span className="text-rose-450 mr-2">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic font-mono">No specific concerns registered for this combination.</p>
                )}
              </div>
            </div>
            
            <div className="text-[9px] text-slate-550 border-t border-slate-850 pt-2.5 mt-4 font-mono uppercase tracking-wider">
              Simulation Cluster Segment Evaluation
            </div>
          </div>

          {/* Micro population explorer list (Middle column) */}
          <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Matched Population</span>
                <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-850">Subset Sample</span>
              </div>
              <h3 className="text-base font-bold text-slate-100 mt-2 font-sans leading-tight">
                Representative Resident Roster
              </h3>
              <p className="text-xs text-slate-400 mt-1">Select a specific resident from this list to launch their high-fidelity citizen quote file.</p>

              {/* List of matching agents */}
              <div className="space-y-1.5 max-h-[290px] overflow-y-auto mt-4 pr-1">
                {selectedCellDetails.agents.slice(0, 45).map(agent => {
                  const score = agentScores[agent.id] ?? 0;
                  const tag = getScoreTag(score);
                  const isCur = activeAgent?.id === agent.id;
                  const border = isCur ? 'bg-slate-805 border-slate-600' : 'hover:bg-slate-850/40 border-slate-850 bg-slate-950/30';

                  return (
                    <button
                      key={agent.id}
                      onClick={() => setActiveAgent(agent)}
                      className={`w-full flex items-center justify-between p-2.5 text-left border rounded-xl text-xs transition-colors cursor-pointer ${border}`}
                    >
                      <div className="flex flex-col justify-center min-w-0 pr-2">
                        <span className="font-bold text-slate-200 truncate">{agent.name}</span>
                        <span className="text-[9px] text-slate-550 truncate font-mono mt-0.5">{agent.age} • {agent.occupation}</span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0 ${tag.color}`}>
                        {score > 0 ? `+${score}` : score}
                      </span>
                    </button>
                  );
                })}
                {selectedCellDetails.agents.length > 45 && (
                  <div className="text-[9px] text-slate-500 font-mono text-center py-2 italic uppercase tracking-wider">
                    + {selectedCellDetails.agents.length - 45} more agents matched...
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-2.5 mt-4 flex items-center justify-between font-mono">
              <span>Cell Distribution: {Math.round((selectedCellDetails.agents.length / agents.length) * 100)}%</span>
              <span>GRID LOCATION FOCUS</span>
            </div>
          </div>

          {/* Individual Interview Room viewport (Right column) */}
          <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            {activeAgent ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Citizen Interview Room</span>
                    <span className="text-[10px] text-slate-505 font-mono">{activeAgent.id}</span>
                  </div>
                  
                  {/* Avatar section */}
                  <div className="flex items-center space-x-3 mt-3.5">
                    <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-sm text-indigo-400 shadow-sm uppercase">
                      {activeAgent.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm leading-tight font-sans">{activeAgent.name}</h4>
                      <p className="text-[9.5px] text-slate-500 font-mono leading-none mt-1 uppercase tracking-wider">{activeAgent.occupation} from {activeAgent.city}, {activeAgent.state}</p>
                    </div>
                  </div>

                  {/* Demographic Grid info */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 my-4 bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px]">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">Age & Gender</span>
                      <span className="font-bold text-slate-300 font-mono leading-relaxed mt-0.5 block">{activeAgent.age} • {activeAgent.gender}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">Marital Status</span>
                      <span className="font-bold text-slate-300 font-mono leading-relaxed mt-0.5 block truncate">{activeAgent.maritalStatus}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">Location</span>
                      <span className="font-bold text-slate-300 font-mono leading-relaxed mt-0.5 block">{activeAgent.city}, {activeAgent.state}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">Formal education</span>
                      <span className="font-bold text-slate-300 font-mono leading-relaxed mt-0.5 block truncate">{activeAgent.education}</span>
                    </div>
                    <div className="col-span-2 border-t border-slate-850 pt-2 mt-1">
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">Persona</span>
                      <span className="text-slate-450 font-medium leading-relaxed italic block font-mono text-[11px] mt-1">"{activeAgent.persona.slice(0, 200)}{activeAgent.persona.length > 200 ? '...' : ''}"</span>
                    </div>
                  </div>

                  {/* Stance Score Card */}
                  <div className="flex items-center justify-between p-3 rounded bg-slate-950 border border-slate-850">
                    <div className="text-xs">
                      <span className="font-bold font-mono text-slate-300 block">Simulated Sentiment</span>
                      <span className="text-[10px] text-slate-500 font-mono uppercase mt-0.5 block">Representative Index Value</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <span className={`text-base font-black font-mono px-3 py-1 rounded border ${getScoreTag(agentScores[activeAgent.id] ?? 0).color}`}>
                        {(agentScores[activeAgent.id] ?? 0) > 0 ? `+${agentScores[activeAgent.id]}` : agentScores[activeAgent.id]}
                      </span>
                    </div>
                  </div>

                  {/* Verbatim quote room */}
                  <div className="mt-4 space-y-1 bg-indigo-950/10 border border-indigo-505/20 text-indigo-300 p-4 rounded text-xs leading-relaxed">
                    <span className="text-[8px] uppercase tracking-widest text-indigo-400 font-mono font-bold block">Verbatim Interview Quote</span>
                    <p className="leading-relaxed font-mono italic text-indigo-205 mt-1">
                      "{generateAgentQuote(activeAgent, result, agentScores[activeAgent.id] ?? 0)}"
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-555 border-t border-slate-850 pt-2.5 mt-4 font-mono uppercase tracking-wider">
                  Fully Simulated Interview Session
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full py-12 text-slate-500">
                <ChevronRight className="w-12 h-12 stroke-1 rotate-90 text-slate-700 mb-2 animate-bounce" />
                <p className="text-xs font-mono lowercase tracking-wide">Select matching resident to open direct chat interview card.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
