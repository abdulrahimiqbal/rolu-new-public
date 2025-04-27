"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardStats } from "./actions";
import { DashboardClient } from "./dashboard-client";

// Loading skeleton component for dashboard
function DashboardSkeleton() {
  return (
    <div className="h-screen bg-gray-100 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
            <div className="h-80 bg-gray-100 rounded flex items-center justify-center">
              <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
            <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
              <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard component with stats from database
async function Dashboard() {
  const stats = await getDashboardStats();

  return <DashboardClient stats={stats} />;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This code runs only on the client side
    let authenticated = false;
    try {
      // Check sessionStorage for authentication status
      authenticated = sessionStorage.getItem('isAdminAuthenticated') === 'true';
    } catch (error) {
      console.error("Error accessing sessionStorage:", error);
      // Handle cases where sessionStorage is not available (e.g., private browsing modes)
    }

    if (!authenticated) {
      // If not authenticated, redirect to the login page
      router.replace('/admin/login');
    } else {
      // If authenticated, update state
      setIsAuthenticated(true);
    }
    // Update loading state regardless of authentication status
    setIsLoading(false);
  }, [router]); // Dependency array includes router

  if (isLoading) {
    // Show a loading indicator (or the skeleton) while checking authentication
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
        {/* Or return <DashboardSkeleton />; if preferred */}
      </div>
    );
  }

  if (!isAuthenticated) {
    // If not authenticated (after loading), render nothing.
    // This prevents briefly showing the dashboard before redirect.
    return null;
  }

  // If authenticated, render the actual dashboard content with Suspense
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
