// ========================================================================
//  src/hooks/useAuth.js — Custom hook quan ly auth state
// ========================================================================
//  Tra ve:
//    - session   : Supabase session hien tai (hoac null neu chua dang nhap)
//    - user      : thong tin user (hoac null)
//    - loading   : dang check session lan dau hay khong
//    - signOut() : ham dang xuat
// ========================================================================

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Lay session ban dau
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Listen cac thay doi auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    session,
    user: session?.user || null,
    loading,
    signOut
  }
}
