"use client";

import React, { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional: Devtools

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Initialize QueryClient using useState to ensure it's only created once per component instance
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Default query options if needed, e.g.:
        // staleTime: 1000 * 60 * 5, // 5 minutes
        // refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    // Provide the client to your App
    <TanStackQueryClientProvider client={queryClient}>
      {children}
      {/* Optional: React Query Devtools for debugging */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </TanStackQueryClientProvider>
  );
} 