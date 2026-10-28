// Contract tests for specs/001-book-word-frequency/contracts/csv-export.md.
import { describe, expect, it } from 'vitest';
import { csvFilename, toCsv } from './csv';
import type { WordEntry } from './types';

const BOM = '﻿';

const entries: WordEntry[] = [
  { word: 'the', count: 4205, rank: 1, percent: 5.12341 },
  { word: 'and', count: 2901, rank: 2, percent: 3.53449 },
  { word: "don't", count: 120, rank: 3, percent: 0.146198 },
];

/** A minimal RFC 4180 parser, so the round trip doesn't trust the writer's own logic. */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv.charAt(i);
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r' && csv[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

describe('toCsv', () => {
  it('starts with a UTF-8 BOM and the header row', () => {
    const csv = toCsv(entries);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1).split('\r\n')[0]).toBe('rank,word,count,percent');
  });

  it('matches the contract example, with CRLF line endings', () => {
    expect(toCsv(entries)).toBe(
      `${BOM}rank,word,count,percent\r\n1,the,4205,5.1234\r\n2,and,2901,3.5345\r\n3,don't,120,0.1462\r\n`,
    );
  });

  it('has no bare LF line breaks', () => {
    expect(toCsv(entries).replaceAll('\r\n', '')).not.toContain('\n');
  });

  it('formats percent with 4 decimals and a "." separator', () => {
    const csv = toCsv([
      { word: 'a', count: 1, rank: 1, percent: 100 },
      { word: 'b', count: 1, rank: 2, percent: 0.00004 },
    ]);
    expect(csv).toContain('\r\n1,a,1,100.0000\r\n');
    expect(csv).toContain('\r\n2,b,1,0.0000\r\n');
  });

  it.each([
    ['a "quoted" word', '"a ""quoted"" word"'],
    ['comma,word', '"comma,word"'],
    ['line\nbreak', '"line\nbreak"'],
    ['carriage\rreturn', '"carriage\rreturn"'],
  ])('quotes %j per RFC 4180', (word, field) => {
    expect(toCsv([{ word, count: 1, rank: 1, percent: 1 }])).toContain(
      `\r\n1,${field},1,1.0000\r\n`,
    );
  });

  it('has one row per entry plus the header', () => {
    const many = Array.from({ length: 1234 }, (_, i) => ({
      word: `w${String(i)}`,
      count: 1,
      rank: i + 1,
      percent: 0.1,
    }));
    expect(parseCsv(toCsv(many).slice(1))).toHaveLength(1235);
    expect(parseCsv(toCsv([]).slice(1))).toEqual([['rank', 'word', 'count', 'percent']]);
  });

  it('parses back to the same entries', () => {
    const tricky: WordEntry[] = [
      ...entries,
      { word: 'say "hi", ok', count: 2, rank: 4, percent: 0.5 },
      { word: 'two\r\nlines', count: 1, rank: 5, percent: 0.25 },
      { word: 'λόγος', count: 1, rank: 6, percent: 0.25 },
    ];
    const [header, ...rows] = parseCsv(toCsv(tricky).slice(1));
    expect(header).toEqual(['rank', 'word', 'count', 'percent']);
    expect(rows).toEqual(
      tricky.map(({ rank, word, count, percent }) => [
        String(rank),
        word,
        String(count),
        percent.toFixed(4),
      ]),
    );
  });
});

describe('csvFilename', () => {
  it('strips the extension and replaces characters filenames do not allow', () => {
    expect(csvFilename('My: Book?.epub')).toBe('My- Book--word-frequencies.csv');
    expect(csvFilename('a\\b/c*d"e<f>g|h.txt')).toBe('a-b-c-d-e-f-g-h-word-frequencies.csv');
  });

  it('keeps names without an extension and strips only the last one', () => {
    expect(csvFilename('known-counts.txt')).toBe('known-counts-word-frequencies.csv');
    expect(csvFilename('notes')).toBe('notes-word-frequencies.csv');
    expect(csvFilename('vol.2.epub')).toBe('vol.2-word-frequencies.csv');
  });

  it('falls back to "book" when nothing is left of the name', () => {
    expect(csvFilename('.txt')).toBe('book-word-frequencies.csv');
  });
});
