import { useEffect, useId, useRef } from 'react';
import { Button } from '../../atoms/Button';
import { Heading } from '../../atoms/Heading';
import { Icon } from '../../atoms/Icon';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Spinner } from '../../atoms/Spinner';
import { Text } from '../../atoms/Text';
import type { AnalysisStage } from '../../../hooks/useAnalysis';
import styles from './ProcessingPanel.module.css';

const STAGE_LABELS: Record<AnalysisStage, string> = {
  reading: 'Reading file…',
  extracting: 'Extracting text…',
  counting: 'Counting words…',
};

export interface ProcessingPanelProps {
  fileName: string;
  stage: AnalysisStage;
  progress: number;
  onCancel: () => void;
  /** Replaces the running analysis with another book. */
  onFile: (file: File) => void;
}

export function ProcessingPanel({
  fileName,
  stage,
  progress,
  onCancel,
  onFile,
}: ProcessingPanelProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  // The control that started the analysis is gone, so keyboard focus moves to Cancel.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby={headingId} className={styles.panel}>
      <Spinner label="Analyzing your book" />
      <Heading level={2} id={headingId} className={styles.title}>
        {`Analyzing ${fileName}`}
      </Heading>
      <span aria-live="polite">
        <Text variant="caption">{STAGE_LABELS[stage]}</Text>
      </span>
      <ProgressBar value={progress} label="Analysis progress" />
      <div className={styles.actions}>
        <Button
          ref={cancelRef}
          variant="secondary"
          leadingIcon={<Icon name="close" />}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="ghost"
          leadingIcon={<Icon name="book" />}
          onClick={() => inputRef.current?.click()}
        >
          Choose a different book
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.epub"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) onFile(file);
          }}
        />
      </div>
    </section>
  );
}
