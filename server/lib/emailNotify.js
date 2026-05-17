// ========================================================================
//  server/lib/emailNotify.js (v0.15) — Email notify khi co lead moi
// ========================================================================
//  Goi Resend API gui email den owner cua project khi khach submit form.
//  Free tier Resend: 3000 email/thang. Khong config thi skip silently.
// ========================================================================

import { Resend } from 'resend'

const FROM_EMAIL  = process.env.FROM_EMAIL || 'DaisanAI <onboarding@resend.dev>'
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://webbuilder.daisan.ai'

let resendClient = null
function getResend() {
  if (resendClient) return resendClient
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  resendClient = new Resend(key)
  return resendClient
}

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY
}

// ─── Escape HTML de chong injection trong email body ─────────────────────
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── Render email template ───────────────────────────────────────────────
function renderEmail({ projectName, siteName, leadData, sourcePage, projectId, submitterIp }) {
  const fields = Object.entries(leadData || {})
  const rows = fields.map(([k, v]) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;white-space:pre-wrap;word-break:break-word;">${esc(v)}</td>
    </tr>`).join('')

  // Try to detect contact info for reply link
  const d = leadData || {}
  const replyEmail = d.email || d.e_mail
  const replyPhone = d.phone || d.sdt || d.so_dien_thoai || d.dien_thoai || d.tel

  const deepLink = `${APP_BASE_URL.replace(/\/$/, '')}/?project=${projectId}&openLeads=1`

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Lead moi tu ${esc(siteName || projectName)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#3b5cf5 0%,#2a40e6 100%);padding:24px 28px;color:white;">
      <div style="font-size:13px;opacity:0.85;letter-spacing:0.5px;text-transform:uppercase;">LEAD MOI</div>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;">Co khach lien he ${esc(siteName || projectName)}</h1>
    </div>

    <!-- Body -->
    <div style="padding:24px 28px;">
      <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.5;">
        Co nguoi vua dien form lien he tren website cua ban. Thong tin chi tiet:
      </p>

      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:16px;">
        ${rows || '<tr><td style="padding:16px;color:#9ca3af;text-align:center;font-style:italic;">(Khong co du lieu)</td></tr>'}
      </table>

      ${sourcePage ? `<p style="font-size:12px;color:#6b7280;margin:0 0 16px;">Submit tu trang: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;">${esc(sourcePage)}</code></p>` : ''}

      <!-- Quick actions -->
      <div style="display:block;margin:20px 0 8px;">
        ${replyPhone ? `
          <a href="tel:${esc(replyPhone)}"
             style="display:inline-block;padding:10px 18px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin-right:8px;margin-bottom:8px;">
            📞 Goi ${esc(replyPhone)}
          </a>` : ''}
        ${replyEmail ? `
          <a href="mailto:${esc(replyEmail)}"
             style="display:inline-block;padding:10px 18px;background:#3b5cf5;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin-right:8px;margin-bottom:8px;">
            ✉️ Reply email
          </a>` : ''}
        <a href="${esc(deepLink)}"
           style="display:inline-block;padding:10px 18px;background:white;color:#111827;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;border:1px solid #d1d5db;margin-bottom:8px;">
          Mo trong app →
        </a>
      </div>

      <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af;line-height:1.5;">
        Submitter IP: <code>${esc(submitterIp || 'unknown')}</code><br>
        Email nay duoc gui tu DaisanAI Lite — nen tang tao web cho SME Viet Nam.<br>
        Khong muon nhan email? Vao app → Settings (sap co option tat).
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─── Public API ──────────────────────────────────────────────────────────
/**
 * Gui email notify cho owner khi co lead moi.
 * Fail silently — khong block luong submit lead.
 * @returns {Promise<{ok: boolean, skipped?: boolean, error?: string}>}
 */
export async function sendLeadNotificationEmail({
  supabase, ownerUserId, projectId, projectName, siteName,
  leadData, sourcePage, submitterIp
}) {
  const client = getResend()
  if (!client) {
    return { ok: false, skipped: true, error: 'RESEND_API_KEY not set' }
  }
  if (!ownerUserId) {
    return { ok: false, skipped: true, error: 'no ownerUserId' }
  }

  try {
    // Lay email tu auth.users (qua service_role)
    const { data, error } = await supabase.auth.admin.getUserById(ownerUserId)
    if (error || !data?.user?.email) {
      return { ok: false, skipped: true, error: 'owner has no email' }
    }
    const toEmail = data.user.email

    const html = renderEmail({
      projectName, siteName, leadData, sourcePage, projectId, submitterIp
    })

    const subject = `[DaisanAI] Lead moi - ${siteName || projectName}`

    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html,
      replyTo: leadData?.email || leadData?.e_mail || undefined
    })

    if (result.error) {
      console.error('[email-notify] resend error:', result.error)
      return { ok: false, error: result.error.message || 'send failed' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[email-notify] exception:', err.message)
    return { ok: false, error: err.message }
  }
}
