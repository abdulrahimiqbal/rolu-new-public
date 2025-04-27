"use client";

import { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";
import { useAuth } from "@/contexts/auth-provider";
import { useLayoutStore } from "@/lib/store/layout";

interface MainLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function MainLayout({ children, hideNav = false }: MainLayoutProps) {
  const { user } = useAuth();
  const isGameplayActive = useLayoutStore((state) => state.isGameplayActive);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-2">
      <div className="relative w-full max-w-[420px] h-[calc(100vh-32px)] max-h-[900px] overflow-hidden bg-white shadow-xl rounded-2xl flex flex-col">
        {user && !isGameplayActive && <Header />}
        <main className="flex-1 overflow-y-auto">{children}</main>
        {!isGameplayActive && !hideNav && <BottomNav />}
      </div>
    </div>
  );
}
