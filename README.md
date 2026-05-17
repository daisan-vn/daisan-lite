# DaisanAI Lite — v0.9

> **Nâng cấp từ v0.8:** Inline Text Edit — click chữ → sửa trực tiếp, không cần AI

---

## CÓ GÌ MỚI Ở v0.9?

| Tính năng | v0.8 | **v0.9** |
|---|---|---|
| Sửa text | Phải prompt AI ("đổi tên thành X") | ✅ Click chữ → edit thẳng |
| Chi phí | Tốn quota AI (~5-20K tokens/lần) | ✅ **Miễn phí 100%** cho mọi tier |
| Tốc độ | 20-40 giây + risk AI sửa nhầm chỗ khác | ✅ **Instant**, chỉ đổi đúng phần đó |
| Workflow | Mỗi typo phải prompt lại | ✅ Edit liên tục, save một lần |

## Tại sao v0.9 quan trọng?

**Vấn đề lớn của AI-only workflow:**

User muốn sửa SDT từ "0901234567" thành "0907123456":
- v0.8: Prompt "đổi SDT thành 0907123456" → AI re-generate cả page → tốn 1 quota → mất 30 giây → có thể đổi luôn cả layout
- v0.9: Click SDT → sửa số → Save → xong trong 3 giây, miễn phí

**Insight**: AI giỏi tạo HTML từ đầu, nhưng dùng AI để **sửa 1 chữ** là lãng phí. Inline edit dùng AI khi cần, không dùng khi không cần.

## Workflow mới

```
1. Click "✏️ Sửa text"
2. Hover các text element → outline xanh đứt
3. Click → caret xuất hiện → edit
4. Tab/click chỗ khác → text được update local
5. Edit nhiều chỗ khác nhau...
6. Click "✓ Lưu" → save 1 lần, instant
```

## Các loại text edit được

✅ Heading: h1, h2, h3, h4, h5, h6
✅ Paragraph: p
✅ Link text: a (giữ nguyên URL)
✅ Button text: button
✅ List item: li
✅ Table cell: td, th
✅ Span, label, blockquote, figcaption

❌ Image src (sẽ làm v0.10)
❌ Background colors / layout (cần AI)
❌ Nested elements có structure (vd `<h1><span>Logo</span><i>icon</i></h1>`)

## CÁCH UPGRADE TỪ v0.8

### Bước 1: Backup folder cũ

### Bước 2: Copy 2 file
- `server/index.js` (đè)
- `src/components/Preview.jsx` (đè)

**KHÔNG cần migration SQL** — v0.9 không thay schema, chỉ thêm endpoint mới.

### Bước 3: Restart
```bash
# Ctrl + C
npm run dev
```

Console banner sẽ hiện: `Edit: Inline text edit ENABLED ✨`

## TEST FLOW

1. Login, mở 1 project có sẵn (hoặc clone template)
2. Click **"✏️ Sửa text"** trên toolbar
3. Toast hiện: "Edit mode bật: 42 text có thể sửa"
4. Toolbar đổi sang **Edit mode banner** + nút "✓ Lưu" / "Hủy"
5. Hover các text → outline xanh đứt
6. Click 1 heading → caret xuất hiện → đổi text
7. Toolbar: "Edit mode (có thay đổi)" — báo dirty
8. Edit thêm 2-3 chỗ khác
9. Click **"✓ Lưu"** → toast "✓ Đã lưu thay đổi" → exit edit mode
10. Refresh trang → thấy text đã update persistent
11. Nếu đã publish → live URL cũng update ngay

## ARCHITECTURE

### Iframe-side script (injected by server)

```js
// Inject vào mỗi page khi save (đã có sẵn nav script)
// Thêm: handle edit mode messages

window.addEventListener('message', (e) => {
  if (e.data.type === 'daisan:setEditMode') {
    if (e.data.enabled) enableEditMode()
    else disableEditMode()
  }
  if (e.data.type === 'daisan:requestCleanHtml') {
    window.parent.postMessage({
      type: 'daisan:cleanHtml',
      html: getCleanHtml()  // strip inject scripts + edit attrs
    }, '*')
  }
})
```

### Parent-side (Preview.jsx)

```js
// Toggle edit mode → send message to iframe
iframeRef.current.contentWindow.postMessage({
  type: 'daisan:setEditMode', enabled: true
}, '*')

// User click "Lưu" → request HTML, then save
iframeRef.current.contentWindow.postMessage({
  type: 'daisan:requestCleanHtml'
}, '*')
// → iframe replies via postMessage → save to backend
```

