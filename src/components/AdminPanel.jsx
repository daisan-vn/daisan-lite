// ========================================================================
//  AdminPanel.jsx (v0.12) — Admin UI cho Templates CRUD
// ========================================================================
//  Route: /admin
//  Yeu cau: user phai co user_roles.is_admin = true (xem SETUP_ADMIN.md)
//  Chuc nang:
//    - List tat ca template + filter theo category + sort theo display_order
//    - Inline edit metadata: name, description, emoji, colors, prompt, is_featured, display_order
//    - Delete template
//    - Toggle featured nhanh
//  Khong xu ly: pages content (HTML cua template) — phai chay
//    `npm run seed-templates` de re-generate, hoac dung API trong tuong lai.
// ========================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPatch, apiDelete, apiPost } from '../lib/api'

const CATEGORY_OPTIONS = [
  { value: 'fnb',       label: 'F&B' },
  { value: 'fashion',   label: 'Fashion' },
  { value: 'service',   label: 'Service' },
  { value: 'education', label: 'Education' },
  { value: 'other',     label: 'Other' }
]

export default function AdminPanel({ onBack, showToast }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)        // template dang sua metadata
  const [editingContent, setEditingContent] = useState(null) // template dang sua HTML
  const [creating, setCreating] = useState(false)     // mo NewTemplateModal
  const [busyId, setBusyId] = useState(null)          // template_id dang lam action
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await apiGet('/api/admin/templates')
      setTemplates(data.templates || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleFeatured(t) {
    setBusyId(t.id)
    try {
      await apiPatch(`/api/admin/templates/${t.id}`, { is_featured: !t.is_featured })
      showToast?.(t.is_featured ? 'Da bo featured' : 'Da set featured', 'success')
      load()
    } catch (err) {
      showToast?.('Loi: ' + err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function deleteTemplate(t) {
    if (!confirm(`Xoa template "${t.name}"?\nUser khong dung duoc template nay nua. Khong the hoan tac.`)) return
    setBusyId(t.id)
    try {
      await apiDelete(`/api/admin/templates/${t.id}`)
      showToast?.('Da xoa template', 'success')
      load()
    } catch (err) {
      showToast?.('Loi xoa: ' + err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const filtered = filter === 'all'
    ? templates
    : templates.filter(t => t.category === filter)

  return (
    <div className="min-h-screen bg-ink-50">
      {/* ─── Header ────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-ink-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-ink-500 hover:text-ink-900 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Quay lai app
          </button>
          <div className="w-px h-6 bg-ink-200"></div>
          <div>
            <h1 className="text-lg font-bold text-ink-900">Admin · Templates</h1>
            <p className="text-xs text-ink-500">Quan ly thu vien template cho user clone</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCreating(true)} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-soft disabled:opacity-50">
            + New template
          </button>
          <button onClick={load} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 disabled:opacity-50">
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">

        {/* ─── Stats + filter ─────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-ink-600">
            <strong className="text-ink-900">{templates.length}</strong> templates
            {' · '}
            <strong className="text-ink-900">{templates.filter(t => t.is_featured).length}</strong> featured
            {' · '}
            <strong className="text-ink-900">{templates.reduce((sum, t) => sum + (t.uses_count || 0), 0)}</strong> total uses
          </div>
          <div className="flex gap-1">
            <FilterBtn value="all" filter={filter} onSet={setFilter}>Tat ca</FilterBtn>
            {CATEGORY_OPTIONS.map(o => (
              <FilterBtn key={o.value} value={o.value} filter={filter} onSet={setFilter}>{o.label}</FilterBtn>
            ))}
          </div>
        </div>

        {/* ─── Hint ────────────────────────────────────────────── */}
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
          <strong>Tao template moi:</strong> click <strong>"+ New template"</strong> → nhap prompt → AI generate (~10-30s, ton ~$0.05-0.20). <strong>Sua noi dung text:</strong> click <strong>"Sua HTML"</strong> tren tung row → inline edit nhu user. <strong>Bulk seed:</strong> van co the chay <code className="bg-white px-1 py-0.5 rounded font-mono">npm run seed-templates</code>.
        </div>

        {/* ─── List / loading / error ─────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            Loi: {error}
            {error.includes('Khong co quyen') && (
              <div className="mt-2 text-xs">
                Tai khoan cua ban chua duoc set admin. Xem <code>SETUP_ADMIN.md</code> de promote admin.
              </div>
            )}
          </div>
        )}

        {loading && !error && (
          <div className="py-12 text-center text-ink-400">
            <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-3"></div>
            Dang tai...
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-12 text-center text-ink-400">
            <div className="text-3xl mb-2">📦</div>
            <p>Khong co template phu hop.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 border-b border-ink-200">
                <tr>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Template</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Pages</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Uses</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Featured</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const isBusy = busyId === t.id
                  return (
                    <tr key={t.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/40">
                      <td className="px-3 py-2 text-xs text-ink-500 font-mono">{t.display_order}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl" style={{ filter: t.is_featured ? 'none' : 'grayscale(0.3)' }}>{t.emoji}</span>
                          <div className="min-w-0">
                            <div className="font-medium text-ink-900 truncate">{t.name}</div>
                            <div className="text-[10px] text-ink-400 font-mono truncate">{t.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-ink-600">{t.industry_label || t.category}</td>
                      <td className="px-3 py-2 text-xs text-ink-600 font-mono">{t.page_count}</td>
                      <td className="px-3 py-2 text-xs text-ink-600 font-mono">{t.uses_count || 0}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => toggleFeatured(t)} disabled={isBusy}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            t.is_featured
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                          } disabled:opacity-50`}>
                          {t.is_featured ? '⭐ ON' : 'OFF'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button onClick={() => setEditingContent(t)} disabled={isBusy}
                          className="text-xs px-2 py-1 rounded text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                          Sua HTML
                        </button>
                        <button onClick={() => setEditing(t)} disabled={isBusy}
                          className="text-xs px-2 py-1 rounded text-brand-600 hover:bg-brand-50 disabled:opacity-50 ml-1">
                          Metadata
                        </button>
                        <button onClick={() => deleteTemplate(t)} disabled={isBusy}
                          className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-50 ml-1">
                          Xoa
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditTemplateModal
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
          showToast={showToast}
        />
      )}

      {creating && (
        <NewTemplateModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load() }}
          showToast={showToast}
        />
      )}

      {editingContent && (
        <AdminTemplateEditor
          templateId={editingContent.id}
          templateName={editingContent.name}
          onClose={() => setEditingContent(null)}
          showToast={showToast}
        />
      )}
    </div>
  )
}

function FilterBtn({ value, filter, onSet, children }) {
  const active = filter === value
  return (
    <button onClick={() => onSet(value)}
      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
        active ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:bg-ink-100 border border-ink-200'
      }`}>{children}</button>
  )
}

// ════════════════════════════════════════════════════════════════════════
//  EDIT MODAL
// ════════════════════════════════════════════════════════════════════════
function EditTemplateModal({ template, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    name:           template.name || '',
    description:    template.description || '',
    category:       template.category || 'other',
    industry_label: template.industry_label || '',
    emoji:          template.emoji || '✨',
    color_from:     template.color_from || '#3b5cf5',
    color_to:       template.color_to || '#2a40e6',
    default_prompt: template.default_prompt || '',
    is_featured:    !!template.is_featured,
    display_order:  template.display_order ?? 100,
    site_name:      template.site_name || ''
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiPatch(`/api/admin/templates/${template.id}`, form)
      showToast?.('Da luu', 'success')
      onSaved?.()
    } catch (err) {
      showToast?.('Loi luu: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-3 border-b border-ink-200 sticky top-0 bg-white">
          <h2 className="text-base font-bold">Sua template</h2>
          <p className="text-xs text-ink-500 font-mono mt-0.5">{template.slug}</p>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">

          <Field label="Ten template" full>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              className="input" maxLength={100} />
          </Field>

          <Field label="Site name (default sau khi clone)" full>
            <input value={form.site_name} onChange={e => set('site_name', e.target.value)} className="input" />
          </Field>

          <Field label="Mo ta" full>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} maxLength={500} className="input resize-none" />
          </Field>

          <Field label="Category">
            <select value={form.category} onChange={e => set('category', e.target.value)} className="input">
              {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Industry label (hien thi)">
            <input value={form.industry_label} onChange={e => set('industry_label', e.target.value)} className="input" />
          </Field>

          <Field label="Emoji">
            <input value={form.emoji} onChange={e => set('emoji', e.target.value)} maxLength={4} className="input text-2xl text-center" />
          </Field>

          <Field label="Display order (nho hien truoc)">
            <input type="number" min="0" max="9999" value={form.display_order}
              onChange={e => set('display_order', parseInt(e.target.value) || 0)} className="input" />
          </Field>

          <Field label="Color from">
            <div className="flex gap-1">
              <input type="color" value={form.color_from} onChange={e => set('color_from', e.target.value)}
                className="w-12 h-9 rounded border border-ink-200" />
              <input value={form.color_from} onChange={e => set('color_from', e.target.value)}
                className="input font-mono text-xs" />
            </div>
          </Field>

          <Field label="Color to">
            <div className="flex gap-1">
              <input type="color" value={form.color_to} onChange={e => set('color_to', e.target.value)}
                className="w-12 h-9 rounded border border-ink-200" />
              <input value={form.color_to} onChange={e => set('color_to', e.target.value)}
                className="input font-mono text-xs" />
            </div>
          </Field>

          <Field label="Default prompt (dung khi user clone)" full>
            <textarea value={form.default_prompt} onChange={e => set('default_prompt', e.target.value)}
              rows={5} className="input resize-y font-mono text-xs" />
          </Field>

          <Field label=" " full>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)}
                className="w-4 h-4" />
              Featured (hien o dau danh sach)
            </label>
          </Field>

          <Field label=" " full>
            <div className="text-[11px] text-ink-500 p-2 bg-ink-50 rounded">
              <strong>Khong sua duoc qua UI:</strong> slug, pages (HTML noi dung). Muon re-generate HTML thi chay <code>npm run seed-templates</code> sau khi update <code>scripts/seed-templates.js</code>.
            </div>
          </Field>
        </div>

        <div className="px-5 py-3 border-t border-ink-200 sticky bottom-0 bg-white flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink-600 hover:bg-ink-100">
            Huy
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-ink-300 text-white text-sm font-semibold">
            {saving ? 'Dang luu...' : 'Luu thay doi'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}


// ════════════════════════════════════════════════════════════════════════
//  NEW TEMPLATE MODAL — admin nhap prompt → AI generate → save
// ════════════════════════════════════════════════════════════════════════
function NewTemplateModal({ onClose, onCreated, showToast }) {
  const [form, setForm] = useState({
    slug:           '',
    name:           '',
    description:    '',
    category:       'other',
    industry_label: '',
    emoji:          '✨',
    color_from:     '#3b5cf5',
    color_to:       '#2a40e6',
    default_prompt: '',
    display_order:  100,
    is_featured:    false
  })
  const [generating, setGenerating] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Auto-suggest slug khi user go name
  function setName(v) {
    set('name', v)
    if (!form.slug) {
      const auto = v.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        .slice(0, 40)
      set('slug', auto)
    }
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (form.default_prompt.trim().length < 20) {
      showToast?.('Prompt phai >= 20 ky tu', 'error'); return
    }
    setGenerating(true)
    try {
      const result = await apiPost('/api/admin/templates/generate', form)
      showToast?.(`Tao xong! ${result.pageCount} pages, ${result.tokens} tokens`, 'success')
      onCreated?.()
    } catch (err) {
      showToast?.('Loi tao: ' + err.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleGenerate}
        className="bg-white rounded-2xl shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-3 border-b border-ink-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold">Tao template moi</h2>
          <p className="text-xs text-ink-500 mt-0.5">AI se generate HTML, ~10-30s. Ton ~$0.05-$0.20 / lan.</p>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Slug (a-z 0-9 -)">
            <input required value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="input font-mono text-xs" maxLength={50} placeholder="fnb-cafe-shop" />
          </Field>

          <Field label="Ten template">
            <input required value={form.name} onChange={e => setName(e.target.value)}
              className="input" maxLength={100} placeholder="Quan ca phe" />
          </Field>

          <Field label="Mo ta" full>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} maxLength={500} className="input resize-none"
              placeholder="Landing page chuyen nghiep cho quan ca phe — menu, khong gian, dat ban" />
          </Field>

          <Field label="Category">
            <select value={form.category} onChange={e => set('category', e.target.value)} className="input">
              {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Industry label">
            <input value={form.industry_label} onChange={e => set('industry_label', e.target.value)}
              className="input" placeholder="F&B / Ca phe" />
          </Field>

          <Field label="Emoji">
            <input value={form.emoji} onChange={e => set('emoji', e.target.value)} maxLength={4}
              className="input text-2xl text-center" />
          </Field>

          <Field label="Display order">
            <input type="number" min="0" max="9999" value={form.display_order}
              onChange={e => set('display_order', parseInt(e.target.value) || 0)} className="input" />
          </Field>

          <Field label="Color from">
            <input type="color" value={form.color_from} onChange={e => set('color_from', e.target.value)}
              className="w-full h-9 rounded border border-ink-200" />
          </Field>

          <Field label="Color to">
            <input type="color" value={form.color_to} onChange={e => set('color_to', e.target.value)}
              className="w-full h-9 rounded border border-ink-200" />
          </Field>

          <Field label="Default prompt (AI dung de generate)" full>
            <textarea required value={form.default_prompt}
              onChange={e => set('default_prompt', e.target.value)}
              rows={8} className="input resize-y font-mono text-xs"
              placeholder={'Tao website 4 trang cho quan ca phe "Cafe An Nhien"...\n- index.html: hero + slogan + CTA\n- menu.html: danh sach do uong\n- ...'} />
            <p className="text-[10px] text-ink-500 mt-1">{form.default_prompt.length} ky tu (min 20)</p>
          </Field>

          <Field label=" " full>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={form.is_featured}
                onChange={e => set('is_featured', e.target.checked)} className="w-4 h-4" />
              Featured (hien o dau danh sach)
            </label>
          </Field>
        </div>

        <div className="px-5 py-3 border-t border-ink-200 sticky bottom-0 bg-white flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={generating}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-50">
            Huy
          </button>
          <button type="submit" disabled={generating}
            className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-ink-300 text-white text-sm font-semibold flex items-center gap-2">
            {generating && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
            {generating ? 'AI dang generate...' : 'Generate + Save'}
          </button>
        </div>
      </form>
    </div>
  )
}


// ════════════════════════════════════════════════════════════════════════
//  ADMIN TEMPLATE EDITOR — full-screen iframe + inline edit cho HTML pages
// ════════════════════════════════════════════════════════════════════════
function AdminTemplateEditor({ templateId, templateName, onClose, showToast }) {
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPath, setCurrentPath] = useState('index.html')
  const [editMode, setEditMode] = useState(false)
  const [editDirty, setEditDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const iframeRef = useRef(null)

  useEffect(() => {
    apiGet(`/api/admin/templates/${templateId}`)
      .then(d => {
        setTemplate(d)
        const paths = Object.keys(d.pages || {})
        if (paths.length) setCurrentPath(paths.includes('index.html') ? 'index.html' : paths[0])
      })
      .catch(err => showToast?.('Loi load: ' + err.message, 'error'))
      .finally(() => setLoading(false))
  }, [templateId])

  // Reset edit mode khi doi page
  useEffect(() => { setEditMode(false); setEditDirty(false) }, [currentPath])

  // Listen message tu iframe (giong Preview.jsx)
  useEffect(() => {
    function handler(e) {
      const d = e.data || {}
      if (d.type === 'daisan:editModeReady') {
        showToast?.(`Edit mode bat: ${d.editableCount} text`, 'info')
      }
      if (d.type === 'daisan:dirty') setEditDirty(true)
      if (d.type === 'daisan:cleanHtml') saveCleanHtml(d.html)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, currentPath])

  function toggleEdit() {
    if (!iframeRef.current?.contentWindow) return
    const next = !editMode
    iframeRef.current.contentWindow.postMessage({ type: 'daisan:setEditMode', enabled: next }, '*')
    setEditMode(next)
    if (!next) setEditDirty(false)
  }

  function requestSave() {
    if (!iframeRef.current?.contentWindow) return
    setSaving(true)
    iframeRef.current.contentWindow.postMessage({ type: 'daisan:requestCleanHtml' }, '*')
  }

  async function saveCleanHtml(html) {
    try {
      await apiPost(`/api/admin/templates/${templateId}/save-edits`, { filename: currentPath, html })
      showToast?.('Da luu', 'success')
      setEditMode(false); setEditDirty(false)
      // Reload template (du lieu pages thay doi sau khi server inject lai script)
      const fresh = await apiGet(`/api/admin/templates/${templateId}`)
      setTemplate(fresh)
    } catch (err) {
      showToast?.('Loi luu: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-ink-50 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  const pages = template?.pages || {}
  const pagePaths = Object.keys(pages)
  const currentHtml = pages[currentPath] || ''

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-ink-200 flex items-center justify-between bg-white flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900 flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Dong
          </button>
          <div className="w-px h-6 bg-ink-200"></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink-900 truncate">Sua HTML: {templateName}</div>
            <div className="text-[10px] text-ink-500 font-mono truncate">{pagePaths.length} pages</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!editMode ? (
            <button onClick={toggleEdit}
              className="px-3 py-1.5 text-xs rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold border border-brand-200">
              Bat edit mode
            </button>
          ) : (
            <>
              <span className="px-2 py-1 text-[11px] rounded bg-brand-50 text-brand-700 border border-brand-200 font-semibold">
                {editDirty ? 'Co thay doi' : 'Edit mode'}
              </span>
              <button onClick={requestSave} disabled={!editDirty || saving}
                className="px-3 py-1.5 text-xs rounded-lg bg-green-500 hover:bg-green-600 disabled:bg-ink-300 text-white font-semibold">
                {saving ? 'Dang luu...' : 'Luu'}
              </button>
              <button onClick={() => { setEditMode(false); setEditDirty(false); toggleEdit() }} disabled={saving}
                className="px-3 py-1.5 text-xs rounded-lg text-red-600 hover:bg-red-50">
                Huy
              </button>
            </>
          )}
        </div>
      </div>

      {/* Page tabs */}
      {pagePaths.length > 0 && (
        <div className="bg-ink-50 border-b border-ink-200 px-3 py-1.5 flex items-center gap-1 overflow-x-auto flex-shrink-0">
          {pagePaths.map(p => (
            <button key={p} onClick={() => setCurrentPath(p)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap ${
                p === currentPath
                  ? 'bg-white text-ink-900 shadow-soft border border-ink-200'
                  : 'text-ink-500 hover:bg-white/50'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Iframe */}
      <div className="flex-1 bg-ink-100 overflow-auto p-4">
        <iframe
          ref={iframeRef}
          key={currentPath + templateId}
          srcDoc={currentHtml}
          title={`Edit ${currentPath}`}
          sandbox="allow-scripts allow-same-origin allow-forms"
          className="w-full h-full bg-white shadow-card rounded-lg"
          style={{ minHeight: '600px' }}
        />
      </div>
    </div>
  )
}
