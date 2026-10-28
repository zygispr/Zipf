import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import styles from './TextInput.module.css';

export type TextInputProps = ComponentPropsWithRef<'input'> & {
  label: string;
  /** Decorative, e.g. `<Icon name="search" />`. Atoms don't import each other. */
  leadingIcon?: ReactNode;
};

/** A text field with an associated `<label>`. */
export function TextInput({ label, leadingIcon, id, className, ...rest }: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        {leadingIcon && (
          <span className={styles.icon} aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          className={styles.input}
          data-has-icon={leadingIcon ? true : undefined}
          {...rest}
        />
      </div>
    </div>
  );
}
