export function masteryBand(score: number): 'Beginner' | 'Developing' | 'Proficient' | 'Strong' {
  if (score <= 30) return 'Beginner';
  if (score <= 60) return 'Developing';
  if (score <= 80) return 'Proficient';
  return 'Strong';
}

/** Recency-weighted practice mastery. It is an estimate from submitted answers, not a credential. */
export function updateMastery(current: number, correct: boolean): number {
  const bounded = Math.max(0, Math.min(100, current));
  const observed = correct ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(bounded * 0.72 + observed * 0.28)));
}

export function adaptiveDifficulty(accuracy: number, attempts: number): number {
  if (attempts < 2 || accuracy < 0.5) return 1;
  if (accuracy < 0.75) return 2;
  if (accuracy < 0.9) return 3;
  return 4;
}
