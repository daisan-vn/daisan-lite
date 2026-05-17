// ========================================================================
//  server/index.js — Backend DaisanAI Lite v0.5
// ========================================================================
//  NANG CAP TU v0.4:
//    + Publish/Unpublish API
//    + Public route /site/:slug/* — phuc vu website live
//    + Smart nav script — tu detect: trong iframe thi postMessage,
//      trong real browsing thi let browser navigate
//    + View count tracking
// ========================================================================

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import dns from 'dns/promises'
import * as cheerio from 'cheerio'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as vnpay from './lib/vnpay.js'
import {
  PLANS, getPlan, getUserSubscription, getCurrentMonthUsage,
  checkGenerateAllowed, checkProjectLimitAllowed,
  upgradeUserPlan, injectFreeBadge
} from './lib/billing.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))
// Trust proxy de lay client IP dung
app.set('trust proxy', true)

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ═══════════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════════

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Chua dang nhap' })
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: 'Token khong hop le' })
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: err.message })
  }
}

// ─── v0.12: Admin check ──────────────────────────────────────────────────
// Tra ve true neu user_id co row user_roles voi is_admin = true
async function isAdminUser(userId) {
  if (!userId) return false
  const { data } = await supabase
    .from('user_roles').select('is_admin')
    .eq('user_id', userId).maybeSingle()
  return !!data?.is_admin
}

// Middleware: yeu cau req.user.id la admin (phai chay sau requireAuth)
async function requireAdmin(req, res, next) {
  const ok = await isAdminUser(req.user?.id)
  if (!ok) return res.status(403).json({ error: 'Khong co quyen admin' })
  next()
}

// ─── v0.10: Role detection — owner vs client ─────────────────────────────
// Tra ve 'owner' | 'client' | null cho user voi project nay
async function getUserRole(userId, projectId) {
  if (!userId || !projectId) return null
  const { data, error } = await supabase
    .from('projects')
    .select('user_id, client_user_id')
    .eq('id', projectId).single()
  if (error || !data) return null
  if (data.user_id === userId) return 'owner'
  if (data.client_user_id === userId) return 'client'
  return null
}

// ═══════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════

function stripCodeFences(text) {
  if (!text) return ''
  let r = text.trim()
  r = r.replace(/^[`~]{3,}\s*[a-zA-Z]*\s*\n?/, '')
  r = r.replace(/\n?[`~]{3,}\s*$/, '')
  return r.trim()
}

function deriveName(prompt) {
  const clean = prompt.trim().replace(/\s+/g, ' ').slice(0, 60)
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

// ─── MARKER PARSER (v0.7.1 fix — thay JSON parser de tranh escape hell) ──
function parseClaudeJSON(text) {
  const result = { siteName: '', navigation: [], pages: {} }

  // SITE_NAME
  const siteMatch = text.match(/===SITE_NAME===\s*\n([\s\S]*?)(?=\n===)/)
  if (siteMatch) result.siteName = siteMatch[1].trim()

  // NAV
  const navMatch = text.match(/===NAV===\s*\n([\s\S]*?)(?=\n===)/)
  if (navMatch) {
    const lines = navMatch[1].trim().split('\n')
    for (const line of lines) {
      const [name, path] = line.split('|').map(s => s.trim())
      if (name && path) result.navigation.push({ name, path })
    }
  }

  // PAGES
  const pageRegex = /===PAGE:([^=\n]+?)===\s*\n([\s\S]*?)(?=\n===PAGE:|\n===END===|$)/g
  let match
  while ((match = pageRegex.exec(text)) !== null) {
    const path = match[1].trim()
    const html = match[2].trim()
    if (path && html) result.pages[path] = html
  }

  if (Object.keys(result.pages).length === 0) {
    throw new Error('AI khong tra ve page nao (parse markers fail)')
  }

  return result
}

// Slug helper — convert "Cà phê Linh" → "ca-phe-linh-x4k2"
function slugify(name) {
  const base = (name || 'web')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // bo dau
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
  const suffix = crypto.randomBytes(2).toString('hex')  // 4 char random
  return (base || 'web') + '-' + suffix
}

async function generateUniqueSlug(name, attempts = 0) {
  if (attempts > 5) throw new Error('Khong the tao slug duy nhat')
  const slug = slugify(name)
  const { data } = await supabase
    .from('projects').select('id').eq('slug', slug).maybeSingle()
  if (data) return generateUniqueSlug(name, attempts + 1)   // try again
  return slug
}

// ─── HTML SANITIZER (v0.10.1 — chong XSS qua /save-edits) ────────────────
// User (owner hoac client) gui HTML qua inline-edit → server phai sanitize
// truoc khi luu DB va serve public. Allowlist script CDN cho AI-generated content.
const ALLOWED_SCRIPT_SRC_PREFIXES = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/',
  'https://unpkg.com/',
  'https://fonts.googleapis.com/'
]

const URL_ATTR_NAMES = new Set([
  'href', 'src', 'action', 'formaction', 'xlink:href', 'srcset', 'background', 'poster'
])
const DANGEROUS_SCHEME_RE = /^\s*(javascript|vbscript|data\s*:\s*text\/html)/i

function sanitizeUserHtml(html) {
  if (!html || typeof html !== 'string') return html
  const $ = cheerio.load(html, { decodeEntities: false })

  // 1. Xoa cac tag co the nhung noi dung tu y / redirect
  $('iframe, object, embed, base, applet, frame, frameset').remove()
  $('meta[http-equiv]').remove()
  $('link[rel="import"]').remove()

  // 2. Lam sach <script>: chi giu src trong allowlist, bo inline, bo moi attr khac
  $('script').each((_, el) => {
    const $el = $(el)
    const src = ($el.attr('src') || '').trim()
    const inline = ($el.html() || '').trim()
    const allowed = src && !inline &&
      ALLOWED_SCRIPT_SRC_PREFIXES.some(p => src.startsWith(p))
    if (!allowed) { $el.remove(); return }
    el.attribs = { src }
  })

  // 3. Strip on* handlers, javascript:/vbscript: URL, srcdoc, nonce trong moi tag
  $('*').each((_, el) => {
    if (!el.attribs) return
    for (const name of Object.keys(el.attribs)) {
      const lower = name.toLowerCase()
      if (lower.startsWith('on')) { delete el.attribs[name]; continue }
      if (lower === 'srcdoc' || lower === 'nonce') { delete el.attribs[name]; continue }
      if (URL_ATTR_NAMES.has(lower) && DANGEROUS_SCHEME_RE.test(el.attribs[name] || '')) {
        delete el.attribs[name]
      }
    }
  })

  // Cheerio drop <!DOCTYPE> trong output, prepend lai cho dung HTML5
  return '<!DOCTYPE html>\n' + $.root().html()
}

