// XHTML → plain text for EPUB chapters (research R4). DOMParser is not available in workers.

// HTML named entities 160–255 (Latin-1), in code-point order.
const LATIN1_NAMES = (
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn ' +
  'sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave ' +
  'Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ' +
  'ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN ' +
  'szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute ' +
  'icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml ' +
  'yacute thorn yuml'
).split(' ');

const NAMED_ENTITIES = new Map<string, string>([
  ...LATIN1_NAMES.map((name, index): [string, string] => [name, String.fromCodePoint(160 + index)]),
  ...Object.entries({
    quot: 34,
    amp: 38,
    apos: 39,
    lt: 60,
    gt: 62,
    OElig: 338,
    oelig: 339,
    Scaron: 352,
    scaron: 353,
    Yuml: 376,
    fnof: 402,
    circ: 710,
    tilde: 732,
    ensp: 8194,
    emsp: 8195,
    thinsp: 8201,
    zwnj: 8204,
    zwj: 8205,
    lrm: 8206,
    rlm: 8207,
    ndash: 8211,
    mdash: 8212,
    lsquo: 8216,
    rsquo: 8217,
    sbquo: 8218,
    ldquo: 8220,
    rdquo: 8221,
    bdquo: 8222,
    dagger: 8224,
    Dagger: 8225,
    bull: 8226,
    hellip: 8230,
    permil: 8240,
    prime: 8242,
    Prime: 8243,
    lsaquo: 8249,
    rsaquo: 8250,
    oline: 8254,
    euro: 8364,
    trade: 8482,
  }).map(([name, codePoint]): [string, string] => [name, String.fromCodePoint(codePoint)]),
]);

const ENTITY_PATTERN = /&(?:#[xX]([0-9a-fA-F]+)|#([0-9]+)|([A-Za-z][A-Za-z0-9]*));/g;

function fromCodePoint(codePoint: number): string {
  const valid =
    codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff);
  return valid ? String.fromCodePoint(codePoint) : '�';
}

/** Decodes named, decimal, and hex entities. Unknown names become a space, never a word. */
export function decodeEntities(text: string): string {
  return text.replace(ENTITY_PATTERN, (_, hex?: string, decimal?: string, name?: string) => {
    if (hex !== undefined) return fromCodePoint(parseInt(hex, 16));
    if (decimal !== undefined) return fromCodePoint(parseInt(decimal, 10));
    return NAMED_ENTITIES.get(name ?? '') ?? ' ';
  });
}

/** Elements whose contents are never book text, in either `<x>…</x>` or `<x/>` form. */
const NON_TEXT_ELEMENTS = /<(head|script|style)\b[^>]*?(?:\/>|>[\s\S]*?<\/\1\s*>)/gi;

export function xhtmlToText(xhtml: string): string {
  const withoutNonText = xhtml
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(NON_TEXT_ELEMENTS, ' ')
    // CDATA is literal text: escape it so the tag stripping below can't eat it.
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, data: string) =>
      data.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    )
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(withoutNonText);
}
