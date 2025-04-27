// Basic i18n utility for localization
// In a real app, we would use a more robust solution like next-intl or react-i18next

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from '@/locales/en/common.json';
import esCommon from '@/locales/es/common.json';
import arCommon from '@/locales/ar/common.json';
import idCommon from '@/locales/id/common.json';
import msCommon from '@/locales/ms/common.json';
import ptCommon from '@/locales/pt/common.json';
import hiCommon from '@/locales/hi/common.json';
import zhCommon from '@/locales/zh/common.json';
// Placeholder imports for new languages - create these files when available
import frCommon from '@/locales/fr/common.json';
import itCommon from '@/locales/it/common.json';
import deCommon from '@/locales/de/common.json';

// List of supported languages
export const supportedLngs = ['en', 'es', 'ar', 'id', 'ms', 'pt', 'hi', 'zh', 'fr', 'it', 'de']; // Add more as needed

// Resources object containing all translations
const resources = {
    en: {
        common: enCommon,
    },
    es: {
        common: esCommon,
    },
    ar: {
        common: arCommon,
    },
    id: {
        common: idCommon,
    },
    ms: {
        common: msCommon,
    },
    pt: {
        common: ptCommon,
    },
    hi: {
        common: hiCommon,
    },
    zh: {
        common: zhCommon,
    },
    fr: {
        common: frCommon,
    },
    it: {
        common: itCommon,
    },
    de: {
        common: deCommon,
    },
    // Add other languages here
};

// Initialize i18n only once
if (!i18n.isInitialized) {
    i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources,
            supportedLngs,
            fallbackLng: 'en',
            defaultNS: 'common',
            interpolation: {
                escapeValue: false, // React already safes from xss
            },
            react: {
                useSuspense: false, // We're not using Suspense for translations
            },
            detection: {
                order: ['localStorage', 'navigator'],
                lookupLocalStorage: 'i18nextLng',
                caches: ['localStorage'],
            },
        });
}

export default i18n;

// Export the Locale type
export type Locale = 'en' | 'es' | 'ar' | 'id' | 'ms' | 'pt' | 'hi' | 'zh' | 'fr' | 'it' | 'de';

// Default locale
let currentLocale: Locale = 'en';

// Get browser language
export function detectBrowserLanguage(): Locale {
    if (typeof window === 'undefined') return 'en';

    const browserLang = navigator.language.split('-')[0];

    switch (browserLang) {
        case 'es':
            return 'es';
        case 'ar':
            return 'ar';
        case 'id':
            return 'id';
        case 'ms':
            return 'ms';
        case 'pt':
            return 'pt';
        case 'hi':
            return 'hi';
        case 'zh':
            return 'zh';
        case 'fr':
            return 'fr';
        case 'it':
            return 'it';
        case 'de':
            return 'de';
        default:
            return 'en';
    }
}

// Set the current locale
export function setLocale(locale: Locale): void {
    currentLocale = locale;

    // In a real app, we would store this in localStorage
    if (typeof window !== 'undefined') {
        localStorage.setItem('locale', locale);
    }

    // Update document direction for RTL languages
    if (typeof document !== 'undefined') {
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    }
}

// Initialize locale from localStorage or browser
export function initLocale(): void {
    if (typeof window === 'undefined') return;

    const savedLocale = localStorage.getItem('locale') as Locale | null;

    if (savedLocale && supportedLngs.includes(savedLocale)) {
        setLocale(savedLocale);
    } else {
        setLocale(detectBrowserLanguage());
    }
}

// Get a translation
export function t(key: string, params?: Record<string, string>): string {
    const translation = i18n.t(key, params);
    return translation;
}

// Get the current locale
export function getLocale(): Locale {
    return currentLocale;
}

// Check if the current locale is RTL
export function isRTL(): boolean {
    return currentLocale === 'ar';
} 