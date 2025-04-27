"use client";

import { useTranslation } from "react-i18next";
import { supportedLngs } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, any>) => void;
    };
  }
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languageFlags: Record<string, string> = {
    en: "🇺🇸 EN",
    es: "🇪🇸 ES",
    ar: "🇸🇦 AR",
    id: "🇮🇩 ID",
    ms: "🇲🇾 MS",
    pt: "🇵🇹 PT",
    hi: "🇮🇳 HI",
    zh: "🇨🇳 ZH",
    fr: "🇫🇷 FR",
    it: "🇮🇹 IT",
    de: "🇩🇪 DE",
  };

  const changeLanguage = (lng: string) => {
    console.log("Changing language to:", lng);
    i18n.changeLanguage(lng);
    console.log("Language after change:", i18n.language);

    // Track the language change with Umami
    if (typeof window !== "undefined" && window.umami) {
      window.umami.track(`language-changed-${lng}`, {
        language: lng,
        previousLanguage: i18n.language,
      });
    }
  };

  return (
    <Select
      onValueChange={changeLanguage}
      data-umami-event="language-switcher-clicked"
      defaultValue={i18n.language}
    >
      <SelectTrigger className="outline-none border-none focus:ring-0 w-14 bg-primary/20">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {supportedLngs.map((lng) => (
            <SelectItem key={lng} value={lng}>
              {languageFlags[lng] || lng.toUpperCase()}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
