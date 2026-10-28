// CSV export (FR-022). The format is a public contract: specs/001-book-word-frequency/contracts/csv-export.md.
import type { WordEntry } from './types';

/** Makes Excel read the file as UTF-8, so words like "café" and "мир" survive. */
const BOM = '﻿';
const CRLF = '\r\n';
const HEADER = 'rank,word,count,percent';

/** RFC 4180: quote a field that holds `"`, `,`, CR, or LF, doubling any `"` inside it. */
function quoteField(field: string): string {
  return /[",\r\n]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

/**
 * The full ranked list for the current filter, one row per entry. Words always start with a
 * letter (research R5), so no cell can start a spreadsheet formula.
 */
export function toCsv(entries: readonly WordEntry[]): string {
  const rows = entries.map(
    ({ rank, word, count, percent }) =>
      `${String(rank)},${quoteField(word)},${String(count)},${percent.toFixed(4)}`,
  );
  return BOM + [HEADER, ...rows].join(CRLF) + CRLF;
}

/** Characters that Windows, macOS, or Linux don't allow in filenames. */
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export function csvFilename(bookName: string): string {
  const base = bookName.replace(/\.[^.]*$/, '').replace(UNSAFE_FILENAME_CHARS, '-');
  return `${base || 'book'}-word-frequencies.csv`;
}
