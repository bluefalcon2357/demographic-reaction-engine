import { Agent } from '../types';
import agentsData from './nemotron-agents.json';

// The full pool of pre-fetched Nemotron agents (up to 20,000)
const allAgents: Agent[] = agentsData as Agent[];

/**
 * Returns all available agents from the Nemotron dataset.
 */
export function getAllAgents(): Agent[] {
  return allAgents;
}

/**
 * Returns a shuffled subsample of agents.
 * Uses a time-based seed so each page load gets a different shuffle,
 * but within a session the order is stable.
 */
export function getAgents(count: number): Agent[] {
  const n = Math.min(count, allAgents.length);
  
  // Fisher-Yates shuffle with a session seed (stable within the same page load)
  const sessionSeed = Math.floor(Date.now() / 60000); // Changes every minute
  const shuffled = [...allAgents];
  let seed = sessionSeed;
  
  // Simple LCG for deterministic shuffle
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (seed >>> 0) / 0xFFFFFFFF;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, n);
}

/**
 * Returns the total number of available agents in the pool.
 */
export function getTotalAgentCount(): number {
  return allAgents.length;
}
