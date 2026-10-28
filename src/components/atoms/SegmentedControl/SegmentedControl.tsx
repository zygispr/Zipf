import { motion } from 'motion/react';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './SegmentedControl.module.css';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  /** Decorative icon shown before the label. */
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string | number> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Choose one of several options: radio-group semantics with arrow-key navigation. */
export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const pillId = useId();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    optionRefs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = options.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next);
  };

  return (
    <div role="radiogroup" aria-label={label} className={styles.group}>
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={styles.option}
            onClick={() => {
              onChange(option.value);
            }}
            onKeyDown={(event) => {
              onKeyDown(event, index);
            }}
          >
            {checked && (
              <motion.span
                layoutId={pillId}
                className={styles.pill}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={styles.content}>
              {option.icon && <span className={styles.icon}>{option.icon}</span>}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
