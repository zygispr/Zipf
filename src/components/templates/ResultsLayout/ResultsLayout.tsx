import type { ReactNode } from 'react';
import styles from './ResultsLayout.module.scss';

export interface ResultsLayoutProps {
  heading?: ReactNode;
  stats?: ReactNode;
  toolbar?: ReactNode;
  visualization?: ReactNode;
  search?: ReactNode;
  table?: ReactNode;
}

const SLOTS = ['heading', 'toolbar', 'stats', 'visualization', 'search', 'table'] as const;

/** Layout only: places the slots in a responsive grid and holds no data (research R14). */
export function ResultsLayout(props: ResultsLayoutProps) {
  return (
    <div className={styles.layout}>
      {SLOTS.map((slot) =>
        props[slot] ? (
          <div key={slot} data-slot={slot} className={styles[slot]}>
            {props[slot]}
          </div>
        ) : null,
      )}
    </div>
  );
}
