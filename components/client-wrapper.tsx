"use client";

import React from 'react';

/**
 * SafeMap component that handles undefined/null arrays for mapping operations
 * Prevents the "undefined is not a function (near '...n.map...')" error
 */
export function SafeMap<T>({ 
  data, 
  render, 
  fallback = null 
}: { 
  data: T[] | null | undefined; 
  render: (item: T, index: number) => React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <>{fallback}</>;
  }
  
  return <>{data.map((item, index) => render(item, index))}</>;
}

/**
 * Safely get a property from an object without throwing errors
 */
export function safelyGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  try {
    return obj ? obj[key] : undefined;
  } catch (e) {
    console.error(`Error accessing ${String(key)}:`, e);
    return undefined;
  }
}

/**
 * Client-side wrapper component that prevents hydration errors
 * by ensuring initial client and server render match
 */
export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Return minimal UI during first render to match server
  if (!isClient) {
    return <div className="min-h-screen bg-background"></div>;
  }
  
  return <>{children}</>;
}

export function safelyAccess<T>(obj: T, path: string, defaultValue: any = undefined): any {
  return path.split('.').reduce((acc: any, part: string) => acc && acc[part] ? acc[part] : defaultValue, obj);
}

export default ClientWrapper;
