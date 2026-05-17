# DaisanAI Lite v0.11 — i18n (VI / EN)

> **Tính năng mới**: Toggle ngôn ngữ Tiếng Việt ↔ English cho toàn bộ UI.

## 🎯 Scope

**Translated**:
- ✅ Tất cả button, label, placeholder UI
- ✅ Tooltips, error messages (frontend)
- ✅ Empty states, dialogs
- ✅ Auth screen (login)
- ✅ Toast confirmations
- ✅ Client invite flow
- ✅ Quick suggestion examples cho PromptInput

**KHÔNG translate** (theo thiết kế):
- ❌ Template titles/descriptions (vẫn tiếng Việt vì target VN SME)
- ❌ AI-generated website content (AI auto-detect ngôn ngữ từ prompt)
- ❌ Server error messages

## 🚀 Cách dùng

### User: toggle ngôn ngữ

1. Click avatar góc trên (hoặc icon cờ 🇻🇳)
2. Hoặc click trực tiếp **Language Toggle** button (giữa LanguageToggle và UserMenu)
3. Chọn 🇻🇳 Tieng Viet hoặc 🇬🇧 English
4. UI auto re-render với ngôn ngữ mới
5. Preference lưu vào `localStorage` — lần sau vào app vẫn ngôn ngữ đó

### Developer: thêm key dịch

1. Mở `src/lib/i18n.js`
2. Thêm key vào CẢ 2 object (`vi` và `en`):
   ```js
   vi: {
     mySection: {
       newKey: 'Văn bản tiếng Việt'
     }
   },
   en: {
     mySection: {
       newKey: 'English text'
     }
   }
   ```
3. Dùng trong component:
   ```jsx
   import { useT } from '../hooks/useLanguage'
   function MyComponent() {
     const t = useT()
     return <h1>{t('mySection.newKey')}</h1>
   }
   ```

### Fallback behavior

- Nếu key thiếu trong ngôn ngữ hiện tại → fallback Tiếng Việt
- Nếu thiếu trong cả 2 → trả về key string (warning cho dev)
- Để bật debug warnings: `localStorage.setItem('debug_i18n', '1')`

## 🏗️ Architecture

```
src/
├── lib/
│   └── i18n.js              ← Dictionary { vi: {...}, en: {...} }
├── hooks/
│   └── useLanguage.js       ← useLanguage() + useT() hooks
└── components/
    └── LanguageToggle.jsx   ← Dropdown 🇻🇳/🇬🇧 button
```

### useLanguage hook

```js
const { lang, setLang } = useLanguage()
// lang: 'vi' | 'en'
// setLang('en')  → save to localStorage + dispatch global event
```

### useT hook

```js
const t = useT()
t('header.tagline')  // → 'Tao web bang tieng Viet' or 'Build websites with AI'
```

### Global state sync

Khi user đổi ngôn ngữ ở 1 component, **mọi component khác** dùng `useT()` đều tự re-render qua custom event `daisan:lang-change`.

## 📊 Files thay đổi

```
NEW (3 files):
+ src/lib/i18n.js               (~600 lines, ~170 keys)
+ src/hooks/useLanguage.js      (~40 lines)
+ src/components/LanguageToggle.jsx (~55 lines)

MODIFIED (10 files):
~ src/App.jsx                   (header + sidebar client)
~ src/components/Auth.jsx       (full translate + lang toggle)
~ src/components/UserMenu.jsx
~ src/components/PromptInput.jsx (incl examples VI+EN)
~ src/components/ProjectList.jsx (incl time-ago labels)
~ src/components/TemplatesGrid.jsx (filter labels)
~ src/components/Preview.jsx     (toolbar + edit mode)
~ src/components/InviteClientModal.jsx
~ src/components/ClientInviteAccept.jsx
~ package.json (version 0.11.0)
```

## 🧪 Test

### Quick smoke test
1. Login → see VI UI by default
2. Click 🇻🇳 → dropdown → 🇬🇧 English → UI flips to EN
3. Refresh page → vẫn EN (persist)
4. Logout → login lại → vẫn EN
5. Click 🇬🇧 → chọn 🇻🇳 Tieng Viet → quay lại VI

### Coverage check
Sau khi toggle EN, check các pages sau xem có còn text VN nào không:

- [ ] Auth screen (login + magic link)
- [ ] Header (DaisanAI Lite, tagline)
- [ ] PromptInput (label + placeholder + suggestions + button)
- [ ] ProjectList (empty state, time labels, action tooltips)
- [ ] TemplatesGrid (title, filter pills, empty state, cards)
- [ ] Preview toolbar (viewport buttons, edit text, publish, open, download)
- [ ] User menu (Upgrade plan, Sign out)
- [ ] Client invite modal (form, status, copy/Zalo buttons)
- [ ] Client accept page

### Còn lại VN (cố ý):
- ✅ Template names (Quán cà phê, Nhà hàng phở...)
- ✅ Toast messages cho 1 số action (server errors)
- ✅ Generated website content

## ⚠️ Limitations

### 1. Toast/Error messages
Đa số server errors return tiếng Việt. Frontend display nguyên văn. Không dịch dynamic content vì:
- Risk dịch sai
- Server có thể return error code thay vì text trong tương lai

### 2. Date format
Sử dụng `toLocaleDateString()` default — sẽ tự format theo browser locale.

### 3. Number/currency
VND vẫn dạng số nguyên (149,000₫). Không convert sang USD.

### 4. URL/routes
Routes vẫn English (`/billing/return`, `/client-invite`). Không multi-language URLs.

## 🎁 Bonus features

### Quick suggestions có 2 ngôn ngữ
`PromptInput.jsx` có examples riêng cho VI và EN:

```js
EXAMPLES_NEW_VI: ['Website quan ca phe — co Home, Menu, Lien he', ...]
EXAMPLES_NEW_EN: ['Coffee shop website with Home, Menu, Contact', ...]
```

Khi user toggle EN, examples cũng đổi sang English → user English có thể prompt AI bằng English → AI generate web English!

### Auto-language for AI generation
AI Claude tự detect ngôn ngữ prompt:
- Prompt VN → web tiếng Việt
- Prompt EN → web tiếng Anh
- Prompt mix → AI quyết định (thường theo ngôn ngữ chính)

**Không cần config gì thêm**. UI toggle EN ≠ AI gen EN — đây là điều quan trọng vì target user VN có thể muốn UI EN để demo nhưng vẫn cần web VN.

## 📦 Deploy

```bash
# Test build local
cd D:\Claude\lovdaisan-2026\daisan-lite
npm run build
# Should succeed ✓

# Push
git add .
git commit -m "v0.11: i18n VI/EN for UI"
git push origin main
```

Vercel auto-rebuild → frontend live in ~30s.

**KHÔNG cần** Render redeploy hoặc Supabase migration — v0.11 chỉ touch frontend.

## 🚀 Roadmap tiếp theo

- **v0.12**: Image upload (Supabase Storage)
- **v0.13**: Simple product manager (CRUD menu items)
- **v0.14**: SEO meta tags + Open Graph customization
- **v1.0**: Public launch (Resend SMTP + cron ping + landing page)

---

**v0.11 hoàn thành!** App giờ có cả Tiếng Việt và English cho UI. 🌐
