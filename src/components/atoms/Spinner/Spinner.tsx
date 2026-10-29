import styles from './Spinner.module.scss';

export interface SpinnerProps {
  /** Announced to screen readers; not shown. */
  label?: string;
}

export function Spinner({ label = 'Loading' }: SpinnerProps) {
  return (
    <div role="status" className={styles.spinner}>
      <span className={styles.ring} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
