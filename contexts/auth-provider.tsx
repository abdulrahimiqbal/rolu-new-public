"use client";

import { useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/lib/auth";
import { trackEvent, identifyUser, resetAnalyticsUser } from "@/lib/analytics";

// Auth context type definition
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (wallet_address: string, referralCode?: string) => Promise<User | undefined>;
  logout: () => void;
  updateUserStats: (stats: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  status: "authenticated" | "unauthenticated" | "loading";
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialUser);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "authenticated" | "unauthenticated" | "loading"
  >(initialUser ? "authenticated" : "loading");
  const router = useRouter();

  // Check for existing user session on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (initialUser) {
        setUser(initialUser);
        setStatus("authenticated");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setStatus("loading");

      try {
        // Check for user data in cookies
        const userDataCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("rolu_user_data="));

        if (userDataCookie) {
          const userData = JSON.parse(
            decodeURIComponent(userDataCookie.split("=")[1])
          );
          setUser(userData);
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
        }
      } catch (err) {
        console.error("Failed to restore auth session:", err);
        setStatus("unauthenticated");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [initialUser]);

  // Login function
  const login = useCallback(async (wallet_address: string, referralCode?: string): Promise<User | undefined> => {
    setIsLoading(true);
    setError(null);
    let sessionStartTime = Date.now(); // Record session start time

    try {
      console.log("Attempting login with wallet address:", wallet_address, "Referral Code:", referralCode || 'None');

      // Use the login API endpoint
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wallet_address, referralCode }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Login failed");
      }

      // Destructure user, referralStatus, and optional referrerUsername
      const { user, referralStatus, referrerUsername } = data.data; 

      console.log("Login successful, user:", user, "Referral Status:", referralStatus, "Referrer Username:", referrerUsername);

      // Store referral status and referrer username (if present) in session storage
      if (referralStatus) {
          const statusData = { status: referralStatus, username: referrerUsername };
          sessionStorage.setItem('referralLoginStatus', JSON.stringify(statusData));
      } else {
          sessionStorage.removeItem('referralLoginStatus');
      }

      setUser(user);
      setStatus("authenticated");
      localStorage.setItem("has_session", "true");

      // Track Session Started
      trackEvent('Session Started', {
        userId: user.id,
        startTime: new Date(sessionStartTime).toISOString()
      });

      return user;
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setStatus("unauthenticated");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    // Track Session Ended before clearing user data
    if (user) {
      trackEvent('Session Ended', {
          userId: user.id,
          // durationMs could be calculated if sessionStartTime was stored in state/context
      });
    }

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      setUser(null);
      setStatus("unauthenticated");
      router.push("/sign-in");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [router]);

  // Update user stats (used after game completion)
  const updateUserStats = async (stats: Partial<User>) => {
    if (!user) return;

    try {
      const response = await fetch("/api/user/update-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stats),
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser = { ...user, ...stats };
        setUser(updatedUser);
      }
    } catch (error) {
      console.error("Error updating user stats:", error);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/users/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);

        // Update the user cookie data
        const userDataStr = encodeURIComponent(JSON.stringify(data.user));
        document.cookie = `rolu_user_data=${userDataStr}; path=/; max-age=86400`;
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        updateUserStats,
        refreshUser,
        status,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
