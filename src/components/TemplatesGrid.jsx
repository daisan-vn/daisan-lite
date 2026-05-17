// ========================================================================
//  src/components/TemplatesGrid.jsx — Browse templates
// ========================================================================
//  Hien trong empty state khi user chua co project nao
//  Filter theo category, click 1 template de clone → project moi
// ========================================================================

import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../lib/api'

const CATEGORIES = [
  { key: 'all',       label: 'Tat ca',     emoji: '✨' },
  { key: 'fnb',       label: 'F&B',        emoji: '☕' },
  { key: 'fashion',   label: 'Thoi trang', emoji: '👗' },
  { key: 'service',   label: 'Dich vu',    emoji: '🔧' },
  { key: 'education', label: 'Giao duc',   emoji: '📚' }
]

export default function TemplatesGrid({ onCloned, showToast }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [cloningId, setCloningId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiGet('/api/templates')
      .then(data => {
        if (cancelled) return
        setTemplates(data.templates || [])
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function handleClone(template) {
    setCloningId(template.id)
    try {
      const data = await apiPost(`/api/templates/${template.id}/clone`, {})
      showToast?.(`✓ Da clone "${template.name}"`, 'success')
      onCloned?.(data.project)
    } catch (err) {
      showToast?.('Loi clone: ' + err.message, 'error')
    } finally {
      setCloningId(null)
    }
  }

  const filtered = category === 'all'
    ? templates
    : templates.filter(t => t.category === category)

  // ─── States ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-ink-400">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Dang tai template...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm font-semibold text-ink-700">Khong tai duoc template</p>
          <p className="text-xs text-ink-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-base font-semibold text-ink-800">Chua co template nao</h3>
          <p className="text-sm text-ink-500 mt-2 leading-relaxed">
            Chay lenh sau trong terminal de tao 6 template ngành VN:
          </p>
          <div className="mt-3 mx-auto inline-block px-3 py-1.5 bg-ink-900 text-white rounded-lg font-mono text-xs">
            npm run seed-templates
          </div>
          <p className="text-[11px] text-ink-400 mt-3">
            Mat ~2-3 phut, chi phi ~$1 Claude API
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-ink-50">
      <div className="max-w-5xl mx-auto p-6">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🎨</div>
          <h2 className="text-2xl font-bold text-ink-900">Bat dau voi template</h2>
          <p className="text-sm text-ink-500 mt-1">
            Chon template ngành cua ban — clone xong la co web ngay, sau do iterate de cu the hon
          </p>
        </div>

        {/* Category filter */}
        <div className="flex items-center justify-center gap-1.5 mb-6 flex-wrap">
          {CATEGORIES.map(cat => {
            const count = cat.key === 'all'
              ? templates.length
              : templates.filter(t => t.category === cat.key).length
            const isActive = category === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-ink-900 text-white shadow-soft'
                    : 'bg-white text-ink-600 hover:bg-ink-100 border border-ink-200'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-ink-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Templates grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-400">
            <div className="text-2xl mb-2">🔍</div>
            <p className="text-sm">Khong co template trong category nay</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(t => {
              const isCloning = cloningId === t.id
              const pageCount = t.navigation?.length || 0
              return (
                <div
                  key={t.id}
                  className="group bg-white rounded-xl border border-ink-200 hover:border-ink-300 hover:shadow-card transition overflow-hidden flex flex-col"
                >
                  {/* Visual top */}
                  <div
                    className="aspect-[16/9] relative flex items-center justify-center overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${t.color_from} 0%, ${t.color_to} 100%)`
                    }}
                  >
                    <span className="text-6xl drop-shadow-md">{t.emoji}</span>

                    {/* Featured badge */}
                    {t.is_featured && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-[10px] font-semibold text-ink-700">
                        ⭐ Featured
                      </span>
                    )}

                    {/* Page count badge */}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/30 backdrop-blur text-[10px] font-medium text-white">
                      {pageCount} trang
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-ink-900 leading-tight">{t.name}</h3>
                      {t.uses_count > 0 && (
                        <span className="text-[10px] text-ink-400 flex-shrink-0 mt-0.5">
                          {t.uses_count}× clone
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-500 leading-relaxed line-clamp-2 flex-1">
                      {t.description}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-3">
                      <span className="text-[10px] text-ink-400 truncate">
                        {t.industry_label}
                      </span>
                      <button
                        onClick={() => handleClone(t)}
                        disabled={isCloning || cloningId !== null}
                        className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-ink-300 disabled:cursor-not-allowed text-white text-[11px] font-semibold transition flex items-center gap-1.5 shadow-soft flex-shrink-0"
                      >
                        {isCloning ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            Cloning
                          </>
                        ) : (
                          <>Su dung →</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer hint */}
        <div className="text-center mt-8 text-[11px] text-ink-400">
          Hoac mo ta y tuong rieng cua ban o panel ben trai
        </div>
      </div>
    </div>
  )
}
