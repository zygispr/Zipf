import type { ReactNode } from 'react';
import { Heading } from '../../atoms/Heading';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import styles from './AppLayout.module.scss';

export interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.logo}>
          <Icon name="zipf" size={24} />
        </span>
        <Heading level={1}>Zipf</Heading>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <Text variant="caption">
          Word counts are computed on your device. Nothing is uploaded or saved.
        </Text>
      </footer>
    </div>
  );
}
