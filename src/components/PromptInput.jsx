// PromptInput v0.4 — examples cap nhat cho multi-page, v0.11 i18n
import { useState, useEffect, useRef } from 'react'
import { useT, useLanguage } from '../hooks/useLanguage'

const EXAMPLES_NEW_VI = [
  'Website quan ca phe — co Home, Menu, Lien he',
  'Website shop thoi trang nu — Home, San pham, Gioi thieu, Lien he',
  'Website dich vu sua xe may — Trang chu, Bang gia, Lien he',
  'Website spa massage — Home, Dich vu, Gallery, Dat lich'
]
const EXAMPLES_NEW_EN = [
  'Coffee shop website with Home, Menu, Contact',
  'Fashion boutique — Home, Products, About, Contact',
  'Motorbike repair service — Home, Pricing, Contact',
  'Spa & massage — Home, Services, Gallery, Book online'
]

const EXAMPLES_ITERATE_VI = [
  'Them trang San pham vao website',
  'Doi mau chu dao tat ca page sang xanh la',
  'Sua so dien thoai trong trang Lien he thanh 0901234567',
  'Them animation hover cho menu navigation',
  'Xoa trang Gioi thieu'
]
const EXAMPLES_ITERATE_EN = [
  'Add a Products page to the website',
  'Change the primary color to green across all pages',
  'Update the phone number on the Contact page to 0901234567',
  'Add hover animation to navigation menu',
  'Remove the About page'
]

export default function PromptInput({
  onSubmit, isStreaming, streamMode, currentProjectId, currentProjectName
}) {
  const t = useT()
  const { lang } = useLanguage()
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  const isIterate = !!currentProjectId
  const examples = isIterate
    ? (lang === 'en' ? EXAMPLES_ITERATE_EN : EXAMPLES_ITERATE_VI)
    : (lang === 'en' ? EXAMPLES_NEW_EN : EXAMPLES_NEW_VI)

  useEffect(() => { setText('') }, [currentProjectId])
  useEffect(() => { if (!isStreaming) textareaRef.current?.focus() }, [isStreaming, currentProjectId])

  function submit() {
    if (!text.trim() || isStreaming) return
    onSubmit(text.trim(), currentProjectId)
    setText('')
  }

  return (
    <div className="p-4 border-b border-ink-200 bg-white">

      {isIterate && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-50 border border-brand-100">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-brand-700 uppercase tracking-wider">
              {t('prompt.currentProject')}
            </div>
            <div className="text-xs text-brand-900 truncate font-medium">
              {currentProjectName}
            </div>
          </div>
        </div>
      )}

      <label className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
        {isIterate ? t('prompt.labelIterate') : t('prompt.labelNew')}
      </label>

      <div className="mt-1.5 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
          }}
          placeholder={isIterate ? t('prompt.placeholderIterate') : t('prompt.placeholderNew')}
          rows={4}
          className="w-full px-3 py-2.5 rounded-lg border border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm resize-none placeholder:text-ink-400 transition"
          disabled={isStreaming}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-ink-400">
          <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-ink-600 text-[10px] font-mono">{t('prompt.hint')}</kbd>
        </span>
        <button
          onClick={submit}
          disabled={isStreaming || !text.trim()}
          className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed text-white text-xs font-semibold transition shadow-soft hover:shadow-card"
        >
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {t('prompt.submitting')}
            </span>
          ) : (
            isIterate ? t('prompt.submitIterate') : t('prompt.submitNew')
          )}
        </button>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
          {t('prompt.suggestionsTitle')}
        </p>
        <div className="space-y-0.5">
          {examples.map((ex, i) => (
            <button key={i}
              onClick={() => { setText(ex); textareaRef.current?.focus() }}
              disabled={isStreaming}
              className="w-full text-left text-[11px] px-2 py-1.5 rounded-md text-ink-600 hover:bg-ink-50 hover:text-brand-700 transition disabled:opacity-50"
            >
              → {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
