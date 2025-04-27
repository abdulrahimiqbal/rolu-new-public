'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface HydrationSafeWrapperProps {
  children: React.ReactNode;
  forceRefresh?: boolean;
}

export function HydrationSafeWrapper({ 
  children, 
  forceRefresh = false 
}: HydrationSafeWrapperProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  // Simple one-time refresh with sessionStorage
  useEffect(() => {
    // Skip this effect on first server-side render
    if (typeof window === 'undefined') return;

    // Check if we need to refresh
    const isHomePage = pathname === '/' || pathname === '/home';
    const shouldRefresh = isHomePage || forceRefresh;
    
    // Create a unique key for this page load
    const pageKey = `hydrated-${pathname}`;
    const hasRefreshed = sessionStorage.getItem(pageKey) === 'true';

    // Only refresh once per session for this specific page
    if (shouldRefresh && !hasRefreshed) {
      // Mark that we've refreshed this page
      sessionStorage.setItem(pageKey, 'true');
      
      // Delay very slightly to ensure this executes after component mounts
      const timer = setTimeout(() => {
        window.location.reload();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [pathname, forceRefresh]);

  useEffect(() => {
    setIsHydrated(true);

    const handleError = (error: ErrorEvent) => {
      console.error('Hydration error caught:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    if (hasError && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        router.refresh();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasError, retryCount, router]);

  if (!isHydrated) {
    return <div className="min-h-screen bg-background"></div>;
  }

  return (
    <div suppressHydrationWarning>
      {children}
    </div>
  );
} 