# Setup Email Notify (v0.15)

Khi khach submit form tren published site, server tu gui email den
email cua chu project (SME owner) voi day du thong tin lead + nut
"Goi", "Reply email", "Mo trong app".

Su dung **Resend** (https://resend.com) — free 3000 email/thang.
Khong config thi tinh nang skip silently (van luu lead vao DB).

## Buoc 1: Dang ky Resend

1. Vao https://resend.com → Sign up (1 phut, dung Google login duoc)
2. Confirm email
3. Tab **API Keys** → "Create API Key" → ten "DaisanAI" → Permission "Full access"
4. Copy key (dang `re_xxxxxxxxxx`) → luu lai khong xem lai duoc

## Buoc 2: Setup From email (chon 1 cach)

### Cach A (nhanh, chi de test):
Dung email sandbox cua Resend `onboarding@resend.dev`. Han che:
- Chi gui duoc den email cua chu account Resend
- Email co label "via resend.dev" trong client
- Khong dung cho production

### Cach B (production):
1. Resend Dashboard → **Domains** → "Add Domain"
2. Nhap domain cua ban: vd `daisan.ai` (phai own)
3. Resend hien 3-4 DNS record (TXT, MX, DKIM) → vao registrar (GoDaddy, etc) them
4. Sau ~10 phut → click "Verify" trong Resend
5. Khi domain verified → set FROM_EMAIL = `noreply@daisan.ai` hoac `DaisanAI <hello@daisan.ai>`

## Buoc 3: Set env var

Tren server (Render → Environment) hoac local `.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=DaisanAI <onboarding@resend.dev>
APP_BASE_URL=https://webbuilder.daisan.ai
```

`APP_BASE_URL` dung de build deep-link "Mo trong app" trong email.

Restart server. Banner se hien `Email: Resend configured ✓`.

## Buoc 4: Test

1. Mo published site → submit form
2. Email vao mailbox cua SME owner sau 1-3 giay
3. Subject: `[DaisanAI] Lead moi - <site name>`
4. Body co bang form data + nut Goi/Email/Mo app
5. Click "Mo trong app" → redirect ve app voi project mo + Leads panel tu hien

## Han che hien tai (v0.15)

- ✅ Email HTML co bang form data + reply buttons
- ✅ Deep-link mo app + Leads panel
- ✅ Fail silently — neu Resend down, lead van duoc luu vao DB
- ✅ Owner reply email duoc set ve email cua khach (neu form co `email` field)
- ❌ Khong cho user disable tu UI — neu khong muon email thi unset RESEND_API_KEY
   (defer toggle per-project khi co request)
- ❌ Chi gui den owner, khong gui den client (intentional — SME la nguoi can biet)
- ❌ Khong email digest theo ngay (gom nhieu lead) — moi lead 1 email

## Quota Resend free

- 3000 email / thang free
- 100 email / ngay free
- Voi 100 SME × 10 lead / thang trung binh = 1000 email/thang → con room rong

Khi dung het free → Resend Pro $20/thang = 50,000 email. Hoac switch sang
provider khac (Postmark, SendGrid, AWS SES).

## API tham khao

`server/lib/emailNotify.js`:
- `sendLeadNotificationEmail({...})` — tra ve `{ok, skipped?, error?}`
- `isEmailConfigured()` — check `RESEND_API_KEY` co set khong

Goi tu `/api/site/:slug/lead` sau khi insert lead vao DB (fire-and-forget).

## Troubleshooting

**Khong nhan duoc email:**
- Check server log: co warn `[lead-email] ...` khong
- Check Resend Dashboard → Logs → thay request da send chua
- Check spam folder (san dau dau bang FROM_EMAIL chua verified)
- Verify SME owner email trong Supabase auth.users co dung khong

**Loi "from domain not verified":**
- Dung Cach A truoc (`onboarding@resend.dev`) → chi gui den email cua chu Resend
- Hoac verify domain theo Cach B
