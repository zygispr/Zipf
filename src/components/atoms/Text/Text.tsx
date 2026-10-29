import type { ReactNode } from 'react';
import styles from './Text.module.scss';

export type TextVariant = 'body' | 'caption' | 'lead';

export interface TextProps {
  variant?: TextVariant;
  as?: 'p' | 'span';
  children: ReactNode;
  id?: string;
  className?: string;
}

export function Text({ variant = 'body', as: Tag = 'p', className, ...rest }: TextProps) {
  return (
    <Tag
      data-variant={variant}
      className={[styles[variant], className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
