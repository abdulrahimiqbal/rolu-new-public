'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, CheckCircle } from 'lucide-react';

const DynamicPullToRefresh = dynamic(
  () => import('react-pull-to-refresh').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => <div className="min-h-screen bg-background"></div>
  }
);

interface PullToRefreshWrapperProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  refreshStatus: 'idle' | 'refreshing' | 'success';
}

export function PullToRefreshWrapper({ 
  children, 
  onRefresh, 
  refreshStatus 
}: PullToRefreshWrapperProps) {
  if (typeof window === 'undefined') {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <DynamicPullToRefresh
      onRefresh={onRefresh}
      className="min-h-[40vh]"
      style={{ WebkitOverflowScrolling: "touch" }}
      icon={
        refreshStatus === "success" ? (
          <div className="flex flex-col items-center text-green-600">
            <CheckCircle className="h-8 w-8 mb-1" />
          </div>
        ) : refreshStatus === "refreshing" ? (
          <div className="flex flex-col items-center text-blue-600">
            <Loader2 className="animate-spin h-8 w-8 mb-1" />
          </div>
        ) : null
      }
    >
      {children}
    </DynamicPullToRefresh>
  );
} 