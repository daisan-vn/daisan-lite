# Hướng dẫn setup Google OAuth cho DaisanAI Lite

> Đây là phần khó nhất của v0.3. Làm theo từng bước, đừng skip.
> Nếu thấy phức tạp quá, dùng **Email magic link** thay thế (không cần setup gì, chạy ngay).

---

## TỔNG QUAN

Để Google login hoạt động, cần kết nối 3 nơi:

```
[Google Cloud Console]  ←—  Lấy Client ID + Secret
        ↓ (paste vào)
[Supabase Auth Google] ←—  Bật provider Google
        ↓ (Supabase tự handle)
[Code DaisanAI Lite]    ←—  Đã viết sẵn, không cần sửa
```

Setup mất khoảng **15-20 phút** nếu chưa từng làm.

---

## PHẦN 1 — GOOGLE CLOUD CONSOLE

### Bước 1.1: Mở Google Cloud Console

Vào https://console.cloud.google.com — đăng nhập bằng Gmail bạn muốn dùng.

### Bước 1.2: Tạo project mới (nếu chưa có)

1. Click dropdown project ở góc trên trái → **"New Project"**
2. Đặt tên: `daisan-ai` (hoặc bất kỳ)
3. Click **Create**
4. Đợi vài giây → chọn project vừa tạo

### Bước 1.3: Configure OAuth consent screen

> Đây là màn hình mà user thấy khi Google hỏi "App này muốn truy cập email của bạn, đồng ý không?"

1. Sidebar trái → **APIs & Services** → **OAuth consent screen**
2. Chọn **External** (cho phép user ngoài tổ chức đăng nhập) → **Create**
3. Điền thông tin:
   - **App name**: `DaisanAI Lite` (hoặc tên bạn muốn)
   - **User support email**: Gmail của bạn
   - **Developer contact email**: Gmail của bạn
   - Các trường khác để trống cũng được
4. Click **Save and Continue**
5. **Scopes** screen: Click **Save and Continue** (không add gì)
6. **Test users** screen: Click **+ Add Users** → thêm Gmail của bạn → **Save and Continue**

> Lưu ý: App đang ở "Testing" mode → chỉ test users trong danh sách mới login được.
> Khi nào ready cho public, click **Publish App** ở OAuth consent screen.

### Bước 1.4: Tạo OAuth Client ID

1. Sidebar trái → **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. **Application type**: chọn **Web application**
4. **Name**: `DaisanAI Web Client`
5. **Authorized JavaScript origins**: bỏ trống
6. **Authorized redirect URIs**: click **+ Add URI**, dán:

   ```
   https://owynuxlvtcvxbynrxvsj.supabase.co/auth/v1/callback
   ```

   > Đây là URL của project Supabase BẠN. Format chung:
   > `https://<PROJECT_ID>.supabase.co/auth/v1/callback`
   > Project bạn đã có là `owynuxlvtcvxbynrxvsj` rồi.

7. Click **Create**
8. Popup hiện ra với 2 giá trị:
   - **Client ID** — chuỗi dài kết thúc `.apps.googleusercontent.com`
   - **Client secret** — chuỗi dạng `GOCSPX-...`
9. **COPY cả 2** — sẽ paste vào Supabase ở Phần 2

> Có thể quay lại lấy bằng cách click vào OAuth client trong danh sách Credentials.

---

## PHẦN 2 — SUPABASE

### Bước 2.1: Bật Google Provider

1. Vào https://supabase.com/dashboard → project của bạn
2. Sidebar trái → **Authentication** → **Providers**
3. Tìm **Google** trong danh sách → click vào để mở rộng
4. **Bật toggle "Enable Sign in with Google"**

### Bước 2.2: Paste Client ID + Secret

Trong cùng panel Google vừa mở:

1. **Client ID (for OAuth)**: paste Client ID từ Google
2. **Client Secret (for OAuth)**: paste Client Secret từ Google
3. **Authorized Client IDs**: BỎ TRỐNG (chỉ dùng cho mobile app)
4. **Skip nonce check**: BỎ TRỐNG
5. Click **Save**

### Bước 2.3: Verify callback URL

Vẫn trong panel Google, có dòng **Callback URL (for OAuth)** — copy ra và kiểm tra:

```
https://owynuxlvtcvxbynrxvsj.supabase.co/auth/v1/callback
```

URL này **phải khớp 100%** với "Authorized redirect URIs" bạn đã add ở Bước 1.4. Nếu khác, edit lại trên Google Cloud Console.

---

## PHẦN 3 — TEST

### Bước 3.1: Restart app

Trong Terminal VS Code:

```bash
# Stop (Ctrl + C) → start lại
npm run dev
```

### Bước 3.2: Test login

1. Mở `http://localhost:5173`
2. Bạn thấy login screen
3. Click **"Tiếp tục với Google"**
4. Browser redirect đến `accounts.google.com`
5. Chọn Gmail của bạn (phải là email trong "Test users" ở Bước 1.3)
6. Google hỏi "DaisanAI Lite muốn truy cập...": click **Continue**
7. Redirect về `http://localhost:5173` — vào thẳng main app!

### Bước 3.3: Verify user được tạo

Vào Supabase Dashboard → **Authentication** → **Users** — thấy Gmail của bạn trong danh sách là OK.

---

## NẾU BỊ LỖI

### "Access blocked: This app's request is invalid"
- Redirect URI ở Google Cloud (Bước 1.4) không khớp với Callback URL ở Supabase (Bước 2.3). Sửa cho khớp 100%, kể cả `https://` và `/` cuối.

### "Error 403: access_denied"
- Gmail bạn đang login không nằm trong **Test users**. Quay Bước 1.3 → Test users → thêm vào.

### "OAuth client was not found"
- Client ID paste sai (có khoảng trắng, thiếu ký tự). Copy lại từ Google.

### Sau khi click Google, redirect về app mà vẫn thấy login screen
- Mở DevTools (F12) → Console → tìm error đỏ
- Thường do `VITE_SUPABASE_ANON_KEY` trong `.env` không đúng
- Hoặc Supabase project ID trong `VITE_SUPABASE_URL` sai

### "Provider Google is not enabled"
- Quay lại Bước 2.1, đảm bảo toggle **ON** và đã **Save**

---

## NẾU KHÔNG MUỐN SETUP GOOGLE BÂY GIỜ

Hoàn toàn được! Dùng **Email magic link** — chạy luôn không cần setup gì:

1. Mở app → click **"Đăng nhập qua email (magic link)"**
2. Nhập email của bạn
3. Check inbox → click link
4. Vào app

Đến khi có nhiều user → muốn UX đẹp hơn → quay lại làm Google OAuth.

---

## SAU KHI READY CHO PUBLIC

Khi app sẵn sàng cho user thật:

1. **Publish OAuth consent screen** (Google Cloud → OAuth consent screen → Publish App)
   → Bỏ giới hạn "test users", ai có Gmail cũng login được
2. **Verify domain** với Google (cần khi >100 users)
3. **Custom SMTP** ở Supabase (Settings → Auth → SMTP)
   → Để email magic link không bị throttle 4/giờ
