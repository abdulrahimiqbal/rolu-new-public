# Rolu Translation System

This document explains how the translation system works in the Rolu educational gaming platform and provides instructions for managing translations.

## Overview

The Rolu platform supports multiple languages, with a focus on:

- English (default)
- Spanish (es)
- Arabic (ar)

The translation system consists of two main components:

1. UI translations using i18next for static text
2. Dynamic quiz content translation using Google Translate API

## UI Translations

UI translations are managed through i18next and stored in JSON files located in the `locales` directory.

```
/locales
  /en            # English
    common.json  # Common translations
    game.json    # Game-specific translations
  /es            # Spanish
  /ar            # Arabic
```

### Adding New UI Translations

To add new UI text that needs translation:

1. Add the key to the appropriate file in `/locales/en/`
2. Add the same key with translated content in the other language files

Example:

```json
// locales/en/common.json
{
  "profile": {
    "title": "Your Profile"
  }
}

// locales/es/common.json
{
  "profile": {
    "title": "Tu Perfil"
  }
}
```

### Using Translations in Components

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();

  return <h1>{t("profile.title")}</h1>;
}
```

## Quiz Content Translation

Quiz questions and options are stored in the database and can be dynamically translated. The translations are stored in:

- `QuizTranslation` table for quiz questions
- `QuizOptionTranslation` table for quiz options

### How It Works

1. When a quiz is loaded in a non-English language, the system checks for existing translations
2. If translations exist, they are used
3. If no translations exist, the content is translated on-the-fly using Google Translate API
4. Translations are stored in the database for future use

### Translation Service

The `translation-service.ts` handles all quiz content translation with the following main functions:

- `getQuizInUserLanguage`: Gets a quiz with translations for a specific language
- `getRandomQuizWithTranslation`: Gets a random quiz for a brand with translations
- `prefetchBrandQuizTranslations`: Preloads translations for all quizzes for a brand

### Admin Tools for Translation Management

For database administrators and content managers, we provide several tools to manage translations:

#### Generate Missing Translations

To fill in missing translations for quiz options:

```bash
# Translate all quiz options for a specific brand and language
npx ts-node scripts/translate-quiz-options.ts [brandId] [languageCode]

# Example:
npx ts-node scripts/translate-quiz-options.ts rolu-brand es
```

To translate for all supported languages and brands at once:

```bash
./scripts/translate-all-quiz-options.sh
```

#### Check Existing Translations

To check the current state of translations:

```bash
npx ts-node scripts/check-translations.ts [brandId] [languageCode]

# Example:
npx ts-node scripts/check-translations.ts rolu-brand es
```

## Adding New Languages

To add support for a new language:

1. Create new folders in `/locales/[language-code]/`
2. Copy the JSON structure from the English files
3. Translate the values
4. Add the language to the language selector in the app

## Translation Quality

The automatic translations provided by Google Translate are machine translations and may require manual review for 100% accuracy. For critical content, we recommend manually reviewing and updating the translations in the database.

## Troubleshooting

### Missing or Incorrect Translations

1. Check if the translation exists in the database using the check-translations script
2. Run the translate-quiz-options script to generate missing translations
3. For incorrect translations, you can update them directly in the database

### Google Translate API Issues

If the Google Translate API is not functioning:

1. Check that the `GOOGLE_TRANSLATE_API_KEY` is set correctly in your environment
2. Verify the API quota has not been exceeded
3. The system will fall back to mock translations (prefixed with language code)
