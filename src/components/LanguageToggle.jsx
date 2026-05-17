// ========================================================================
//  LanguageToggle.jsx — Nut chuyen ngon ngu VI <-> EN (v0.11)
// ========================================================================

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { SUPPORTED_LANGUAGES } from '../lib/i18n'

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-ink-100 transition text-sm"
        title="Change language / Doi ngon ngu"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="text-xs font-medium text-ink-700 uppercase">{current.code}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ink-500">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-ink-200 rounded-xl shadow-card overflow-hidden z-50">
          {SUPPORTED_LANGUAGES.map(l => {
            const isActive = l.code === lang
            return (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm transition flex items-center gap-2 ${
                  isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'hover:bg-ink-50 text-ink-700'
                }`}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="flex-1">{l.name}</span>
                {isActive && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
