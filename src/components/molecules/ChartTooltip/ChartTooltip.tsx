import { Tooltip } from '../../atoms/Tooltip';
import type { TooltipPosition } from '../../../hooks/useWordTooltip';
import { formatCount, formatPercent } from '../../../lib/selectView';
import type { WordEntry } from '../../../lib/types';
import styles from './ChartTooltip.module.scss';

export interface ChartTooltipProps {
  id: string;
  /** The word to describe; `null` closes the tooltip. */
  entry: WordEntry | null;
  position: TooltipPosition;
  onDismiss: () => void;
}

/** Word, count, rank, and percent for a chart mark (FR-015). */
export function ChartTooltip({ id, entry, position, onDismiss }: ChartTooltipProps) {
  return (
    <Tooltip id={id} open={entry !== null} x={position.x} y={position.y} onDismiss={onDismiss}>
      {entry && (
        <>
          <strong className={styles.word}>{entry.word}</strong>
          <span>{`Count: ${formatCount(entry.count)}`}</span>
          <span>{`Rank: #${formatCount(entry.rank)}`}</span>
          <span>{`${formatPercent(entry.percent)}% of words`}</span>
        </>
      )}
    </Tooltip>
  );
}
