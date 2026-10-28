import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { SegmentedControl } from '../../atoms/SegmentedControl';
import type { VisualizationType } from '../../../lib/types';
import styles from './ResultsToolbar.module.css';

const VISUALIZATION_OPTIONS = [
  { value: 'bar', label: 'Bar chart', icon: <Icon name="chart-bar" /> },
  { value: 'cloud', label: 'Word cloud', icon: <Icon name="cloud" /> },
  { value: 'zipf', label: "Zipf's law", icon: <Icon name="zipf" /> },
] as const;

export interface ResultsToolbarProps {
  visualization: VisualizationType;
  onVisualizationChange: (visualization: VisualizationType) => void;
  onNewBook: () => void;
}

export function ResultsToolbar({
  visualization,
  onVisualizationChange,
  onNewBook,
}: ResultsToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <SegmentedControl
        label="Visualization"
        options={VISUALIZATION_OPTIONS}
        value={visualization}
        onChange={onVisualizationChange}
      />
      <Button variant="secondary" leadingIcon={<Icon name="refresh" />} onClick={onNewBook}>
        New book
      </Button>
    </div>
  );
}
