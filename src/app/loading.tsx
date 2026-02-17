import { LoadingScreen } from '@/components/ui/loading-screen';

/**
 * Root Loading State
 * 
 * Displayed while the root layout is loading.
 * Uses a full-screen loading component with animated logo.
 */
export default function RootLoading(): React.ReactElement {
  return <LoadingScreen message="Loading AgentLink..." />;
}
