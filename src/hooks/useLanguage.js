// ========================================================================
//  useLanguage.js — Hook quan ly ngon ngu (v0.11)
// ========================================================================
//  - Doc/luu ngon ngu vao localStorage
//  - Default: 'vi'
//  - Re-render moi component khi user toggle qua window event
// ========================================================================

import { useState, useEffect, useCallback } from 'react'
import { translate } from '../lib/i18n'

const STORAGE_KEY = 'daisan_lang'
const DEFAULT_LANG = 'vi'

// Custom event de cac component khac biet khi language change
const LANG_CHANGE_EVENT = 'daisan:lang-change'

export function useLanguage() {
  const [lang, setLangState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LANG
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG
  })

  // Listen for global lang change events (cross-component sync)
  useEffect(() => {
    function handleChange(e) {
      setLangState(e.detail.lang)
    }
    window.addEventListener(LANG_CHANGE_EVENT, handleChange)
    return () => window.removeEventListener(LANG_CHANGE_EVENT, handleChange)
  }, [])

  const setLang = useCallback((newLang) => {
    if (newLang !== 'vi' && newLang !== 'en') return
    window.localStorage.setItem(STORAGE_KEY, newLang)
    window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: { lang: newLang } }))
    setLangState(newLang)
  }, [])

  return { lang, setLang }
}

/**
 * Convenience hook — returns a memoized translation function bound to current language.
 * Usage:
 *   const t = useT()
 *   <h1>{t('header.title')}</h1>
 */
export function useT() {
  const { lang } = useLanguage()
  return useCallback((key) => translate(lang, key), [lang])
}
