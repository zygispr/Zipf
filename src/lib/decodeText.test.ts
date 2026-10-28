import { describe, expect, it } from 'vitest';
import { decodeText } from './decodeText';

const utf8 = (text: string) => new TextEncoder().encode(text);

function utf16(text: string, littleEndian: boolean): Uint8Array {
  const bytes = new Uint8Array(2 + text.length * 2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0xfeff, littleEndian);
  for (let i = 0; i < text.length; i++) view.setUint16(2 + i * 2, text.charCodeAt(i), littleEndian);
  return bytes;
}

describe('decodeText', () => {
  it('decodes UTF-8 without a BOM', () => {
    expect(decodeText(utf8('café мир'))).toBe('café мир');
  });

  it('decodes UTF-8 and strips the BOM', () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('Hello')]))).toBe('Hello');
  });

  it('detects UTF-16 LE from its BOM', () => {
    expect(decodeText(utf16('Hello café', true))).toBe('Hello café');
  });

  it('detects UTF-16 BE from its BOM', () => {
    expect(decodeText(utf16('Hello café', false))).toBe('Hello café');
  });

  it('falls back to windows-1252 for invalid UTF-8', () => {
    expect(decodeText(new Uint8Array([0x63, 0x61, 0x66, 0xe9]))).toBe('café');
    expect(decodeText(new Uint8Array([0x64, 0x6f, 0x6e, 0x92, 0x74]))).toBe('don’t');
  });

  it('decodes empty input to an empty string', () => {
    expect(decodeText(new Uint8Array())).toBe('');
  });
});
