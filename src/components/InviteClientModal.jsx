// ========================================================================
//  InviteClientModal.jsx — v0.10
// ========================================================================
//  Owner mo modal → nhap email khach hang → generate invite link
//  Sau do copy link gui qua Zalo/email/SMS cho khach
// ========================================================================

import { useState } from 'react'
import { apiPost, apiDelete } from '../lib/api'

export default function InviteClientModal({ project, onClose, showToast, onUpdate }) {
  const [email, setEmail] = useState(project?.client_email || '')
  const [inviteUrl, setInviteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const hasClient = project?.client_user_id && project?.client_accepted_at
  const hasPendingInvite = project?.client_email && !project?.client_user_id

  async function handleGenerate(e) {
    e?.preventDefault()
    if (!email.includes('@')) {
      showToast('Email khong hop le', 'error')
      return
    }
    setLoading(true)
    try {
      const result = await apiPost(`/api/projects/${project.id}/invite-client`, { email })
      setInviteUrl(result.inviteUrl)
      showToast('✓ Da tao link moi. Copy va gui cho khach hang.', 'success')
      onUpdate?.()
    } catch (err) {
      showToast('Loi: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke() {
    if (!confirm('Huy quyen edit cua khach hang? Ho se khong vao duoc nua.')) return
    setRevoking(true)
    try {
      await apiDelete(`/api/projects/${project.id}/client`)
      showToast('Da huy quyen edit cua khach', 'success')
      setInviteUrl('')
      setEmail('')
      onUpdate?.()
      onClose()
    } catch (err) {
      showToast('Loi: ' + err.message, 'error')
    } finally {
      setRevoking(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl)
    showToast('✓ Da copy link', 'success')
  }

  function handleShareZalo() {
    const text = `Chao ban! Day la link de chinh sua website "${project.name}" cua ban:\n\n${inviteUrl}\n\nClick vao link, nhap email ${email}, nhan link dang nhap qua email roi bat dau sua thong tin.`
    const zaloUrl = `https://zalo.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(text)}`
    window.open(zaloUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-pop max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-ink-900">👥 Moi khach hang edit</h2>
            <p className="text-sm text-ink-500 mt-1">
              Khach hang co the dang nhap va sua text, gia, thong tin lien he
            </p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-2xl leading-none">×</button>
        </div>

        {/* Status hien tai */}
        {hasClient && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <div className="flex-1 text-sm">
                <div className="font-semibold text-green-900">Khach da accept</div>
                <div className="text-green-700">{project.client_email}</div>
                <div className="text-xs text-green-600 mt-1">
                  Tu: {new Date(project.client_accepted_at).toLocaleDateString('vi-VN')}
                </div>
              </div>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="text-xs px-2 py-1 rounded bg-white border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {revoking ? '...' : 'Huy quyen'}
              </button>
            </div>
          </div>
        )}

        {hasPendingInvite && !hasClient && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <div className="font-semibold text-amber-900">⏳ Da gui invite — cho khach accept</div>
            <div className="text-amber-700 mt-1">{project.client_email}</div>
            <div className="text-xs text-amber-600 mt-1">Het han: {new Date(project.client_invite_expires_at).toLocaleDateString('vi-VN')}</div>
          </div>
        )}

        {/* Form generate invite */}
        {!hasClient && (
          <form onSubmit={handleGenerate}>
            <label className="block text-xs uppercase tracking-wide text-ink-500 font-semibold mb-2">
              Email khach hang
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vd: chuquan@cafeannien.vn"
              required
              className="w-full px-3 py-2 rounded-lg border border-ink-300 focus:border-brand-500 focus:outline-none text-sm"
            />
            <p className="text-xs text-ink-500 mt-2">
              Khach se nhan link → dang nhap bang chinh email nay → tu sua web cua ho
            </p>
            <button
              type="submit"
              disabled={loading || !email.includes('@')}
              className="mt-3 w-full px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50 transition"
            >
              {loading ? 'Dang tao link...' : (hasPendingInvite ? 'Tao link MOI (huy link cu)' : '📩 Tao link moi')}
            </button>
          </form>
        )}

        {/* Hien thi invite link sau khi tao */}
        {inviteUrl && (
          <div className="mt-5 pt-5 border-t border-ink-200">
            <label className="block text-xs uppercase tracking-wide text-ink-500 font-semibold mb-2">
              Link moi (gui cho khach)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                onFocus={e => e.target.select()}
                className="flex-1 px-3 py-2 rounded-lg border border-ink-300 bg-ink-50 text-xs font-mono"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 rounded-lg bg-ink-100 hover:bg-ink-200 text-sm font-medium whitespace-nowrap"
              >
                📋 Copy
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={handleShareZalo}
                className="px-3 py-2 rounded-lg bg-[#0068FF] hover:opacity-90 text-white text-sm font-medium"
              >
                💬 Gui qua Zalo
              </button>
              <a
                href={`mailto:${email}?subject=Link%20edit%20website&body=${encodeURIComponent(`Day la link edit web "${project.name}":\n\n${inviteUrl}\n\nClick vao → dang nhap voi email ${email} → bat dau sua thong tin.`)}`}
                className="px-3 py-2 rounded-lg bg-ink-100 hover:bg-ink-200 text-sm font-medium text-center"
              >
                ✉️ Gui qua Email
              </a>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
              <div className="font-semibold mb-1">⚠️ Luu y:</div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Link het han sau 30 ngay</li>
                <li>Khach dang nhap dung email <strong>{email}</strong></li>
                <li>Khach chi sua duoc text — khong xoa, khong AI, khong billing</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
