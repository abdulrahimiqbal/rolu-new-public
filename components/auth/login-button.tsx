"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginButton({ className = "" }: { className?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, user } = useAuth();
  const router = useRouter();

  // Generate a random username for test login
  const handleTestLogin = async () => {
    if (user) return; // Already logged in

    setIsLoading(true);
    setError(null);

    try {
      console.log("Starting test login process");

      // Generate a random wallet address with timestamp to ensure uniqueness
      const randomWalletAddress = `0x${Math.random()
        .toString(36)
        .substring(2, 15)}`;
      console.log("Generated wallet address:", randomWalletAddress);

      await login(randomWalletAddress);
      console.log("Login successful");

      // Set a cookie to help the middleware know we have localStorage auth
      document.cookie = "has_session=true; path=/; max-age=2592000"; // 30 days

      // Refresh the page to ensure everything is loaded correctly
      router.refresh();
    } catch (error) {
      console.error("Login failed:", error);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return null; // Don't show button if user is already logged in
  }

  return (
    <div className="flex flex-col items-center">
      <Button
        onClick={handleTestLogin}
        disabled={isLoading}
        className={`flex items-center gap-2 ${className}`}
        variant="outline"
      >
        {isLoading ? (
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1"></span>
        ) : (
          <User className="h-4 w-4" />
        )}
        {isLoading ? "Signing in..." : "Test Login"}
      </Button>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
