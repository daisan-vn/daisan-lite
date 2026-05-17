// ========================================================================
//  scripts/seed-templates.js — v2 (marker-based parsing)
// ========================================================================
//  FIX: Thay JSON parsing -> marker parsing → bo qua JSON escape hell
//  Cach chay: npm run seed-templates
// ========================================================================

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TEMPLATES = [
  {
    slug: 'fnb-coffee-shop',
    name: 'Quán cà phê',
    description: 'Landing page chuyen nghiep cho quan ca phe — menu, khong gian, dat ban',
    category: 'fnb',
    industry_label: 'F&B / Cà phê',
    emoji: '☕',
    color_from: '#92400e', color_to: '#451a03',
    display_order: 1, is_featured: true,
    prompt: `Tao website 4 trang cho quan ca phe "Cafe An Nhien" tai Sai Gon:
- index.html: hero voi background quan, slogan, gioi thieu ngan, CTA "Xem menu" va "Dat ban"
- menu.html: danh sach do uong theo nhom (Ca phe, Tra, Da xay, Banh ngot), gia, mo ta
- khong-gian.html: gioi thieu kien truc, gallery anh, dia chi, gio mo cua
- lien-he.html: form lien he, ban do, SDT 0901234567, fanpage facebook
Phong cach: vintage cafe, mau nau dam + kem, font serif cho tieu de.`
  },
  {
    slug: 'fnb-pho-restaurant',
    name: 'Nhà hàng phở',
    description: 'Website cho nha hang pho truyen thong — menu, cau chuyen thuong hieu',
    category: 'fnb',
    industry_label: 'F&B / Nhà hàng',
    emoji: '🍜',
    color_from: '#b91c1c', color_to: '#7f1d1d',
    display_order: 2, is_featured: true,
    prompt: `Tao website 4 trang cho nha hang pho "Pho Ha Noi Xua" tai Hanoi:
- index.html: hero voi to pho, "Pho gia truyen 50 nam", CTA "Xem menu" "Dat ban"
- menu.html: cac loai pho (bo, ga, tai, nam, gau), gia, hinh, kem do uong
- cau-chuyen.html: lich su quan 50 nam, gioi thieu chu quan, bi quyet nuoc dung
- lien-he.html: form, dia chi 89 Bach Mai, SDT 0912345678, gio 6h-22h, ban do
Phong cach: am ap, truyen thong, mau do dam + vang.`
  },
  {
    slug: 'fashion-boutique',
    name: 'Shop thời trang nữ',
    description: 'Website shop thoi trang phong cach toi gian — bo suu tap, lookbook',
    category: 'fashion',
    industry_label: 'Thời trang',
    emoji: '👗',
    color_from: '#831843', color_to: '#500724',
    display_order: 3, is_featured: true,
    prompt: `Tao website 4 trang cho shop thoi trang nu "Linh Boutique":
- index.html: hero voi anh model, slogan "Phong cach toi gian", new arrivals, CTA "Mua ngay"
- bo-suu-tap.html: grid san pham (8-12 item) gia, hinh, theo nhom Vay/Ao/Phu kien
- gioi-thieu.html: cau chuyen thuong hieu, gia tri, anh studio
- lien-he.html: form, showroom Q1 TPHCM, Instagram @linhboutique, SDT 0987654321
Phong cach: toi gian, sang trong, mau be + den + hong pastel.`
  },
  {
    slug: 'service-motorcycle-repair',
    name: 'Sửa xe máy',
    description: 'Website tiem sua xe may — bang gia dich vu, dat lich online',
    category: 'service',
    industry_label: 'Dịch vụ',
    emoji: '🔧',
    color_from: '#1e3a8a', color_to: '#172554',
    display_order: 4, is_featured: false,
    prompt: `Tao website 3 trang cho tiem sua xe may "Garage Tien Nhanh" Q.Tan Binh TPHCM:
- index.html: hero anh tho sua xe, "Sua xe nhanh, gia tot, uy tin 15 nam", CTA "Bang gia" va "Goi ngay"
- bang-gia.html: bang gia chi tiet cac dich vu (thay nhot, sua phanh, sua may, son xe), bang co cot ten/mo ta/gia
- lien-he.html: dia chi, ban do, SDT 0909123456, gio 7h-20h, form dat lich
Phong cach: chuyen nghiep, mau xanh dam + cam.`
  },
  {
    slug: 'service-spa-massage',
    name: 'Spa massage',
    description: 'Website spa cao cap — dich vu, gallery, dat lich truc tuyen',
    category: 'service',
    industry_label: 'Dịch vụ / Spa',
    emoji: '💆',
    color_from: '#065f46', color_to: '#022c22',
    display_order: 5, is_featured: false,
    prompt: `Tao website 4 trang cho spa "An Lac Spa & Massage" Q.7 TPHCM:
- index.html: hero "Khong gian thu gian, nang luong an lac", anh spa room, CTA "Dich vu" "Dat lich"
- dich-vu.html: cac goi massage (body, foot, head, hot stone, aromatherapy), thoi gian + gia
- gallery.html: anh khong gian spa, treatment rooms, reception
- dat-lich.html: form dat lich (chon dich vu + ngay + gio), dia chi, SDT 0938123456
Phong cach: tinh, sang trong, zen, mau xanh la dam + kem.`
  },
  {
    slug: 'education-english-center',
    name: 'Trung tâm tiếng Anh',
    description: 'Website trung tam tieng Anh — khoa hoc, giao vien, dang ky thu',
    category: 'education',
    industry_label: 'Giáo dục',
    emoji: '📚',
    color_from: '#7c2d12', color_to: '#431407',
    display_order: 6, is_featured: false,
    prompt: `Tao website 4 trang cho trung tam tieng Anh "Smart English Center":
- index.html: hero "Hoc tieng Anh hieu qua trong 6 thang", thanh tich (5000+ hoc vien, 95% pass IELTS), CTA
- khoa-hoc.html: cac khoa (IELTS, TOEIC, Giao tiep, Tre em), thoi luong, mo ta, gia
- giao-vien.html: gioi thieu 4-6 giao vien co anh, trinh do, kinh nghiem
- lien-he.html: form dang ky hoc thu, dia chi, SDT 0911223344, fanpage
Phong cach: tre trung, chuyen nghiep, mau cam + trang + xanh.`
  }
]

