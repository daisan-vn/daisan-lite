// ========================================================================
//  src/components/Auth.jsx — Man hinh dang nhap
// ========================================================================
//  Ho tro 2 cach:
//    1) Google OAuth (yeu cau bat Google provider trong Supabase)
//    2) Magic link email (chay duoc luon, khong can config gi them)
// ========================================================================

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('select')   // 'select' | 'email'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [emailSent, setEmailSent] = useState(false)

  async function signInWithGoogle() {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // Neu thanh cong, browser se redirect — khong can lam gi
  }

  async function signInWithMagicLink(e) {
    e?.preventDefault()
    if (!email.trim()) return
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin
      }
    })

    setLoading(false)
    if (error) setError(error.message)
    else setEmailSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-ink-50">

      {/* Background decoration */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-gradient-to-br from-brand-200 to-brand-400 blur-3xl"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-brand-100 to-brand-300 blur-3xl"></div>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-card border border-ink-100 p-8">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-lg shadow-soft">
            D
          </div>
          <div>
            <h1 className="font-bold text-xl leading-tight">
              DaisanAI <span className="text-xs font-normal text-ink-400 ml-1">Lite</span>
            </h1>
            <p className="text-xs text-ink-500">Tao web bang tieng Viet — sieu nhanh</p>
          </div>
        </div>

        {/* Tieu de */}
        <h2 className="text-2xl font-bold mb-1 text-ink-900">
          Chao mung tro lai
        </h2>
        <p className="text-sm text-ink-500 mb-6">
          Dang nhap de tiep tuc voi cac project cua ban
        </p>

        {/* Email sent state */}
        {emailSent ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-ink-900 mb-1">Kiem tra email cua ban</h3>
            <p className="text-sm text-ink-500 mb-4">
              Da gui link dang nhap toi<br />
              <strong className="text-ink-700">{email}</strong>
            </p>
            <button
              onClick={() => { setEmailSent(false); setEmail(''); setMode('select') }}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              ← Dung email khac
            </button>
          </div>
        ) : mode === 'select' ? (
          <>
            {/* Google button */}
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-ink-200 hover:border-ink-300 hover:bg-ink-50 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-ink-800"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              {loading ? 'Dang chuyen huong...' : 'Tiep tuc voi Google'}
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-ink-200"></div>
              <span className="text-xs text-ink-400 uppercase tracking-wider">hoac</span>
              <div className="flex-1 h-px bg-ink-200"></div>
            </div>

            {/* Magic link option */}
            <button
              onClick={() => setMode('email')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ink-100 hover:bg-ink-200 transition font-medium text-ink-700 text-sm"
            >
              ✉️  Dang nhap qua email (magic link)
            </button>
          </>
        ) : (
          <form onSubmit={signInWithMagicLink}>
            <button
              type="button"
              onClick={() => setMode('select')}
              className="text-xs text-ink-500 hover:text-ink-700 mb-3 inline-flex items-center gap-1"
            >
              ← Quay lai
            </button>

            <label className="text-xs font-semibold text-ink-600 uppercase tracking-wider">
              Email cua ban
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@vidu.com"
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="mt-4 w-full px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-ink-200 disabled:text-ink-400 disabled:cursor-not-allowed text-white font-semibold transition shadow-soft"
            >
              {loading ? 'Dang gui...' : 'Gui link dang nhap'}
            </button>

            <p className="mt-3 text-[11px] text-ink-400 text-center">
              Chung toi se gui link bao mat den email cua ban — khong can mat khau.
            </p>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <strong>Loi:</strong> {error}
          </div>
        )}

        {/* Footer */}
        <p className="mt-6 text-[11px] text-center text-ink-400">
          Bang viec dang nhap, ban dong y voi Dieu khoan & Chinh sach bao mat.
        </p>
      </div>

      {/* Help text duoi cung */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[11px] text-ink-400">
        DaisanAI Lite v0.3 — Auth bang Supabase
      </div>
    </div>
  )
}
