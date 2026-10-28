import { motion } from 'motion/react';
import { memo, useId, useRef } from 'react';
import { Spinner } from '../../atoms/Spinner';
import { Text } from '../../atoms/Text';
import { ChartTooltip } from '../../molecules/ChartTooltip';
import { useElementWidth } from '../../../hooks/useElementWidth';
import { useWordCloudLayout } from '../../../hooks/useWordCloudLayout';
import { useWordTooltip } from '../../../hooks/useWordTooltip';
import { chartColor } from '../../../lib/chartColors';
import { formatCount } from '../../../lib/selectView';
import type { WordEntry } from '../../../lib/types';
import { WORD_CLOUD_FONT_FAMILY, WORD_CLOUD_FONT_WEIGHT } from '../../../lib/wordCloudLayout';
import chartStyles from '../../../styles/chart.module.css';
import styles from './WordCloud.module.css';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface WordCloudProps {
  /** The top words (at most 100 are laid out). */
  entries: WordEntry[];
  tableId: string;
}

/** Word size from √count (FR-014); the layout is computed in a worker, off the main thread. */
export const WordCloud = memo(function WordCloud({ entries, tableId }: WordCloudProps) {
  // Measured on the figure, not the tooltip container, because the tooltip needs the word count,
  // which depends on the width.
  const figureRef = useRef<HTMLElement | null>(null);
  const width = useElementWidth(figureRef, 640);
  const height = Math.round(Math.min(440, Math.max(280, width * 0.62)));
  const { words, failed } = useWordCloudLayout(entries, { width, height });
  const tooltip = useWordTooltip(words?.length ?? 0);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();

  // The SVG (with its title) renders at once and reserves the cloud's height; the spinner covers it
  // until the first layout is ready. Later layouts (e.g. after a resize) replace the previous one.
  const activeEntry = words?.find((word) => word.word === tooltip.activeWord) ?? null;

  return (
    <figure ref={figureRef} className={chartStyles.figure}>
      <div ref={tooltip.containerRef} className={chartStyles.canvas}>
        <svg
          role="group"
          aria-labelledby={titleId}
          aria-describedby={descId}
          viewBox={`${String(-width / 2)} ${String(-height / 2)} ${String(width)} ${String(height)}`}
          className={chartStyles.svg}
          onKeyDown={tooltip.onChartKeyDown}
        >
          <title id={titleId}>{`Word cloud of the top ${String(entries.length)} words`}</title>
          <desc id={descId}>
            {`Larger words appear more often. The largest is “${entries[0]?.word ?? ''}”.`}
          </desc>
          {words?.map((word, index) => (
            <g
              key={word.word}
              transform={`translate(${String(word.x)},${String(word.y)}) rotate(${String(word.rotate)})`}
            >
              <motion.text
                role="img"
                aria-label={`${word.word}: ${formatCount(word.count)} times`}
                className={styles.word}
                {...tooltip.getWordProps(word.word, index)}
                textAnchor="middle"
                fontSize={word.size}
                fontFamily={WORD_CLOUD_FONT_FAMILY}
                fontWeight={WORD_CLOUD_FONT_WEIGHT}
                style={{ fill: chartColor(index) }}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 200, damping: 20, delay: index * 0.02 }
                }
              >
                {word.word}
              </motion.text>
            </g>
          ))}
        </svg>
        {!words && !failed && (
          <div className={chartStyles.loading}>
            <Spinner label="Arranging words" />
          </div>
        )}
        {failed && (
          <div role="alert" className={chartStyles.loading}>
            <Text>
              The word cloud couldn&apos;t be drawn in this browser. The bar chart and the table
              show the same words.
            </Text>
          </div>
        )}
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
