"use client";

import { useAuth } from "@/contexts/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

// Higher-order component to protect routes that require authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function ProtectedRoute(props: P) {
    const { user, status } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // If authentication is complete and user is not authenticated, redirect to sign-in
      if (status === "unauthenticated") {
        router.push("/sign-in");
      }
    }, [status, router]);

    // Show loading state while checking authentication
    if (status === "loading") {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-gray-600">Checking authentication...</p>
          </div>
        </div>
      );
    }

    // If authenticated, render the protected component
    if (status === "authenticated" && user) {
      return <Component {...props} />;
    }

    // This should not be visible, but added as a fallback
    return null;
  };
}
