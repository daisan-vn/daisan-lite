// PromptInput v0.2 — co 2 mode:
//  - Khi chua chon project: tao moi (placeholder + suggestion)
//  - Khi dang xem project: tinh chinh (placeholder thay doi)
import { useState, useEffect, useRef } from 'react'

const EXAMPLES_NEW = [
  'Landing page cho quan ca phe — co menu, dia chi, so dien thoai',
  'Trang shop thoi trang nu — phong cach toi gian, banner lon',
  'Trang dich vu sua xe may — bang gia, form lien he, gio mo cua',
  'Web gioi thieu spa massage — gallery anh, dat lich, danh gia'
]

const EXAMPLES_ITERATE = [
  'Doi mau chu dao sang xanh la',
  'Them section "Khach hang noi gi"',
  'Sua so dien thoai thanh 0901234567',
  'Them animation hover cho nut',
  'Lam header co dinh khi scroll'
]

export default function PromptInput({
  onSubmit, isStreaming, streamMode, currentProjectId, currentProjectName
}) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  const isIterate = !!currentProjectId
  const examples = isIterate ? EXAMPLES_ITERATE : EXAMPLES_NEW

  // Khi chuyen sang iterate mode, clear input
  useEffect(() => {
    setText('')
  }, [currentProjectId])

  // Auto focus
  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus()
  }, [isStreaming, currentProjectId])

  function submit() {
    if (!text.trim() || isStreaming) return
    onSubmit(text.trim(), currentProjectId)
    setText('')
  }

  return (
    <div className="p-4 border-b border-ink-200 bg-white">

      {/* Mode badge */}
      {isIterate && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-50 border border-brand-100">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-brand-700 uppercase tracking-wider">
              Dang tinh chinh
            </div>
            <div className="text-xs text-brand-900 truncate font-medium">
              {currentProjectName}
            </div>
          </div>
        </div>
      )}

      <label className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
        {isIterate ? 'Yeu cau thay doi' : 'Mo ta trang web ban muon'}
      </label>

      <div className="mt-1.5 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
          }}
          placeholder={isIterate
            ? 'VD: Doi mau nen sang xanh, them form dang ky email...'
            : 'VD: Tao landing page cho quan pho Ha Noi voi menu, dia chi, so dien thoai...'
          }
          rows={4}
          className="w-full px-3 py-2.5 rounded-lg border border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm resize-none placeholder:text-ink-400 transition"
          disabled={isStreaming}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-ink-400">
          <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-ink-600 text-[10px] font-mono">Ctrl+Enter</kbd>
        </span>
        <button
          onClick={submit}
          disabled={isStreaming || !text.trim()}
          className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed text-white text-xs font-semibold transition shadow-soft hover:shadow-card"
        >
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {streamMode === 'iterate' ? 'Dang sua...' : 'Dang tao...'}
            </span>
          ) : (
            isIterate ? '↻ Cap nhat' : '+ Tao web'
          )}
        </button>
      </div>

      {/* Suggestions */}
      <div className="mt-3">
        <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
          Goi y nhanh
        </p>
        <div className="space-y-0.5">
          {examples.map((ex, i) => (
            <button
              key={i}
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