// ─── SMART NAV SCRIPT ────────────────────────────────────────────────────
// Tu detect: neu trong iframe → postMessage (preview mode)
//            neu top-level → let browser navigate (publish mode)
function injectNavScript(html) {
  if (!html) return html
  const script = `
<script data-daisan-inject="true">
(function() {
  var inIframe = (function(){ try { return window.self !== window.top; } catch(e){ return true; } })();
  if (!inIframe) return;

  // ─── Nav script (intercept link clicks) ─────────────────────────────
  document.addEventListener('click', function(e) {
    // Bo qua khi dang edit
    if (document.body.classList.contains('daisan-edit-mode')) return;
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href) return;
    if (href.startsWith('http') || href.startsWith('//') || href.includes(':')) return;
    if (href.startsWith('#')) return;
    if (href.endsWith('.html') || !href.includes('.')) {
      e.preventDefault();
      var cleanPath = href.replace(/^\\.\\//, '');
      window.parent.postMessage({ type: 'daisan:navigate', path: cleanPath }, '*');
    }
  });
  document.addEventListener('submit', function(e) {
    if (document.body.classList.contains('daisan-edit-mode')) return;
    e.preventDefault();
    window.parent.postMessage({ type: 'daisan:formSubmit' }, '*');
  });

  // ─── Edit mode script (v0.9) ────────────────────────────────────────
  function isEditableTextEl(el) {
    var tag = el.tagName.toLowerCase();
    var ok = ['h1','h2','h3','h4','h5','h6','p','span','a','li','button','label','td','th','blockquote','figcaption'];
    if (ok.indexOf(tag) === -1) return false;
    if (!el.textContent || !el.textContent.trim()) return false;
    if (el.closest('head, script, style, noscript')) return false;
    // Skip if has block-level children
    for (var i = 0; i < el.children.length; i++) {
      var ct = el.children[i].tagName;
      if (['SPAN','EM','STRONG','I','B','U','BR','SMALL','MARK','SUB','SUP','CODE'].indexOf(ct) === -1) {
        return false;
      }
    }
    return true;
  }

  var editStyleId = 'daisan-edit-style';
  function injectEditStyles() {
    if (document.getElementById(editStyleId)) return;
    var s = document.createElement('style');
    s.id = editStyleId;
    s.setAttribute('data-daisan-inject', 'true');
    s.textContent = '' +
      '.daisan-edit-mode [data-daisan-editable]:hover {' +
      '  outline: 2px dashed #3b5cf5 !important;' +
      '  outline-offset: 2px !important;' +
      '  cursor: text !important;' +
      '  background: rgba(59,92,245,0.05) !important;' +
      '}' +
      '.daisan-edit-mode [data-daisan-editable]:focus {' +
      '  outline: 2px solid #3b5cf5 !important;' +
      '  outline-offset: 2px !important;' +
      '  background: rgba(59,92,245,0.08) !important;' +
      '}' +
      '.daisan-edit-mode a { pointer-events: auto !important; }' +
      '.daisan-edit-mode * { user-select: text !important; }';
    document.head.appendChild(s);
  }

  function enableEditMode() {
    injectEditStyles();
    document.body.classList.add('daisan-edit-mode');
    var els = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,li,button,label,td,th,blockquote,figcaption');
    els.forEach(function(el) {
      if (!isEditableTextEl(el)) return;
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('data-daisan-editable', 'true');
      if (!el.hasAttribute('data-daisan-original')) {
        el.setAttribute('data-daisan-original', el.textContent);
      }
      el.addEventListener('input', notifyDirty, { once: false });
      // Prevent Enter from adding <div>
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          el.blur();
        }
      });
    });
    window.parent.postMessage({ type: 'daisan:editModeReady', editableCount: document.querySelectorAll('[data-daisan-editable]').length }, '*');
  }

  function disableEditMode() {
    document.body.classList.remove('daisan-edit-mode');
    var els = document.querySelectorAll('[data-daisan-editable]');
    els.forEach(function(el) {
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-daisan-editable');
      el.removeAttribute('data-daisan-original');
    });
  }

  var dirtyTimer = null;
  function notifyDirty() {
    if (dirtyTimer) return;
    dirtyTimer = setTimeout(function() {
      dirtyTimer = null;
      window.parent.postMessage({ type: 'daisan:dirty' }, '*');
    }, 100);
  }

  function getCleanHtml() {
    // Clone documentElement, strip injected stuff
    var root = document.documentElement.cloneNode(true);
    var injects = root.querySelectorAll('[data-daisan-inject]');
    for (var i = 0; i < injects.length; i++) injects[i].remove();
    var editables = root.querySelectorAll('[data-daisan-editable]');
    for (var j = 0; j < editables.length; j++) {
      editables[j].removeAttribute('contenteditable');
      editables[j].removeAttribute('data-daisan-editable');
      editables[j].removeAttribute('data-daisan-original');
    }
    return '<!DOCTYPE html>\\n' + root.outerHTML;
  }

  window.addEventListener('message', function(e) {
    var d = e.data || {};
    if (d.type === 'daisan:setEditMode') {
      if (d.enabled) enableEditMode(); else disableEditMode();
    }
    if (d.type === 'daisan:requestCleanHtml') {
      window.parent.postMessage({
        type: 'daisan:cleanHtml',
        html: getCleanHtml()
      }, '*');
    }
  });
})();
</script>
`
  if (html.includes('</body>')) return html.replace('</body>', script + '</body>')
  return html + script
}

function injectAllPages(pages) {
  const result = {}
  for (const [path, html] of Object.entries(pages)) {
    result[path] = injectNavScript(html)
  }
  return result
}

// ═══════════════════════════════════════════════════════════════════════
//  SYSTEM PROMPTS (v0.7.1 — MARKER format, fix JSON parse hell)
// ═══════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT_NEW = `Ban la AI chuyen tao website nhieu trang chuyen nghiep cho thi truong Viet Nam.

NHIEM VU: Tao website co 2-5 trang lien ket voi nhau dua tren yeu cau user.

OUTPUT FORMAT (BAT BUOC theo dung):
Su dung MARKERS === phan chia. KHONG dung JSON, KHONG wrap markdown fence.

VI DU OUTPUT (bat dau ngay tu dong dau, KHONG co text truoc):

===SITE_NAME===
Ten website ngan gon

===NAV===
Trang chu|index.html
Gioi thieu|gioi-thieu.html
Lien he|lien-he.html

===PAGE:index.html===
<!DOCTYPE html>
<html lang="vi">
<head>...</head>
<body>...</body>
</html>

===PAGE:gioi-thieu.html===
<!DOCTYPE html>
<html lang="vi">
...
</html>

===PAGE:lien-he.html===
<!DOCTYPE html>
<html lang="vi">
...
</html>

===END===

