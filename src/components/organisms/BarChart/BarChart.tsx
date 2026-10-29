import { motion, type Transition } from 'motion/react';
import { scaleLinear } from 'd3-scale';
import { memo, useId } from 'react';
import { ChartTooltip } from '../../molecules/ChartTooltip';
import { useElementWidth } from '../../../hooks/useElementWidth';
import { useWordTooltip } from '../../../hooks/useWordTooltip';
import { chartColor } from '../../../lib/chartColors';
import { formatCount } from '../../../lib/selectView';
import type { WordEntry } from '../../../lib/types';
import chartStyles from '../../../styles/chart.module.scss';
import styles from './BarChart.module.css';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

/** Each row is the bar's hit area, so it is at least 24 px tall (WCAG 2.2 target size). */
const ROW_HEIGHT = 24;
const BAR_HEIGHT = 18;
const PADDING = 8;
const VALUE_WIDTH = 56;
const MAX_LABEL_LENGTH = 16;

const shorten = (word: string) =>
  word.length > MAX_LABEL_LENGTH ? `${word.slice(0, MAX_LABEL_LENGTH - 1)}…` : word;

export interface BarChartProps {
  /** The top words, most frequent first. */
  entries: WordEntry[];
  /** Id of the word table, for the "View as table" link. */
  tableId: string;
}

/** Horizontal bars for the top words (FR-013), with animated growth and reordering. */
export const BarChart = memo(function BarChart({ entries, tableId }: BarChartProps) {
  const tooltip = useWordTooltip(entries.length);
  const width = useElementWidth(tooltip.containerRef, 640);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();

  const labelWidth = Math.round(Math.min(160, Math.max(72, width * 0.28)));
  const x = scaleLinear()
    .domain([0, entries[0]?.count ?? 1])
    .range([0, Math.max(0, width - labelWidth - VALUE_WIDTH - PADDING)]);
  const height = entries.length * ROW_HEIGHT + PADDING * 2;
  const top = entries[0];
  const activeEntry = entries.find((entry) => entry.word === tooltip.activeWord) ?? null;

  return (
    <figure className={chartStyles.figure}>
      <div ref={tooltip.containerRef} className={chartStyles.canvas}>
        <svg
          role="group"
          aria-labelledby={titleId}
          aria-describedby={descId}
          viewBox={`0 0 ${String(width)} ${String(height)}`}
          className={chartStyles.svg}
          onKeyDown={tooltip.onChartKeyDown}
        >
          <title id={titleId}>{`Bar chart of the top ${String(entries.length)} words`}</title>
          <desc id={descId}>
            {top
              ? `The most frequent word is “${top.word}”, used ${formatCount(top.count)} times.`
              : 'There are no words to show.'}
          </desc>
          {entries.map((entry, index) => {
            const y = PADDING + index * ROW_HEIGHT;
            const barWidth = x(entry.count);
            const transition: Transition = reduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 170, damping: 24, delay: index * 0.025 };
            return (
              <motion.g
                key={entry.word}
                role="img"
                aria-label={`${entry.word}: ${formatCount(entry.count)} times`}
                className={styles.mark}
                {...tooltip.getWordProps(entry.word, index)}
                initial={reduceMotion ? false : { opacity: 0, y }}
                animate={{ opacity: 1, y }}
                transition={transition}
              >
                <rect className={styles.hit} width={width} height={ROW_HEIGHT} rx={6} />
                <text
                  className={styles.label}
                  x={labelWidth - 8}
                  y={ROW_HEIGHT / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  {shorten(entry.word)}
                </text>
                <motion.rect
                  data-bar
                  x={labelWidth}
                  y={(ROW_HEIGHT - BAR_HEIGHT) / 2}
                  height={BAR_HEIGHT}
                  rx={5}
                  style={{ fill: chartColor(index) }}
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: barWidth }}
                  transition={transition}
                />
                <motion.text
                  className={styles.value}
                  x={labelWidth + 6}
                  y={ROW_HEIGHT / 2}
                  dominantBaseline="central"
                  initial={reduceMotion ? false : { x: 0 }}
                  animate={{ x: barWidth }}
                  transition={transition}
                >
                  {formatCount(entry.count)}
                </motion.text>
              </motion.g>
            );
          })}
        </svg>
        <ChartTooltip
          id={tooltip.tooltipId}
          entry={activeEntry}
          position={tooltip.position}
          onDismiss={tooltip.dismiss}
        />
      </div>
      <a href={`#${tableId}`} className={chartStyles.tableLink}>
        View as table
      </a>
    </figure>
  );
});
