import { AnimatePresence, motion } from 'motion/react';
import { Heading } from '../../atoms/Heading';
import { BarChart } from '../BarChart';
import { WordCloud } from '../WordCloud';
import { ZipfChart } from '../ZipfChart';
import type { View } from '../../../lib/selectView';
import type { VisualizationType } from '../../../lib/types';
import styles from './VisualizationPanel.module.scss';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface VisualizationPanelProps {
  visualization: VisualizationType;
  view: View;
  tableId: string;
}

function headingFor(visualization: VisualizationType, topCount: number): string {
  switch (visualization) {
    case 'bar':
      return `Top ${String(topCount)} words`;
    case 'cloud':
      return 'Word cloud';
    case 'zipf':
      return "Zipf's law";
  }
}

/** One of the three charts, cross-fading when the view changes (FR-014). */
export function VisualizationPanel({ visualization, view, tableId }: VisualizationPanelProps) {
  const reduceMotion = useReducedMotion();

  let chart;
  switch (visualization) {
    case 'bar':
      chart = <BarChart entries={view.top} tableId={tableId} />;
      break;
    case 'cloud':
      chart = <WordCloud entries={view.top} tableId={tableId} />;
      break;
    case 'zipf':
      chart = (
        <ZipfChart
          entries={view.entries}
          points={view.zipfPoints}
          idealAt={view.idealAt}
          tableId={tableId}
        />
      );
      break;
  }

  return (
    <section className={styles.panel} aria-label="Visualization">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={visualization}
          className={styles.view}
          // With reduced motion there is no exit animation, so the next chart appears at once.
          // Opacity only: the compositor can fade large SVGs without repainting them each frame.
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
        >
          <Heading level={3}>{headingFor(visualization, view.top.length)}</Heading>
          {chart}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
