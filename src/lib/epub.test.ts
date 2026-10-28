import { describe, expect, it } from 'vitest';
import {
  AES_128_CBC,
  IDPF_FONT_OBFUSCATION,
  NON_TEXT_MARKERS,
  buildEpub,
  chapterXhtml,
  encryptionXml,
  knownCountsEpubItems,
} from '../../tests/fixtures/epubFixtures';
import { readFixture, readFixtureText } from '../../tests/fixtures/readFixture';
import { EpubError, assertUncompressedSizeWithin, extractEpubText } from './epub';
import { tokenize } from './tokenize';
import { MAX_UNCOMPRESSED_BYTES } from './types';

const knownText = readFixtureText('known-counts.txt');
const knownItems = knownCountsEpubItems(knownText);

function epubErrorCode(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof EpubError) return error.code;
    throw error;
  }
  return undefined;
}

describe('extractEpubText', () => {
  it('returns the spine chapters in reading order, with the same words as the .txt', () => {
    const text = extractEpubText(readFixture('known-counts.epub'));
    expect(tokenize(text)).toEqual(tokenize(knownText));
  });

  it('excludes OPF metadata, nav, CSS, head, scripts, styles, and comments', () => {
    const words = new Set(tokenize(extractEpubText(readFixture('known-counts.epub'))));
    for (const marker of NON_TEXT_MARKERS) {
      expect(words.has(marker)).toBe(false);
    }
  });

  it('rejects DRM-encrypted books as protected', () => {
    expect(epubErrorCode(() => extractEpubText(readFixture('drm.epub')))).toBe('protected');
  });

  it('reads books whose only encryption is font obfuscation', () => {
    const text = extractEpubText(readFixture('font-obfuscated.epub'));
    expect(tokenize(text)).toEqual(tokenize(knownText));
  });

  it('allows Adobe font obfuscation too', () => {
    const bytes = buildEpub({
      items: knownItems,
      encryptionXml: encryptionXml([
        { uri: 'OEBPS/Fonts/a.otf', algorithm: 'http://ns.adobe.com/pdf/enc#RC' },
      ]),
    });
    expect(tokenize(extractEpubText(bytes))).toEqual(tokenize(knownText));
  });

  it('is protected when any resource uses real encryption, even next to font obfuscation', () => {
    const bytes = buildEpub({
      items: knownItems,
      encryptionXml: encryptionXml([
        { uri: 'OEBPS/Fonts/a.otf', algorithm: IDPF_FONT_OBFUSCATION },
        { uri: 'OEBPS/Text/chapter2.xhtml', algorithm: AES_128_CBC },
      ]),
    });
    expect(epubErrorCode(() => extractEpubText(bytes))).toBe('protected');
  });

  it('rejects a truncated zip as corrupted', () => {
    expect(epubErrorCode(() => extractEpubText(readFixture('corrupted.epub')))).toBe('corrupted');
  });

  it('rejects bytes that are not a zip as corrupted', () => {
    expect(epubErrorCode(() => extractEpubText(new TextEncoder().encode('just text')))).toBe(
      'corrupted',
    );
  });

  it('rejects a zip without META-INF/container.xml as corrupted', () => {
    const bytes = buildEpub({ items: knownItems, includeContainer: false });
    expect(epubErrorCode(() => extractEpubText(bytes))).toBe('corrupted');
  });

  it('rejects an OPF whose spine refers to a missing manifest item as corrupted', () => {
    const bytes = buildEpub({ items: knownItems, spineIdrefs: ['chapter1', 'missing'] });
    expect(epubErrorCode(() => extractEpubText(bytes))).toBe('corrupted');
  });

  it('rejects the zip bomb as corrupted before decompressing it', () => {
    const bytes = readFixture('zip-bomb.epub');
    const started = performance.now();
    expect(epubErrorCode(() => extractEpubText(bytes))).toBe('corrupted');
    expect(performance.now() - started).toBeLessThan(500);
  });

  it('skips spine items that are not XHTML or HTML', () => {
    const bytes = buildEpub({
      items: [
        ...knownItems,
        {
          id: 'cover',
          href: 'Images/cover.svg',
          mediaType: 'image/svg+xml',
          inSpine: true,
          content: '<svg xmlns="http://www.w3.org/2000/svg"><text>zzsvgword</text></svg>',
        },
        {
          id: 'legacy',
          href: 'Text/legacy.html',
          mediaType: 'text/html',
          inSpine: true,
          content: chapterXhtml('<p>zzhtmlword</p>'),
        },
      ],
    });
    const words = tokenize(extractEpubText(bytes));
    expect(words).not.toContain('zzsvgword');
    expect(words.at(-1)).toBe('zzhtmlword');
  });
});

describe('assertUncompressedSizeWithin', () => {
  it('passes when the declared total is exactly at the limit', () => {
    expect(() => {
      assertUncompressedSizeWithin([{ originalSize: 60 }, { originalSize: 40 }], 100);
    }).not.toThrow();
  });

  it('throws corrupted when the declared total is one byte over the limit', () => {
    expect(
      epubErrorCode(() => {
        assertUncompressedSizeWithin([{ originalSize: 60 }, { originalSize: 41 }], 100);
      }),
    ).toBe('corrupted');
  });

  it('uses a 200 MB limit for books', () => {
    expect(MAX_UNCOMPRESSED_BYTES).toBe(200 * 1024 * 1024);
  });
});
