import { describe, expect, it } from 'vitest';
import { readFixtureText } from '../../tests/fixtures/readFixture';
import { countWords } from './countWords';
import { ENGLISH_STOP_WORDS, isLikelyEnglish } from './stopWords';
import { normalizeWord } from './tokenize';

describe('ENGLISH_STOP_WORDS', () => {
  it('is a set of about 180 words', () => {
    expect(ENGLISH_STOP_WORDS).toBeInstanceOf(Set);
    expect(ENGLISH_STOP_WORDS.size).toBeGreaterThanOrEqual(170);
    expect(ENGLISH_STOP_WORDS.size).toBeLessThanOrEqual(200);
  });

  it('includes common function words and contractions', () => {
    for (const word of ['the', 'and', 'of', "don't", "it's", "i'm"]) {
      expect(ENGLISH_STOP_WORDS.has(word)).toBe(true);
    }
  });

  it('stores every word already normalized (lowercase, straight apostrophe)', () => {
    for (const word of ENGLISH_STOP_WORDS) {
      expect(word).toBe(normalizeWord(word));
      expect(word).not.toContain('’');
    }
  });
});

describe('isLikelyEnglish', () => {
  it('is true at exactly 20% stop-word tokens', () => {
    expect(
      isLikelyEnglish(
        [
          ['zebra', 80],
          ['the', 20],
        ],
        100,
      ),
    ).toBe(true);
  });

  it('is false just below 20%', () => {
    expect(
      isLikelyEnglish(
        [
          ['zebra', 81],
          ['the', 19],
        ],
        100,
      ),
    ).toBe(false);
  });

  it('is false for Cyrillic-only text', () => {
    expect(
      isLikelyEnglish(
        [
          ['мир', 10],
          ['книги', 5],
        ],
        15,
      ),
    ).toBe(false);
  });

  it('is false for a Russian book (cyrillic.txt)', () => {
    const { entries, totalWords } = countWords(readFixtureText('cyrillic.txt'), 'cyrillic.txt');
    expect(totalWords).toBeGreaterThan(150);
    expect(isLikelyEnglish(entries, totalWords)).toBe(false);
  });

  it('is true for an English book (known-counts.txt)', () => {
    const { entries, totalWords } = countWords(
      readFixtureText('known-counts.txt'),
      'known-counts.txt',
    );
    expect(isLikelyEnglish(entries, totalWords)).toBe(true);
  });

  it('is false when there are no words', () => {
    expect(isLikelyEnglish([], 0)).toBe(false);
  });
});
