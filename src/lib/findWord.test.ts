import { describe, expect, it } from 'vitest';
import { createWordIndex, findWord } from './findWord';
import type { WordEntry } from './types';

const entries: WordEntry[] = [
  { word: 'the', count: 4, rank: 1, percent: 40 },
  { word: "don't", count: 3, rank: 2, percent: 30 },
  { word: 'café', count: 2, rank: 3, percent: 20 },
  { word: 'well-known', count: 1, rank: 4, percent: 10 },
];

describe('createWordIndex', () => {
  it('maps each word to its entry', () => {
    const index = createWordIndex(entries);
    expect(index).toBeInstanceOf(Map);
    expect(index.size).toBe(4);
    expect(index.get('café')).toBe(entries[2]);
  });
});

describe('findWord (FR-021)', () => {
  const index = createWordIndex(entries);

  it('returns the entry for a hit', () => {
    expect(findWord(index, 'the')).toEqual({ word: 'the', count: 4, rank: 1, percent: 40 });
  });

  it('trims and lowercases the query', () => {
    expect(findWord(index, '  THE \n')).toBe(entries[0]);
  });

  it('matches curly and straight apostrophes', () => {
    expect(findWord(index, 'Don’t')).toBe(entries[1]);
    expect(findWord(index, "don't")).toBe(entries[1]);
  });

  it('normalizes to NFC, so a decomposed accent still matches', () => {
    expect(findWord(index, 'café')).toBe(entries[2]);
  });

  it('matches a Unicode hyphen', () => {
    expect(findWord(index, 'well‐known')).toBe(entries[3]);
  });

  it('returns null for a miss', () => {
    expect(findWord(index, 'zzz')).toBeNull();
  });

  it('returns null for an empty or blank query', () => {
    expect(findWord(index, '')).toBeNull();
    expect(findWord(index, '   ')).toBeNull();
  });
});