QUY TAC OUTPUT:
1. Bat dau NGAY voi ===SITE_NAME=== (KHONG co text giai thich truoc)
2. NAV: moi dong la "Ten hien thi|filename.html"
3. Moi PAGE bat dau voi ===PAGE:<filename>=== o dong rieng
4. HTML day du tu <!DOCTYPE html> den </html>
5. Ket thuc ===END===
6. KHONG them text gi them sau ===END===

QUY TAC NOI DUNG:
- 100% tieng Viet co dau
- Page filename khong dau: gioi-thieu.html, san-pham.html, lien-he.html
- 2-5 page (vua phai)

QUY TAC TUNG PAGE:
- <!DOCTYPE html>, <head>, <body> day du
- Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>
- Google Fonts Be Vietnam Pro qua <link>
- Header NAV co link den TAT CA page khac
- Footer co SDT 09xx, dia chi VN chi tiet
- Responsive mobile-first
- TAT CA page chia se design: cung header, mau, font, footer
- Hover effects, animation tinh te`

const SYSTEM_PROMPT_ITERATE = `Ban dang sua website nhieu trang. User gui yeu cau thay doi.

INPUT: Website hien tai (dang JSON tham khao).

OUTPUT FORMAT (BAT BUOC dung MARKER, KHONG dung JSON):

===SITE_NAME===
Ten website

===NAV===
Trang chu|index.html
...

===PAGE:index.html===
<!DOCTYPE html>
...

===PAGE:khac.html===
<!DOCTYPE html>
...

===END===

