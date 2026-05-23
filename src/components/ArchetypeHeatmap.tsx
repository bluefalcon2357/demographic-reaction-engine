import React, { useState, useMemo } from 'react';
import { Agent, EvaluationResult } from '../types';
import { Layers, ChevronRight, UserPlus, HelpCircle } from 'lucide-react';
import { generateAgentQuote, incomeBracketOf, occupationCategoryOf, ethnicityOf } from '../utils/evaluationMapper';

interface ArchetypeHeatmapProps {
  agents: Agent[];
  agentScores: Record<string, number>;
  result: EvaluationResult;
}

type DimensionType = 'gender' | 'ageGroup' | 'education' | 'region' | 'maritalStatus' | 'income' | 'occupationCategory' | 'ethnicity';

const dimensionLabels: Record<DimensionType, string> = {
  gender: 'Gender',
  ageGroup: 'Age Group',
  education: 'Education Level',
  region: 'Geographic Region',
  maritalStatus: 'Marital Status',
  income: 'Income Bracket',
  occupationCategory: 'Occupation Category',
  ethnicity: 'Ethnicity'
};

const dimensionOptions: Record<DimensionType, string[]> = {
  gender: ['Male', 'Female'],
  ageGroup: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  education: ['High School or less', 'Some College / Associate', 'Bachelor\'s Degree', 'Postgraduate / Advanced'],
  region: ['Northeast', 'Midwest', 'South', 'West'],
  maritalStatus: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'],
  income: ['Under $25K', '$25K-$50K', '$50K-$100K', '$100K-$150K', '$150K+'],
  occupationCategory: ['Professional / Technical', 'Management / Business', 'Service', 'Sales / Office', 'Trades / Construction / Maintenance', 'Production / Transport', 'Not in Workforce / Retired'],
  ethnicity: ['White', 'Black / African-American', 'Hispanic / Latino', 'Asian / Pacific Islander', 'Native American', 'Multiracial / Other']
};

