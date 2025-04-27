"use client";

import { AuthProvider } from "./auth-provider";
import { GameProvider } from "./game-context";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { ReactNode, Suspense, useEffect } from "react";
import { Toaster } from "sonner";
// import { ThemeProvider } from "@/components/providers/theme-provider"; // Commented out as file not found
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
// Restore TanStack Query imports
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Remove Wagmi imports
// import { WagmiProvider, createConfig, http, createStorage } from "wagmi";
// import { worldchain, worldchainSepolia } from "wagmi/chains";
// import { injected } from "wagmi/connectors";
import { User } from "@/lib/auth"; // Re-add User type import

const inter = Inter({ subsets: ["latin"] });

// Remove Wagmi config
// const config = createConfig({ ... });

// Restore QueryClient instance
const queryClient = new QueryClient();

export function Providers({ children, initialUser }: { children: ReactNode, initialUser?: User | null }) {
  
  // Remove EIP-6963 Listener (was for wagmi)
  // useEffect(() => { ... }, []); 

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* Remove WagmiProvider wrapper */}
      {/* <WagmiProvider config={config} reconnectOnMount={true}> */}
        {/* Restore QueryClientProvider wrapper */}
        <QueryClientProvider client={queryClient}>
          <AuthProvider initialUser={initialUser}>
            <GameProvider initialBrandId="">
              {/* <ThemeProvider ... > */}
                <I18nProvider>
                  <Toaster />
                  <main className={cn("font-sans", inter.className)}>
                    {children}
                  </main>
                </I18nProvider>
              {/* </ThemeProvider> */}
            </GameProvider>
          </AuthProvider>
        </QueryClientProvider>
      {/* </WagmiProvider> */}
    </Suspense>
  );
}
