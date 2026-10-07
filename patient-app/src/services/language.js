const LANGUAGE_ALIASES = new Map([
  ['en', 'en'], ['en-us', 'en'], ['en-in', 'en'], ['english', 'en'], ['english (us)', 'en'],
  ['gu', 'gu'], ['gu-in', 'gu'], ['gujarati', 'gu'], ['ગુજરાતી', 'gu'],
  ['hi', 'hi'], ['hi-in', 'hi'], ['hindi', 'hi'], ['हिन्दी', 'hi'], ['हिंदी', 'hi'],
  ['mr', 'mr'], ['mr-in', 'mr'], ['marathi', 'mr'], ['मराठी', 'mr'],
  ['ta', 'ta'], ['ta-in', 'ta'], ['tamil', 'ta'], ['தமிழ்', 'ta'],
  ['te', 'te'], ['te-in', 'te'], ['telugu', 'te'], ['తెలుగు', 'te'],
  ['kn', 'kn'], ['kn-in', 'kn'], ['kannada', 'kn'], ['ಕನ್ನಡ', 'kn'],
  ['ml', 'ml'], ['ml-in', 'ml'], ['malayalam', 'ml'], ['മലയാളം', 'ml'],
  ['bn', 'bn'], ['bn-in', 'bn'], ['bengali', 'bn'], ['বাংলা', 'bn'],
  ['pa', 'pa'], ['pa-in', 'pa'], ['punjabi', 'pa'], ['ਪੰਜਾਬੀ', 'pa'],
])

export const LANGUAGE_LOCALES = {
  en: 'en-IN', gu: 'gu-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN',
  te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', bn: 'bn-IN', pa: 'pa-IN',
}

export function normalizeLanguage(value, fallback = 'en') {
  if (typeof value !== 'string') return fallback

  const normalized = value.trim().toLowerCase().replace(/_/g, '-')
  if (!normalized) return fallback

  return LANGUAGE_ALIASES.get(normalized) ||
    LANGUAGE_ALIASES.get(normalized.split('-')[0]) ||
    fallback
}

export function languageToLocale(value) {
  return LANGUAGE_LOCALES[normalizeLanguage(value)] || LANGUAGE_LOCALES.en
}