function dimensionValueOf(agent: Agent, dim: DimensionType): string {
  if (dim === 'income') return incomeBracketOf(agent);
  if (dim === 'occupationCategory') return occupationCategoryOf(agent);
  if (dim === 'ethnicity') return ethnicityOf(agent);
  return agent[dim] as string;
}

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
      const rVal = dimensionValueOf(agent, rowDim);
      const cVal = dimensionValueOf(agent, colDim);
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
      if (dimType === 'ageGroup') return result.ageGroup[val as keyof typeof result.ageGroup];
      if (dimType === 'education') return result.education[val as keyof typeof result.education];
      if (dimType === 'region') return result.region[val as keyof typeof result.region];
      if (dimType === 'gender') return result.gender[val as keyof typeof result.gender];
      if (dimType === 'maritalStatus') return result.maritalStatus[val as keyof typeof result.maritalStatus];
      if (dimType === 'income') return result.income[val as keyof typeof result.income];
      if (dimType === 'occupationCategory') return result.occupationCategory[val as keyof typeof result.occupationCategory];
      if (dimType === 'ethnicity') return result.ethnicity[val as keyof typeof result.ethnicity];
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
    if (score >= 40) return 'bg-emerald-200 hover:bg-emerald-300 text-emerald-900 border-emerald-300';
    if (score >= 15) return 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-200';
    if (score <= -40) return 'bg-rose-200 hover:bg-rose-300 text-rose-900 border-rose-300';
    if (score <= -15) return 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-200';
    return 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200';
  };

  const getScoreTag = (score: number) => {
    if (score >= 35) return { text: "Highly Support", color: "bg-emerald-100 text-emerald-800 border border-emerald-300" };
    if (score >= 10) return { text: "Lean Support", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    if (score <= -35) return { text: "Highly Oppose", color: "bg-rose-100 text-rose-800 border border-rose-300" };
    if (score <= -10) return { text: "Lean Oppose", color: "bg-rose-50 text-rose-700 border border-rose-200" };
    return { text: "Undecided / Neutral", color: "bg-slate-100 text-slate-600 border border-slate-200" };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Segmentation Matrix
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">Parallel Demographic Heatmap</h2>
            <p className="text-xs text-slate-600 mt-1">Cross-examine approval across {agents.length.toLocaleString()} agents. Select Row and Column dimensions to recalculate the US public stance grid.</p>
          </div>

          {/* Matrix Axis Controllers */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Row Pivot Area</span>
              <select
                value={rowDim}
                onChange={(e) => { setRowDim(e.target.value as DimensionType); setSelectedCell(null); }}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium cursor-pointer"
              >
                {Object.entries(dimensionLabels).map(([k, v]) => (
                  <option key={k} value={k} disabled={k === colDim} className="bg-white text-slate-900">{v}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Column Pivot Area</span>
              <select
                value={colDim}
                onChange={(e) => { setColDim(e.target.value as DimensionType); setSelectedCell(null); }}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium cursor-pointer"
              >
                {Object.entries(dimensionLabels).map(([k, v]) => (
                  <option key={k} value={k} disabled={k === rowDim} className="bg-white text-slate-900">{v}</option>
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
                  <div key={cVal} className="flex-1 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider py-2 border-b border-slate-200">
                    {cVal}
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix Data Rows */}
            {rowValues.map(rVal => (
              <div key={rVal} className="flex items-center">

                {/* Row Header Label */}
                <div className="w-40 flex-shrink-0 text-xs font-bold text-slate-700 text-right pr-4 truncate font-mono">
                  {rVal}
                </div>

                {/* Grid Squares for Row */}
                <div className="flex flex-1 justify-around gap-2">
                  {colValues.map(cVal => {
                    const data = cellData[rVal]?.[cVal];
                    const isSelected = selectedCell?.row === rVal && selectedCell?.col === cVal;
                    const rating = isSelected ? "ring-2 ring-indigo-500 scale-[0.98] z-10 border-indigo-500" : "border";

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
                          <span className="text-[10px] opacity-75 font-mono">
                            N={data.count}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono leading-none tracking-tight truncate w-full opacity-80 uppercase uppercase-wider">
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
        <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 mt-4 border-t border-slate-200 pt-3">
          <div className="flex items-center space-x-1.5 font-mono flex-wrap gap-y-1">
            <span>Grid scale:</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">OPPOSING (-100 to -15)</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">NEUTRAL (-14 to +14)</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">SUPPORTIVE (+15 to +100)</span>
          </div>
          <div className="text-slate-600 flex items-center gap-1.5 font-mono mt-2 xl:mt-0">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Click any cell to drill down into active segment profiles.</span>
          </div>
        </div>
      </div>

      {/* Selected cell details slideout row analysis */}
      {selectedCell && selectedCellDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">

          {/* Subsegment Analysis (Cons & Pros) card */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Segment Analysis</span>
                <span className="text-[10px] text-slate-600 font-mono uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Count: {selectedCellDetails.agents.length} Agents</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2 truncate font-sans">
                {selectedCell.row} × {selectedCell.col}
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-mono">
                Segment Average Score: <strong className={selectedCellDetails.avgScore >= 0 ? "text-emerald-600" : "text-rose-600"}>{selectedCellDetails.avgScore > 0 ? `+${selectedCellDetails.avgScore}` : selectedCellDetails.avgScore} / 100</strong>
              </p>

              {/* Benefits list */}
              <div className="space-y-2 mt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded inline-block">Key Drivers & Pulls</h4>
                {selectedCellDetails.benefits.length > 0 ? (
                  <ul className="space-y-1.5">
                    {selectedCellDetails.benefits.map((b, idx) => (
                      <li key={idx} className="text-xs text-slate-700 leading-normal flex items-start pl-1">
                        <span className="text-emerald-500 mr-2">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">No strong benefits profiled for this combination.</p>
                )}
              </div>

              {/* Concerns list */}
              <div className="space-y-2 mt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest font-mono text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded inline-block">Anxieties & Friction</h4>
                {selectedCellDetails.concerns.length > 0 ? (
                  <ul className="space-y-1.5">
                    {selectedCellDetails.concerns.map((c, idx) => (
                      <li key={idx} className="text-xs text-slate-700 leading-normal flex items-start pl-1">
                        <span className="text-rose-500 mr-2">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">No specific concerns registered for this combination.</p>
                )}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2.5 mt-4 font-mono uppercase tracking-wider">
              Simulation Cluster Segment Evaluation
            </div>
          </div>

          {/* Micro population explorer list (Middle column) */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Matched Population</span>
                <span className="text-[10px] text-slate-600 font-mono uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Subset Sample</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2 font-sans leading-tight">
                Representative Resident Roster
              </h3>
              <p className="text-xs text-slate-600 mt-1">Select a specific resident from this list to launch their high-fidelity citizen quote file.</p>

              {/* List of matching agents */}
              <div className="space-y-1.5 max-h-[290px] overflow-y-auto mt-4 pr-1">
                {selectedCellDetails.agents.slice(0, 45).map(agent => {
                  const score = agentScores[agent.id] ?? 0;
                  const tag = getScoreTag(score);
                  const isCur = activeAgent?.id === agent.id;
                  const border = isCur ? 'bg-slate-100 border-slate-300' : 'hover:bg-slate-50 border-slate-200 bg-white';

                  return (
                    <button
                      key={agent.id}
                      onClick={() => setActiveAgent(agent)}
                      className={`w-full flex items-center justify-between p-2.5 text-left border rounded-xl text-xs transition-colors cursor-pointer ${border}`}
                    >
                      <div className="flex flex-col justify-center min-w-0 pr-2">
                        <span className="font-bold text-slate-800 truncate">{agent.name}</span>
                        <span className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{agent.age} • {agent.occupation}</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0 ${tag.color}`}>
                        {score > 0 ? `+${score}` : score}
                      </span>
                    </button>
                  );
                })}
                {selectedCellDetails.agents.length > 45 && (
                  <div className="text-[10px] text-slate-500 font-mono text-center py-2 italic uppercase tracking-wider">
                    + {selectedCellDetails.agents.length - 45} more agents matched...
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2.5 mt-4 flex items-center justify-between font-mono">
              <span>Cell Distribution: {Math.round((selectedCellDetails.agents.length / agents.length) * 100)}%</span>
              <span>GRID LOCATION FOCUS</span>
            </div>
          </div>

          {/* Individual Interview Room viewport (Right column) */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            {activeAgent ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest font-mono">Citizen Interview Room</span>
                    <span className="text-[10px] text-slate-500 font-mono">{activeAgent.id}</span>
                  </div>

                  {/* Avatar section */}
                  <div className="flex items-center space-x-3 mt-3.5">
                    <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-sm text-indigo-600 shadow-sm uppercase">
                      {activeAgent.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight font-sans">{activeAgent.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono leading-none mt-1 uppercase tracking-wider">{activeAgent.occupation} from {activeAgent.city}, {activeAgent.state}</p>
                    </div>
                  </div>

                  {/* Demographic Grid info */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 my-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px]">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Age & Gender</span>
                      <span className="font-bold text-slate-700 font-mono leading-relaxed mt-0.5 block">{activeAgent.age} • {activeAgent.gender}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Marital Status</span>
                      <span className="font-bold text-slate-700 font-mono leading-relaxed mt-0.5 block truncate">{activeAgent.maritalStatus}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Location</span>
                      <span className="font-bold text-slate-700 font-mono leading-relaxed mt-0.5 block">{activeAgent.city}, {activeAgent.state}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Formal education</span>
                      <span className="font-bold text-slate-700 font-mono leading-relaxed mt-0.5 block truncate">{activeAgent.education}</span>
                    </div>
                    <div className="col-span-2 border-t border-slate-200 pt-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Persona</span>
                      <span className="text-slate-600 font-medium leading-relaxed italic block text-[11px] mt-1">"{activeAgent.persona.slice(0, 200)}{activeAgent.persona.length > 200 ? '...' : ''}"</span>
                    </div>
                  </div>

                  {/* Stance Score Card */}
                  <div className="flex items-center justify-between p-3 rounded bg-slate-50 border border-slate-200">
                    <div className="text-xs">
                      <span className="font-bold font-mono text-slate-700 block">Simulated Sentiment</span>
                      <span className="text-[10px] text-slate-500 font-mono uppercase mt-0.5 block">Representative Index Value</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <span className={`text-base font-black font-mono px-3 py-1 rounded border ${getScoreTag(agentScores[activeAgent.id] ?? 0).color}`}>
                        {(agentScores[activeAgent.id] ?? 0) > 0 ? `+${agentScores[activeAgent.id]}` : agentScores[activeAgent.id]}
                      </span>
                    </div>
                  </div>

                  {/* Verbatim quote room */}
                  <div className="mt-4 space-y-1 bg-indigo-50 border border-indigo-200 text-indigo-800 p-4 rounded text-xs leading-relaxed">
                    <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-mono font-bold block">Verbatim Interview Quote</span>
                    <p className="leading-relaxed italic text-indigo-800 mt-1">
                      "{generateAgentQuote(activeAgent, result, agentScores[activeAgent.id] ?? 0)}"
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2.5 mt-4 font-mono uppercase tracking-wider">
                  Fully Simulated Interview Session
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full py-12 text-slate-500">
                <ChevronRight className="w-12 h-12 stroke-1 rotate-90 text-slate-300 mb-2 animate-bounce" />
                <p className="text-xs font-mono lowercase tracking-wide">Select matching resident to open direct chat interview card.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};