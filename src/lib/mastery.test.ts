import { describe, expect, it } from 'vitest';
import { adaptiveDifficulty, masteryBand, updateMastery } from './mastery';

describe('masteryBand', () => {
  it.each([
    [0, 'Beginner'],
    [30, 'Beginner'],
    [31, 'Developing'],
    [60, 'Developing'],
    [61, 'Proficient'],
    [80, 'Proficient'],
    [81, 'Strong'],
    [100, 'Strong'],
  ] as const)('classifies score %i as %s', (score, band) => {
    expect(masteryBand(score)).toBe(band);
  });
});

describe('updateMastery', () => {
  it('moves mastery toward the observed answer without an all-or-nothing jump', () => {
    expect(updateMastery(50, true)).toBe(64);
    expect(updateMastery(50, false)).toBe(36);
  });

  it('clamps prior mastery to the supported range', () => {
    expect(updateMastery(-20, false)).toBe(0);
    expect(updateMastery(130, true)).toBe(100);
  });
});

describe('adaptiveDifficulty', () => {
  it('starts easy until the learner has at least two attempts', () => {
    expect(adaptiveDifficulty(1, 0)).toBe(1);
    expect(adaptiveDifficulty(1, 1)).toBe(1);
  });

  it.each([
    [0.49, 8, 1],
    [0.5, 2, 2],
    [0.74, 8, 2],
    [0.75, 8, 3],
    [0.89, 8, 3],
    [0.9, 8, 4],
  ])('maps practice accuracy to an adaptive difficulty', (accuracy, attempts, difficulty) => {
    expect(adaptiveDifficulty(accuracy, attempts)).toBe(difficulty);
  });
});
