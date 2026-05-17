// ========================================================================
//  src/components/DomainSettings.jsx (v0.8) — Custom domain setup
// ========================================================================

import { useState } from 'react'
import { apiPost, apiDelete } from '../lib/api'

export default function DomainSettings({ project, onClose, onUpdated, showToast }) {
  const [step, setStep] = useState(
    project.custom_domain
      ? (project.custom_domain_verified ? 'verified' : 'pending')
      : 'input'
  )
  const [domain, setDomain] = useState(project.custom_domain || '')
  const [dnsData, setDnsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [verifyError, setVerifyError] = useState(null)

  async function handleAddDomain(e) {
    e?.preventDefault()
    if (!domain.trim()) return
    setLoading(true)
    try {
      const data = await apiPost(`/api/projects/${project.id}/domain`, {
        domain: domain.trim()
      })
      setDnsData(data)
      setStep('pending')
      onUpdated?.()
    } catch (err) {
      showToast?.('Loi: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setLoading(true)
    setVerifyError(null)
    try {
      const data = await apiPost(`/api/projects/${project.id}/domain/verify`, {})
      if (data.verified) {
        setStep('verified')
        showToast?.(data.message, 'success')
        onUpdated?.()
      } else {
        setVerifyError(data.error)
      }
    } catch (err) {
      setVerifyError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    if (!confirm('Xoa custom domain? URL slug van hoat dong, nhung domain rieng se khong serve nua.')) return
    setLoading(true)
    try {
      await apiDelete(`/api/projects/${project.id}/domain`)
      setStep('input')
      setDomain('')
      setDnsData(null)
      showToast?.('Da xoa custom domain', 'success')
      onUpdated?.()
    } catch (err) {
      showToast?.('Loi: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function copy(text) {
    navigator.clipboard.writeText(text)
    showToast?.('Da copy', 'success')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-5 py-4 border-b border-ink-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Custom Domain</h2>
            <p className="text-xs text-ink-500 mt-0.5">Gan domain rieng vao project nay</p>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">

          {/* Step: Input */}
          {step === 'input' && (
            <form onSubmit={handleAddDomain}>
              <label className="text-xs font-semibold text-ink-600 uppercase tracking-wider">
                Domain ban muon gan
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="vd: cuahangcuaban.com"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm font-mono"
                disabled={loading}
                autoFocus
              />
              <p className="mt-2 text-[11px] text-ink-500">
                Domain phai do <strong>ban so huu</strong>. Sau khi them, ban can config DNS roi verify.
              </p>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>Yeu cau:</strong> Goi <strong>Pro+</strong>. Free khong duoc dung custom domain.
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-ink-600 hover:bg-ink-100 transition">
                  Huy
                </button>
                <button type="submit" disabled={loading || !domain.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-ink-300 text-white text-sm font-semibold transition shadow-soft">
                  {loading ? 'Dang luu...' : 'Tiep tuc →'}
                </button>
              </div>
            </form>
          )}

          {/* Step: Pending verification */}
          {step === 'pending' && (
            <div>
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <strong className="text-sm text-amber-900">Cho verify DNS</strong>
                </div>
                <p className="text-xs text-amber-800">
                  Domain: <strong className="font-mono">{project.custom_domain || domain}</strong>
                </p>
              </div>

              <h3 className="text-sm font-semibold text-ink-900 mb-2">Buoc 1: Them DNS records</h3>
              <p className="text-xs text-ink-600 mb-3">
                Vao trang quan ly domain cua ban (GoDaddy / Tenten / Mat Bao / ...), them 2 record sau:
              </p>

              {/* Hien DNS records (neu co dnsData hoac dung tu project) */}
              {dnsData?.dnsInstructions ? (
                <div className="space-y-2">
                  <DnsRow record={dnsData.dnsInstructions.a_record} onCopy={copy} />
                  <DnsRow record={dnsData.dnsInstructions.txt_record} onCopy={copy} />
                </div>
              ) : (
                <div className="text-xs text-ink-500 italic p-3 bg-ink-50 rounded-lg">
                  (DNS instructions se hien sau khi them domain. Neu thay trang nay sau khi refresh,
                  hay xoa domain va them lai.)
                </div>
              )}

              <h3 className="text-sm font-semibold text-ink-900 mt-5 mb-2">Buoc 2: Verify</h3>
              <p className="text-xs text-ink-600 mb-3">
                Sau khi them DNS, doi 5-30 phut (DNS propagation), roi click "Verify".
              </p>

              {verifyError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {verifyError}
                </div>
              )}

              <button onClick={handleVerify} disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-ink-300 text-white text-sm font-semibold transition shadow-soft">
                {loading ? 'Dang verify...' : '↻ Verify DNS'}
              </button>

              <div className="mt-4 pt-3 border-t border-ink-100">
                <button onClick={handleRemove} disabled={loading}
                  className="text-xs text-red-600 hover:text-red-700 transition">
                  Xoa domain nay
                </button>
              </div>
            </div>
          )}

          {/* Step: Verified ✓ */}
          {step === 'verified' && (
            <div>
              <div className="text-center py-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 className="text-base font-bold text-ink-900">Domain da active!</h3>
                <p className="text-sm text-ink-600 mt-1">
                  Website cua ban dang live tai:
                </p>
                <a href={`https://${project.custom_domain}`} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-2 text-brand-600 hover:text-brand-700 font-mono text-sm font-semibold">
                  https://{project.custom_domain} →
                </a>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <strong>Luu y:</strong> Day la setting Pro+. Neu downgrade ve Free, custom domain se ngung hoat dong nhung slug URL van work.
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={handleRemove} disabled={loading}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition">
                  Xoa domain
                </button>
                <button onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold transition">
                  Dong
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DnsRow({ record, onCopy }) {
  return (
    <div className="p-3 bg-ink-50 border border-ink-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ink-900 text-white">
          {record.type}
        </span>
        <span className="text-[11px] text-ink-500">{record.note}</span>
      </div>
      <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
        <span className="text-[10px] uppercase text-ink-500 font-semibold">Host/Name</span>
        <code className="text-xs font-mono text-ink-900 bg-white px-2 py-1 rounded border border-ink-200 truncate">
          {record.host}
        </code>
        <button onClick={() => onCopy(record.host)}
          className="text-[10px] text-brand-600 hover:text-brand-700 font-semibold">
          Copy
        </button>

        <span className="text-[10px] uppercase text-ink-500 font-semibold">Value</span>
        <code className="text-xs font-mono text-ink-900 bg-white px-2 py-1 rounded border border-ink-200 truncate">
          {record.value}
        </code>
        <button onClick={() => onCopy(record.value)}
          className="text-[10px] text-brand-600 hover:text-brand-700 font-semibold">
          Copy
        </button>
      </div>
    </div>
  )
}
