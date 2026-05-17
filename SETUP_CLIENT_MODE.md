# DaisanAI Lite v0.10 — Client Invite System

> **Tính năng mới**: Cho phép **khách hàng** (chủ tiệm/quán/shop) tự đăng nhập và edit text trên web của họ, mà KHÔNG cần truy cập đầy đủ DaisanAI.

---

## 🎯 Vấn đề được giải quyết

**Trước v0.10**:
- Bạn làm web cho khách hàng (chủ quán cà phê An Nhiên)
- Khách hàng muốn đổi giá menu / SDT / địa chỉ
- → Họ phải **gọi cho bạn**, bạn login DaisanAI, sửa, hand off lại
- Mỗi tháng có 5-10 khách → bạn tốn nhiều thời gian làm việc nhỏ

**Sau v0.10**:
- Bạn generate link **mời khách edit**
- Gửi qua Zalo / Email cho khách
- Khách click → magic link login → tự sửa
- Bạn **không cần can thiệp** nữa

---

## 📋 Database migration

**TRƯỚC KHI deploy v0.10**, phải chạy migration trong Supabase:

1. Supabase Dashboard → **SQL Editor** → **New query**
2. Copy nội dung file `supabase/migration_v0.10.sql`
3. Paste → click **Run**
4. Verify: Database → Tables → `projects` → thấy 6 cột mới:
   - `client_email`
   - `client_user_id`
   - `client_invite_token`
   - `client_invite_expires_at`
   - `client_invited_at`
   - `client_accepted_at`

---

## 🚀 Cách sử dụng

### Phía OWNER (bạn)

**Bước 1: Tạo invite link**

1. Mở project muốn share (vd: "Cafe An Nhien")
2. Trên header, click nút **"👥 Khach hang"** (cạnh "+ Project moi")
3. Modal hiện → nhập email khách hàng: `chuquan@cafeannien.vn`
4. Click **"📩 Tao link moi"**
5. Có invite link kiểu:
   ```
   https://webbuilder.daisan.ai/client-invite?token=abc123...
   ```

**Bước 2: Gửi link cho khách**

3 cách:
- **Copy link** → paste vào Zalo/Messenger/SMS
- Click **"💬 Gui qua Zalo"** → mở Zalo share
- Click **"✉️ Gui qua Email"** → mở email client

**Bước 3: Quản lý quyền**

Click lại nút **"👥 Khach hang"** để xem:
- Trạng thái: đang chờ accept / đã accept
- Email khách
- Ngày accept
- Nút **"Huy quyen"** — revoke access bất cứ lúc nào

### Phía CLIENT (khách hàng)

**Bước 1: Click link bạn gửi**

Link trông như: `https://webbuilder.daisan.ai/client-invite?token=abc123...`

**Bước 2: Đăng nhập**

- Page hiện: *"Bạn được mời sửa website CAFE AN NHIEN"*
- Email đã pre-fill (không sửa được — phải đúng email được mời)
- Click **"Gửi link đăng nhập"**
- Vào email → click magic link từ Supabase

**Bước 3: Sửa web**

- Tự động redirect vào app với project được mời
- UI giản lược: chỉ thấy preview + nút "✏️ Sửa text"
- Click chữ → sửa → "✓ Lưu"
- **KHÔNG thấy**: AI chat, Templates, Billing, Project khác

---

## 🔒 Quyền hạn

| Hành động | Owner (bạn) | Client (khách) |
|---|---|---|
| Xem project | ✅ tất cả | ✅ chỉ project được invite |
| Sửa text inline | ✅ | ✅ |
| Dùng AI generate | ✅ | ❌ |
| Publish/Unpublish | ✅ | ❌ |
| Xóa project | ✅ | ❌ |
| Đổi tên project | ✅ | ❌ |
| Tạo project mới | ✅ | ❌ |
| Quản lý billing | ✅ | ❌ |
| Custom domain | ✅ | ❌ |

---

## 🛠️ Architecture

### Backend endpoints mới

| Endpoint | Auth | Mô tả |
|---|---|---|
| `POST /api/projects/:id/invite-client` | Owner | Tạo invite token, trả về URL |
| `GET /api/client-invite/:token` | **Public** | Lấy info project (cho page accept hiển thị) |
| `POST /api/client-invite/:token/accept` | Logged in | Link auth.uid → project.client_user_id |
| `DELETE /api/projects/:id/client` | Owner | Revoke client access |

### Database changes

```sql
ALTER TABLE projects
  ADD COLUMN client_email             text,
  ADD COLUMN client_user_id           uuid REFERENCES auth.users(id),
  ADD COLUMN client_invite_token      text UNIQUE,
  ADD COLUMN client_invite_expires_at timestamptz,
  ADD COLUMN client_invited_at        timestamptz,
  ADD COLUMN client_accepted_at       timestamptz;
```

### Role detection

Mỗi project có 2 user fields:
- `user_id` = owner (tạo project)
- `client_user_id` = client (được mời)

Server check trên mỗi request:
```js
const role = await getUserRole(req.user.id, projectId)
// returns: 'owner' | 'client' | null
```

API trả về `role` trong project object → frontend biết được hide/show UI.

### Security

