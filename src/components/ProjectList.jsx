// ProjectList v0.2 — co delete + rename, hover de hien action. v0.11 i18n
import { useState } from 'react'
import { useT } from '../hooks/useLanguage'

export default function ProjectList({
  projects, currentId, onSelect, onDelete, onRename, disabled
}) {
  const t = useT()
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  function timeAgo(iso) {
    if (!iso) return ''
    const s = (Date.now() - new Date(iso).getTime()) / 1000
    if (s < 60)    return t('projects.timeJustNow')
    if (s < 3600)  return `${Math.floor(s/60)} ${t('projects.timeMinuteAgo')}`
    if (s < 86400) return `${Math.floor(s/3600)} ${t('projects.timeHourAgo')}`
    return `${Math.floor(s/86400)} ${t('projects.timeDayAgo')}`
  }

  function startEdit(p, e) {
    e.stopPropagation()
    setEditingId(p.id)
    setEditText(p.name)
  }

  function saveEdit(id) {
    if (editText.trim() && editText.trim() !== '') {
      onRename(id, editText.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
          {t('projects.title')} ({projects.length})
        </h3>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 text-sm text-ink-400">
          <div className="text-3xl mb-2 opacity-50">📄</div>
          <div className="text-xs">{t('projects.empty')}</div>
          <div className="text-[11px] mt-1 text-ink-300">{t('projects.emptyHint')}</div>
        </div>
      ) : (
        <div className="space-y-1">
          {projects.map((p) => {
            const isActive = p.id === currentId
            const isEditing = p.id === editingId

            return (
              <div
                key={p.id}
                className={`group relative rounded-lg transition border ${
                  isActive
                    ? 'bg-brand-50 border-brand-200'
                    : 'bg-white border-transparent hover:bg-ink-50 hover:border-ink-100'
                }`}
              >
                <button
                  onClick={() => !isEditing && !disabled && onSelect(p.id)}
                  className="w-full text-left px-3 py-2.5"
                  disabled={disabled}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveEdit(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(p.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-sm font-medium bg-white border border-brand-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  ) : (
                    <div className="text-sm font-medium text-ink-900 truncate pr-12">
                      {p.name}
                    </div>
                  )}
                  <div className="text-[11px] text-ink-400 mt-1">
                    {timeAgo(p.updated_at || p.created_at)}
                  </div>
                </button>

                {/* Action buttons - hien khi hover */}
                {!isEditing && (
                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition flex gap-0.5">
                    <button
                      onClick={(e) => startEdit(p, e)}
                      disabled={disabled}
                      title={t('projects.rename')}
                      className="w-6 h-6 rounded flex items-center justify-center text-ink-500 hover:bg-white hover:text-brand-600 transition"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}
                      disabled={disabled}
                      title={t('projects.delete')}
                      className="w-6 h-6 rounded flex items-center justify-center text-ink-500 hover:bg-white hover:text-red-600 transition"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
