import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import styles from './ResultsToolbar.module.css';

export interface ResultsToolbarProps {
  onNewBook: () => void;
}

export function ResultsToolbar({ onNewBook }: ResultsToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <Button variant="secondary" leadingIcon={<Icon name="refresh" />} onClick={onNewBook}>
        New book
      </Button>
    </div>
  );
}
