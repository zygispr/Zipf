import { describe, expect, it } from 'vitest';
import { readExpectedCounts, readFixtureText } from '../../tests/fixtures/readFixture';
import { forEachToken, normalizeWord, tokenize } from './tokenize';

describe('tokenize', () => {
  it('lowercases words', () => {
    expect(tokenize('The THE the')).toEqual(['the', 'the', 'the']);
  });

  it('NFC-normalizes, so decomposed and composed "café" are the same word', () => {
    const [decomposed, composed] = tokenize('café café');
    expect(decomposed).toBe('café');
    expect(decomposed).toBe(composed);
  });

  it('strips surrounding punctuation', () => {
    expect(tokenize('"Hello," (end.) ¡hola! [word]')).toEqual(['hello', 'end', 'hola', 'word']);
  });

  it('keeps internal apostrophes and hyphens', () => {
    expect(tokenize("don't well-known rock'n'roll")).toEqual([
      "don't",
      'well-known',
      "rock'n'roll",
    ]);
  });

  it('drops leading and trailing apostrophes and hyphens', () => {
    expect(tokenize("'tis dogs' -start end- --")).toEqual(['tis', 'dogs', 'start', 'end']);
  });

  it('splits on dashes that are not hyphens', () => {
    expect(tokenize('read—and to–from')).toEqual(['read', 'and', 'to', 'from']);
  });

  it('unifies curly and straight apostrophes', () => {
    expect(tokenize("don't don’t DON’T")).toEqual(["don't", "don't", "don't"]);
  });

  it('unifies the Unicode hyphen with the ASCII hyphen', () => {
    expect(tokenize('well-known well‐known')).toEqual(['well-known', 'well-known']);
  });

  it('excludes numbers', () => {
    expect(tokenize('1984 42 3.14 1,000 007')).toEqual([]);
  });

  it('handles Cyrillic, Greek, and combining marks', () => {
    expect(tokenize('Мир книги ΛΌΓΟΣ नमस्ते')).toEqual(['мир', 'книги', 'λόγος', 'नमस्ते']);
  });

  it('returns no tokens for whitespace and punctuation only', () => {
    expect(tokenize('   ... !!! — \n\t "" ')).toEqual([]);
    expect(tokenize('')).toEqual([]);
  });

  it('tokenizes the known-counts fixture to exactly the expected words', () => {
    const expected = readExpectedCounts();
    const tokens = tokenize(readFixtureText('known-counts.txt'));
    const counts = new Map<string, number>();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    expect(tokens).toHaveLength(expected.totalWords);
    expect(Object.fromEntries(counts)).toEqual(Object.fromEntries(expected.entries));
  });
});

describe('normalizeWord', () => {
  it('lowercases, NFC-normalizes, and unifies punctuation variants', () => {
    expect(normalizeWord('DON’T')).toBe("don't");
    expect(normalizeWord('Well‐Known')).toBe('well-known');
    expect(normalizeWord('CAFÉ')).toBe('café');
  });
});

describe('forEachToken', () => {
  it('calls back once per token, in order', () => {
    const seen: string[] = [];
    forEachToken('One, two—THREE', (token) => seen.push(token));
    expect(seen).toEqual(['one', 'two', 'three']);
  });
});
