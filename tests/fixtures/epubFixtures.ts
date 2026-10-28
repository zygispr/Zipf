// Pure EPUB builders shared by build-fixtures.ts and the tests. No Node APIs here.
import { strToU8, zipSync, type Zippable } from 'fflate';

export interface EpubItem {
  id: string;
  /** Path relative to the OPF folder (OEBPS/). Written URL-encoded into the manifest. */
  href: string;
  mediaType: string;
  content: string | Uint8Array;
  inSpine?: boolean;
  properties?: string;
}

export interface EpubSpec {
  items: EpubItem[];
  /** Defaults to the ids of `inSpine` items, in order. */
  spineIdrefs?: string[];
  encryptionXml?: string;
  includeContainer?: boolean;
}

// Local-time constructor, so the DOS timestamps in the zip are the same in every time zone.
const FIXED_MTIME = new Date(2026, 0, 1);

/** Words that appear only outside the spine text. None of them may ever be counted. */
export const NON_TEXT_MARKERS = [
  'zzmetadata',
  'zzauthor',
  'zznavigation',
  'zzcss',
  'zzheadtitle',
  'zzstyle',
  'zzscript',
  'zzbodyscript',
  'zzcomment',
];

export function buildEpub({
  items,
  spineIdrefs,
  encryptionXml,
  includeContainer = true,
}: EpubSpec): Uint8Array {
  const spine = spineIdrefs ?? items.filter((item) => item.inSpine).map((item) => item.id);
  const manifest = items
    .map((item) => {
      const properties = item.properties ? ` properties="${item.properties}"` : '';
      return `    <item id="${item.id}" href="${encodeURI(item.href)}" media-type="${item.mediaType}"${properties}/>`;
    })
    .join('\n');
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:7f1c9a52-6d1e-4c1a-9a3e-0f6d2b9e4c11</dc:identifier>
    <dc:title>Zzmetadata Title</dc:title>
    <dc:creator>Zzauthor</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
${manifest}
  </manifest>
  <spine>
${spine.map((idref) => `    <itemref idref="${idref}"/>`).join('\n')}
  </spine>
</package>
`;
  const files: Zippable = {
    // Must be the first entry and stored uncompressed (EPUB OCF).
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
  };
  if (includeContainer) {
    files['META-INF/container.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`);
  }
  if (encryptionXml) {
    files['META-INF/encryption.xml'] = strToU8(encryptionXml);
  }
  files['OEBPS/content.opf'] = strToU8(opf);
  for (const item of items) {
    files[`OEBPS/${item.href}`] =
      typeof item.content === 'string' ? strToU8(item.content) : item.content;
  }
  return zipSync(files, { level: 9, mtime: FIXED_MTIME });
}

export function chapterXhtml(bodyHtml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Zzheadtitle</title>
  <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
  <style>p { zzstyle: 1; }</style>
  <script>var zzscript = 1;</script>
</head>
<body>
<!-- zzcomment -->
<section>
${bodyHtml}
</section>
<script><![CDATA[ zzbodyscript(1 < 2); ]]></script>
</body>
</html>
`;
}

/** Turns plain text into XHTML paragraphs, encoding some characters as entities on purpose. */
export function textToXhtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim() !== '')
    .map((paragraph) => {
      const html = paragraph
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('’', '&#8217;')
        .replaceAll('—', '&mdash;')
        .replaceAll(', and ', ',&nbsp;and ')
        .replaceAll('Welcome', '&#x57;elcome')
        .replaceAll('\n', ' ');
      return `<p>${html}</p>`;
    })
    .join('\n');
}

/** The known-counts text split across two spine chapters, plus nav, CSS, and metadata. */
export function knownCountsEpubItems(text: string): EpubItem[] {
  const paragraphs = text.split(/\n{2,}/);
  const middle = Math.ceil(paragraphs.length / 2);
  const first = paragraphs.slice(0, middle).join('\n\n');
  const second = paragraphs.slice(middle).join('\n\n');
  return [
    {
      id: 'nav',
      href: 'nav.xhtml',
      mediaType: 'application/xhtml+xml',
      properties: 'nav',
      content: chapterXhtml(
        '<nav epub:type="toc"><ol><li><a href="Text/chapter%201.xhtml">Zznavigation</a></li></ol></nav>',
      ),
    },
    {
      id: 'css',
      href: 'Styles/style.css',
      mediaType: 'text/css',
      content: 'body { font-family: zzcss, serif; }\n',
    },
    {
      // A space in the file name checks that manifest hrefs are URL-decoded.
      id: 'chapter1',
      href: 'Text/chapter 1.xhtml',
      mediaType: 'application/xhtml+xml',
      inSpine: true,
      content: chapterXhtml(textToXhtmlParagraphs(first)),
    },
    {
      id: 'chapter2',
      href: 'Text/chapter2.xhtml',
      mediaType: 'application/xhtml+xml',
      inSpine: true,
      content: chapterXhtml(textToXhtmlParagraphs(second)),
    },
  ];
}

export function encryptionXml(entries: { uri: string; algorithm: string }[]): string {
  const data = entries
    .map(
      ({ uri, algorithm }) => `  <enc:EncryptedData>
    <enc:EncryptionMethod Algorithm="${algorithm}"/>
    <enc:CipherData><enc:CipherReference URI="${uri}"/></enc:CipherData>
  </enc:EncryptedData>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#">
${data}
</encryption>
`;
}

export const AES_128_CBC = 'http://www.w3.org/2001/04/xmlenc#aes128-cbc';
export const IDPF_FONT_OBFUSCATION = 'http://www.idpf.org/2008/embedding';

/** A valid EPUB whose single chapter is `bytes` long, made of repeated `<p>a</p>`. */
export function zipBombEpub(bytes: number): Uint8Array {
  const head = strToU8(`${chapterXhtml('').split('<section>')[0] ?? ''}<section>`);
  const tail = strToU8('</section></body></html>\n');
  const pattern = strToU8('<p>a</p>');
  const chapter = new Uint8Array(bytes);
  chapter.set(head, 0);
  let filled = head.length;
  const bodyEnd = bytes - tail.length;
  // Fill by doubling, then trim to a whole number of patterns.
  chapter.set(pattern, filled);
  let written = pattern.length;
  while (filled + written * 2 <= bodyEnd) {
    chapter.copyWithin(filled + written, filled, filled + written);
    written *= 2;
  }
  filled += written;
  while (filled + pattern.length <= bodyEnd) {
    chapter.set(pattern, filled);
    filled += pattern.length;
  }
  chapter.fill(0x20, filled, bodyEnd);
  chapter.set(tail, bodyEnd);
  return buildEpub({
    items: [
      {
        id: 'chapter1',
        href: 'Text/chapter1.xhtml',
        mediaType: 'application/xhtml+xml',
        inSpine: true,
        content: chapter,
      },
    ],
  });
}
