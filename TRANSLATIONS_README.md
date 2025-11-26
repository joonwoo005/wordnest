# Translation System Guide

## Important Reminder: Always Add Translations for New Text

This app has a comprehensive bilingual translation system (English and Chinese). Whenever you add new text to the UI, you **MUST** add translations for both languages.

## How to Use Translations

### 1. Adding a New Translation Key

Edit `/utils/translations.ts` and add your key to both `en` and `zh` objects:

```typescript
export const translations: Record<Language, Record<string, string>> = {
  en: {
    'myNewKey': 'English text here',
  },
  zh: {
    'myNewKey': '中文文本在这里',
  },
};
```

### 2. Using the Translation in Your Component

Import the `t` function and use it with the current language:

```typescript
import { t } from '@/utils/translations';

// In your component
const language = appState?.language || 'en';

<Text>{t('myNewKey', language)}</Text>
```

### 3. Using Translations with Parameters

For dynamic text like names, use parameter replacement:

```typescript
// In translations.ts
'welcome': 'Welcome, {username}!',
'欢迎': '欢迎，{username}！',

// In component
<Text>{t('welcome', language, { username: 'John' })}</Text>
```

## Files Updated with Translations

- ✅ `/app/index.tsx` - Home screen
- ✅ `/components/Sidebar.tsx` - Sidebar
- ✅ `/app/add-word.tsx` - Add word screen
- ✅ `/app/edit-word.tsx` - Edit word screen
- ✅ `/app/onboarding.tsx` - Onboarding screen

## Common Translation Keys

### UI Labels
- `addNewWord` - Button text for adding words
- `save` - Save button
- `delete` - Delete button
- `cancel` - Cancel button
- `back` - Back button

### Messages
- `error` - Error title
- `success` - Success title
- `selectFolder` - Please select a folder message
- `fillAllFields` - Please fill all fields message

### Screen Titles
- `addWord` - Add Word screen title
- `editWord` - Edit Word screen title

### Form Labels
- `chineseLabel` - Chinese label
- `pinyinLabel` - Pinyin label
- `englishLabel` - English label

## Language Toggle

The language can be toggled using the language button in the top-right of the home screen. This changes `appState.language` between `'en'` and `'zh'`, and all UI text will update accordingly.

## Adding Translations to New Screens

When creating a new screen:

1. Add import: `import { t } from '@/utils/translations';`
2. Add all translation keys to `/utils/translations.ts` for both languages
3. Replace all hardcoded UI text with `t('key', language)` calls
4. Always use `appState?.language || 'en'` as a fallback

## Checklist for New Features

- [ ] Created translation keys in `utils/translations.ts` for both English and Chinese
- [ ] Imported `t` function from `@/utils/translations`
- [ ] Replaced all hardcoded text with translation calls
- [ ] Used `appState?.language` or `language` prop to pass the language
- [ ] Tested the feature with both language modes
