// Deterministic English-like prose with Zipf-distributed words, used by the benchmark and the
// speed e2e test in place of a committed 100k-word novel.

const VOCABULARY_SIZE = 5_000;

// The most frequent real English words come first, so the top ranks look like a real book.
const COMMON_WORDS = (
  'the of and to a in that it is was he for on are as with his they at be this from i have ' +
  'or by one had not but what all were when we there can an your which their said if do will ' +
  'each about how up out them then she many some so these would other into has more her two ' +
  'like him see time could no make than first been its who now people my made over did down ' +
  "only way find use may water long little very after words called just where most know don't " +
  "it's book story house night river light hand world place great old"
).split(' ');

const SYLLABLES = (
  'ba be bi bo bu ca ce ci co cu da de di do du fa fe fi fo fu ga ge gi go gu la le li lo lu ' +
  'ma me mi mo mu na ne ni no nu pa pe pi po pu ra re ri ro ru sa se si so su ta te ti to tu ' +
  'ver lan dor mis tor wen thal ber cor'
).split(' ');

function buildVocabulary(): string[] {
  const words = new Set(COMMON_WORDS);
  // Enumerate two- then three-syllable words in a fixed order until the vocabulary is full.
  outer: for (let length = 2; length <= 3; length++) {
    const indexes = new Array<number>(length).fill(0);
    for (;;) {
      words.add(indexes.map((i) => SYLLABLES[i] ?? '').join(''));
      if (words.size >= VOCABULARY_SIZE) break outer;
      let position = length - 1;
      while (position >= 0 && indexes[position] === SYLLABLES.length - 1) {
        indexes[position] = 0;
        position--;
      }
      if (position < 0) break;
      indexes[position] = (indexes[position] ?? 0) + 1;
    }
  }
  return [...words];
}

const VOCABULARY = buildVocabulary();

// Cumulative Zipf weights (1 / rank) for sampling by binary search.
const CUMULATIVE = VOCABULARY.reduce<number[]>((sums, _, index) => {
  sums.push((sums[index - 1] ?? 0) + 1 / (index + 1));
  return sums;
}, []);
const TOTAL_WEIGHT = CUMULATIVE[CUMULATIVE.length - 1] ?? 1;

/** mulberry32: a small, fast, seeded PRNG returning floats in [0, 1). */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function sampleWord(random: () => number): string {
  const target = random() * TOTAL_WEIGHT;
  let low = 0;
  let high = CUMULATIVE.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((CUMULATIVE[middle] ?? 0) < target) low = middle + 1;
    else high = middle;
  }
  return VOCABULARY[low] ?? 'the';
}

/** Exactly `wordCount` words of seeded prose: sentences, commas, and paragraph breaks. */
export function generateZipfText(wordCount: number, seed = 42): string {
  const random = createRandom(seed);
  const parts: string[] = [];
  let written = 0;
  let sentencesInParagraph = 0;
  while (written < wordCount) {
    const sentenceLength = Math.min(5 + Math.floor(random() * 16), wordCount - written);
    for (let i = 0; i < sentenceLength; i++) {
      let word = sampleWord(random);
      if (i === 0) word = word.charAt(0).toUpperCase() + word.slice(1);
      const isLast = i === sentenceLength - 1;
      const comma = !isLast && random() < 0.08 ? ',' : '';
      parts.push(isLast ? `${word}.` : `${word}${comma} `);
    }
    written += sentenceLength;
    sentencesInParagraph++;
    if (sentencesInParagraph >= 4 + Math.floor(random() * 4)) {
      parts.push('\n\n');
      sentencesInParagraph = 0;
    } else {
      parts.push(' ');
    }
  }
  return parts.join('');
}
