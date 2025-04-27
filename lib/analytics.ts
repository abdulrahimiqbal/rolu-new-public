"use client"; // Mark as client component if using browser APIs

// Use conditional imports for browser-only modules
let amplitude: any = null;
let Identify: any = null;
let sessionReplay: any = null; // Added for session replay
let mixpanel: any = null;

// Safe check for browser environment
const isBrowser = typeof window !== 'undefined';

// --- Initialization ---
// Remove single isInitialized flag
// let isInitialized = false;
let isAmplitudeReady = false;
let isMixpanelReady = false;

// Store initialization promises to ensure modules are loaded before init is called
let amplitudePromise: Promise<any> | null = null;
let mixpanelPromise: Promise<any> | null = null;

if (isBrowser) {
  amplitudePromise = import('@amplitude/analytics-browser').then(async (ampModule) => { // Added async
    amplitude = ampModule;
    Identify = ampModule.Identify;
    // Dynamically import the plugin *after* the main module
    try {
      // Use the imported module directly
      sessionReplay = await import('@amplitude/plugin-session-replay-browser');
      console.log("Amplitude Session Replay plugin loaded.");
    } catch (pluginErr) {
      console.error("Failed to load Amplitude Session Replay plugin:", pluginErr);
      // Decide if Amplitude should still initialize without replay or fail
    }
    console.log("Amplitude module loaded.");
    return ampModule; // Return the main module for chaining
  }).catch(err => console.error("Failed to load Amplitude module:", err));

  mixpanelPromise = import('mixpanel-browser').then((mixModule) => {
    mixpanel = mixModule.default;
    console.log("Mixpanel module loaded.");
    return mixModule.default; // Return the module for chaining
  }).catch(err => console.error("Failed to load Mixpanel module:", err));
}

export const initializeAnalytics = async () => { // Make async to await module load
  if (!isBrowser) {
    return;
  }
  // Ensure this runs only once conceptually, readiness flags prevent re-init
  if (isAmplitudeReady || isMixpanelReady) {
      console.log("Analytics already initializing/initialized.")
      return;
  }

  console.log("Initializing analytics...");

  const amplitudeApiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  const mixpanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

  // Wait for modules to load, then initialize
  try {
    if (amplitudeApiKey && amplitudePromise) {
      await amplitudePromise; // Ensure module and plugin are loaded
      if (amplitude && !isAmplitudeReady) { // Check if already initialized
        const pluginsToAdd = [];
        let replayPluginInstance: any = null; // To hold the instance

        if (sessionReplay && sessionReplay.plugin) { // Check the imported module has 'plugin'
          replayPluginInstance = sessionReplay.plugin(); // Instantiate the plugin using the function
          pluginsToAdd.push(replayPluginInstance);
          console.log("Session Replay plugin instantiated.");
        } else {
          console.warn("Session Replay plugin not available or loaded incorrectly for initialization.");
        }

        amplitude.init(amplitudeApiKey, undefined, {
          defaultTracking: {
            pageViews: true,
            sessions: true,
            formInteractions: true,
            fileDownloads: true,
          },
          plugins: pluginsToAdd, // Add the plugin instance here
        });
        isAmplitudeReady = true;
        console.log("Amplitude initialized.");

        // Initialize the session replay plugin *after* main init
        if (replayPluginInstance) {
          try {
            // Configure session replay - minimal config for now
            // IMPORTANT: Add detailed masking rules here for production!
            await replayPluginInstance.init({
              sampleRate: 0.1, // Start with 10% sample rate
              // maskAllInputs: true, // Example: Re-enable and add more rules later
            }).promise;
            console.log("Amplitude Session Replay plugin initialized.");
          } catch (replayInitError) {
            console.error("Failed to initialize Amplitude Session Replay plugin:", replayInitError);
          }
        }

      } else if (!amplitude) {
          console.warn("Amplitude module failed to load before init call.")
      }
    } else if (amplitudeApiKey) {
      console.warn("Amplitude API Key provided, but module promise missing.");
    } else {
        // console.warn("Amplitude API Key missing.");
    }

    if (mixpanelToken && mixpanelPromise) {
      await mixpanelPromise; // Ensure module is loaded
      if (mixpanel && !isMixpanelReady) { // Check if already initialized
        mixpanel.init(mixpanelToken, {
          debug: process.env.NODE_ENV === 'development', 
          track_pageview: true, 
          persistence: 'localStorage'
        });
        isMixpanelReady = true;
        console.log("Mixpanel initialized.");
      } else if (!mixpanel) {
          console.warn("Mixpanel module failed to load before init call.")
      }
    } else if (mixpanelToken) {
      console.warn("Mixpanel Token provided, but module promise missing.");
    } else {
        // console.warn("Mixpanel Token missing.");
    }

  } catch (error) {
      console.error("Error during analytics initialization:", error);
  }
  // Remove setting global flag here
  // isInitialized = true; 
};

// --- Event Tracking ---
export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  if (!isBrowser) {
    console.log(`[Server] Would track: ${eventName}`);
    return;
  }

  // Track with Amplitude only if ready
  if (isAmplitudeReady && amplitude) {
    amplitude.track(eventName, properties);
  } else if (process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) {
      // Optional: Queue event or log warning if not ready?
      console.warn(`Amplitude not ready, event skipped: ${eventName}`);
  }

  // Track with Mixpanel only if ready
  if (isMixpanelReady && mixpanel) {
    mixpanel.track(eventName, properties);
  } else if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
      // Optional: Queue event or log warning if not ready?
       console.warn(`Mixpanel not ready, event skipped: ${eventName}`);
  }

  // Log if neither is configured (for debugging)
  if (!process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY && !process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    console.log(`[Analytics Event - No Service Configured]: ${eventName}`, properties || "");
  }
};

// --- User Identification ---
export const identifyUser = (
  userId: string,
  userProperties?: Record<string, any>
) => {
  if (!isBrowser) return;

  // Identify with Amplitude only if ready
  if (isAmplitudeReady && amplitude && Identify) {
    amplitude.setUserId(userId);
    if (userProperties) {
      const ampIdentify = new Identify();
      for (const key in userProperties) {
        ampIdentify.set(key, userProperties[key]);
      }
      amplitude.identify(ampIdentify);
    }
  } else if (process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) {
      console.warn(`Amplitude not ready, identify skipped for user: ${userId}`);
  }

  // Identify with Mixpanel only if ready
  if (isMixpanelReady && mixpanel) {
    mixpanel.identify(userId);
    if (userProperties) {
      mixpanel.people.set(userProperties);
    }
  } else if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
      console.warn(`Mixpanel not ready, identify skipped for user: ${userId}`);
  }
};

// --- Reset Identification ---
export const resetAnalyticsUser = () => {
  if (!isBrowser) return;

  // Reset Amplitude only if ready
  if (isAmplitudeReady && amplitude) {
    amplitude.reset();
  }

  // Reset Mixpanel only if ready
  if (isMixpanelReady && mixpanel) {
    mixpanel.reset();
  }
}; 