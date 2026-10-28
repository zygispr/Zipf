// Writes the binary and tiny text fixtures in tests/fixtures/. The output is deterministic, and the
// generated files are committed. Re-run after changing known-counts.txt or epubFixtures.ts:
//
//   node tests/fixtures/build-fixtures.ts
//
// (Node 24 strips TypeScript types natively; `npx tsx tests/fixtures/build-fixtures.ts` also works.)
import { readFileSync, writeFileSync } from 'node:fs';
import {
  AES_128_CBC,
  IDPF_FONT_OBFUSCATION,
  buildEpub,
  encryptionXml,
  knownCountsEpubItems,
  zipBombEpub,
} from './epubFixtures.ts';

const dir = new URL('./', import.meta.url);
const write = (name: string, data: Uint8Array | string) => {
  writeFileSync(new URL(name, dir), data);
  console.log(
    `wrote ${name} (${String(data.length)} ${typeof data === 'string' ? 'chars' : 'bytes'})`,
  );
};

const knownText = readFileSync(new URL('known-counts.txt', dir), 'utf8');
const items = knownCountsEpubItems(knownText);
const knownEpub = buildEpub({ items });

write('known-counts.epub', knownEpub);
write(
  'drm.epub',
  buildEpub({
    items,
    encryptionXml: encryptionXml([{ uri: 'OEBPS/Text/chapter2.xhtml', algorithm: AES_128_CBC }]),
  }),
);
write(
  'font-obfuscated.epub',
  buildEpub({
    items: [
      ...items,
      {
        id: 'font',
        href: 'Fonts/font.otf',
        mediaType: 'font/otf',
        content: new Uint8Array(256).map((_, i) => (i * 37) % 256),
      },
    ],
    encryptionXml: encryptionXml([
      { uri: 'OEBPS/Fonts/font.otf', algorithm: IDPF_FONT_OBFUSCATION },
    ]),
  }),
);
write('corrupted.epub', knownEpub.slice(0, 200));
// 210 MB uncompressed, over the 200 MB MAX_UNCOMPRESSED_BYTES guard (research R4).
write('zip-bomb.epub', zipBombEpub(210 * 1024 * 1024));
// 0-byte files are rejected by validateFile, so "empty" is a single newline.
write('empty.txt', '\n');
write('numbers-only.txt', '1 2 3 1984 42\n');
