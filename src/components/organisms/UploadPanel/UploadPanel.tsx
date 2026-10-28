import { useEffect, useId, useRef } from 'react';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { ErrorMessage } from '../../molecules/ErrorMessage';
import { FileDropZone } from '../../molecules/FileDropZone';
import { PrivacyNote } from '../../molecules/PrivacyNote';
import type { AnalysisErrorCode } from '../../../lib/types';
import styles from './UploadPanel.module.css';

export interface UploadPanelProps {
  onFile: (file: File) => void;
  errorCode?: AnalysisErrorCode;
  onRetry: () => void;
}

export function UploadPanel({ onFile, errorCode, onRetry }: UploadPanelProps) {
  const dropZoneRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  useEffect(() => {
    dropZoneRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby={headingId} className={styles.panel}>
      <div className={styles.intro}>
        <Heading level={2} id={headingId}>
          See every word in your book
        </Heading>
        <Text variant="lead">Find out which words your book uses most, and how often.</Text>
      </div>
      {errorCode && (
        <ErrorMessage
          code={errorCode}
          onRetry={() => {
            onRetry();
            dropZoneRef.current?.focus();
          }}
        />
      )}
      <FileDropZone ref={dropZoneRef} onFile={onFile} />
      <PrivacyNote />
    </section>
  );
}
