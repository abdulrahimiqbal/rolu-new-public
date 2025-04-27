"use client";

/**
 * A utility module for browser-specific code that should only run on the client side.
 * This helps prevent "window is not defined" errors during server-side rendering.
 */

/**
 * Returns true if running in browser, false on server
 * Helps prevent "window is not defined" errors
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Safely access the window object
 * @returns The window object or null if not in browser
 */
export const getWindow = (): (Window & typeof globalThis) | null => {
  if (isBrowser()) {
    return window;
  }
  return null;
};

/**
 * Safely access the document object
 * @returns The document object or null if not in browser
 */
export const getDocument = (): Document | null => {
  if (typeof document !== 'undefined') {
    return document;
  }
  return null;
};

/**
 * Run a function only on the client side
 * @param fn Function to run on client
 */
export const runOnClient = (fn: () => void): void => {
  if (isBrowser()) {
    fn();
  }
};

/**
 * Safe access to localStorage with fallbacks
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser()) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Error accessing localStorage.getItem for key "${key}":`, error);
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    if (!isBrowser()) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Error in localStorage.setItem for key "${key}":`, error);
      return false;
    }
  },
  removeItem: (key: string): boolean => {
    if (!isBrowser()) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Error in localStorage.removeItem for key "${key}":`, error);
      return false;
    }
  }
};

/**
 * Safe access to sessionStorage with fallbacks
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser()) return null;
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn(`Error accessing sessionStorage.getItem for key "${key}":`, error);
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    if (!isBrowser()) return false;
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Error in sessionStorage.setItem for key "${key}":`, error);
      return false;
    }
  },
  removeItem: (key: string): boolean => {
    if (!isBrowser()) return false;
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Error in sessionStorage.removeItem for key "${key}":`, error);
      return false;
    }
  }
};

/**
 * Safely map over an array, handling undefined/null cases
 * Prevents "undefined is not a function (near '...n.map...')" errors
 */
export function safeMap<T, U>(array: T[] | null | undefined, callback: (item: T, index: number) => U): U[] {
  if (!array) return [];
  return Array.isArray(array) ? array.map(callback) : [];
}

/**
 * Safely access properties that might be undefined
 */
export function safeProp<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  if (!obj) return undefined;
  return obj[key];
}

/**
 * Parse JSON safely
 */
export function safeParseJSON<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('Error parsing JSON:', error);
    return fallback;
  }
}

/**
 * Safe async function execution that won't crash the UI
 */
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await asyncFn();
  } catch (error) {
    console.error('Async error caught:', error);
    return fallback;
  }
}

/**
 * Safely fetch data with error handling
 */
export async function safeFetch<T>(
  url: string, 
  options?: RequestInit,
  fallback: T | null = null
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return { 
      data: fallback, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
}

/**
 * Safe DOM element handling that prevents null reference errors
 */
export function safeQuerySelector<T extends Element>(
  selector: string
): T | null {
  if (!isBrowser()) return null;
  
  try {
    return document.querySelector<T>(selector);
  } catch (error) {
    console.error(`Error querying selector "${selector}":`, error);
    return null;
  }
}

/**
 * Handle undefined errors in array operations
 */
export function getSafeArray<T>(possibleArray: T[] | null | undefined): T[] {
  if (!possibleArray) return [];
  return Array.isArray(possibleArray) ? possibleArray : [];
} 