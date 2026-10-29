import { motion } from 'motion/react';
import { scaleLog } from 'd3-scale';
import { memo, useId } from 'react';
import { ChartTooltip } from '../../molecules/ChartTooltip';
import { useElementWidth } from '../../../hooks/useElementWidth';
import { useWordTooltip } from '../../../hooks/useWordTooltip';
import { formatCount, type ZipfPoint } from '../../../lib/selectView';
import type { WordEntry } from '../../../lib/types';
import chartStyles from '../../../styles/chart.module.scss';
import styles from './ZipfChart.module.css';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

const HEIGHT = 380;
const MARGIN = { top: 16, right: 20, bottom: 52, left: 64 };
/** Radius of each point's invisible hit area: 24×24 px (WCAG 2.2 target size). */
const HIT_RADIUS = 12;
const IDEAL_CURVE_SAMPLES = 120;

/** 1, 10, 100, … within the domain. */
function powersOfTen([min, max]: number[]): number[] {
  const ticks: number[] = [];
  for (let power = Math.ceil(Math.log10(min ?? 1)); 10 ** power <= (max ?? 1); power++) {
    ticks.push(10 ** power);
  }
  return ticks;
}

export interface ZipfChartProps {
  /** All entries, used to look up the word at each sampled rank. */
  entries: WordEntry[];
  points: ZipfPoint[];
  idealAt: (rank: number) => number;
  tableId: string;
}

/** Log–log rank vs. frequency, with the ideal Zipf curve for comparison (US2-5). */
export const ZipfChart = memo(function ZipfChart({
  entries,
  points,
  idealAt,
  tableId,
}: ZipfChartProps) {
  const tooltip = useWordTooltip(points.length);
  const width = useElementWidth(tooltip.containerRef, 640);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const clipId = `zipf-plot-${useId().replace(/[^\w-]/g, '')}`;

  const maxRank = points.at(-1)?.rank ?? 1;
  const maxCount = points[0]?.count ?? 1;
  // Padded log domains, so the first rank and words seen once don't sit on the axes.
  const x = scaleLog()
    .domain([0.8, Math.max(10, maxRank * 1.25)])
    .range([MARGIN.left, width - MARGIN.right]);
  const y = scaleLog()
    .domain([0.7, Math.max(10, maxCount * 1.5)])
    .range([HEIGHT - MARGIN.bottom, MARGIN.top]);
  const [plotLeft, plotRight] = x.range() as [number, number];
  const [plotBottom, plotTop] = y.range() as [number, number];

  const [, lastPlottedRank = maxRank] = x.domain();
  const idealPath = Array.from({ length: IDEAL_CURVE_SAMPLES }, (_, i) => {
    const rank = lastPlottedRank ** (i / (IDEAL_CURVE_SAMPLES - 1));
    return `${i === 0 ? 'M' : 'L'}${x(rank).toFixed(1)},${y(idealAt(rank)).toFixed(1)}`;
  }).join('');

  const activeEntry = entries.find((entry) => entry.word === tooltip.activeWord) ?? null;

  return (
    <figure className={chartStyles.figure}>
      <div ref={tooltip.containerRef} className={chartStyles.canvas}>
        <svg
          role="group"
          aria-labelledby={titleId}
          aria-describedby={descId}
          viewBox={`0 0 ${String(width)} ${String(HEIGHT)}`}
          className={chartStyles.svg}
          onKeyDown={tooltip.onChartKeyDown}
        >
          <title id={titleId}>Zipf&apos;s law chart: word rank against frequency</title>
          <desc id={descId}>
            {`Log–log plot of ${formatCount(points.length)} ranks from your book, with the ideal ` +
              'Zipf curve (frequency proportional to 1 / rank) for comparison.'}
          </desc>
          <clipPath id={clipId}>
            <rect
              x={plotLeft}
              y={plotTop}
              width={plotRight - plotLeft}
              height={plotBottom - plotTop}
            />
          </clipPath>

          <g data-axis="x" className={styles.axis}>
            <line x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} />
            {powersOfTen(x.domain()).map((tick) => (
              <g key={tick} transform={`translate(${String(x(tick))},${String(plotBottom)})`}>
                <line className={styles.grid} y2={plotTop - plotBottom} />
                <line y2={6} />
                <text y={20} textAnchor="middle">
                  {formatCount(tick)}
                </text>
              </g>
            ))}
          </g>
          <g data-axis="y" className={styles.axis}>
            <line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBottom} />
            {powersOfTen(y.domain()).map((tick) => (
              <g key={tick} transform={`translate(${String(plotLeft)},${String(y(tick))})`}>
                <line className={styles.grid} x2={plotRight - plotLeft} />
                <line x2={-6} />
                <text x={-10} textAnchor="end" dominantBaseline="central">
                  {formatCount(tick)}
                </text>
              </g>
            ))}
          </g>
          <text
            className={styles.axisLabel}
            x={(plotLeft + plotRight) / 2}
            y={HEIGHT - 8}
            textAnchor="middle"
          >
            Rank
          </text>
          <text
            className={styles.axisLabel}
            transform={`translate(16,${String((plotTop + plotBottom) / 2)}) rotate(-90)`}
            textAnchor="middle"
          >
            Frequency
          </text>

          <motion.path
            data-series="ideal"
            className={styles.ideal}
            d={idealPath}
            clipPath={`url(#${clipId})`}
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 1.2, ease: 'easeInOut' }}
          />
          {/* One fade for the whole layer: up to 1,000 per-point animations cost frames. */}
          <motion.g
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.15 }}
          >
            {points.map((point, index) => {
              const word = entries[point.rank - 1]?.word ?? '';
              return (
                <g
                  key={point.rank}
                  role="img"
                  aria-label={`Rank ${formatCount(point.rank)}: ${word}, ${formatCount(point.count)} times`}
                  className={styles.point}
                  {...tooltip.getWordProps(word, index)}
                  transform={`translate(${x(point.rank).toFixed(1)},${y(point.count).toFixed(1)})`}
                >
                  <circle data-hit-area className={styles.hit} r={HIT_RADIUS} />
                  <circle className={styles.dot} r={4} />
                </g>
              );
            })}
          </motion.g>
        </svg>
        <ChartTooltip
          id={tooltip.tooltipId}
          entry={activeEntry}
          position={tooltip.position}
          onDismiss={tooltip.dismiss}
        />
      </div>
      <ul className={styles.legend}>
        <li>
          <span className={styles.swatchPoint} aria-hidden="true" />
          Your book
        </li>
        <li>
          <span className={styles.swatchLine} aria-hidden="true" />
          Ideal Zipf curve
        </li>
      </ul>
      <a href={`#${tableId}`} className={chartStyles.tableLink}>
        View as table
      </a>
    </figure>
  );
});
