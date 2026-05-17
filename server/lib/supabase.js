// ========================================================================
//  src/lib/supabase.js — Supabase client cho frontend
// ========================================================================
//  - Tu dong handle token refresh
//  - Tu dong luu session vao localStorage
//  - Listen auth state changes
// ========================================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Thieu VITE_SUPABASE_URL hoac VITE_SUPABASE_ANON_KEY trong file .env\n' +
    'Da restart server sau khi sua .env chua?'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:    true,      // Luu session vao localStorage
    autoRefreshToken:  true,      // Tu dong refresh khi token sap het han
    detectSessionInUrl: true      // Detect token tu URL hash sau OAuth redirect
  }
})
