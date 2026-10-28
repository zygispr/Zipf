import { MotionConfig } from 'motion/react';
import { HomePage } from './components/pages/HomePage';
import { AppLayout } from './components/templates/AppLayout';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppLayout>
        <HomePage />
      </AppLayout>
    </MotionConfig>
  );
}
