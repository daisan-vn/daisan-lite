// ========================================================================
//  ClientInviteAccept.jsx — v0.10
// ========================================================================
//  Page mount tai /client-invite?token=xxx
//
//  Luong:
//    1. Parse token tu URL
//    2. Goi GET /api/client-invite/:token → lay project name + client email
//    3. Neu user CHUA dang nhap → hien magic link form (pre-fill email)
//    4. Sau khi dang nhap → goi POST /accept → redirect ve app
//    5. Neu loi (sai email / token het han) → hien thong bao
// ========================================================================

import { useEffect, useState } from 'react'
import { apiPost } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../hooks/useLanguage'
import LanguageToggle from './LanguageToggle'

export default function ClientInviteAccept() {
  const t = useT()
  const { user, loading: authLoading } = useAuth()
  const [token, setToken] = useState('')
  const [inviteInfo, setInviteInfo] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  // Parse token tu URL khi mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (!t) {
      setError('Thieu token. Link khong hop le.')
      setLoading(false)
      return
    }
    setToken(t)
    fetchInviteInfo(t)
  }, [])

  async function fetchInviteInfo(t) {
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiBase}/api/client-invite/${t}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Link khong hop le')
      setInviteInfo(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-accept khi user da dang nhap va co token valid
  useEffect(() => {
    if (!authLoading && user && inviteInfo && token && !accepting) {
      handleAccept()
    }
  }, [user, authLoading, inviteInfo, token])

  async function handleAccept() {
    if (accepting) return
    setAccepting(true)
    try {
      const result = await apiPost(`/api/client-invite/${token}/accept`, {})
      // Redirect den main app voi project da chon
      // Frontend se detect role va hien UI client mode
      window.location.href = `/?project=${result.projectId}`
    } catch (err) {
      setError(err.message)
      setAccepting(false)
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault()
    if (!inviteInfo?.clientEmail) return
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: inviteInfo.clientEmail,
        options: { emailRedirectTo: window.location.href }
      })
      if (error) throw error
      setMagicLinkSent(true)
    } catch (err) {
      setError(err.message)
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────────

  if (loading || authLoading) return <Loading />

  if (error && !inviteInfo) {
    return (
      <CenterCard>
        <div className="text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h1 className="text-xl font-bold text-ink-900 mb-2">{t('clientAccept.invalidTitle')}</h1>
          <p className="text-sm text-ink-600 mb-4">{error}</p>
          <a href="/" className="text-sm text-brand-600 hover:underline">{t('clientAccept.backHome')}</a>
        </div>
      </CenterCard>
    )
  }

  if (accepting) {
    return (
      <CenterCard>
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-ink-600">{t('clientAccept.verifying')}</p>
        </div>
      </CenterCard>
    )
  }

  if (user && inviteInfo) {
    return (
      <CenterCard>
        <div className="text-center">
          <h1 className="text-xl font-bold text-ink-900 mb-2">{t('clientAccept.acceptingTitle')}</h1>
          <p className="text-sm text-ink-600 mb-4">
            {t('clientAccept.acceptingDesc')} <strong>{user.email}</strong>
          </p>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <button
            onClick={handleAccept}
            className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"
          >
            {t('clientAccept.enterProject')}
          </button>
        </div>
      </CenterCard>
    )
  }

  return (
    <CenterCard>
      <div className="text-center mb-5">
        <div className="text-4xl mb-2">📩</div>
        <h1 className="text-xl font-bold text-ink-900">
          {t('clientAccept.title')}
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          {t('clientAccept.project')} <strong>{inviteInfo?.projectName}</strong>
        </p>
      </div>

      {magicLinkSent ? (
        <div className="text-center">
          <div className="text-3xl mb-2">✉️</div>
          <h2 className="font-semibold text-ink-900 mb-1">{t('clientAccept.magicLinkSent')}</h2>
          <p className="text-sm text-ink-600 mb-3">
            {t('clientAccept.magicLinkDesc')} <strong>{inviteInfo.clientEmail}</strong>
          </p>
          <p className="text-xs text-ink-500">
            {t('clientAccept.checkSpam')}
          </p>
        </div>
      ) : (
        <form onSubmit={handleMagicLink}>
          <label className="block text-xs uppercase tracking-wide text-ink-500 font-semibold mb-2">
            {t('clientAccept.emailLabel')}
          </label>
          <input
            type="email"
            value={inviteInfo?.clientEmail || ''}
            readOnly
            className="w-full px-3 py-2.5 rounded-lg border border-ink-300 bg-ink-50 text-sm text-ink-700"
          />
          <p className="text-xs text-ink-500 mt-2 mb-4">
            {t('clientAccept.emailHint')}
          </p>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <button
            type="submit"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"
          >
            {t('clientAccept.sendLink')}
          </button>
        </form>
      )}

      <div className="mt-5 pt-5 border-t border-ink-200 text-xs text-ink-500 text-center">
        {t('clientAccept.poweredBy')}
      </div>
    </CenterCard>
  )
}

function CenterCard({ children }) {
  const t = useT()
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="bg-white rounded-2xl shadow-card max-w-md w-full p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold shadow-soft">
            D
          </div>
          <div>
            <h1 className="font-semibold text-sm">DaisanAI <span className="text-xs text-ink-400">Lite</span></h1>
            <p className="text-[10px] text-ink-500">{t('clientAccept.clientModeTag')}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50">
      <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}
