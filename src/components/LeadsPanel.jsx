// ========================================================================
//  LeadsPanel.jsx (v0.14) — Owner/client xem leads tu published site
// ========================================================================
//  Mount nhu slide-over panel ben phai. Load leads cua 1 project,
//  hien mark read/unread, click row → xem chi tiet field data,
//  owner co the xoa lead.
// ========================================================================

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPatch, apiDelete } from '../lib/api'

export default function LeadsPanel({ projectId, projectName, isOwner, onClose, showToast }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')   // 'all' | 'unread'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet(`/api/projects/${projectId}/leads`)
      setLeads(data.leads || [])
    } catch (err) {
      showToast?.('Loi tai leads: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, showToast])

  useEffect(() => { load() }, [load])

  async function markRead(lead, read = true) {
    try {
      await apiPatch(`/api/projects/${projectId}/leads/${lead.id}`, { read })
      setLeads(ls => ls.map(l => l.id === lead.id
        ? { ...l, read_at: read ? new Date().toISOString() : null }
        : l))
    } catch (err) {
      showToast?.('Loi: ' + err.message, 'error')
    }
  }

  async function deleteLead(lead) {
    if (!confirm('Xoa lead nay? Khong the hoan tac.')) return
    try {
      await apiDelete(`/api/projects/${projectId}/leads/${lead.id}`)
      setLeads(ls => ls.filter(l => l.id !== lead.id))
      if (selected?.id === lead.id) setSelected(null)
      showToast?.('Da xoa', 'success')
    } catch (err) {
      showToast?.('Loi xoa: ' + err.message, 'error')
    }
  }

  const filtered = filter === 'unread' ? leads.filter(l => !l.read_at) : leads
  const unreadCount = leads.filter(l => !l.read_at).length

  return (
    <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink-900">Leads</h2>
            <p className="text-xs text-ink-500 truncate">{projectName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="text-xs px-2 py-1 rounded hover:bg-ink-100" title="Refresh">
              ↻
            </button>
            <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-2xl leading-none px-1">×</button>
          </div>
        </div>

        {/* Filter */}
        <div className="px-4 py-2 border-b border-ink-100 flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setFilter('all')}
            className={`text-xs px-2.5 py-1 rounded-full ${
              filter === 'all' ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}>
            Tat ca ({leads.length})
          </button>
          <button onClick={() => setFilter('unread')}
            className={`text-xs px-2.5 py-1 rounded-full ${
              filter === 'unread' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}>
            Chua doc ({unreadCount})
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-ink-400">
              <div className="w-6 h-6 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">Dang tai...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-ink-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm font-medium">{filter === 'unread' ? 'Khong co lead chua doc' : 'Chua co lead nao'}</p>
              <p className="text-xs mt-1">
                Khi khach submit form trong site, lead se hien o day.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {filtered.map(lead => {
                const isUnread = !lead.read_at
                const summary = summarizeLead(lead.data)
                const isSelected = selected?.id === lead.id
                return (
                  <button
                    key={lead.id}
                    onClick={() => {
                      setSelected(lead)
                      if (isUnread) markRead(lead, true)
                    }}
                    className={`w-full text-left px-4 py-3 transition ${
                      isSelected ? 'bg-brand-50' : 'hover:bg-ink-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isUnread && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 flex-shrink-0"></span>}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm truncate ${isUnread ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>
                          {summary.title}
                        </div>
                        {summary.subtitle && (
                          <div className="text-xs text-ink-500 truncate mt-0.5">{summary.subtitle}</div>
                        )}
                        <div className="text-[10px] text-ink-400 mt-1 flex items-center gap-2">
                          <span>{timeAgo(lead.created_at)}</span>
                          {lead.source_page && <span className="font-mono">· {lead.source_page}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail drawer */}
        {selected && (
          <div className="border-t border-ink-200 bg-ink-50/50 flex-shrink-0 max-h-[50%] overflow-y-auto">
            <div className="px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Chi tiet lead</h3>
              <div className="flex gap-1">
                {!selected.read_at && (
                  <button onClick={() => markRead(selected, true)}
                    className="text-xs px-2 py-1 rounded text-ink-600 hover:bg-ink-200">
                    Mark read
                  </button>
                )}
                {selected.read_at && (
                  <button onClick={() => markRead(selected, false)}
                    className="text-xs px-2 py-1 rounded text-ink-600 hover:bg-ink-200">
                    Mark unread
                  </button>
                )}
                {isOwner && (
                  <button onClick={() => deleteLead(selected)}
                    className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50">
                    Xoa
                  </button>
                )}
                <button onClick={() => setSelected(null)}
                  className="text-xs px-2 py-1 rounded text-ink-500 hover:bg-ink-200">
                  Dong
                </button>
              </div>
            </div>
            <div className="px-4 pb-3">
              <dl className="space-y-1.5">
                {Object.entries(selected.data || {}).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-3 gap-2 text-xs">
                    <dt className="text-ink-500 font-medium truncate">{k}</dt>
                    <dd className="col-span-2 text-ink-900 break-words whitespace-pre-wrap">{String(v)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 pt-2 border-t border-ink-200 text-[10px] text-ink-400 space-y-0.5">
                <div>Submit luc: {new Date(selected.created_at).toLocaleString('vi-VN')}</div>
                {selected.source_page && <div>Tu page: <code>{selected.source_page}</code></div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────
function summarizeLead(data) {
  const d = data || {}
  // Uu tien field theo thu tu pho bien
  const name = d.name || d.ho_ten || d.hoten || d.full_name || d.fullname
  const phone = d.phone || d.sdt || d.so_dien_thoai || d.dien_thoai || d.tel
  const email = d.email || d.e_mail
  const msg = d.message || d.loi_nhan || d.noi_dung || d.note || d.tin_nhan

  const title = name || phone || email || (msg && msg.slice(0, 40)) || 'Lead moi'
  const sub = [phone, email].filter(x => x && x !== name).join(' · ')
  return { title, subtitle: sub || (msg && msg !== title ? msg.slice(0, 60) : null) }
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60)    return 'vua xong'
  if (s < 3600)  return `${Math.floor(s/60)} phut truoc`
  if (s < 86400) return `${Math.floor(s/3600)} gio truoc`
  if (s < 86400 * 30) return `${Math.floor(s/86400)} ngay truoc`
  return new Date(iso).toLocaleDateString('vi-VN')
}
