import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { SegmentedControl } from '../../atoms/SegmentedControl';
import { Toggle } from '../../atoms/Toggle';
import type { TopN, VisualizationType } from '../../../lib/types';
import styles from './ResultsToolbar.module.css';

const VISUALIZATION_OPTIONS = [
  { value: 'bar', label: 'Bar chart', icon: <Icon name="chart-bar" /> },
  { value: 'cloud', label: 'Word cloud', icon: <Icon name="cloud" /> },
  { value: 'zipf', label: "Zipf's law", icon: <Icon name="zipf" /> },
] as const;

const TOP_N_OPTIONS = ([10, 25, 50, 100] as const).map((value) => ({
  value,
  label: String(value),
}));

/** Shown when the book doesn't look English (research R6). */
const NOT_ENGLISH_DESCRIPTION = 'Common-word filtering is available for English books';

export interface ResultsToolbarProps {
  visualization: VisualizationType;
  onVisualizationChange: (visualization: VisualizationType) => void;
  topN: TopN;
  onTopNChange: (topN: TopN) => void;
  hideCommonWords: boolean;
  onHideCommonWordsChange: (hideCommonWords: boolean) => void;
  /** False for books that don't look English; the switch is then disabled with an explanation. */
  canHideCommonWords: boolean;
  /** Saves the full ranked list for the current filter as CSV (FR-022). */
  onDownload: () => void;
  onNewBook: () => void;
}

export function ResultsToolbar({
  visualization,
  onVisualizationChange,
  topN,
  onTopNChange,
  hideCommonWords,
  onHideCommonWordsChange,
  canHideCommonWords,
  onDownload,
  onNewBook,
}: ResultsToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.row}>
        <SegmentedControl
          label="Visualization"
          options={VISUALIZATION_OPTIONS}
          value={visualization}
          onChange={onVisualizationChange}
        />
        <div className={styles.actions}>
          <Button variant="secondary" leadingIcon={<Icon name="download" />} onClick={onDownload}>
            Download results
          </Button>
          <Button variant="secondary" leadingIcon={<Icon name="refresh" />} onClick={onNewBook}>
            New book
          </Button>
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.topN}>
          <span className={styles.topNLabel} aria-hidden="true">
            Top words
          </span>
          <SegmentedControl
            label="Top words"
            options={TOP_N_OPTIONS}
            value={topN}
            onChange={onTopNChange}
          />
        </div>
        <Toggle
          label="Hide common words"
          checked={hideCommonWords}
          onChange={onHideCommonWordsChange}
          disabled={!canHideCommonWords}
          description={canHideCommonWords ? undefined : NOT_ENGLISH_DESCRIPTION}
        />
      </div>
    </div>
  );
}
