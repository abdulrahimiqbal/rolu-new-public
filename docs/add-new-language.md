# Adding a New Language to Rolu Platform

This guide provides step-by-step instructions for adding support for a new language to the Rolu educational gaming platform. The platform uses two translation mechanisms:

1. **Static UI Translations**: Using i18next for UI text, stored in JSON files
2. **Dynamic Quiz Translations**: Using Google Translate API for quiz content, stored in the database

## Prerequisites

- Access to the codebase
- Basic understanding of React and Next.js
- Google Translate API key (for dynamic translations)

## Step 1: Add a New Language to i18n

### 1.1 Create Language Files

1. Navigate to the `/locales` directory
2. Create a new folder with the [ISO language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) of the language you want to add (e.g., `fr` for French)
3. Copy all JSON files from the `/locales/en` directory to your new language directory

```bash
# Example for adding French
mkdir -p locales/fr
cp locales/en/*.json locales/fr/
```

### 1.2 Translate the Content

1. Edit each JSON file in your new language directory
2. Translate the values (right side) without changing the keys (left side)

Example:

```json
// locales/fr/common.json
{
  "nav": {
    "home": "Accueil",
    "play": "Jouer",
    "profile": "Profil"
  }
}
```

### 1.3 Update i18n Configuration

1. Open `lib/i18n.ts` (or similar file where i18n is configured)
2. Add your new language code to the list of supported languages

```typescript
// Before
const supportedLngs = ["en", "es", "ar"];

// After
const supportedLngs = ["en", "es", "ar", "fr"];
```

## Step 2: Update the Language Selector Component

1. Locate the language selector component (typically in `components/language-selector.tsx`)
2. Add your new language to the options list:

```tsx
// Before
const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "ar", name: "العربية" },
];

// After
const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "ar", name: "العربية" },
  { code: "fr", name: "Français" },
];
```

## Step 3: Configure Dynamic Quiz Translations

### 3.1 Update Mock Translation Function

1. Open `lib/translation-service.ts`
2. Add a new case to the `mockTranslate` function for your language:

```typescript
// Before
function mockTranslate(text: string, targetLang: string): string {
  if (!text) return "";
  if (targetLang === "es") return `[ES] ${text}`;
  if (targetLang === "ar") return `[AR] ${text}`;
  return text;
}

// After
function mockTranslate(text: string, targetLang: string): string {
  if (!text) return "";
  if (targetLang === "es") return `[ES] ${text}`;
  if (targetLang === "ar") return `[AR] ${text}`;
  if (targetLang === "fr") return `[FR] ${text}`;
  return text;
}
```

### 3.2 Test RTL Support (if needed)

If your new language is right-to-left (RTL), ensure it's added to the RTL handling logic in your application.

```typescript
// Example - typically found in UI wrapper or layout files
const rtlLanguages = ["ar", "he"]; // Add your RTL language here if needed
const isRtl = rtlLanguages.includes(currentLanguage);
```

## Step 4: Seed Initial Translations in the Database (Optional)

If you want to pre-translate existing quiz content instead of waiting for on-the-fly translation:

1. Ensure your environment has a valid `GOOGLE_TRANSLATE_API_KEY`
2. Run the following command to translate all quiz content for each brand:

```bash
# Replace 'fr' with your language code
# Replace 'rolu-brand' with the brand ID you want to translate for
npx ts-node scripts/translate-quiz-options.ts rolu-brand fr
```

## Step 5: Testing

1. **UI Testing**: Switch to the new language and verify all UI elements are correctly translated
2. **Quiz Testing**: Play a game with the new language selected and verify that quiz questions and options are translated
3. **RTL Testing**: If the language is RTL, verify that the layout correctly flips

## Step 6: Handling Special Cases

### 6.1 Date and Number Formatting

Ensure date and number formatting functions support your new language:

```typescript
// Example for date formatting
const formatDate = (date, language) => {
  return new Date(date).toLocaleDateString(language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
```

### 6.2 Font Support

Ensure your fonts support the characters needed for the new language. Update your font configuration if necessary:

```css
/* Example - add new font for specific language */
html[lang="fr"] body {
  font-family: "Your French Font", sans-serif;
}
```

## Troubleshooting

### Missing Translations

If UI elements show up in English despite language switching:

- Check that all keys exist in your new language JSON files
- Verify the language is correctly set in i18n

### Quiz Content Not Translating

If quiz content doesn't translate:

- Verify your Google Translate API key is valid
- Check server logs for translation errors
- Manually run the translation script for the specific brand and language

### RTL Issues

If RTL layout looks incorrect:

- Ensure your CSS uses logical properties (e.g., `margin-inline-start` instead of `margin-left`)
- Verify the RTL language detection is working correctly

## Adding Multiple Languages at Once

To add several languages at once, simply repeat the above steps for each language code. You can also use this script to automate JSON file creation:

```bash
# Example script to create multiple language folders
LANGUAGES=("fr" "de" "it" "ja")
for lang in "${LANGUAGES[@]}"; do
  mkdir -p "locales/$lang"
  cp locales/en/*.json "locales/$lang/"
  echo "Created files for $lang"
done
```

## Reference

- [i18next Documentation](https://www.i18next.com/)
- [ISO Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
- [Google Translate API Documentation](https://cloud.google.com/translate/docs)
