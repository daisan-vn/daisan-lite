// ========================================================================
//  src/lib/api.js — Wrapper fetch tu dong them Authorization header
// ========================================================================

import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Helper: lay token JWT hien tai
async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Chua dang nhap')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

// GET — co JSON response
export async function apiGet(path) {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...authHeader }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// POST — co JSON body va response
export async function apiPost(path, body) {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// PATCH
export async function apiPatch(path, body) {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// DELETE
export async function apiDelete(path) {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { ...authHeader }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// POST stream — co Authorization, tra ve raw Response de doc body stream
export async function apiPostStream(path, body) {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res  // caller will reader = res.body.getReader()
}
