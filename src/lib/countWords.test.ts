import { describe, expect, it } from 'vitest';
import { readExpectedCounts, readFixtureText } from '../../tests/fixtures/readFixture';
import { countWords } from './countWords';
import { isLikelyEnglish } from './stopWords';

describe('countWords', () => {
  it('sorts by count descending', () => {
    expect(countWords('b a c b a b', 'x').entries).toEqual([
      ['b', 3],
      ['a', 2],
      ['c', 1],
    ]);
  });

  it('breaks ties alphabetically (FR-007)', () => {
    expect(countWords('pear apple fig Apple', 'x').entries).toEqual([
      ['apple', 2],
      ['fig', 1],
      ['pear', 1],
    ]);
  });

  it('keeps totals consistent', () => {
    const result = countWords('the cat and the hat and the bat', 'cats.txt');
    const sum = result.entries.reduce((total, [, count]) => total + count, 0);
    expect(result.totalWords).toBe(sum);
    expect(result.totalWords).toBe(8);
    expect(result.distinctWords).toBe(result.entries.length);
    expect(result.bookName).toBe('cats.txt');
  });

  it('matches the hand-verified known-counts.json exactly, including order', () => {
    const expected = readExpectedCounts();
    const result = countWords(readFixtureText('known-counts.txt'), 'known-counts.txt');
    expect(result.totalWords).toBe(expected.totalWords);
    expect(result.distinctWords).toBe(expected.distinctWords);
    expect(result.entries).toEqual(expected.entries);
  });

  it('sets isLikelyEnglish from the stop-word heuristic', () => {
    const english = countWords(readFixtureText('known-counts.txt'), 'en.txt');
    expect(english.isLikelyEnglish).toBe(isLikelyEnglish(english.entries, english.totalWords));
    expect(english.isLikelyEnglish).toBe(true);
    expect(countWords('Мир книги и мир людей', 'ru.txt').isLikelyEnglish).toBe(false);
  });

  it('returns an empty result for text without words', () => {
    expect(countWords('1984 ... 42', 'n.txt')).toMatchObject({
      totalWords: 0,
      distinctWords: 0,
      entries: [],
    });
  });
});