// ─── SYSTEM PROMPT (MARKERS, KHONG dung JSON) ────────────────────────────
const SYSTEM_PROMPT = `Ban la AI chuyen tao website nhieu trang chuyen nghiep cho thi truong Viet Nam.

OUTPUT FORMAT (BAT BUOC theo dung):
Su dung MARKERS phan chia, KHONG dung JSON, KHONG wrap fence.

VI DU OUTPUT:
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
<html>...</html>

===PAGE:lien-he.html===
<!DOCTYPE html>
<html>...</html>

===END===

QUY TAC OUTPUT:
1. Bat dau ngay voi ===SITE_NAME=== (KHONG co text truoc)
2. NAV: moi dong la "Ten hien thi|filename.html"
3. Moi PAGE bat dau voi ===PAGE:<filename>=== o dong rieng
4. HTML day du tu <!DOCTYPE html> den </html>
5. Ket thuc bang ===END===
6. KHONG them text giai thich gi them

YEU CAU NOI DUNG:
- 100% tieng Viet co dau day du
- Filename khong dau: gioi-thieu.html, san-pham.html, lien-he.html
- 2-5 page (vua phai)

YEU CAU MOI PAGE:
- <!DOCTYPE html>, <head>, <body> day du
- Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>
- Font Google Be Vietnam Pro qua <link>
- Responsive mobile-first
- Header NAV link den TAT CA page khac
- Footer co SDT 09xx, dia chi VN
- TAT CA page chia se cung design: header, mau, font, footer
- Hover effects, animation tinh te`

// ─── MARKER PARSER (thay JSON parser) ────────────────────────────────────
function parseMarkers(text) {
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

  // PAGES - tim het cac ===PAGE:xxx=== blocks
  const pageRegex = /===PAGE:([^=\n]+?)===\s*\n([\s\S]*?)(?=\n===PAGE:|\n===END===|$)/g
  let match
  while ((match = pageRegex.exec(text)) !== null) {
    const path = match[1].trim()
    let html = match[2].trim()
    if (path && html) result.pages[path] = html
  }

  return result
}

