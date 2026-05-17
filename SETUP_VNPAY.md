# Hướng dẫn setup VNPay Sandbox cho DaisanAI Lite

> Nếu chưa setup, app vẫn chạy được với **MOCK MODE** — click "Nâng cấp" sẽ auto-success để test UX.
> Khi nào muốn test thanh toán thật (sandbox), làm theo file này.

---

## YÊU CẦU

- Email cá nhân (Gmail OK)
- Số điện thoại VN
- Không cần đăng ký kinh doanh (sandbox miễn phí)

---

## BƯỚC 1 — ĐĂNG KÝ TÀI KHOẢN MERCHANT SANDBOX

1. Vào https://sandbox.vnpayment.vn
2. Click **"Đăng ký Merchant"** (góc trên phải)
3. Điền form:
   - Email: dùng email bạn
   - Số điện thoại
   - Mật khẩu
4. Verify email → đăng nhập
5. Hoàn thiện hồ sơ merchant (thông tin doanh nghiệp giả lập cũng được)
6. Đợi VNPay duyệt (~1 ngày làm việc)

> Nếu vội: VNPay có sẵn một số **test merchant** trong tài liệu. Tham khảo:
> https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop/

---

## BƯỚC 2 — LẤY CREDENTIALS

Sau khi merchant được duyệt:

1. Đăng nhập https://sandbox.vnpayment.vn
2. Vào **Quản lý cấu hình** → **Cấu hình thanh toán**
3. Lấy 2 giá trị:
   - **Mã website (TMN Code)** — vd: `ABCDEF12`
   - **Chuỗi bí mật (Hash Secret)** — chuỗi dài

---

## BƯỚC 3 — CẤU HÌNH RETURN URL

Trong VNPay merchant dashboard:

1. **Quản lý cấu hình** → **Cấu hình URL**
2. **URL trả về (Return URL)**: dán:
   ```
   http://localhost:5173/billing/return
   ```

> Cho production sau này: `https://daisan.vn/billing/return`

3. Lưu lại

---

## BƯỚC 4 — ĐIỀN VÀO .env

Mở `D:\daisan-lite\.env`, tìm các dòng VNPay và điền:

```env
VNP_TMN_CODE=ABCDEF12                             ← từ Bước 2
VNP_HASH_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX   ← từ Bước 2
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

Lưu file → **restart server** (Ctrl+C, `npm run dev` lại).

---

## BƯỚC 5 — TEST THANH TOÁN

Trong app:

1. Login → click avatar góc trên → **Nâng cấp gói**
2. Click **"Nâng cấp Pro"** trên card Pro (₫149K)
3. Browser redirect đến VNPay sandbox checkout
4. Chọn ngân hàng (vd **Ngân hàng NCB**)
5. Dùng **thẻ test** của VNPay:

   ```
   Số thẻ:      9704198526191432198
   Tên chủ thẻ: NGUYEN VAN A
   Ngày phát hành: 07/15
   Mật khẩu OTP: 123456
   ```

6. Nhập OTP → thanh toán thành công
7. VNPay redirect về `http://localhost:5173/billing/return`
8. Trang PaymentReturn verify signature → upgrade plan

---

## CÁC THẺ TEST KHÁC

VNPay cung cấp nhiều thẻ test cho các kịch bản:

| Kịch bản | Số thẻ |
|---|---|
| Thành công | `9704198526191432198` |
| Không đủ số dư | `9704195798459170488` |
| Thẻ bị khóa | `9704195798459170488` |
| Sai OTP | (bất kỳ thẻ trên, gõ OTP sai) |

OTP cho mọi thẻ test: `123456`

---

## CÁC RESPONSE CODE VNPay

Server code có map sẵn (xem `server/lib/vnpay.js`):

| Code | Ý nghĩa |
|---|---|
| 00 | Thành công |
| 11 | Hết hạn |
| 24 | User cancel |
| 51 | Không đủ số dư |
| 99 | Lỗi không xác định |

---

## TROUBLESHOOTING

### "Sai chữ ký" khi redirect về
- TMN_CODE hoặc HASH_SECRET sai → check `.env`
- Sửa rồi nhớ restart server

### "URL trả về không hợp lệ"
- Return URL trong VNPay dashboard chưa khớp với `http://localhost:5173/billing/return`
- Vào dashboard, sửa lại đúng từng ký tự

### Sau khi thanh toán, redirect về app nhưng vẫn thấy Free
- Mở DevTools → Network → tab `/api/billing/verify-return` → check response
- Có thể: signature fail (TMN_CODE sai) hoặc `vnp_ResponseCode != 00`

### IPN không hoạt động
- VNPay IPN (server-to-server notification) yêu cầu URL public, không hoạt động với localhost
- Để test IPN: dùng **ngrok** (https://ngrok.com) expose localhost ra internet
- Hoặc bỏ qua IPN — chỉ rely vào Return URL (đủ cho dev)

---

## CHUYỂN SANG PRODUCTION VNPay

Khi launch thật:

1. Đăng ký merchant production tại https://pay.vnpay.vn
2. Cần: Giấy phép kinh doanh, MST, hợp đồng
3. Lấy TMN_CODE + HASH_SECRET production
4. Update `.env`:
   ```env
   VNP_URL=https://pay.vnpay.vn/vpcpay.html
   VNP_TMN_CODE=<production code>
   VNP_HASH_SECRET=<production secret>
   ```
5. Update Return URL trong dashboard → `https://yourdomain.com/billing/return`
6. **Phí**: VNPay charge ~1.5-2.5% mỗi giao dịch (giảm theo volume)
