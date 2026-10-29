import styles from './ProgressBar.module.scss';

export interface ProgressBarProps {
  /** Progress from 0 to 1; out-of-range values are clamped. */
  value: number;
  /** Accessible name of the progress bar. */
  label: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const fraction = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(fraction * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={styles.track}
    >
      <div className={styles.fill} style={{ width: `${String(percent)}%` }} />
    </div>
  );
}