// ─── Inject nav script ───────────────────────────────────────────────────
function injectNavScript(html) {
  if (!html) return html
  const script = `
<script>
(function() {
  var inIframe = (function(){ try { return window.self !== window.top; } catch(e){ return true; } })();
  if (!inIframe) return;
  document.addEventListener('click', function(e) {
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
    e.preventDefault();
    window.parent.postMessage({ type: 'daisan:formSubmit' }, '*');
  });
})();
</script>
`
  return html.includes('</body>') ? html.replace('</body>', script + '</body>') : html + script
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗')
  console.log('║  DaisanAI — Seed Templates v2 (marker-based)           ║')
  console.log('╠════════════════════════════════════════════════════════╣')
  console.log(`║  Se sinh ${TEMPLATES.length} template, thoi gian ~2-3 phut`.padEnd(57) + '║')
  console.log('║  Chi phi: ~$0.5-$1                                     ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  // Check env (cho phep ca eyJ JWT va sb_secret_ format moi)
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!key || (!key.startsWith('eyJ') && !key.startsWith('sb_secret_'))) {
    console.error('✗ SUPABASE_SERVICE_KEY chua duoc set dung trong .env')
    console.error('  Phai bat dau bang "eyJ..." (legacy) hoac "sb_secret_..." (new format)')
    process.exit(1)
  }
  if (!process.env.ANTHROPIC_API_KEY?.startsWith('sk-')) {
    console.error('✗ ANTHROPIC_API_KEY chua duoc set trong .env')
    process.exit(1)
  }

  let success = 0, failed = 0
  const failedTemplates = []

  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i]
    process.stdout.write(`[${i + 1}/${TEMPLATES.length}] ${t.emoji} ${t.name}... `)

    try {
      const message = await claude.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 20000,                    // tang token
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: t.prompt }]
      })

      const fullText = message.content.filter(b => b.type === 'text').map(b => b.text).join('')
      const parsed = parseMarkers(fullText)

      if (!parsed.pages || Object.keys(parsed.pages).length === 0) {
        throw new Error(`Khong parse duoc page nao (text len: ${fullText.length})`)
      }

      // Inject nav script
      const injectedPages = {}
      for (const [path, html] of Object.entries(parsed.pages)) {
        injectedPages[path] = injectNavScript(html)
      }

      // Upsert
      const { error } = await supabase
        .from('templates')
        .upsert({
          slug: t.slug, name: t.name, description: t.description,
          category: t.category, industry_label: t.industry_label,
          emoji: t.emoji, color_from: t.color_from, color_to: t.color_to,
          pages: injectedPages,
          navigation: parsed.navigation.length > 0 ? parsed.navigation
            : [{ name: 'Trang chu', path: 'index.html' }],
          site_name: parsed.siteName || t.name,
          default_prompt: t.prompt,
          display_order: t.display_order,
          is_featured: t.is_featured
        }, { onConflict: 'slug' })

      if (error) throw error

      const pageCount = Object.keys(injectedPages).length
      const tokens = message.usage?.output_tokens || 0
      console.log(`✓ ${pageCount} page, ${tokens} tokens`)
      success++

    } catch (err) {
      console.log(`✗ ${err.message}`)
      failed++
      failedTemplates.push(t.name)
    }
  }

  console.log('\n┌──────────────────────────────────────────────────────┐')
  console.log(`│  Hoan thanh: ${success} thanh cong, ${failed} loi`.padEnd(55) + '│')
  console.log('└──────────────────────────────────────────────────────┘')

  if (failed > 0) {
    console.log(`\n  Templates loi: ${failedTemplates.join(', ')}`)
    console.log('  → Chay lai script de retry (idempotent, KHONG duplicate)')
  }
  if (success > 0) {
    console.log('\n  → Refresh app de xem 6 template moi!')
  }
}

main().catch(err => {
  console.error('\n✗ Loi fatal:', err.message)
  process.exit(1)
})
