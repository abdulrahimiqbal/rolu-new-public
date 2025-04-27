"use client";

import { ReactNode, useEffect } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize World ID MiniKit with your app ID
    MiniKit.install(process.env.NEXT_PUBLIC_WORLD_ID_APP_ID as `app_${string}`);
  }, []);

  return <>{children}</>;
}
