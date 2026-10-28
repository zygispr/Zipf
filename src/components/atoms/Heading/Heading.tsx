import type { ReactNode, Ref } from 'react';
import styles from './Heading.module.css';

const TAGS = { 1: 'h1', 2: 'h2', 3: 'h3' } as const;

export interface HeadingProps {
  level: 1 | 2 | 3;
  children: ReactNode;
  /** `-1` lets focus be moved here programmatically (FR-018). */
  tabIndex?: number;
  id?: string;
  className?: string;
  ref?: Ref<HTMLHeadingElement>;
}

export function Heading({ level, className, ...rest }: HeadingProps) {
  const Tag = TAGS[level];
  return (
    <Tag className={[styles.heading, styles[Tag], className].filter(Boolean).join(' ')} {...rest} />
  );
}
