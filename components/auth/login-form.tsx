"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      await login(username);
    }
  };

  return (
    <Card className="w-full max-w-md p-6 mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Sign In to Rolu</h2>
        <p className="text-muted-foreground mt-2">
          Test login until World ID integration is complete
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUsername(e.target.value)
            }
            disabled={isLoading}
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign In with Test User"}
        </Button>

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            This is a temporary login for testing. <br />
            World ID integration coming soon.
          </p>
        </div>
      </form>
    </Card>
  );
}
