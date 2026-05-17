// ========================================================================
//  src/hooks/useAdmin.js (v0.12) — Check user co phai admin khong
// ========================================================================
//  Goi /api/admin/check 1 lan sau khi user login. Cache trong state.
//  Tra ve: { isAdmin: bool|null, loading: bool }
//    isAdmin = null → chua biet (dang loading)
//    isAdmin = true/false → ket qua
// ========================================================================

import { useState, useEffect } from 'react'
import { apiGet } from '../lib/api'

export function useAdmin(user) {
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    if (!user) { setIsAdmin(false); return }
    let cancelled = false
    apiGet('/api/admin/check')
      .then(d => { if (!cancelled) setIsAdmin(!!d.is_admin) })
      .catch(() => { if (!cancelled) setIsAdmin(false) })
    return () => { cancelled = true }
  }, [user?.id])

  return { isAdmin, loading: isAdmin === null }
}