### Backend (server/index.js)

```
POST /api/projects/:id/save-edits
  body: { filename, html }
  → Validate ownership
  → injectNavScript(html)  ← re-inject nav script
  → UPDATE projects SET pages = {...pages, [filename]: html}
  → No AI, no quota, no billing check
  → FREE for all tiers
```

### Clean HTML extraction

Iframe có nav + edit script được inject. Khi save:
1. Clone DOM
2. Remove tất cả `<script data-daisan-inject="true">` và `<style data-daisan-inject="true">`
3. Strip `contenteditable`, `data-daisan-editable`, `data-daisan-original` attrs
4. Serialize back thành HTML

Server inject lại nav script sau khi save → next load có đủ scripts mà không duplicate.

## SECURITY CONSIDERATIONS

### XSS protection
- User chỉ edit text content trong elements đã có sẵn
- contenteditable không cho phép inject `<script>` (browser strip)
- Server validate HTML length max 500KB
- HTML lưu vào `pages` jsonb, không execute trên server

### Authorization
- `/save-edits` require auth JWT
- DB query check `user_id` match
- RLS policies vẫn active

### Quota bypass
- KHÔNG check quota cho text edits (intentional UX win)
- Không thể abuse vì:
  - User chỉ edit project của họ
  - 500KB max → ~30K text characters cap
  - Save edit không gọi Claude API

## EDGE CASES

### Edit khi đang streaming
→ Edit toggle disabled khi `isStreaming = true`. Phải đợi generate xong mới edit.

### Edit rồi đổi page
→ Auto-exit edit mode, warning "có thay đổi chưa lưu" (TODO v0.10)

### 2 user cùng edit 1 project
→ Last-write-wins. v0.9 không có real-time collab.

### Edit text quá dài
→ contenteditable cho phép infinite, nhưng UX kém. Future: max length per element type.

### Empty text sau edit
→ Browser tự handle. Element còn nhưng visually trống. Acceptable.

## TROUBLESHOOTING

### Click "Sửa text" nhưng iframe không react
- Iframe chưa load xong → đợi vài giây
- Browser block sandbox postMessage → check DevTools console
- Cross-origin issue → đảm bảo iframe srcDoc, không src external

### Save báo lỗi "HTML không hợp lệ"
- HTML rỗng / quá ngắn → có thể iframe bị clear
- HTML > 500KB → quá lớn, có gì đó sai

### Sau Save, refresh không thấy thay đổi
- Backend không lưu được → check Network tab
- Browser cache iframe cũ → Ctrl+Shift+R

### Edit element có icon → icon biến mất
- Element có nested HTML (vd `<button><i>icon</i> Click</button>`)
- contenteditable đôi khi strip nested → expected limitation
- Workaround: edit qua AI cho elements phức tạp

## CHI PHÍ FEATURE

- **Cho user**: Miễn phí 100%, không tốn quota AI
- **Cho bạn (dev)**: Chỉ tốn DB writes (Supabase) — vài cent cho 10K edits
- **Storage**: HTML lưu vào jsonb `pages`, ~5-30KB/page → trivial

## TÁC ĐỘNG KINH DOANH

**Pre-v0.9 problem**: User free tier hết 30 generates/tháng nhanh vì mỗi typo cũng tốn 1 generate. Frustration → churn.

**Post-v0.9**: 
- Free user dùng 30 generates cho **structural changes** (thêm page, đổi layout)
- Text fixes không tốn quota → user happier
- Pro upgrade chỉ xảy ra khi user thực sự cần nhiều generates → conversion organic hơn

## ROADMAP TIẾP THEO

- **v0.10 — Image upload**: replace AI placeholder ảnh bằng ảnh thật user upload
- **v0.11 — Forms**: contact form submit → email/Zalo OA notification + leads DB
- **v0.12 — SEO meta editor**: title, description, og:image inline editor
- **v1.0 — Public launch**

---

## TỔNG KẾT v0.1 → v0.9

| Version | Feature | Status |
|---|---|---|
| v0.1-0.2 | MVP + Streaming | ✓ |
| v0.3 | Authentication | ✓ |
| v0.4 | Multi-page | ✓ |
| v0.5 | Publish & live URLs | ✓ |
| v0.6 | Templates library | ✓ |
| v0.7 | VNPay billing | ✓ |
| v0.8 | Custom domain | ✓ |
| **v0.9** | **Inline text edit** | **✓** |

**Bạn có một SaaS hoàn chỉnh + UX polish.** Đã đủ điều kiện để launch public.
