// English stop words and the "is this English?" heuristic (research R6, FR-019).
// Words are stored normalized (see normalizeWord): lowercase, straight apostrophe only.

export const ENGLISH_STOP_WORDS: ReadonlySet<string> = new Set(
  (
    "a about above after again against all also am an and any are aren't as at be because been " +
    "before being below between both but by can can't cannot could couldn't did didn't do does " +
    "doesn't doing don't down during each few for from further had hadn't has hasn't have haven't " +
    "having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll " +
    "i'm i've if in into is isn't it it's its itself just let's may me might more most must mustn't " +
    'my myself no nor not of off on once only or other ought our ours ourselves out over own same ' +
    "shall shan't she she'd she'll she's should shouldn't so some such than that that's the their " +
    "theirs them themselves then there there's these they they'd they'll they're they've this those " +
    "through to too under until up upon us very was wasn't we we'd we'll we're we've were weren't " +
    "what what's when when's where where's which while who who's whom why why's will with won't " +
    "would wouldn't yet you you'd you'll you're you've your yours yourself yourselves"
  ).split(' '),
);

/** Typical English prose is 40–55% stop words; other languages fall well below 20%. */
const MIN_STOP_WORD_SHARE = 0.2;

export function isLikelyEnglish(
  entries: readonly (readonly [string, number])[],
  totalWords: number,
): boolean {
  if (totalWords <= 0) return false;
  let stopWordTokens = 0;
  for (const [word, count] of entries) {
    if (ENGLISH_STOP_WORDS.has(word)) stopWordTokens += count;
  }
  return stopWordTokens / totalWords >= MIN_STOP_WORD_SHARE;
}
