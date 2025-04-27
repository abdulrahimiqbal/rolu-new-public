"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// User type definition
export interface User {
  id: string;
  username: string;
  wallet_address: string | null;
  profileImage: string | null;
  xp: number;
  roluBalance: number;
  level: number;
}

// Auth context type definition
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  updateUserStats: (stats: Partial<User>) => void;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: React.ReactNode;
}

// Local storage key for user data
const USER_STORAGE_KEY = "rolu_user";
const TOKEN_STORAGE_KEY = "rolu_token";

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing user session on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);

      try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

        if (storedUser && storedToken) {
          // Validate token with the server in a real implementation
          // For now, just parse the stored user
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (err) {
        console.error("Failed to restore auth session:", err);
        // Clear invalid session data
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function - uses test login API for now
  const login = async (username: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/test-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Login failed");
      }

      const { user, token } = data.data;

      // Store user and token in local storage
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      setUser(user);
      return user;
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  };

  // Update user stats (used after game completion)
  const updateUserStats = (stats: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...stats };
    setUser(updatedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error, login, logout, updateUserStats }}
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
