"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
// Remove direct Amplitude imports
// import * as amplitude from "@amplitude/analytics-browser";
// import { Identify, identify } from "@amplitude/analytics-browser";
import { useAuth } from "./auth-provider"; 
// Import unified analytics functions
import {
  initializeAnalytics,
  trackEvent,
  identifyUser,
  resetAnalyticsUser,
} from "@/lib/analytics";

interface AmplitudeContextType { // Keep name or rename to AnalyticsContextType if preferred
  track: (eventName: string, eventProperties?: Record<string, any>) => void;
}

const AmplitudeContext = createContext<AmplitudeContextType | undefined>(
  undefined
);

export const AmplitudeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  // apiKey is no longer needed directly here

  useEffect(() => {
    // Initialize both analytics services
    initializeAnalytics();
    // Track app open using the unified function
    trackEvent('app_open'); 

    // No Amplitude specific cleanup needed here now
    return () => {};
  }, []); // Run only once on mount

  // Identify user when auth state changes using the unified function
  useEffect(() => {
    if (user) {
      const userProperties = {
        username: user.username || "guest",
        is_verified: user.is_verified ?? false,
        // Add any other common properties for both services
      };
      identifyUser(user.id, userProperties);
    } else {
      // If user logs out, reset both services
      resetAnalyticsUser();
    }
  }, [user]);

  // Tracking function provided by the context now uses the unified trackEvent
  const track = (eventName: string, eventProperties?: Record<string, any>) => {
    trackEvent(eventName, eventProperties);
  };

  return (
    <AmplitudeContext.Provider value={{ track }}>
      {children}
    </AmplitudeContext.Provider>
  );
};

// Custom hook to use the Amplitude context (can keep name or rename)
export const useAmplitude = () => { // Or rename to useAnalytics
  const context = useContext(AmplitudeContext);
  if (context === undefined) {
    throw new Error("useAmplitude must be used within an AmplitudeProvider");
  }
  // No need for the dummy track function check here anymore if handled in lib/analytics.ts
  return context;
};
