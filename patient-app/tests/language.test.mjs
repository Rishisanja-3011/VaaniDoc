import { describe, expect, it } from 'vitest'
import {
  languageToLocale,
  normalizeLanguage,
} from '../src/services/language.js'

describe('language normalization', () => {
  it.each([
    ['English', 'en'],
    ['en-US', 'en'],
    ['Gujarati', 'gu'],
    ['gu-IN', 'gu'],
    ['Hindi', 'hi'],
    ['Marathi', 'mr'],
    ['Tamil', 'ta'],
    ['Telugu', 'te'],
    ['Kannada', 'kn'],
    ['Malayalam', 'ml'],
    ['Bengali', 'bn'],
    ['Punjabi', 'pa'],
  ])('normalizes %s to %s', (value, expected) => {
    expect(normalizeLanguage(value)).toBe(expected)
  })

  it('does not silently turn an unsupported value into a supported voice', () => {
    expect(normalizeLanguage('xx-XX', null)).toBeNull()
  })

  it('maps canonical language codes to speech locales', () => {
    expect(languageToLocale('gu')).toBe('gu-IN')
    expect(languageToLocale('hi-IN')).toBe('hi-IN')
  })
})