- Invite token: `crypto.randomBytes(32).toString('hex')` (64 ký tự, ~256 bits entropy)
- **Email-bound**: server verify `JWT.email === project.client_email`
- Token expire sau **30 ngày**
- Token là **one-time use** — clear sau khi accept
- Re-invite cùng email = generate token mới, clear cũ

---

## 📊 Workflow example

```
[T0] Owner tạo invite
  ↓
  Modal mở → nhập email khach@vd.com → "Tao link moi"
  ↓
  Server: lưu client_email + token + expires (30 days)
  ↓
  UI: hiện invite URL

[T1] Owner gửi link qua Zalo
  ↓
  Khách hàng nhận link

[T2] Khách click link
  ↓
  Page /client-invite?token=xxx mount
  ↓
  Goi GET /api/client-invite/:token → trả về project name + email
  ↓
  Hiện form "Đăng nhập với khach@vd.com"
  ↓
  Click "Gửi link đăng nhập" → Supabase OTP

[T3] Khách kiểm email, click magic link
  ↓
  Logged in tại /client-invite?token=xxx
  ↓
  useEffect detect user + token → auto call POST /accept
  ↓
  Server: verify JWT.email === client_email → link user_id → clear token
  ↓
  Redirect /?project=xxx

[T4] App load với project=xxx
  ↓
  GET /api/projects/xxx → returns project với role: 'client'
  ↓
  UI: hide AI chat, hide billing, hide templates, show edit toolbar only
  ↓
  Khach hang tu chinh text
```

---

## ⚠️ Edge cases & limitations

### 1. Email pre-existed account
Nếu khách hàng đã có account DaisanAI riêng:
- Họ vẫn login bằng email được mời
- Sau khi accept, account của họ có 2 dạng project:
  - Owned projects (của họ)
  - Client projects (được mời)
- Khi chọn project, role tự động detect

### 2. Owner revoke access
Owner có thể click **"Huy quyen"** bất cứ lúc nào:
- `client_user_id` → NULL
- Khách hàng next time mở app → không thấy project đó nữa

### 3. Re-invite
Nếu muốn mời lại (vd: khách mất link):
- Mở modal lại → nhập email → generate link mới
- Token cũ tự động bị invalidate

### 4. Multiple clients per project
**v0.10 chỉ hỗ trợ 1 client/project**. Nếu cần nhiều người edit (vd: 2 chủ quán):
- Future feature (v0.11+)
- Workaround: tạo email chung (vd: `team@cafeannien.vn`)

### 5. Magic link email rate limit
Supabase Free tier: 3 email/giờ. Nếu khách hàng kẹt:
- Setup Resend SMTP (xem README)
- → Magic link gửi qua Resend (free 100/day)

---

## 🧪 Test scenario

### Test 1: Happy path
1. **Owner**: Tạo project "Cafe Test", invite email `test@gmail.com`
2. **Copy link**, mở incognito browser
3. **Paste link** → page hiện invite info
4. **Click "Gửi link đăng nhập"** → check email
5. **Click magic link** → tự động redirect
6. **Vào app** → thấy chỉ project "Cafe Test", UI giản lược
7. **Click "Sửa text"** → click chữ → sửa → "Lưu"
8. **Quay lại owner browser** → reload → thấy thay đổi của client

### Test 2: Wrong email
1. Owner invite `test@gmail.com`
2. Client login với `other@gmail.com`
3. Click accept → **Error**: "Email không khớp"

### Test 3: Token expired
1. Tạo invite, đợi 30 ngày
2. Click link → **Error**: "Link đã hết hạn"

### Test 4: Revoke
1. Owner click "Huy quyen"
2. Client (đã accept) reload app → project biến mất

---

## 🎁 Cho beta launch

Workflow đề xuất:
1. Bạn tạo 5-10 web cho người quen (free, làm đẹp port-folio)
2. Cho từng người **invite link**
3. Hướng dẫn họ tự update menu/SDT/giá khi cần
4. Bạn **không phải làm việc thủ công** mỗi lần khách đổi
5. Khi muốn nâng cấp (publish thật, custom domain), họ liên hệ bạn → bạn charge phí

→ **Đây là cách scale agency-style** với min effort.

---

## 📝 Files thay đổi trong v0.10

```
NEW:
+ supabase/migration_v0.10.sql
+ src/components/InviteClientModal.jsx
+ src/components/ClientInviteAccept.jsx

MODIFIED:
~ server/index.js (4 endpoints mới, role helper, version → 0.10.0)
~ src/App.jsx (route /client-invite, role detection, conditional UI)
~ src/components/Preview.jsx (hide Publish/Templates for client)
~ src/components/UserMenu.jsx (hide Billing for client)
~ package.json (version 0.10.0)
```

---

## 🚀 Deploy checklist

- [ ] Chạy `migration_v0.10.sql` trên Supabase
- [ ] Copy v0.10 code vào local project
- [ ] `npm install` (nếu có dep mới — không, không có)
- [ ] `git add . && git commit -m "v0.10: Client invite system"`
- [ ] `git push origin main`
- [ ] Render auto-rebuild backend (~3 phút)
- [ ] Vercel auto-rebuild frontend (~30s)
- [ ] Check `/api/health` → `version: 0.10.0`
- [ ] Test invite flow end-to-end

---

**v0.10 complete!** Bây giờ DaisanAI Lite là **agency-friendly** tool — bạn quản lý web cho nhiều khách, khách tự update content. 🎉
