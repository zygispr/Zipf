import { motion } from 'motion/react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  // motion.button redefines these with animation-specific signatures.
  'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> & {
  variant?: ButtonVariant;
  /** Shown before the label, e.g. `<Icon name="upload" />`. Atoms don't import each other. */
  leadingIcon?: ReactNode;
};

export function Button({
  variant = 'primary',
  leadingIcon,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      data-variant={variant}
      className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      {...rest}
    >
      {leadingIcon}
      {children}
    </motion.button>
  );
}
