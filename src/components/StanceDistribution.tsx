import React, { useState, useMemo } from 'react';
import { Agent } from '../types';
import { BarChart3 } from 'lucide-react';

interface StanceDistributionProps {
  agents: Agent[];
  agentScores: Record<string, number>;
}

const NUM_BINS = 20;
const BIN_WIDTH = 10;

const colorForCenter = (center: number) => {
  if (center >= 40) return { fill: '#059669', soft: '#d1fae5' };   // emerald-600 / 100
  if (center > 5) return { fill: '#34d399', soft: '#d1fae5' };     // emerald-400
  if (center >= -5) return { fill: '#fbbf24', soft: '#fef3c7' };   // amber-400
  if (center > -40) return { fill: '#fb7185', soft: '#ffe4e6' };   // rose-400
  return { fill: '#e11d48', soft: '#ffe4e6' };                     // rose-600
};

const labelForCenter = (center: number) => {
  if (center >= 40) return 'Strong Support';
  if (center > 5) return 'Lean Support';
  if (center >= -5) return 'Neutral';
  if (center > -40) return 'Lean Oppose';
  return 'Strong Oppose';
};

export const StanceDistribution: React.FC<StanceDistributionProps> = ({ agents, agentScores }) => {
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);

  const bins = useMemo(() => {
    const arr: { start: number; end: number; center: number; count: number; agents: Agent[] }[] = [];
    for (let i = 0; i < NUM_BINS; i++) {
      const start = -100 + i * BIN_WIDTH;
      arr.push({ start, end: start + BIN_WIDTH, center: start + BIN_WIDTH / 2, count: 0, agents: [] });
    }
    agents.forEach(agent => {
      const score = agentScores[agent.id] ?? 0;
      let idx = Math.floor((score + 100) / BIN_WIDTH);
      if (idx < 0) idx = 0;
      if (idx >= NUM_BINS) idx = NUM_BINS - 1;
      arr[idx].count += 1;
      arr[idx].agents.push(agent);
    });
    return arr;
  }, [agents, agentScores]);

  const total = agents.length;
  const maxCount = Math.max(...bins.map(b => b.count), 1);

  // Chart geometry
  const W = 720;
  const H = 220;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const barGap = 2;
  const barW = plotW / NUM_BINS - barGap;

  const yTicks = 4;
  const yStep = Math.ceil(maxCount / yTicks / 5) * 5 || 1;
  const yMax = yStep * yTicks;

  const hovered = hoveredBin !== null ? bins[hoveredBin] : null;
  const hoveredColor = hovered ? colorForCenter(hovered.center) : null;

  // Sorted spectrum: each agent positioned by score along a strip
  const spectrumW = 720;
  const spectrumH = 28;
  const tickH = 14;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-500" /> Stance Distribution
        </span>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">Population Reaction Shape</h2>
        <p className="text-xs text-slate-600 mt-1">
          How {total.toLocaleString()} agents distribute across the stance spectrum. Hover a bar to see the slice.
        </p>
      </div>

      {/* Histogram */}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Y gridlines + labels */}
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const v = (yMax / yTicks) * i;
            const y = padT + plotH - (v / yMax) * plotH;
            return (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#64748b" fontFamily="ui-monospace, monospace">
                  {Math.round(v)}
                </text>
              </g>
            );
          })}

          {/* Center axis at score=0 */}
          {(() => {
            const zeroX = padL + (100 / 200) * plotW;
            return <line x1={zeroX} x2={zeroX} y1={padT} y2={padT + plotH} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth={1} />;
          })()}

          {/* Bars */}
          {bins.map((b, i) => {
            const h = (b.count / yMax) * plotH;
            const x = padL + i * (barW + barGap) + barGap / 2;
            const y = padT + plotH - h;
            const c = colorForCenter(b.center);
            const isHovered = hoveredBin === i;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  fill={c.fill}
                  rx={2}
                  opacity={hoveredBin === null || isHovered ? 1 : 0.45}
                  style={{ transition: 'opacity 120ms' }}
                />
                {/* Full-column hover target so empty bins still respond */}
                <rect
                  x={x}
                  y={padT}
                  width={barW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoveredBin(i)}
                  onMouseLeave={() => setHoveredBin(prev => (prev === i ? null : prev))}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            );
          })}

          {/* X axis labels: -100, -50, 0, +50, +100 */}
          {[-100, -50, 0, 50, 100].map(v => {
            const x = padL + ((v + 100) / 200) * plotW;
            return (
              <g key={v}>
                <line x1={x} x2={x} y1={padT + plotH} y2={padT + plotH + 4} stroke="#94a3b8" strokeWidth={1} />
                <text x={x} y={padT + plotH + 16} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="ui-monospace, monospace">
                  {v > 0 ? `+${v}` : v}
                </text>
              </g>
            );
          })}
          <text x={padL} y={H - 4} fontSize={9} fill="#94a3b8" fontFamily="ui-monospace, monospace">Opposition</text>
          <text x={W - padR} y={H - 4} textAnchor="end" fontSize={9} fill="#94a3b8" fontFamily="ui-monospace, monospace">Support</text>
          <text x={padL + plotW / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#94a3b8" fontFamily="ui-monospace, monospace">Stance Score</text>
        </svg>

        {/* Hover info panel */}
        <div className="min-h-[44px] mt-1">
          {hovered ? (
            <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded"
                  style={{ background: hoveredColor!.fill }}
                />
                <span className="font-mono text-slate-700">
                  [{hovered.start > 0 ? `+${hovered.start}` : hovered.start}, {hovered.end > 0 ? `+${hovered.end}` : hovered.end})
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-700">{labelForCenter(hovered.center)}</span>
              </div>
              <div className="font-mono text-slate-700">
                <strong>{hovered.count.toLocaleString()}</strong> agents
                <span className="text-slate-500 ml-1.5">({((hovered.count / total) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 font-mono italic px-1">Hover a bar to inspect that slice.</div>
          )}
        </div>
      </div>

      {/* Stance Spectrum — each agent as a tick along the score axis */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">Agent Spectrum</h3>
          <span className="text-[10px] text-slate-500 font-mono">{total.toLocaleString()} agents — one tick each</span>
        </div>
        <svg viewBox={`0 0 ${spectrumW} ${spectrumH}`} className="w-full h-auto" preserveAspectRatio="none">
          {/* baseline */}
          <line x1={0} x2={spectrumW} y1={spectrumH / 2} y2={spectrumH / 2} stroke="#e2e8f0" strokeWidth={1} />
          {/* center tick at 0 */}
          <line x1={spectrumW / 2} x2={spectrumW / 2} y1={(spectrumH - tickH) / 2 - 2} y2={(spectrumH + tickH) / 2 + 2} stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth={1} />
          {agents.map(a => {
            const score = agentScores[a.id] ?? 0;
            const x = ((score + 100) / 200) * spectrumW;
            const c = colorForCenter(score);
            return (
              <line
                key={a.id}
                x1={x}
                x2={x}
                y1={(spectrumH - tickH) / 2}
                y2={(spectrumH + tickH) / 2}
                stroke={c.fill}
                strokeWidth={1}
                opacity={0.55}
              />
            );
          })}
        </svg>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
          <span>-100 OPPOSE</span>
          <span>0 NEUTRAL</span>
          <span>+100 SUPPORT</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-600 pt-3 border-t border-slate-200">
        <span className="text-slate-500">Bands:</span>
        <span className="px-1.5 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700 font-bold">Strong Oppose ≤ -40</span>
        <span className="px-1.5 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-600">Lean Oppose -40..-5</span>
        <span className="px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700">Neutral -5..+5</span>
        <span className="px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-600">Lean Support +5..+40</span>
        <span className="px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold">Strong Support ≥ +40</span>
      </div>
    </div>
  );
};