QUY TAC:
1. Bat dau ngay voi ===SITE_NAME=== (KHONG text truoc)
2. Tra ve TAT CA page (ke ca khong sua) trong output
3. GIU NGUYEN noi dung cua page khong duoc yeu cau sua
4. Khi them page: cap nhat NAV va nav menu trong TAT CA page hien co
5. Khi xoa page: cap nhat NAV va nav menu trong cac page con lai
6. Khi doi design: ap dung cho TAT CA page de consistency
7. Ket thuc ===END===, KHONG them text gi`

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES (khong can auth)
// ═══════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '0.12.0', time: new Date().toISOString() })
})

// ─── GET /site/:slug/ va /site/:slug/:filename ────────────────────────
// Phuc vu website live cho cong dong
async function servePublicSite(req, res) {
  const { slug } = req.params
  const filename = req.params.filename || 'index.html'

  // Bao mat: chi cho phep .html files
  if (!filename.endsWith('.html')) {
    return res.status(404).send('Not found')
  }

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, user_id, pages, site_name, is_published, view_count')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()

    if (error || !project) {
      return res.status(404).type('html').send(notFoundPage(slug))
    }

    let html = project.pages?.[filename]
    if (!html) {
      return res.status(404).type('html').send(notFoundPage(slug, filename))
    }

    // v0.7: Inject badge cho free tier
    const ownerSub = await getUserSubscription(supabase, project.user_id)
    const ownerPlan = getPlan(ownerSub.plan_id)
    if (ownerPlan.has_watermark) {
      html = injectFreeBadge(html)
    }

    // Track view (fire-and-forget)
    if (filename === 'index.html') {
      supabase
        .from('projects')
        .update({ view_count: (project.view_count || 0) + 1 })
        .eq('id', project.id)
        .then(() => {})
        .catch(() => {})
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('X-Powered-By', 'DaisanAI')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.send(html)
  } catch (err) {
    console.error('[publish]', err)
    res.status(500).send('Server error')
  }
}

app.get('/site/:slug', servePublicSite)
app.get('/site/:slug/', servePublicSite)
app.get('/site/:slug/:filename', servePublicSite)


// ─── CUSTOM DOMAIN MIDDLEWARE (v0.8) ──────────────────────────────────
// Khi request den voi Host header la custom domain → serve site cua project do
// VD: Host: cuahangcuaban.com → tim project co custom_domain = "cuahangcuaban.com"
// Phai chay TRUOC tat ca cac route khac
async function customDomainMiddleware(req, res, next) {
  let host = (req.headers.host || '').toLowerCase().split(':')[0]

  // Bo qua localhost, IP, va daisan domain chinh
  if (!host
      || host === 'localhost'
      || host === '127.0.0.1'
      || host.match(/^\d+\.\d+\.\d+\.\d+$/)
      || host.endsWith('.daisan.vn')
      || host === 'daisan.vn') {
    return next()
  }

  // Bo qua API requests
  if (req.path.startsWith('/api/') || req.path.startsWith('/site/')) {
    return next()
  }

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, user_id, pages, site_name, is_published, view_count, custom_domain_verified')
      .eq('custom_domain', host)
      .eq('is_published', true)
      .maybeSingle()

    if (!project || !project.custom_domain_verified) {
      return next()    // khong match → let SPA handle (or 404)
    }

    // Tim file path tu URL
    let filename = req.path === '/' ? 'index.html' : req.path.slice(1)
    if (!filename.endsWith('.html')) filename = filename + '.html'
    // Loai bo trailing slash neu co
    if (filename.endsWith('/')) filename = filename.slice(0, -1) || 'index.html'

    let html = project.pages?.[filename]
    if (!html) {
      // Fallback ve index.html cho SPA-like routing
      html = project.pages?.['index.html']
    }
    if (!html) {
      return res.status(404).type('html').send(notFoundPage(host, filename))
    }

    // Inject badge cho free tier
    const ownerSub = await getUserSubscription(supabase, project.user_id)
    const ownerPlan = getPlan(ownerSub.plan_id)
    if (ownerPlan.has_watermark) {
      html = injectFreeBadge(html)
    }

    // Track view
    if (filename === 'index.html') {
      supabase
        .from('projects')
        .update({ view_count: (project.view_count || 0) + 1 })
        .eq('id', project.id)
        .then(() => {}).catch(() => {})
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('X-Powered-By', 'DaisanAI')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    return res.send(html)
  } catch (err) {
    console.error('[custom-domain]', err)
    return next()
  }
}

// Apply middleware TRUOC cac routes API thong thuong
app.use(customDomainMiddleware)

function notFoundPage(slug, filename) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Khong tim thay trang</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600&display=swap" rel="stylesheet">
<style>body{font-family:'Be Vietnam Pro',sans-serif}</style>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
  <div class="text-center max-w-md">
    <div class="text-6xl mb-4">🔍</div>
    <h1 class="text-2xl font-bold text-gray-900">Không tìm thấy trang</h1>
    <p class="text-gray-600 mt-2">
      ${filename ? `Trang <code class="bg-gray-200 px-1.5 rounded text-sm">${filename}</code> ` : `Website <code class="bg-gray-200 px-1.5 rounded text-sm">${slug}</code> `}
      không tồn tại hoặc đã được gỡ.
    </p>
    <p class="text-xs text-gray-400 mt-8">Powered by <strong>DaisanAI</strong></p>
  </div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════
//  AUTHENTICATED API
// ═══════════════════════════════════════════════════════════════════════

app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id, email: req.user.email,
    name: req.user.user_metadata?.full_name || req.user.email,
    avatar: req.user.user_metadata?.avatar_url || null,
    provider: req.user.app_metadata?.provider || 'email'
  })
})

app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    // v0.10: get projects where user is OWNER or CLIENT
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, prompt, site_name, slug, is_published, view_count, created_at, updated_at, user_id, client_user_id')
      .or(`user_id.eq.${req.user.id},client_user_id.eq.${req.user.id}`)
      .order('updated_at', { ascending: false })
      .limit(50)
    if (error) throw error
    // Them field 'role' cho moi project (owner/client) → frontend biet quyen
    const projectsWithRole = (data || []).map(p => ({
      ...p,
      role: p.user_id === req.user.id ? 'owner' : 'client'
    }))
    res.json({ projects: projectsWithRole })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    // v0.10: allow owner OR client to view
    const { data, error } = await supabase
      .from('projects').select('*')
      .eq('id', req.params.id)
      .or(`user_id.eq.${req.user.id},client_user_id.eq.${req.user.id}`)
      .single()
    if (error) throw error
    if ((!data.pages || Object.keys(data.pages).length === 0) && data.html) {
      data.pages = { 'index.html': data.html }
      data.navigation = [{ name: 'Trang chu', path: 'index.html' }]
    }
    // Add role field
    data.role = data.user_id === req.user.id ? 'owner' : 'client'
    res.json(data)
  } catch (err) {
    res.status(404).json({ error: 'Khong tim thay project' })
  }
})

app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('projects').delete()
      .eq('id', req.params.id).eq('user_id', req.user.id)
    if (error) throw error
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Ten khong duoc rong' })
    const { data, error } = await supabase
      .from('projects').update({ name: name.trim().slice(0, 100) })
      .eq('id', req.params.id).eq('user_id', req.user.id).select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/projects/:id/save-edits (v0.9, updated v0.10) ───────────
// User edit text trong iframe → frontend gui ve HTML moi cho 1 page
// Khong dung AI, khong ton quota → FREE cho moi tier
// v0.10: cho ca OWNER va CLIENT cua project edit
app.post('/api/projects/:id/save-edits', requireAuth, async (req, res) => {
  try {
    const { filename, html } = req.body
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Thieu filename' })
    }
    if (!filename.endsWith('.html')) {
      return res.status(400).json({ error: 'Filename phai .html' })
    }
    if (!html || typeof html !== 'string' || html.length < 50) {
      return res.status(400).json({ error: 'HTML khong hop le' })
    }
    if (html.length > 500000) {
      return res.status(400).json({ error: 'HTML qua lon (> 500KB)' })
    }

    // v0.10: Check role (owner OR client) — KHONG dung user_id filter cung
    const role = await getUserRole(req.user.id, req.params.id)
    if (!role) return res.status(403).json({ error: 'Khong co quyen edit project nay' })

    // Load project pages
    const { data: project, error: lErr } = await supabase
      .from('projects')
      .select('id, pages')
      .eq('id', req.params.id).single()

    if (lErr || !project) return res.status(404).json({ error: 'Project khong ton tai' })

    const pages = { ...(project.pages || {}) }
    if (!pages[filename]) {
      return res.status(404).json({ error: `Page "${filename}" khong ton tai trong project` })
    }

    // Sanitize HTML — chong XSS qua client invite (v0.10.1)
    // Strip <script> inline, on* handlers, javascript: URL, iframe/object/embed.
    // Allowlist CDN script (Tailwind, Google Fonts) de giu AI-generated content.
    const safeHtml = sanitizeUserHtml(html)
    if (!safeHtml || safeHtml.length < 50) {
      return res.status(400).json({ error: 'HTML sau khi loc qua ngan hoac khong hop le' })
    }

    // Re-inject nav script (vi frontend gui HTML clean, server tu inject lai)
    pages[filename] = injectNavScript(safeHtml)

    // Update DB (chi update pages, khong filter user_id vi da check role)
    const updates = { pages }
    // Neu day la index → cap nhat truong html chinh (dung cho backward compat)
    if (filename === 'index.html') {
      updates.html = pages[filename]
    }

    const { data: updated, error: uErr } = await supabase
      .from('projects').update(updates)
      .eq('id', req.params.id).select().single()

    if (uErr) throw uErr

    // Add role to response
    updated.role = role
    res.json({ success: true, project: updated, role })
  } catch (err) {
    console.error('[save-edits]', err)
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════════════════
//  CLIENT INVITE ENDPOINTS (v0.10)
// ════════════════════════════════════════════════════════════════════════

// ─── POST /api/projects/:id/invite-client ───────────────────────────────
// Owner sinh invite link cho client → return link de share qua Zalo/email
app.post('/api/projects/:id/invite-client', requireAuth, async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Email khong hop le' })
    }

    // Verify owner
    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('id, name, user_id, client_email, client_user_id')
      .eq('id', req.params.id).eq('user_id', req.user.id).single()

    if (pErr || !project) {
      return res.status(404).json({ error: 'Project khong ton tai hoac ban khong phai owner' })
    }

    // Generate token + 30 day expiry
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const { error: uErr } = await supabase.from('projects').update({
      client_email: email.toLowerCase().trim(),
      client_invite_token: token,
      client_invite_expires_at: expiresAt.toISOString(),
      client_invited_at: new Date().toISOString(),
      // Reset client_user_id neu da link truoc do (cho phep re-invite)
      client_user_id: null,
      client_accepted_at: null
    }).eq('id', req.params.id)

    if (uErr) throw uErr

    // Generate frontend URL — su dung referer header hoac default
    const baseUrl = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://webbuilder.daisan.ai'
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/client-invite?token=${token}`

    res.json({
      success: true,
      inviteUrl,
      email,
      expiresAt: expiresAt.toISOString(),
      projectName: project.name
    })
  } catch (err) {
    console.error('[invite-client]', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/client-invite/:token ───────────────────────────────────────
// PUBLIC endpoint — frontend goi de hien thi info project trong page accept
app.get('/api/client-invite/:token', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, site_name, client_email, client_invite_expires_at')
      .eq('client_invite_token', req.params.token)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'Link moi khong hop le hoac da het han' })
    }

    if (data.client_invite_expires_at && new Date(data.client_invite_expires_at) < new Date()) {
      return res.status(410).json({ error: 'Link moi da het han. Hay yeu cau chu DaisanAI tao link moi.' })
    }

    res.json({
      projectName: data.name || data.site_name || 'Website',
      clientEmail: data.client_email,
      expiresAt: data.client_invite_expires_at
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/client-invite/:token/accept ───────────────────────────────
// Client da dang nhap → link auth.uid() vao project.client_user_id
app.post('/api/client-invite/:token/accept', requireAuth, async (req, res) => {
  try {
    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('id, name, client_email, client_invite_expires_at')
      .eq('client_invite_token', req.params.token)
      .single()

    if (pErr || !project) {
      return res.status(404).json({ error: 'Link moi khong hop le' })
    }

    if (project.client_invite_expires_at && new Date(project.client_invite_expires_at) < new Date()) {
      return res.status(410).json({ error: 'Link moi da het han' })
    }

    // Check user email match client_email
    const userEmail = (req.user.email || '').toLowerCase().trim()
    const inviteEmail = (project.client_email || '').toLowerCase().trim()
    if (!userEmail || userEmail !== inviteEmail) {
      return res.status(403).json({
        error: `Email cua ban (${userEmail}) khong khop voi email duoc moi (${inviteEmail}). Hay dang nhap dung email duoc moi.`
      })
    }

    // Link user → project, clear token (one-time use)
    const { error: uErr } = await supabase.from('projects').update({
      client_user_id: req.user.id,
      client_invite_token: null,
      client_accepted_at: new Date().toISOString()
    }).eq('id', project.id)

    if (uErr) throw uErr

    res.json({
      success: true,
      projectId: project.id,
      projectName: project.name
    })
  } catch (err) {
    console.error('[accept-invite]', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── DELETE /api/projects/:id/client ────────────────────────────────────
// Owner revoke client access
app.delete('/api/projects/:id/client', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('projects').update({
      client_email: null,
      client_user_id: null,
      client_invite_token: null,
      client_invite_expires_at: null,
      client_invited_at: null,
      client_accepted_at: null
    }).eq('id', req.params.id).eq('user_id', req.user.id).select().single()

    if (error || !data) return res.status(404).json({ error: 'Project khong ton tai' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS (v0.12) — yeu cau user_roles.is_admin = true
// ════════════════════════════════════════════════════════════════════════

// GET /api/admin/check — frontend goi de biet user co phai admin khong
app.get('/api/admin/check', requireAuth, async (req, res) => {
  res.json({ is_admin: await isAdminUser(req.user.id) })
})

// GET /api/admin/templates — list tat ca template (kem metadata day du)
app.get('/api/admin/templates', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('id, slug, name, description, category, industry_label, emoji, color_from, color_to, navigation, site_name, default_prompt, uses_count, is_featured, display_order, pages, created_at, updated_at')
      .order('display_order', { ascending: true })
    if (error) throw error
    // Tinh page_count tu pages jsonb (khong tra ve pages content de keep payload nho)
    const slim = (data || []).map(t => ({
      ...t,
      page_count: t.pages ? Object.keys(t.pages).length : 0,
      pages: undefined   // strip content khoi list
    }))
    res.json({ templates: slim })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/templates/:id — sua metadata cua 1 template
// Allowlist field de chong user gui pages/uses_count gia
app.patch('/api/admin/templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ALLOWED = ['name','description','category','industry_label','emoji',
      'color_from','color_to','default_prompt','is_featured','display_order','site_name']
    const updates = {}
    for (const f of ALLOWED) {
      if (f in req.body) updates[f] = req.body[f]
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Khong co field hop le de cap nhat' })
    }
    // Sanitize: trim strings, clamp display_order
    if ('name' in updates) updates.name = String(updates.name).trim().slice(0, 100)
    if ('description' in updates) updates.description = String(updates.description).slice(0, 500)
    if ('display_order' in updates) updates.display_order = Math.max(0, Math.min(9999, parseInt(updates.display_order) || 100))
    if ('is_featured' in updates) updates.is_featured = !!updates.is_featured

    const { data, error } = await supabase
      .from('templates').update(updates).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ template: data })
  } catch (err) {
    console.error('[admin-template-patch]', err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/templates/:id — xoa hoan toan
app.delete('/api/admin/templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('templates').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/templates/:id — full data (bao gom pages content)
app.get('/api/admin/templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('templates').select('*').eq('id', req.params.id).single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(404).json({ error: 'Khong tim thay template' })
  }
})

// POST /api/admin/templates/generate — tao template moi qua AI
// Body: { slug, name, description, category, industry_label, emoji,
//         color_from, color_to, default_prompt, display_order, is_featured }
// Goi Claude API (non-streaming), parse markers, inject nav script, insert vao DB.
// LUU Y: ton ~$0.05-$0.20 / request → chi admin moi goi duoc.
app.post('/api/admin/templates/generate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      slug, name, description = '', category = 'other', industry_label = '',
      emoji = '✨', color_from = '#3b5cf5', color_to = '#2a40e6',
      default_prompt, display_order = 100, is_featured = false
    } = req.body || {}

    // Validate input
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug khong hop le (chi cho phep a-z 0-9 dau gach)' })
    }
    if (!name?.trim()) return res.status(400).json({ error: 'Thieu name' })
    if (!default_prompt?.trim() || default_prompt.length < 20) {
      return res.status(400).json({ error: 'default_prompt phai >= 20 ky tu' })
    }

    // Check slug khong trung
    const { data: existing } = await supabase
      .from('templates').select('id').eq('slug', slug).maybeSingle()
    if (existing) return res.status(409).json({ error: `Slug "${slug}" da ton tai` })

    // Goi Claude API (giong scripts/seed-templates.js)
    const message = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 20000,
      system: SYSTEM_PROMPT_NEW,
      messages: [{ role: 'user', content: default_prompt.trim() }]
    })
    const fullText = message.content.filter(b => b.type === 'text').map(b => b.text).join('')

    let parsed
    try { parsed = parseClaudeJSON(fullText) }
    catch (err) {
      return res.status(500).json({ error: 'AI khong tra ve format chuan: ' + err.message })
    }
    if (!parsed.pages || Object.keys(parsed.pages).length === 0) {
      return res.status(500).json({ error: 'AI khong tra ve page nao' })
    }

    // Inject nav script vao tat ca pages
    const injectedPages = injectAllPages(parsed.pages)

    // Insert vao DB
    const { data: inserted, error: insErr } = await supabase
      .from('templates').insert({
        slug, name: name.trim().slice(0, 100), description: description.slice(0, 500),
        category, industry_label: industry_label.slice(0, 100),
        emoji: emoji.slice(0, 4), color_from, color_to,
        pages: injectedPages,
        navigation: parsed.navigation.length > 0 ? parsed.navigation
          : [{ name: 'Trang chu', path: 'index.html' }],
        site_name: parsed.siteName || name,
        default_prompt: default_prompt.trim(),
        display_order: Math.max(0, Math.min(9999, parseInt(display_order) || 100)),
        is_featured: !!is_featured
      }).select().single()

    if (insErr) throw insErr

    res.json({
      success: true,
      template: inserted,
      pageCount: Object.keys(injectedPages).length,
      tokens: message.usage?.output_tokens || 0
    })
  } catch (err) {
    console.error('[admin-generate-template]', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/templates/:id/save-edits — save HTML cho 1 page cua template
// Body: { filename, html } — giong /api/projects/:id/save-edits nhung cho templates
app.post('/api/admin/templates/:id/save-edits', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { filename, html } = req.body
    if (!filename?.endsWith('.html')) {
      return res.status(400).json({ error: 'Filename phai .html' })
    }
    if (!html || html.length < 50) return res.status(400).json({ error: 'HTML khong hop le' })
    if (html.length > 500000) return res.status(400).json({ error: 'HTML qua lon (> 500KB)' })

    // Load template
    const { data: tpl, error: lErr } = await supabase
      .from('templates').select('id, pages').eq('id', req.params.id).single()
    if (lErr || !tpl) return res.status(404).json({ error: 'Template khong ton tai' })

    const pages = { ...(tpl.pages || {}) }
    if (!pages[filename]) {
      return res.status(404).json({ error: `Page "${filename}" khong ton tai trong template` })
    }

    // Sanitize HTML giong /api/projects/:id/save-edits
    const safeHtml = sanitizeUserHtml(html)
    if (!safeHtml || safeHtml.length < 50) {
      return res.status(400).json({ error: 'HTML sau khi loc qua ngan' })
    }
    pages[filename] = injectNavScript(safeHtml)

    const { data: updated, error: uErr } = await supabase
      .from('templates').update({ pages }).eq('id', req.params.id).select().single()
    if (uErr) throw uErr

    res.json({ success: true, template: updated })
  } catch (err) {
    console.error('[admin-template-save-edits]', err)
    res.status(500).json({ error: err.message })
  }
})


// ─── TEMPLATES endpoints (v0.6) ───────────────────────────────────────
// GET /api/templates — list all templates
app.get('/api/templates', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('id, slug, name, description, category, industry_label, emoji, color_from, color_to, navigation, site_name, uses_count, is_featured, display_order')
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
    if (error) throw error
    res.json({ templates: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/templates/:id — chi tiet 1 template (kem pages)
app.get('/api/templates/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('templates').select('*').eq('id', req.params.id).single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(404).json({ error: 'Khong tim thay template' })
  }
})

// POST /api/templates/:id/clone — clone template thanh project moi cua user
app.post('/api/templates/:id/clone', requireAuth, async (req, res) => {
  try {
    // Load template
    const { data: template, error: tErr } = await supabase
      .from('templates').select('*').eq('id', req.params.id).single()
    if (tErr || !template) {
      return res.status(404).json({ error: 'Template khong ton tai' })
    }

    // Custom name optional (tu user)
    const customName = (req.body?.name?.trim() || '').slice(0, 100)
    const newName = customName || `${template.name} cua toi`

    // Tao project moi
    const { data: project, error: pErr } = await supabase
      .from('projects')
      .insert({
        user_id:      req.user.id,
        name:         newName,
        site_name:    template.site_name || template.name,
        prompt:       `[Tu template: ${template.name}]\n${template.default_prompt}`,
        pages:        template.pages,
        navigation:   template.navigation,
        html:         template.pages?.['index.html'] || null,
        template_id:  template.id,
        status:       'completed'
      })
      .select().single()

    if (pErr) throw pErr

    // Tang uses_count cua template (fire-and-forget)
    supabase.rpc('increment_template_uses', { template_id: template.id })
      .then(() => {}).catch(() => {})

    res.json({ success: true, project })
  } catch (err) {
    console.error('[clone-template]', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════
//  BILLING endpoints (v0.7)
// ═══════════════════════════════════════════════════════════════════════

// GET /api/billing/plans — list cac goi
app.get('/api/billing/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS) })
})

// GET /api/billing/me — thong tin subscription + usage hien tai
app.get('/api/billing/me', requireAuth, async (req, res) => {
  try {
    const sub = await getUserSubscription(supabase, req.user.id)
    const usage = await getCurrentMonthUsage(supabase, req.user.id)
    const plan = getPlan(sub.plan_id)

    // Count projects
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)

    res.json({
      subscription: sub,
      plan,
      usage: {
        ai_generates: usage.ai_generates,
        ai_generates_limit: plan.max_ai_generates,
        projects: projectCount || 0,
        projects_limit: plan.max_projects   // null = unlimited
      },
      vnpay_configured: vnpay.isVnpayConfigured()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/billing/create-payment — tao URL thanh toan VNPay
// Hoac mock-upgrade neu VNPay chua config
app.post('/api/billing/create-payment', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body
    const plan = getPlan(planId)

    if (!plan || plan.id === 'free') {
      return res.status(400).json({ error: 'Plan khong hop le' })
    }

    // Tao txn ref unique
    const txnRef = `DAI${Date.now()}${crypto.randomBytes(2).toString('hex')}`

    // Luu payment record (pending)
    await supabase.from('payments').insert({
      user_id:    req.user.id,
      plan_id:    plan.id,
      amount_vnd: plan.price_vnd,
      status:     'pending',
      vnp_txn_ref: txnRef
    })

    // ─── MOCK MODE: neu VNPay chua config → auto-upgrade ──────────────
    if (!vnpay.isVnpayConfigured()) {
      // Upgrade ngay (MOCK)
      await upgradeUserPlan(supabase, req.user.id, plan.id, 1)
      await supabase
        .from('payments')
        .update({ status: 'success', paid_at: new Date().toISOString() })
        .eq('vnp_txn_ref', txnRef)

      return res.json({
        mock: true,
        message: 'VNPay chua config → mock upgrade thanh cong (chi de test UX)',
        plan
      })
    }

    // ─── REAL VNPay flow ─────────────────────────────────────────────
    const ipAddr = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket.remoteAddress || '127.0.0.1'

    const origin = req.headers.origin || `http://localhost:5173`
    const returnUrl = `${origin}/billing/return`

    const paymentUrl = vnpay.createPaymentUrl({
      amountVnd: plan.price_vnd,
      orderId:   txnRef,
      orderInfo: `DaisanAI ${plan.name} - 1 thang`,
      ipAddr,
      returnUrl
    })

    res.json({ paymentUrl, txnRef })
  } catch (err) {
    console.error('[create-payment]', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/billing/verify-return — verify VNPay return URL params
app.post('/api/billing/verify-return', requireAuth, async (req, res) => {
  try {
    const { params } = req.body
    if (!params) return res.status(400).json({ error: 'Thieu params' })

    const result = vnpay.verifyReturn(params)
    if (!result.valid) {
      return res.json({ success: false, error: 'Chu ky khong hop le', result })
    }

    // Tim payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('vnp_txn_ref', result.txnRef)
      .eq('user_id', req.user.id)
      .single()

    if (!payment) {
      return res.json({ success: false, error: 'Khong tim thay giao dich' })
    }

    // Cap nhat payment
    const isSuccess = result.responseCode === '00'
    await supabase
      .from('payments')
      .update({
        status:             isSuccess ? 'success' : 'failed',
        vnp_transaction_no: result.transactionNo,
        vnp_response_code:  result.responseCode,
        vnp_bank_code:      result.bankCode,
        raw_response:       result.rawParams,
        paid_at:            isSuccess ? new Date().toISOString() : null
      })
      .eq('id', payment.id)

    // Neu thanh cong → upgrade plan
    if (isSuccess) {
      await upgradeUserPlan(supabase, req.user.id, payment.plan_id, 1)
    }

    res.json({
      success: isSuccess,
      responseCode: result.responseCode,
      message: vnpay.decodeResponseCode(result.responseCode),
      plan: getPlan(payment.plan_id)
    })
  } catch (err) {
    console.error('[verify-return]', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/billing/payments — lich su thanh toan
app.get('/api/billing/payments', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('payments')
      .select('id, plan_id, amount_vnd, status, vnp_response_code, paid_at, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    res.json({ payments: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════
//  CUSTOM DOMAIN endpoints (v0.8) — Pro+ only
// ═══════════════════════════════════════════════════════════════════════

// Helper: validate domain format
function isValidDomain(domain) {
  if (!domain) return false
  if (domain.length < 4 || domain.length > 253) return false
  if (domain.includes(' ') || domain.includes('//')) return false
  // Basic regex (chap nhan apex va subdomain)
  return /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)
}

// POST /api/projects/:id/domain — them domain cho project
app.post('/api/projects/:id/domain', requireAuth, async (req, res) => {
  try {
    const { domain } = req.body
    const cleanDomain = (domain || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '')

    if (!isValidDomain(cleanDomain)) {
      return res.status(400).json({ error: 'Domain khong hop le (vd dung: cuahangcuaban.com)' })
    }

    // Check user's plan
    const sub = await getUserSubscription(supabase, req.user.id)
    const plan = getPlan(sub.plan_id)
    if (!plan.has_custom_domain) {
      return res.status(403).json({
        error: `Custom domain la tinh nang Pro+. Goi ${plan.name} khong ho tro.`,
        reason: 'plan_required',
        requiredPlan: 'pro'
      })
    }

    // Check project belongs to user
    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('id, custom_domain')
      .eq('id', req.params.id).eq('user_id', req.user.id).single()
    if (pErr || !project) return res.status(404).json({ error: 'Project khong ton tai' })

    // Check domain not used by another project
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('custom_domain', cleanDomain)
      .neq('id', req.params.id)
      .maybeSingle()
    if (existing) {
      return res.status(409).json({ error: 'Domain nay da duoc su dung boi project khac' })
    }

    // Tao verification token
    const token = 'daisan-verify=' + crypto.randomBytes(16).toString('hex')

    // Update DB
    const { data: updated, error: uErr } = await supabase
      .from('projects')
      .update({
        custom_domain: cleanDomain,
        custom_domain_verified: false,
        custom_domain_token: token,
        custom_domain_added_at: new Date().toISOString()
      })
      .eq('id', req.params.id).eq('user_id', req.user.id).select().single()

    if (uErr) throw uErr

    // Tra ve DNS instructions
    const serverIp = process.env.SERVER_PUBLIC_IP || 'YOUR_SERVER_IP'
    res.json({
      success: true,
      domain: cleanDomain,
      verified: false,
      token,
      dnsInstructions: {
        a_record: {
          type: 'A',
          host: '@',
          value: serverIp,
          note: `Tro domain ve server cua DaisanAI`
        },
        txt_record: {
          type: 'TXT',
          host: `_daisan-verify.${cleanDomain}`,
          value: token,
          note: 'Token de verify ban so huu domain'
        },
        www_cname: {
          type: 'CNAME',
          host: 'www',
          value: cleanDomain + '.',
          note: '(tuy chon) Redirect www → apex'
        }
      },
      project: updated
    })
  } catch (err) {
    console.error('[domain-add]', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/domain/verify — check DNS roi update verified
app.post('/api/projects/:id/domain/verify', requireAuth, async (req, res) => {
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, custom_domain, custom_domain_token, custom_domain_verified')
      .eq('id', req.params.id).eq('user_id', req.user.id).single()

    if (!project) return res.status(404).json({ error: 'Project khong ton tai' })
    if (!project.custom_domain) return res.status(400).json({ error: 'Project chua co domain' })

    // Lookup TXT record
    let txtRecords
    try {
      txtRecords = await dns.resolveTxt(`_daisan-verify.${project.custom_domain}`)
    } catch (dnsErr) {
      return res.json({
        success: false,
        verified: false,
        error: `Khong tim thay TXT record. Hay them: _daisan-verify.${project.custom_domain} → "${project.custom_domain_token}"`,
        dns_error: dnsErr.code
      })
    }

    // Flatten cac record (TXT co the multi-line)
    const flatRecords = txtRecords.map(arr => arr.join('')).map(s => s.trim())

    // So sanh voi token mong doi (chap nhan voi hoac khong co quotes)
    const expectedValue = project.custom_domain_token
    const expectedValueRaw = expectedValue.replace(/^daisan-verify=/, '')
    const matched = flatRecords.some(r =>
      r === expectedValue ||
      r === `daisan-verify=${expectedValueRaw}` ||
      r === expectedValueRaw
    )

    if (!matched) {
      return res.json({
        success: false,
        verified: false,
        error: 'TXT record khong khop. DNS co the chua propagate (doi 5-30 phut).',
        found_records: flatRecords,
        expected: expectedValue
      })
    }

    // Verified! Update DB
    await supabase
      .from('projects')
      .update({ custom_domain_verified: true })
      .eq('id', req.params.id).eq('user_id', req.user.id)

    res.json({
      success: true,
      verified: true,
      message: `✓ Domain ${project.custom_domain} da verify thanh cong!`,
      url: `https://${project.custom_domain}`
    })
  } catch (err) {
    console.error('[domain-verify]', err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/projects/:id/domain — xoa domain
app.delete('/api/projects/:id/domain', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        custom_domain: null,
        custom_domain_verified: false,
        custom_domain_token: null,
        custom_domain_added_at: null
      })
      .eq('id', req.params.id).eq('user_id', req.user.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── PUBLISH endpoints ────────────────────────────────────────────────
// POST /api/projects/:id/publish — bat publish, tao slug neu chua co
app.post('/api/projects/:id/publish', requireAuth, async (req, res) => {
  try {
    // Load project
    const { data: project, error: loadErr } = await supabase
      .from('projects')
      .select('id, slug, name, site_name, pages')
      .eq('id', req.params.id).eq('user_id', req.user.id).single()

    if (loadErr || !project) {
      return res.status(404).json({ error: 'Khong tim thay project' })
    }

    if (!project.pages || Object.keys(project.pages).length === 0) {
      return res.status(400).json({ error: 'Project chua co noi dung, khong the publish' })
    }

    // Tao slug neu chua co
    let slug = project.slug
    if (!slug) {
      slug = await generateUniqueSlug(project.site_name || project.name)
    }

    // Update DB
    const { data: updated, error: updateErr } = await supabase
      .from('projects')
      .update({
        slug,
        is_published: true,
        published_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select().single()

    if (updateErr) throw updateErr

    res.json({
      success: true,
      slug,
      url: `${getPublicBaseUrl(req)}/site/${slug}/`,
      project: updated
    })
  } catch (err) {
    console.error('[publish]', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/unpublish
app.post('/api/projects/:id/unpublish', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('projects')
      .update({ is_published: false })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

function getPublicBaseUrl(req) {
  // Tra ve URL goc — uu tien header X-Public-Url (frontend gui khi local dev),
  // sau do dung host header
  const fromHeader = req.headers['x-public-url']
  if (fromHeader) return fromHeader.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || req.protocol
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

// ─── GENERATE STREAM (giu nguyen tu v0.4) ─────────────────────────────
app.post('/api/generate-stream', requireAuth, async (req, res) => {
  const { prompt, projectId } = req.body
  const userId = req.user.id

  if (!prompt || prompt.trim().length < 5) {
    return res.status(400).json({ error: 'Prompt phai co it nhat 5 ky tu' })
  }

  // ─── v0.7: Check limits ────────────────────────────────────────────
  // Check monthly AI generates
  const generateCheck = await checkGenerateAllowed(supabase, userId)
  if (!generateCheck.allowed) {
    return res.status(403).json({
      error: generateCheck.message,
      reason: generateCheck.reason,
      plan: generateCheck.plan,
      usage: generateCheck.usage
    })
  }

  // Neu la NEW project (khong phai iterate) → check project count
  if (!projectId) {
    const projectCheck = await checkProjectLimitAllowed(supabase, userId)
    if (!projectCheck.allowed) {
      return res.status(403).json({
        error: projectCheck.message,
        reason: projectCheck.reason,
        plan: projectCheck.plan,
        currentCount: projectCheck.currentCount
      })
    }
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  try {
    let messages, systemPrompt, existingProject = null

    if (projectId) {
      const { data } = await supabase
        .from('projects').select('*')
        .eq('id', projectId).eq('user_id', userId).single()
      if (!data) { send('error', { message: 'Project khong ton tai' }); return res.end() }
      existingProject = data
      let pages = data.pages, navigation = data.navigation
      if ((!pages || Object.keys(pages).length === 0) && data.html) {
        pages = { 'index.html': data.html }
        navigation = [{ name: 'Trang chu', path: 'index.html' }]
      }
      systemPrompt = SYSTEM_PROMPT_ITERATE
      messages = [{
        role: 'user',
        content: `Website hien tai:\n\n${JSON.stringify({
          siteName: data.site_name || data.name, navigation, pages
        }, null, 2)}\n\n---\n\nYeu cau thay doi: ${prompt.trim()}`
      }]
      send('start', { mode: 'iterate', projectName: data.name })
    } else {
      systemPrompt = SYSTEM_PROMPT_NEW
      messages = [{ role: 'user', content: prompt.trim() }]
      send('start', { mode: 'new' })
    }

    let fullText = ''
    const stream = claude.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 20000,
      system: systemPrompt,
      messages
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const chunk = event.delta.text
        fullText += chunk
        send('chunk', { text: chunk })
      }
    }

    const finalMessage = await stream.finalMessage()
    let parsed
    try { parsed = parseClaudeJSON(fullText) }
    catch (err) { send('error', { message: 'Khong parse duoc JSON: ' + err.message }); return res.end() }

    if (!parsed.pages || typeof parsed.pages !== 'object') {
      send('error', { message: 'AI khong tra ve pages hop le' }); return res.end()
    }

    const injectedPages = injectAllPages(parsed.pages)
    const payload = {
      pages: injectedPages,
      navigation: parsed.navigation || [{ name: 'Trang chu', path: 'index.html' }],
      site_name: parsed.siteName || deriveName(prompt),
      html: injectedPages['index.html'] || null,
      status: 'completed'
    }

    let saved
    if (existingProject) {
      payload.prompt = `${existingProject.prompt}\n\n[+] ${prompt.trim()}`
      const { data } = await supabase
        .from('projects').update(payload)
        .eq('id', projectId).eq('user_id', userId).select().single()
      saved = data
    } else {
      payload.user_id = userId
      payload.name = deriveName(prompt)
      payload.prompt = prompt.trim()
      const { data } = await supabase.from('projects').insert(payload).select().single()
      saved = data
    }

    // v0.7: Increment AI generates count (fire-and-forget)
    supabase.rpc('increment_ai_generates', { user_uuid: userId })
      .then(() => {}).catch(() => {})

    send('done', {
      project: saved,
      usage: {
        input: finalMessage.usage?.input_tokens || 0,
        output: finalMessage.usage?.output_tokens || 0,
        pageCount: Object.keys(injectedPages).length
      }
    })
    res.end()
  } catch (err) {
    console.error('[generate-stream]', err)
    send('error', { message: err.message }); res.end()
  }
})

// ═══════════════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log('')
  console.log('  ┌──────────────────────────────────────────────┐')
  console.log('  │   DaisanAI Lite v0.12 — Server san sang!     │')
  console.log(`  │   API:    http://localhost:${PORT}              │`)
  console.log(`  │   Web:    http://localhost:5173              │`)
  console.log(`  │   Sites:  http://localhost:5173/site/<slug>  │`)
  console.log(`  │   VNPay:  ${vnpay.isVnpayConfigured() ? 'configured ✓' : 'MOCK mode (chua config)'.padEnd(32)}│`)
  console.log(`  │   Domain: Pro+ feature san sang              │`)
  console.log(`  │   Edit:   Inline text edit ENABLED ✨        │`)
  console.log(`  │   Client: Invite system ENABLED 👥           │`)
  console.log('  └──────────────────────────────────────────────┘')
  console.log('')
  if (!process.env.ANTHROPIC_API_KEY?.startsWith('sk-')) {
    console.warn('  ⚠️  ANTHROPIC_API_KEY chua duoc set dung')
  }
  if (!process.env.SUPABASE_SERVICE_KEY?.startsWith('eyJ')) {
    console.warn('  ⚠️  SUPABASE_SERVICE_KEY chua duoc set dung')
  }
})
