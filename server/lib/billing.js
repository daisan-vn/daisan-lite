// ========================================================================
//  server/lib/billing.js — Plan definitions + limit checks
// ========================================================================

// ─── Cac goi cuoc ────────────────────────────────────────────────────────
export const PLANS = {
  free: {
    id:                 'free',
    name:               'Free',
    price_vnd:          0,
    interval:           'forever',
    max_projects:       5,
    max_ai_generates:   30,
    has_watermark:      true,
    has_custom_domain:  false,
    features: [
      '5 projects',
      '30 lan AI generate/thang',
      'Multi-page websites',
      'Publish voi URL chia se',
      'Co badge "Made with DaisanAI"'
    ],
    cta: 'Goi hien tai'
  },
  pro: {
    id:                 'pro',
    name:               'Pro',
    price_vnd:          149000,
    interval:           'month',
    max_projects:       null,                // unlimited
    max_ai_generates:   200,
    has_watermark:      false,
    has_custom_domain:  true,
    features: [
      'Unlimited projects',
      '200 lan AI generate/thang',
      'Khong co badge DaisanAI',
      'Custom domain (vd: cuahangcuaban.com)',
      'Email support'
    ],
    cta: 'Nang cap Pro',
    is_popular: true
  },
  business: {
    id:                 'business',
    name:               'Business',
    price_vnd:          399000,
    interval:           'month',
    max_projects:       null,
    max_ai_generates:   500,
    has_watermark:      false,
    has_custom_domain:  true,
    features: [
      'Unlimited everything',
      '500 lan AI generate/thang',
      'White-label hoan toan',
      'Custom domain + SSL',
      'Priority support 24/7',
      'API access (sap co)'
    ],
    cta: 'Nang cap Business'
  }
}

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free
}

// ─── Format VND ──────────────────────────────────────────────────────────
export function formatVnd(amount) {
  return amount.toLocaleString('vi-VN') + 'd'
}

// ─── Lay subscription hien tai cua user (auto-fallback ve free) ──────────
export async function getUserSubscription(supabase, userId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) {
    // Khong co subscription → free mac dinh
    return { plan_id: 'free', status: 'active', current_period_end: null }
  }

  // Check expiry
  if (data.current_period_end && new Date(data.current_period_end) < new Date()) {
    // Het han → tra ve free (khong update DB, chi virtual)
    return { ...data, plan_id: 'free', status: 'expired' }
  }

  return data
}

// ─── Lay usage thang nay ──────────────────────────────────────────────────
export async function getCurrentMonthUsage(supabase, userId) {
  const month = new Date().toISOString().slice(0, 7)   // 'YYYY-MM'
  const { data } = await supabase
    .from('usage_monthly')
    .select('*')
    .eq('user_id', userId)
    .eq('year_month', month)
    .maybeSingle()

  return data || { user_id: userId, year_month: month, ai_generates: 0 }
}

// ─── Check user co duoc generate AI khong ────────────────────────────────
export async function checkGenerateAllowed(supabase, userId) {
  const sub = await getUserSubscription(supabase, userId)
  const plan = getPlan(sub.plan_id)

  // Check project count (chi cho new project, khong cho iterate)
  // Caller phai biet la new hay iterate, va goi rieng

  // Check monthly AI generates
  const usage = await getCurrentMonthUsage(supabase, userId)
  if (usage.ai_generates >= plan.max_ai_generates) {
    return {
      allowed: false,
      reason: 'monthly_limit',
      message: `Da het quota ${plan.max_ai_generates} lan/thang cua goi ${plan.name}. Nang cap de tiep tuc.`,
      plan,
      usage
    }
  }

  return { allowed: true, plan, usage }
}

// ─── Check user co duoc tao project moi khong ───────────────────────────
export async function checkProjectLimitAllowed(supabase, userId) {
  const sub = await getUserSubscription(supabase, userId)
  const plan = getPlan(sub.plan_id)

  if (plan.max_projects === null) return { allowed: true, plan }

  // Count current projects
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (count >= plan.max_projects) {
    return {
      allowed: false,
      reason: 'project_limit',
      message: `Da dat gioi han ${plan.max_projects} projects cua goi ${plan.name}. Xoa project cu hoac nang cap.`,
      plan,
      currentCount: count
    }
  }

  return { allowed: true, plan, currentCount: count }
}

// ─── Cap nhat subscription len plan moi (sau khi thanh toan thanh cong) ─
export async function upgradeUserPlan(supabase, userId, planId, periodMonths = 1) {
  if (!PLANS[planId]) throw new Error('Plan khong hop le')

  const start = new Date()
  const end = new Date()
  end.setMonth(end.getMonth() + periodMonths)

  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      current_period_start: start.toISOString(),
      current_period_end: planId === 'free' ? null : end.toISOString()
    }, { onConflict: 'user_id' })

  if (error) throw error
}

// ─── Inject footer badge cho Free tier sites ────────────────────────────
export function injectFreeBadge(html) {
  if (!html) return html
  const badge = `
<a href="https://daisan.vn?ref=site" target="_blank" rel="noopener" style="
  position:fixed; bottom:12px; right:12px; z-index:9999;
  padding:6px 12px; background:rgba(15,18,32,0.85); color:white;
  text-decoration:none; border-radius:99px;
  font-family:system-ui,sans-serif; font-size:11px; font-weight:500;
  backdrop-filter:blur(8px); box-shadow:0 4px 12px rgba(0,0,0,0.15);
  display:inline-flex; align-items:center; gap:4px;
">
  <span style="color:#5e85ff">⚡</span>
  Made with DaisanAI
</a>
`
  if (html.includes('</body>')) return html.replace('</body>', badge + '</body>')
  return html + badge
}
