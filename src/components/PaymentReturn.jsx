// ========================================================================
//  src/components/PaymentReturn.jsx — Handle VNPay redirect back
// ========================================================================
//  Khi VNPay redirect ve /billing/return?vnp_TxnRef=...&vnp_ResponseCode=...
//  Component nay:
//    1) Parse URL params
//    2) Goi /api/billing/verify-return de verify signature
//    3) Hien thi ket qua
// ========================================================================

import { useState, useEffect } from 'react'
import { apiPost } from '../lib/api'

export default function PaymentReturn() {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    const params = {}
    new URLSearchParams(window.location.search).forEach((v, k) => {
      params[k] = v
    })

    if (!params.vnp_TxnRef) {
      setState({ loading: false, error: 'Khong co thong tin giao dich trong URL' })
      return
    }

    apiPost('/api/billing/verify-return', { params })
      .then(result => setState({ loading: false, ...result }))
      .catch(err => setState({ loading: false, error: err.message }))
  }, [])

  function goHome() {
    window.location.href = '/'
  }

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-ink-600">Dang xac thuc giao dich...</p>
        </div>
      </div>
    )
  }

  const isSuccess = state.success === true

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-ink-200 p-8">

        {isSuccess ? (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-center text-ink-900">Thanh toan thanh cong!</h1>
            <p className="text-center text-ink-500 text-sm mt-2">
              Da nang cap len <strong className="text-ink-900 capitalize">{state.plan?.name}</strong>
            </p>
            <p className="text-center text-xs text-ink-400 mt-1">
              {state.message}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-center text-ink-900">Thanh toan that bai</h1>
            <p className="text-center text-ink-500 text-sm mt-2">
              {state.message || state.error || 'Da co loi xay ra'}
            </p>
            {state.responseCode && (
              <p className="text-center text-[11px] text-ink-400 mt-1 font-mono">
                Code: {state.responseCode}
              </p>
            )}
          </>
        )}

        <button onClick={goHome}
          className="mt-6 w-full px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition">
          Quay ve DaisanAI
        </button>
      </div>
    </div>
  )
}
