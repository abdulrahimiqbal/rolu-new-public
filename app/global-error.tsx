'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Global Application error:", error);
  // Render an empty body to suppress visual errors
  return (
    <html lang="en">
      <body></body>
    </html>
  );
} 