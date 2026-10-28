// EPUB text extraction (research R4): container → OPF → spine, with DRM and zip-bomb guards.
import { unzipSync, type UnzipFileInfo } from 'fflate';
import { decodeText } from './decodeText';
import { MAX_UNCOMPRESSED_BYTES } from './types';
import { decodeEntities, xhtmlToText } from './xhtmlToText';

export class EpubError extends Error {
  readonly code: 'corrupted' | 'protected';

  constructor(code: 'corrupted' | 'protected', message: string) {
    super(message);
    this.name = 'EpubError';
    this.code = code;
  }
}

/** Encryption that only obfuscates fonts; the text is still readable. */
const FONT_OBFUSCATION_ALGORITHMS = new Set([
  'http://www.idpf.org/2008/embedding',
  'http://ns.adobe.com/pdf/enc#RC',
]);

const TEXT_MEDIA_TYPES = new Set(['application/xhtml+xml', 'text/html']);

/** Entries that are never read, so they are never decompressed. */
const SKIPPED_ENTRY =
  /\.(?:png|jpe?g|gif|webp|bmp|svg|ico|ttf|otf|woff2?|mp3|m4a|mp4|aac|ogg|oga|wav|webm|css|js)$/i;

/** Zip-bomb guard: throws once the declared uncompressed sizes add up to more than `limit`. */
export function assertUncompressedSizeWithin(
  entries: Iterable<Pick<UnzipFileInfo, 'originalSize'>>,
  limit: number,
): void {
  let total = 0;
  for (const entry of entries) {
    total += entry.originalSize;
    if (total > limit) {
      throw new EpubError('corrupted', `Declared uncompressed size exceeds ${String(limit)} bytes`);
    }
  }
}

function unzip(bytes: Uint8Array): Record<string, Uint8Array> {
  try {
    // First pass reads only the central directory: the filter rejects every entry, so nothing is
    // inflated until the declared sizes have been checked.
    const entries: UnzipFileInfo[] = [];
    unzipSync(bytes, {
      filter: (entry) => {
        entries.push(entry);
        return false;
      },
    });
    assertUncompressedSizeWithin(entries, MAX_UNCOMPRESSED_BYTES);
    return unzipSync(bytes, { filter: (entry) => !SKIPPED_ENTRY.test(entry.name) });
  } catch (error) {
    if (error instanceof EpubError) throw error;
    throw new EpubError('corrupted', 'Not a readable zip archive');
  }
}

/** Reads one attribute from a single start tag (attribute names must match exactly). */
function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 's').exec(tag);
  return match?.[2] === undefined ? undefined : decodeEntities(match[2]);
}

/** All start tags of `element`, with or without a namespace prefix. */
function startTags(xml: string, element: string): string[] {
  return xml.match(new RegExp(`<(?:[\\w-]+:)?${element}\\b[^>]*>`, 'g')) ?? [];
}

function readText(files: Record<string, Uint8Array>, path: string): string {
  const file = files[path];
  if (!file) throw new EpubError('corrupted', `Missing ${path}`);
  return decodeText(file);
}

function assertNotProtected(files: Record<string, Uint8Array>): void {
  if (!files['META-INF/encryption.xml']) return;
  const encryption = readText(files, 'META-INF/encryption.xml');
  for (const tag of startTags(encryption, 'EncryptionMethod')) {
    const algorithm = attribute(tag, 'Algorithm');
    if (algorithm === undefined || !FONT_OBFUSCATION_ALGORITHMS.has(algorithm)) {
      throw new EpubError('protected', 'The book is DRM-encrypted');
    }
  }
}

/** Resolves an href against a base folder and removes `.` and `..` segments. */
function resolvePath(baseFolder: string, href: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(href.split('#')[0] ?? '');
  } catch {
    throw new EpubError('corrupted', `Invalid href ${href}`);
  }
  const segments: string[] = [];
  for (const segment of `${baseFolder}${decoded}`.split('/')) {
    if (segment === '..') segments.pop();
    else if (segment !== '.' && segment !== '') segments.push(segment);
  }
  return segments.join('/');
}

export function extractEpubText(bytes: Uint8Array): string {
  const files = unzip(bytes);
  assertNotProtected(files);

  const container = readText(files, 'META-INF/container.xml');
  const rootfile = startTags(container, 'rootfile')[0];
  const opfPath = rootfile && attribute(rootfile, 'full-path');
  if (!opfPath) throw new EpubError('corrupted', 'container.xml has no rootfile');

  const opf = readText(files, opfPath);
  const opfFolder = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const manifest = new Map<string, { path: string; mediaType: string }>();
  for (const tag of startTags(opf, 'item')) {
    const id = attribute(tag, 'id');
    const href = attribute(tag, 'href');
    if (id !== undefined && href !== undefined) {
      manifest.set(id, {
        path: resolvePath(opfFolder, href),
        mediaType: attribute(tag, 'media-type') ?? '',
      });
    }
  }

  const spine = /<(?:[\w-]+:)?spine\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?spine\s*>/.exec(opf)?.[1];
  if (spine === undefined) throw new EpubError('corrupted', 'OPF has no spine');

  const chapters: string[] = [];
  for (const tag of startTags(spine, 'itemref')) {
    const idref = attribute(tag, 'idref') ?? '';
    const item = manifest.get(idref);
    if (!item) throw new EpubError('corrupted', `Spine item ${idref} is not in the manifest`);
    if (!TEXT_MEDIA_TYPES.has(item.mediaType)) continue;
    chapters.push(xhtmlToText(readText(files, item.path)));
  }
  return chapters.join('\n');
}
