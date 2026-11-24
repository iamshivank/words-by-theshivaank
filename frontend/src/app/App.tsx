import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router';
import { ApiError } from '@/api/client';
import { EASE, ThemeProvider } from '@/design';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Client errors are answers, not glitches; only retry network and server failures.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user" transition={{ ease: EASE, duration: 0.65 }}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
