import { Agent, EvaluationResult } from '../types';

/**
 * Calculates a high-fidelity, customized stance score for an individual agent
 * based on the multi-dimensional demographic evaluation results from Gemini.
 * 
 * Uses 5 Nemotron-native dimensions weighted by their typical impact on opinion formation.
 */
export function calculateAgentScore(agent: Agent, result: EvaluationResult): number {
  // 1. Education level (weight: 30%) — strongest predictor of opinion variance
  const eduScore = result.education[agent.education]?.score ?? 0;

  // 2. Age Group (weight: 25%)
  const ageScore = result.ageGroup[agent.ageGroup]?.score ?? 0;

  // 3. Regional culture & geography (weight: 20%)
  const regScore = result.region[agent.region]?.score ?? 0;

  // 4. Gender differences (weight: 15%)
  const genScore = result.gender[agent.gender]?.score ?? 0;

  // 5. Marital status (weight: 10%)
  const maritalKey = agent.maritalStatus as keyof typeof result.maritalStatus;
  const maritalScore = result.maritalStatus[maritalKey]?.score ?? 0;

  // Combine weighted factors
  const weightedBase = (
    eduScore * 0.30 +
    ageScore * 0.25 +
    regScore * 0.20 +
    genScore * 0.15 +
    maritalScore * 0.10
  );

  // Deterministic persona-specific micro-uniqueness
  // derived from the agent ID so the response remains consistent on reload
  const idValue = parseInt(agent.id.replace(/[^0-9]/g, ''), 10) || 0;
  const variance = ((idValue % 17) - 8) * 1.5; // Variance between -12 and +12

  // Return bounded between -100 and +100
  return Math.max(-100, Math.min(100, Math.round(weightedBase + variance)));
}

/**
 * Procedurally generates an authentic, context-aware verbal quote for an agent
 * by synthesizing their specific demographics with the benefits or concerns evaluated by Gemini.
 */
export function generateAgentQuote(agent: Agent, result: EvaluationResult, score: number): string {
  // Check if this agent has a pre-existing verbatim returned by the server
  const exactVerbatim = result.verbatims.find(
    v => v.gender === agent.gender && 
         Math.abs(v.age - agent.age) <= 4 && 
         v.maritalStatus === agent.maritalStatus
  );
  if (exactVerbatim) {
    return exactVerbatim.quote;
  }

  // Extract candidate concerns and benefits
  const ageData = result.ageGroup[agent.ageGroup];
  const eduData = result.education[agent.education];
  const regData = result.region[agent.region];
  const genData = result.gender[agent.gender];

  const poolOfBenefits = [
    ...(ageData?.benefits || []),
    ...(eduData?.benefits || []),
    ...(regData?.benefits || []),
    ...(genData?.benefits || [])
  ].filter(b => b && b.length > 5);

  const poolOfConcerns = [
    ...(ageData?.concerns || []),
    ...(eduData?.concerns || []),
    ...(regData?.concerns || []),
    ...(genData?.concerns || [])
  ].filter(c => c && c.length > 5);

  const keyBenefit = poolOfBenefits.length > 0 ? poolOfBenefits[parseInt(agent.id.replace(/[^0-9]/g, ''), 10) % poolOfBenefits.length] : "it seems promising";
  const keyConcern = poolOfConcerns.length > 0 ? poolOfConcerns[(parseInt(agent.id.replace(/[^0-9]/g, ''), 10) + 3) % poolOfConcerns.length] : "potential logistics";

  const lowerOccupation = agent.occupation.toLowerCase();

  if (score >= 40) {
    const positiveTemplates = [
      `Honestly, this sounds like a massive win. As a ${lowerOccupation}, I think ${keyBenefit.toLowerCase().replace(/\.$/, '')} is a game changer.`,
      `I'm really supportive of this. Seeing that we get ${keyBenefit.toLowerCase().replace(/\.$/, '')} makes a lot of sense for someone in ${agent.state}.`,
      `This is a great idea. It directly addresses things I care about, especially ${keyBenefit.toLowerCase().replace(/\.$/, '')}.`,
      `Finally, something practical! Being a ${lowerOccupation}, I see huge potential here. It clearly helps with ${keyBenefit.toLowerCase().replace(/\.$/, '')}.`
    ];
    return positiveTemplates[parseInt(agent.id.replace(/[^0-9]/g, ''), 10) % positiveTemplates.length];
  } else if (score >= 10) {
    return `I think this is a step in the right direction. It's solid because it supports ${keyBenefit.toLowerCase().replace(/\.$/, '')}, though I do wonder if they have thought about ${keyConcern.toLowerCase().replace(/\.$/, '')}.`;
  } else if (score >= -10) {
    return `I'm fairly neutral on this. On one hand, I like that it highlights ${keyBenefit.toLowerCase().replace(/\.$/, '')}. On the other hand, my main hesitation is ${keyConcern.toLowerCase().replace(/\.$/, '')}. Let's see how they implement it.`;
  } else if (score >= -40) {
    return `I have some doubts about this proposal. While ${keyBenefit.toLowerCase().replace(/\.$/, '')} is fine, I can't shake my worry about ${keyConcern.toLowerCase().replace(/\.$/, '')}. It doesn't seem fully thought out.`;
  } else {
    const negativeTemplates = [
      `I'm really against this. As a ${lowerOccupation}, my biggest concern is ${keyConcern.toLowerCase().replace(/\.$/, '')}. No thanks.`,
      `This is highly problematic. They claim it helps, but it completely ignores the issue of ${keyConcern.toLowerCase().replace(/\.$/, '')}.`,
      `I don't support this at all. From my perspective in ${agent.state}, this is a recipe for trouble, especially regarding ${keyConcern.toLowerCase().replace(/\.$/, '')}.`,
      `This doesn't align with my needs as a ${lowerOccupation} at all. The risk of ${keyConcern.toLowerCase().replace(/\.$/, '')} makes it a dealbreaker for me.`
    ];
    return negativeTemplates[parseInt(agent.id.replace(/[^0-9]/g, ''), 10) % negativeTemplates.length];
  }
}
