// ========================================================================
//  src/components/UserMenu.jsx — Avatar + dropdown menu
// ========================================================================

import { useState, useRef, useEffect } from 'react'
import { useT } from '../hooks/useLanguage'

export default function UserMenu({ user, onSignOut, onShowBilling, hideBilling = false, isAdmin = false }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Close khi click ra ngoai
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const name   = user.user_metadata?.full_name || user.email
  const email  = user.email
  const avatar = user.user_metadata?.avatar_url
  const initial = (name || email || 'U')[0].toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ink-100 transition"
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-7 h-7 rounded-full border border-ink-200"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold text-xs">
            {initial}
          </div>
        )}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ink-500">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-ink-200 rounded-xl shadow-card overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-ink-100">
            <div className="flex items-center gap-3">
              {avatar ? (
                <img src={avatar} alt={name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold">
                  {initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink-900 truncate">{name}</div>
                <div className="text-[11px] text-ink-500 truncate">{email}</div>
              </div>
            </div>
          </div>

          {!hideBilling && (
          <button
            onClick={() => { setOpen(false); onShowBilling?.() }}
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-ink-50 transition flex items-center gap-2 text-ink-700 border-b border-ink-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z"/>
            </svg>
            <span>{t('userMenu.upgrade')}</span>
            <span className="ml-auto text-[10px] text-brand-600 font-semibold">{t('common.pro')}</span>
          </button>
          )}

          {/* v0.12: Admin link (chi hien khi user_roles.is_admin = true) */}
          {isAdmin && (
          <a
            href="/admin"
            onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-ink-50 transition flex items-center gap-2 text-ink-700 border-b border-ink-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Admin panel</span>
            <span className="ml-auto text-[10px] text-amber-600 font-semibold">ADMIN</span>
          </a>
          )}

          <button
            onClick={() => {
              setOpen(false)
              if (confirm(t('userMenu.signOutConfirm'))) onSignOut()
            }}
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-ink-50 transition flex items-center gap-2 text-ink-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {t('userMenu.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}
