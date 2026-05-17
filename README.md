# DaisanAI Lite

> Phiên bản đơn giản của DaisanAI — chỉ ~15 files, chạy được trong 5 phút.
> Sau khi nó chạy được, ta sẽ mở rộng thành phiên bản đầy đủ.

---

## Bạn sẽ có gì sau khi setup xong?

Một web app chạy trên máy bạn (`http://localhost:5173`), trong đó:

- Nhập prompt tiếng Việt → AI Claude sinh ra trang web HTML
- Trang web được lưu vào Supabase database
- Xem lại các trang đã tạo trước đó
- Xem preview HTML hoặc xem mã nguồn

---

## YÊU CẦU TRƯỚC KHI BẮT ĐẦU

### Phần mềm cần cài (nếu chưa có):

| Phần mềm | Tải ở đâu | Kiểm tra đã cài chưa |
|---|---|---|
| **Node.js 20+** | https://nodejs.org → tải bản LTS | Mở Terminal gõ `node --version` |
| **VS Code** | https://code.visualstudio.com | Đã quen |
| **Git** (tùy chọn) | https://git-scm.com | `git --version` |

### Tài khoản cần có:

| Dịch vụ | Để làm gì | Link |
|---|---|---|
| **Supabase** | Lưu database | https://supabase.com (bạn đã có) |
| **Anthropic Console** | Lấy Claude API key | https://console.anthropic.com |

---

## CÁCH SETUP — 6 BƯỚC

### Bước 1: Đặt code vào đúng chỗ

Giải nén file ZIP này vào: `D:\daisan-lite\`

Mở VS Code → **File → Open Folder** → chọn `D:\daisan-lite`

Bạn sẽ thấy cấu trúc:

```
daisan-lite/
├── server/          ← Backend (Node.js + Express)
├── src/             ← Frontend (React + Vite)
├── supabase/        ← Schema database
├── package.json
├── .env.example     ← Template cấu hình (chưa dùng được)
└── README.md        ← File này
```

---

### Bước 2: Cài đặt thư viện

Trong VS Code, mở Terminal: **Ctrl + `** (dấu phẩy ngược, cạnh số 1)

Gõ lệnh:

```bash
npm install
```

Đợi 1-2 phút. Khi xong sẽ có folder `node_modules/` (đừng đụng vào).

> **Lỗi thường gặp:** `npm: command not found` → bạn chưa cài Node.js.
> Tải tại https://nodejs.org, cài xong **đóng và mở lại VS Code**.

---

### Bước 3: Lấy 2 API key cần thiết

#### 3.1 Lấy Supabase Service Role Key

1. Mở https://supabase.com/dashboard
2. Vào project của bạn (URL: `owynuxlvtcvxbynrxvsj`)
3. Click **Settings** (icon bánh răng dưới cùng sidebar trái)
4. Click **API**
5. Tìm phần **Project API keys** → có 2 key:
   - `anon` → key public (bạn đã có)
   - `service_role` → **copy cái này** (key bí mật)

> ⚠️ KHÔNG share `service_role` key với ai. Đừng commit lên GitHub.

#### 3.2 Lấy Claude API Key

1. Mở https://console.anthropic.com
2. Đăng ký/đăng nhập
3. Vào **API Keys** (sidebar trái) → **Create Key**
4. Đặt tên (vd: "daisan-dev"), tạo, **copy key** (bắt đầu bằng `sk-ant-`)

> Anthropic cho $5 credit miễn phí khi đăng ký mới. Đủ để test vài chục lần.

---

### Bước 4: Tạo file `.env`

Trong Terminal VS Code, gõ:

```bash
copy .env.example .env
```

(Trên Mac/Linux: `cp .env.example .env`)

Mở file `.env` vừa tạo, **điền các giá trị**:

```env
SUPABASE_URL=https://owynuxlvtcvxbynrxvsj.supabase.co
SUPABASE_ANON_KEY=sb_publishable_gCLOr9eKENXgly3a3M3EFg_64eXEKLe
SUPABASE_SERVICE_KEY=eyJ...                   ← DÁN service_role key của bạn
ANTHROPIC_API_KEY=sk-ant-...                  ← DÁN Claude API key của bạn

VITE_SUPABASE_URL=https://owynuxlvtcvxbynrxvsj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_gCLOr9eKENXgly3a3M3EFg_64eXEKLe
VITE_API_URL=http://localhost:3001
```

**Lưu file** (Ctrl + S).

---

### Bước 5: Tạo table trong Supabase

