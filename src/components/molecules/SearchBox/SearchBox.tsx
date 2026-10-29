import { useMemo, useState } from 'react';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import { TextInput } from '../../atoms/TextInput';
import { createWordIndex, findWord } from '../../../lib/findWord';
import { formatCount, formatPercent } from '../../../lib/selectView';
import { normalizeWord } from '../../../lib/tokenize';
import type { WordEntry } from '../../../lib/types';
import styles from './SearchBox.module.scss';

export interface SearchBoxProps {
  /** The current view's entries, so ranks match the table and charts. */
  entries: WordEntry[];
  /** Words in the book that are hidden from `entries`; searching one says so instead of "not found". */
  hiddenWords?: ReadonlySet<string>;
}

const NO_HIDDEN_WORDS: ReadonlySet<string> = new Set();

function describeResult(
  query: string,
  entry: WordEntry | null,
  hiddenWords: ReadonlySet<string>,
): string {
  if (!query) return '';
  if (!entry) {
    return hiddenWords.has(normalizeWord(query))
      ? `“${query}” is a common word, hidden while “Hide common words” is on`
      : `“${query}” doesn't appear in this book`;
  }
  const times = entry.count === 1 ? 'time' : 'times';
  return `${entry.word}: ${formatCount(entry.count)} ${times} · rank #${String(entry.rank)} · ${formatPercent(entry.percent)}%`;
}

/** Owns its query (research R14), so typing re-renders only this box, never the charts. */
export function SearchBox({ entries, hiddenWords = NO_HIDDEN_WORDS }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const index = useMemo(() => createWordIndex(entries), [entries]);
  const trimmed = query.trim();
  const message = describeResult(trimmed, findWord(index, trimmed), hiddenWords);

  return (
    <div role="search" className={styles.search}>
      <TextInput
        label="Find a word"
        type="search"
        autoComplete="off"
        spellCheck={false}
        leadingIcon={<Icon name="search" />}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      <div role="status" aria-live="polite" className={styles.result}>
        {message && <Text>{message}</Text>}
      </div>
    </div>
  );
}
