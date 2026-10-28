import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES } from './types';
import { validateFile } from './validateFile';

describe('validateFile', () => {
  it.each([
    ['book.txt', 'txt'],
    ['BOOK.TXT', 'txt'],
    ['novel.epub', 'epub'],
    ['Novel.EPUB', 'epub'],
    ['my.book.v2.txt', 'txt'],
  ])('accepts %s as %s', (name, format) => {
    expect(validateFile({ name, size: 100 })).toEqual({ ok: true, format });
  });

  it.each(['book.pdf', 'book.docx', 'book', 'txt', 'book.txt.zip'])(
    'rejects %s as unsupported',
    (name) => {
      expect(validateFile({ name, size: 100 })).toEqual({ ok: false, code: 'unsupported' });
    },
  );

  it('accepts exactly 50 MB', () => {
    expect(validateFile({ name: 'a.txt', size: 52_428_800 })).toEqual({ ok: true, format: 'txt' });
    expect(MAX_FILE_BYTES).toBe(52_428_800);
  });

  it('rejects one byte over 50 MB as too large', () => {
    expect(validateFile({ name: 'a.txt', size: 52_428_801 })).toEqual({
      ok: false,
      code: 'too-large',
    });
  });

  it('rejects a 0-byte file as empty', () => {
    expect(validateFile({ name: 'a.epub', size: 0 })).toEqual({ ok: false, code: 'empty' });
  });
});
