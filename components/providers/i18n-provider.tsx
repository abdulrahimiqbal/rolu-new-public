"use client";

import "@/lib/i18n"; // Initialize i18next
import { I18nextProvider } from "react-i18next";
import { ReactNode, useEffect, useState } from "react";
import i18n from "@/lib/i18n";

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * I18nProvider wraps the application to provide i18n context
 * It ensures i18n is initialized and handles RTL for Arabic language
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // On mount, ensure default language is set
    const storedLang = localStorage.getItem("i18nextLng");
    if (!storedLang) {
      i18n.changeLanguage("en");
      localStorage.setItem("i18nextLng", "en");
    }

    // Handle RTL direction for Arabic language
    const html = document.documentElement;
    const isRTL = i18n.language === "ar";

    if (isRTL) {
      html.setAttribute("dir", "rtl");
      html.classList.add("rtl");
    } else {
      html.setAttribute("dir", "ltr");
      html.classList.remove("rtl");
    }

    // Listen for language changes to update RTL/LTR
    const handleLanguageChange = (lng: string) => {
      const isRTL = lng === "ar";
      if (isRTL) {
        html.setAttribute("dir", "rtl");
        html.classList.add("rtl");
      } else {
        html.setAttribute("dir", "ltr");
        html.classList.remove("rtl");
      }
    };

    i18n.on("languageChanged", handleLanguageChange);

    setMounted(true);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, []);

  if (!mounted) {
    return null; // Prevent rendering until client-side mount
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
