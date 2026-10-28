import { MotionConfig } from 'motion/react';
import { AppLayout } from './components/templates/AppLayout';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppLayout>{/* HomePage added in US1 */}</AppLayout>
    </MotionConfig>
  );
}
