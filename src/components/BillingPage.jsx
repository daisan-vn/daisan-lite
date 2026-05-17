// ========================================================================
//  src/components/BillingPage.jsx — Goi cuoc + usage
// ========================================================================

import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../lib/api'

function formatVnd(n) {
  return n.toLocaleString('vi-VN') + 'đ'
}

export default function BillingPage({ onBack, showToast }) {
  const [data, setData] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [me, plansData] = await Promise.all([
        apiGet('/api/billing/me'),
        apiGet('/api/billing/plans')
      ])
      setData(me)
      setPlans(plansData.plans)
    } catch (err) {
      showToast?.('Loi tai goi cuoc: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planId) {
    setUpgrading(planId)
    try {
      const result = await apiPost('/api/billing/create-payment', { planId })

      if (result.mock) {
        // MOCK mode — da upgrade thanh cong ngay
        showToast?.(`✓ ${result.message}`, 'success')
        await load()  // reload
      } else if (result.paymentUrl) {
        // Real VNPay — redirect ra trang thanh toan
        window.location.href = result.paymentUrl
      }
    } catch (err) {
      showToast?.('Loi: ' + err.message, 'error')
    } finally {
      setUpgrading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  const currentPlanId = data?.subscription?.plan_id || 'free'
  const usage = data?.usage || {}
  const isMock = !data?.vnpay_configured

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-ink-50">
      <div className="max-w-5xl mx-auto p-6 pb-12">

        {/* Back */}
        <button onClick={onBack}
          className="mb-4 text-sm text-ink-500 hover:text-ink-900 flex items-center gap-1.5 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Quay lai
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ink-900">Goi cuoc</h1>
          <p className="text-sm text-ink-500 mt-2">
            Chon goi phu hop voi nhu cau cua ban
          </p>
        </div>

        {/* Mock mode banner */}
        {isMock && (
          <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <strong>⚠️ MOCK MODE:</strong> VNPay chua duoc cau hinh trong <code>.env</code>.
            Click "Nang cap" se auto-upgrade ngay (de test UX). Khi setup VNPay sandbox thi se goi thanh toan that.
            Xem huong dan: <code>SETUP_VNPAY.md</code>
          </div>
        )}

        {/* Current usage */}
        <div className="mb-8 p-4 bg-white rounded-xl border border-ink-200 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Goi hien tai</div>
              <div className="text-lg font-bold text-ink-900 capitalize">{currentPlanId}</div>
            </div>
            {data?.subscription?.current_period_end && (
              <div className="text-right">
                <div className="text-[10px] text-ink-400">Het han</div>
                <div className="text-xs text-ink-700">
                  {new Date(data.subscription.current_period_end).toLocaleDateString('vi-VN')}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Projects */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-ink-600">Projects</span>
                <span className="text-ink-800 font-medium">
                  {usage.projects}{usage.projects_limit ? ` / ${usage.projects_limit}` : ' / unlimited'}
                </span>
              </div>
              <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 transition-all" style={{
                  width: usage.projects_limit
                    ? `${Math.min(100, (usage.projects / usage.projects_limit) * 100)}%`
                    : '8%'
                }}></div>
              </div>
            </div>

            {/* AI generates */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-ink-600">AI generates thang nay</span>
                <span className="text-ink-800 font-medium">
                  {usage.ai_generates} / {usage.ai_generates_limit}
                </span>
              </div>
              <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all ${
                  usage.ai_generates >= usage.ai_generates_limit ? 'bg-red-500' :
                  usage.ai_generates >= usage.ai_generates_limit * 0.8 ? 'bg-amber-500' :
                  'bg-brand-500'
                }`} style={{
                  width: `${Math.min(100, (usage.ai_generates / usage.ai_generates_limit) * 100)}%`
                }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => {
            const isCurrent = plan.id === currentPlanId
            const isUpgrading = upgrading === plan.id
            const isFree = plan.id === 'free'

            return (
              <div key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col ${
                  plan.is_popular ? 'border-brand-500 shadow-card' : 'border-ink-200'
                }`}>

                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-semibold tracking-wide">
                    PHO BIEN
                  </div>
                )}

                <h3 className="text-xl font-bold text-ink-900">{plan.name}</h3>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-ink-900">
                    {isFree ? 'Mien phi' : formatVnd(plan.price_vnd)}
                  </span>
                  {!isFree && <span className="text-sm text-ink-500">/thang</span>}
                </div>

                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-ink-700">
                      <svg className="w-3.5 h-3.5 mt-0.5 text-green-600 flex-shrink-0"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrent && !isFree && handleUpgrade(plan.id)}
                  disabled={isCurrent || isFree || isUpgrading || upgrading !== null}
                  className={`mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isCurrent
                      ? 'bg-ink-100 text-ink-500 cursor-default'
                      : isFree
                        ? 'bg-ink-100 text-ink-500 cursor-not-allowed'
                        : plan.is_popular
                          ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-soft'
                          : 'bg-ink-900 hover:bg-ink-800 text-white'
                  } disabled:opacity-60`}
                >
                  {isUpgrading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin"></span>
                      Dang xu ly...
                    </span>
                  ) : isCurrent ? 'Goi hien tai'
                    : isFree ? 'Goi mac dinh'
                    : plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        {/* Footnote */}
        <div className="mt-8 text-center text-[11px] text-ink-400 space-y-1">
          <p>Thanh toan qua VNPay (the noi dia VN, QR Pay, Visa/Master)</p>
          <p>Co the huy bat ky luc nao. Khong tu dong gia han (v0.7).</p>
        </div>
      </div>
    </div>
  )
}
