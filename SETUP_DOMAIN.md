# Hướng dẫn Custom Domain — Production Deployment

> **Local dev không thể test custom domain thật** — bạn phải deploy lên VPS có public IP.
> File này hướng dẫn cách deploy DaisanAI lên Viettel Cloud / DigitalOcean / AWS để custom domain hoạt động.

---

## TỔNG QUAN

Để user gắn `cuahangcuaban.com` vào DaisanAI, cần:

```
1. Server DaisanAI có PUBLIC IP (vd: 123.45.67.89)
2. User mua domain (vd: cuahangcuaban.com)
3. User tro DNS:
   A record  @                          → 123.45.67.89
   TXT record _daisan-verify.<domain>   → token verify
4. Server nhan request voi Host header "cuahangcuaban.com"
   → Lookup DB → tim project co custom_domain = "cuahangcuaban.com"
   → Serve HTML cua project do
```

---

## BƯỚC 1: DEPLOY DAISAN LÊN VPS

### Yêu cầu VPS
- Ubuntu 22.04+
- 2GB RAM tối thiểu
- Public IP
- Domain chính cho DaisanAI (vd: `daisan.vn`) — không bắt buộc nếu chỉ test với IP

### Cài đặt môi trường

```bash
# SSH vào VPS
ssh root@123.45.67.89

# Cài Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx

# Clone code
cd /var/www
git clone <repo-cua-ban> daisan-lite
cd daisan-lite
npm install

# Tạo .env (giống local nhưng thay localhost → domain thật)
nano .env
```

`.env` production:
```env
PORT=3001
SUPABASE_URL=https://owynuxlvtcvxbynrxvsj.supabase.co
SUPABASE_SERVICE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
VITE_API_URL=https://daisan.vn
VNP_TMN_CODE=...
VNP_HASH_SECRET=...
VNP_URL=https://pay.vnpay.vn/vpcpay.html   # production
SERVER_PUBLIC_IP=123.45.67.89
```

### Build frontend
```bash
npm run build
# Output: dist/ folder
```

### Chạy với PM2 (process manager)
```bash
npm install -g pm2
pm2 start server/index.js --name daisan-api
pm2 startup
pm2 save
```

---

## BƯỚC 2: CẤU HÌNH NGINX

File `/etc/nginx/sites-available/daisan`:

```nginx
# 1. Main DaisanAI app
server {
    listen 80;
    server_name daisan.vn www.daisan.vn;

    # Frontend SPA
    location / {
        root /var/www/daisan-lite/dist;
        try_files $uri /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Site routes (slug-based)
    location /site/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 2. CATCH-ALL — phuc vu custom domains
# Bat ky domain nao tro toi server nay (khong phai daisan.vn) → di vao backend
# Backend se check custom_domain trong DB
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;       # ← QUAN TRONG: pass Host header
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable + reload:
```bash
ln -s /etc/nginx/sites-available/daisan /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## BƯỚC 3: SSL CERT CHO MAIN DOMAIN

```bash
certbot --nginx -d daisan.vn -d www.daisan.vn
```

Auto-renew: certbot tự config cron.

---

## BƯỚC 4: SSL CERT CHO CUSTOM DOMAINS (advanced)

Đây là **phần khó nhất**. 2 approach:

### Approach A: Cloudflare proxy (DỄ NHẤT)

User tro DNS qua Cloudflare:
- A record `cuahangcuaban.com` → `123.45.67.89` (proxied: 🟠 ON)

Cloudflare tự cấp SSL free. DaisanAI chỉ cần handle HTTP (Cloudflare làm HTTPS→HTTP).

**Lợi ích:**
- Free SSL cho mọi domain
- DDoS protection
- CDN cache
- DNS quản lý dễ

**Nhược:**
- User phải dùng Cloudflare nameserver
- Có thể không phù hợp mọi user

### Approach B: Let's Encrypt + automatic provisioning (KHÓ HƠN)

Khi user verify domain → server tự chạy:
```bash
certbot certonly --webroot -w /var/www/daisan-lite/dist \
  -d cuahangcuaban.com --non-interactive --agree-tos --email admin@daisan.vn
```

Sau đó reload nginx với cert mới. Cần script automation.

→ Ngoài scope v0.8. Khuyến nghị **dùng Cloudflare** cho MVP.

---

## TEST FLOW SAU KHI DEPLOY

1. User register DaisanAI → upgrade Pro
2. User tạo project, publish (có slug URL)
3. User click "Custom domain" → nhập `cuahangcuaban.com`
4. App hiện DNS instructions:
   ```
   A record    @                           → 123.45.67.89
   TXT record  _daisan-verify.cuahangcuaban.com → daisan-verify=abc123...
   ```
5. User vào trang quản lý domain của họ (vd Tenten), thêm 2 record
6. Đợi 5-30 phút DNS propagate
7. User click "Verify" → server query TXT record → match → verified
8. Truy cập `https://cuahangcuaban.com` → thấy website của user!

---

## LOCAL TEST WORKAROUND

Không có VPS thật? Test bằng `/etc/hosts`:

**Mac/Linux:**
```bash
sudo nano /etc/hosts
```

**Windows:**
Mở `C:\Windows\System32\drivers\etc\hosts` (cần admin)

Thêm dòng:
```
127.0.0.1   cuahangcuaban.com
```

Bây giờ `cuahangcuaban.com` resolve về localhost. Nhưng vẫn cần port:
- `http://cuahangcuaban.com:3001/` → goes to backend (custom domain middleware)

**Để verify token**: DNS lookup local sẽ fail (vì /etc/hosts không có TXT records). Test verify chỉ work với DNS thật → cần VPS hoặc external DNS provider.

**Workaround verify**: Cập nhật `custom_domain_verified = true` thủ công trong Supabase Table Editor:
```sql
UPDATE projects
SET custom_domain_verified = true
WHERE id = '<project-id>';
```

Sau đó request `http://cuahangcuaban.com:3001/` sẽ serve site.

---

## TROUBLESHOOTING

### Verify fail "Khong tim thay TXT record"
- DNS chưa propagate (đợi thêm)
- Record sai host name (phải là `_daisan-verify.<domain>`, không phải `_daisan-verify`)
- Provider không cho TXT record cho subdomain → dùng provider khác

### Domain đã verify nhưng truy cập vẫn 404
- Project chưa publish (check `is_published = true`)
- Custom domain middleware không match Host (check nginx pass `Host $host`)
- Browser cache DNS cũ → flush DNS hoặc thử browser khác

### "Domain đã được sử dụng bởi project khác"
- Trong DB, slug unique. User khác đã claim → xoa khoi project ho hoac dung domain khac

---

## NGẮN GỌN: LOCAL VS PRODUCTION

| | Local dev | Production VPS |
|---|---|---|
| Tạo domain trong UI | ✅ | ✅ |
| Hiện DNS instructions | ✅ | ✅ |
| Verify DNS | ❌ (cần TXT record thật) | ✅ |
| Serve site qua custom domain | ⚠️ (cần `/etc/hosts` hack) | ✅ |
| SSL HTTPS | ❌ | ✅ (Cloudflare hoặc Let's Encrypt) |

→ Code v0.8 build feature đúng. Production deploy là việc tiếp theo (DevOps task).
