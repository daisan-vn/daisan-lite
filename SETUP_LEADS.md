# Setup Leads / Contact Form (v0.14)

Khach hang tiem nang dien form tren published site → lead vao DB →
SME chu tiem login vao app thay tab "Leads" voi unread badge → click
xem chi tiet → goi/gui email tra loi.

## Buoc 1: Chay migration

Mo Supabase Dashboard → SQL Editor → paste va run:

```
supabase/migration_v0.14.sql
```

Migration tao:
- Table `public.leads (id, project_id, data jsonb, source_page, ...)`
- Index `leads_project_idx`, `leads_unread_idx`
- RLS: owner + client xem va mark read; chi owner duoc delete

## Cach hoat dong

### Tren published site (cho khach)

Khi server serve site qua `/site/<slug>/...` hoac custom domain, no
inject 1 script. Script nay:

1. Listen `submit` event tren TAT CA `<form>` trong page
2. Block default submission (`preventDefault`)
3. Collect cac field co `name` attribute (text, email, tel, textarea, select, checkbox)
4. POST `/api/site/<slug>/lead` voi body `{ data: {...}, source_page: 'lien-he.html' }`
5. Server validate + rate-limit (10 lead / 10 phut / IP) → insert vao leads table
6. Hien `Da gui thanh cong!` thay cho form

Form trong template AI gen ra co the la bat ky cau truc gi — script
collect tat ca `[name]` field. Khong can SME config gi them.

### Trong app (cho SME / client)

- Vao project published → toolbar hien nut **Leads** + badge so lead chua doc
- Click → slide-over panel ben phai
- Filter: Tat ca / Chua doc
- Click 1 row → drawer ben duoi hien chi tiet field
- Owner co the xoa lead, client chi co the mark read/unread
- Refresh moi 30s tu dong, hoac click ↻

## API endpoints

| Endpoint | Auth | Mo ta |
|---|---|---|
| `POST /api/site/:slug/lead` | Public | Khach submit form (rate-limit 10/10ph/IP) |
| `GET /api/projects/:id/leads` | requireAuth (owner/client) | List + unreadCount |
| `PATCH /api/projects/:id/leads/:lid` | requireAuth | `{read: true/false}` → mark read/unread |
| `DELETE /api/projects/:id/leads/:lid` | requireAuth (owner only) | Xoa lead |

## Test luc moi cai

1. Mo 1 project co page form (vd template "Nha hang pho" co trang lien-he.html)
2. Click Publish → copy URL `/site/<slug>/`
3. Mo URL trong tab moi (KHONG dang nhap) → vao page Lien he → dien form → Submit
4. Form bien mat, hien notice "Da gui thanh cong"
5. Quay ve app, mo lai project → toolbar co badge "1" do tren nut "Leads"
6. Click "Leads" → thay lead vua submit voi day du field
7. Click lead → drawer hien chi tiet → mark read tu dong

## Han che (v0.14)

- ✅ Lead luu DB + UI xem trong app
- ✅ Mark read / unread
- ✅ Owner xoa lead
- ✅ Rate limit IP 10 lead / 10 phut (chong spam basic)
- ❌ Khong email notification → SME phai mo app de check (defer v0.15)
- ❌ Khong Zalo OA notify (defer)
- ❌ Khong CAPTCHA → spam neu attacker xai nhieu IP. Hien tai chap nhan,
   gan reCAPTCHA neu phat sinh van de.
- ❌ Khong export CSV leads — defer khi co request that

## Bao mat / Privacy

- Form data luu nguyen ban trong jsonb → SME co the thay PII cua khach
- IP submitter luu de chong spam, KHONG hien len UI
- Rate limit in-memory: 1 IP / 10 lead / 10 phut. Restart server thi reset.
- RLS dam bao only owner/client xem leads cua project minh
- Public POST endpoint khong yeu cau auth → ai co URL site da publish la
  submit duoc → dung muc dich (contact form)

## Tro giup khac

Neu form khong gui:
- Mo DevTools Console khi truy cap site → check error
- Verify URL POST: `/api/site/<slug>/lead` co tra ve 200
- Check `is_published = true` cua project
- Verify migration_v0.14.sql da chay (table leads ton tai)
