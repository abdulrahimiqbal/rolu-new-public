import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { Toaster } from "react-hot-toast";
import MiniKitProvider from "@/components/providers/minikit-provider";
import { ErudaProvider } from '@/components/providers/eruda';
import Script from "next/script";
import NextTopLoader from "nextjs-toploader";
import { AmplitudeProvider } from "@/contexts/amplitude-provider";
import DynamicWrapper from "./dynamic-wrapper";
import { Providers } from "@/contexts/providers";
// import { GameProvider } from "@/contexts/game-provider";
// import { TooltipProvider } from "@/components/providers/tooltip";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rolu - Educational Gaming Platform",
  description: "Learn while you play with Rolu's educational games",
  other: {
    "cache-control": "no-cache, no-store, must-revalidate",
    pragma: "no-cache",
    expires: "0",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4F46E5",
};

// Force dynamic rendering for the entire app
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script dangerouslySetInnerHTML={{
          __html: `
            // Prevent undefined map errors from crashing the application
            window.addEventListener('error', function(event) {
              // For undefined is not a function (map) errors
              if (event.message && event.message.includes('is not a function') && event.message.includes('map')) {
                console.error('Prevented crash from mapping error:', event.message);
                event.preventDefault();
                return;
              }
              
              // Prevent API fetch errors from showing error UI
              if (event.message && (
                event.message.includes('NetworkError') || 
                event.message.includes('Failed to fetch')
              )) {
                console.error('Prevented crash from network error:', event.message);
                event.preventDefault();
                return;
              }
              
              // Prevent null property access errors
              if (event.message && event.message.includes('Cannot read properties of null')) {
                console.error('Prevented crash from null access:', event.message);
                event.preventDefault();
                return;
              }
            });
            
            // Prevent unhandled promise rejections from showing error UI
            window.addEventListener('unhandledrejection', function(event) {
              console.error('Unhandled promise rejection:', event.reason);
              // Only prevent error UI for auth-related errors
              if (event.reason && event.reason.message && (
                event.reason.message.includes('auth') || 
                event.reason.message.includes('unauthorized') ||
                event.reason.message.includes('not found')
              )) {
                event.preventDefault();
              }
            });
          `
        }} />
      </head>
      <body className={inter.className}>
        {/* <ErudaProvider> */}
        <Script
          src="https://umami.hub.suhaybka.com/script.js"
          data-website-id="a97a6aaa-a03d-4971-897a-5afcae4b411d"
          strategy="afterInteractive"
        />
        <Script id="clear-cache" strategy="beforeInteractive">
          {`
            // Clear any service workers that might be causing caching issues
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for (let registration of registrations) {
                  registration.unregister();
                }
              });
            }
            
            // Add version query param to help bust cache
            if (typeof window !== 'undefined') {
              // Add a timestamp to force fresh resources
              const timestamp = new Date().getTime();
              const browserRefreshParam = 'v=' + timestamp;
              
              // Add to all fetch requests
              const originalFetch = window.fetch;
              window.fetch = function(input, init) {
                if (typeof input === 'string') {
                  input = input + (input.includes('?') ? '&' : '?') + browserRefreshParam;
                }
                return originalFetch(input, init);
              };
            }

            // Add global error handler to prevent uncaught client exceptions from showing generic error page
            window.addEventListener('error', function(event) {
              // Log the error to console with additional context
              console.error('Captured client error:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
              });

              // For undefined is not a function (map) errors specifically
              if (event.message && event.message.includes('is not a function') && event.message.includes('map')) {
                console.warn('Caught potential undefined map error. Check your data structures.');
                // Prevent the default error UI in production
                event.preventDefault();
                return;
              }
              
              // Prevent default error handling for most client-side errors
              if (event.error && !event.error.suppressDefaultUI) {
                event.preventDefault();
              }
            });
          `}
        </Script>
        <MiniKitProvider>
            <Providers initialUser={user}>
              <AmplitudeProvider>
                    <DynamicWrapper>{children}</DynamicWrapper>
                    <Toaster position="bottom-center" />
              </AmplitudeProvider>
            </Providers>
        </MiniKitProvider>
        {/* </ErudaProvider> */}
      </body>
    </html>
  );
}
