import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useId } from 'react';
import { Text } from '../../atoms/Text';
import { formatCount } from '../../../lib/selectView';
import styles from './StatCard.module.css';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export type StatTone = 'primary' | 'secondary' | 'accent';

export interface StatCardProps {
  label: string;
  /** Numbers count up from 0; text is shown as is. */
  value: number | string;
  subLabel?: string;
  tone?: StatTone;
}

function CountUp({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(reduceMotion ? value : 0);
  const text = useTransform(count, (latest) => formatCount(Math.round(latest)));

  useEffect(() => {
    if (reduceMotion) {
      count.jump(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.9, ease: 'easeOut' });
    return () => {
      controls.stop();
    };
  }, [count, value, reduceMotion]);

  return <motion.span>{text}</motion.span>;
}

export function StatCard({ label, value, subLabel, tone = 'primary' }: StatCardProps) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} data-tone={tone} className={styles.card}>
      <Text variant="caption" id={labelId} className={styles.label}>
        {label}
      </Text>
      <p className={styles.value}>
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </p>
      {subLabel && <Text variant="caption">{subLabel}</Text>}
    </div>
  );
}
