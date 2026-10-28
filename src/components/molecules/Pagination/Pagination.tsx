import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import styles from './Pagination.module.css';

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  return (
    <nav aria-label="Table pages" className={styles.pagination}>
      <Button
        variant="ghost"
        leadingIcon={<Icon name="chevron-left" />}
        disabled={page <= 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
      >
        Previous
      </Button>
      <span aria-live="polite">
        <Text as="span" variant="caption">{`Page ${String(page)} of ${String(pageCount)}`}</Text>
      </span>
      <Button
        variant="ghost"
        trailingIcon={<Icon name="chevron-right" />}
        disabled={page >= pageCount}
        onClick={() => {
          onPageChange(page + 1);
        }}
      >
        Next
      </Button>
    </nav>
  );
}
