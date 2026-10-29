import { useId, type ReactNode } from 'react';
import styles from './Toggle.module.scss';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Linked with `aria-describedby`; explains why the switch is disabled, when it is. */
  description?: ReactNode;
  /**
   * Uses `aria-disabled` instead of `disabled`, so the switch stays focusable and screen reader
   * users can still hear the description that explains why.
   */
  disabled?: boolean;
}

/** On/off switch. A native button, so Space and Enter toggle it. */
export function Toggle({ label, checked, onChange, description, disabled = false }: ToggleProps) {
  const descriptionId = useId();
  return (
    <div className={styles.field}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={styles.switch}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
      >
        <span className={styles.track} aria-hidden="true">
          <span className={styles.knob} />
        </span>
        <span className={styles.label}>{label}</span>
      </button>
      {description && (
        <span id={descriptionId} className={styles.description}>
          {description}
        </span>
      )}
    </div>
  );
}
