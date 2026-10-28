import { Text } from '../../atoms/Text';
import { StatCard } from '../../molecules/StatCard';
import { formatCount } from '../../../lib/selectView';
import styles from './SummaryStats.module.css';

export interface SummaryStatsProps {
  totalWords: number;
  distinctWords: number;
  /** The most frequent word and its count. */
  topEntry?: [word: string, count: number];
  /** Shown under the cards, e.g. to say they are book totals while words are hidden. */
  note?: string;
}

export function SummaryStats({ totalWords, distinctWords, topEntry, note }: SummaryStatsProps) {
  const topSubLabel =
    topEntry && `${formatCount(topEntry[1])} ${topEntry[1] === 1 ? 'time' : 'times'}`;
  return (
    <div className={styles.summary}>
      <div className={styles.stats}>
        <StatCard label="Total words" value={totalWords} tone="primary" />
        <StatCard label="Distinct words" value={distinctWords} tone="secondary" />
        <StatCard
          label="Most frequent word"
          value={topEntry?.[0] ?? '—'}
          subLabel={topSubLabel}
          tone="accent"
        />
      </div>
      {note && <Text variant="caption">{note}</Text>}
    </div>
  );
}