1. Mở https://supabase.com/dashboard → project của bạn
2. Click **SQL Editor** (icon database, sidebar trái)
3. Click **New query**
4. Mở file `supabase/schema.sql` trong VS Code
5. **Copy toàn bộ nội dung file** → paste vào SQL Editor trên Supabase
6. Click **Run** (hoặc Ctrl + Enter)

Kết quả: thấy thông báo "Success. No rows returned" → OK.

**Kiểm tra:** Vào **Database → Tables**, sẽ thấy table `projects` mới tạo.

---

### Bước 6: Chạy app!

Trong Terminal VS Code, gõ:

```bash
npm run dev
```

Bạn sẽ thấy 2 dòng log màu xanh dương và xanh lá:

```
[SERVER] DaisanAI Lite — Server sẵn sàng!
[SERVER] API:  http://localhost:3001
[WEB]    VITE ready in 234 ms
[WEB]    Local: http://localhost:5173
```

Mở trình duyệt → **http://localhost:5173**

**Thử ngay:** nhập prompt vào ô bên trái:
> *"Tạo landing page cho quán phở Hà Nội — có menu, địa chỉ, số điện thoại"*

Nhấn **Tạo web** → đợi 5-15 giây → xem preview bên phải!

---

## ⚠️ KHI GẶP LỖI

### `EADDRINUSE: port 3001 already in use`
Có process khác đang dùng port. Trong Terminal Windows:
```powershell
netstat -ano | findstr :3001
taskkill /PID <số PID> /F
```

### `ANTHROPIC_API_KEY missing`
Chưa điền key trong `.env`, hoặc chưa restart server. Stop (Ctrl+C) rồi `npm run dev` lại.

### `relation "projects" does not exist`
Chưa chạy schema SQL ở Bước 5. Quay lại làm.

### `Invalid API key` (Supabase)
Bạn copy nhầm. `service_role` bắt đầu bằng `eyJ`, không phải `sb_publishable_`.

### App chạy nhưng AI trả về toàn tiếng Anh
Edit `server/index.js`, tìm phần `system:` và thêm câu **"Luôn trả lời 100% bằng tiếng Việt có dấu"** vào.

---

## CẤU TRÚC THƯ MỤC — HIỂU CODE ĐANG LÀM GÌ

```
daisan-lite/
│
├── server/                    ← BACKEND chạy port 3001
│   └── index.js               ← Toàn bộ logic backend ở đây:
│                                 - Nhận prompt từ frontend
│                                 - Gọi Claude API
│                                 - Lưu kết quả vào Supabase
│                                 - Trả về frontend
│
├── src/                       ← FRONTEND React chạy port 5173
│   ├── main.jsx               ← Điểm vào của React
│   ├── App.jsx                ← Component gốc, layout 2 cột
│   ├── index.css              ← Tailwind + CSS chung
│   └── components/
│       ├── PromptInput.jsx    ← Ô nhập prompt + nút "Tạo web"
│       ├── ProjectList.jsx    ← Danh sách project đã tạo
│       └── Preview.jsx        ← Iframe preview HTML AI sinh ra
│
├── supabase/
│   └── schema.sql             ← SQL tạo table (chạy 1 lần)
│
├── package.json               ← Khai báo thư viện
├── vite.config.js             ← Cấu hình Vite (build tool)
├── tailwind.config.js         ← Cấu hình màu sắc, font
├── .env                       ← Chứa API keys (KHÔNG commit!)
└── .env.example               ← Template để biết cần điền gì
```

### Luồng dữ liệu khi user nhập prompt

```
Người dùng → PromptInput.jsx
            → fetch('/api/generate', { prompt })
            → server/index.js nhận request
            → gọi Claude API (~5-10 giây)
            → lưu kết quả vào Supabase
            → trả về frontend
            → Preview.jsx render HTML trong iframe
```

---

## SAU KHI CHẠY ĐƯỢC — CÁC BƯỚC TIẾP THEO

Khi app đã chạy ngon, ta sẽ thêm dần:

1. **Authentication** — đăng nhập bằng Google/email
2. **Streaming response** — thấy code AI viết từng chữ thay vì đợi 10 giây
3. **Sửa code bằng prompt** — "đổi màu nền sang xanh", "thêm form liên hệ"
4. **Deploy thật** — publish lên subdomain `xyz.daisan.vn`
5. **Thanh toán VNPay** — gói Free/Pro/Business
6. **Templates** — F&B, thời trang, dịch vụ

Mỗi tính năng sẽ thêm dần để bạn vừa làm vừa học.

---

## CẦN GIÚP?

Nhắn tôi (Claude) bất cứ lúc nào — gặp lỗi gì cứ paste lỗi vào chat, tôi sẽ hướng dẫn cách fix.

**Đừng paste keys/passwords vào chat** — chỉ paste error message thôi nhé!
