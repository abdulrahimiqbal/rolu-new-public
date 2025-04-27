"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input'; // Assuming shadcn UI input
import { Button } from '@/components/ui/button'; // Assuming shadcn UI button
import { Label } from '@/components/ui/label'; // Assuming shadcn UI label

// TODO: Add NEXT_PUBLIC_ADMIN_PASSWORD to your .env.local file
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ADMIN_PASSWORD) {
      console.error("NEXT_PUBLIC_ADMIN_PASSWORD environment variable is not set.");
      setError("Configuration error. Please contact support.");
      return;
    }

    if (password === ADMIN_PASSWORD) {
      // Store auth status in sessionStorage
      try {
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        // Redirect to the main admin dashboard
        router.push('/admin');
      } catch (storageError) {
        console.error("Failed to set sessionStorage:", storageError);
        setError("Could not save session. Please enable session storage.");
      }
    } else {
      setError('Incorrect password.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="p-8 bg-white dark:bg-gray-800 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Admin Login</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
