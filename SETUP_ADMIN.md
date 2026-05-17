# Setup Admin Panel (v0.12)

Admin panel cho phép user co `user_roles.is_admin = true` truy cap `/admin`
de quan ly templates (sua, xoa, toggle featured, doi display order).

## Buoc 1: Chay migration

Mo Supabase Dashboard → SQL Editor → paste va run noi dung file:

```
supabase/migration_v0.12.sql
```

Migration nay tao:
- Table `public.user_roles (user_id, is_admin, ...)`
- RLS policy: user chi xem duoc row cua chinh minh
- Index `user_roles_admin_idx` cho query nhanh
- Trigger updated_at

## Buoc 2: Promote admin dau tien

1. Vao **Authentication → Users** trong Supabase Dashboard.
2. Tim user bang email → click vao row → copy **User UID** (dang UUID).
3. Vao **SQL Editor** chay (thay UUID vao):

   ```sql
   INSERT INTO public.user_roles (user_id, is_admin)
   VALUES ('paste-uuid-vao-day', true)
   ON CONFLICT (user_id) DO UPDATE SET is_admin = true;
   ```

4. User do reload trang app → trong dropdown **UserMenu** se thay item
   **"Admin panel"** voi badge `ADMIN`. Hoac vao thang `/admin`.

## Demote admin

```sql
UPDATE public.user_roles SET is_admin = false WHERE user_id = '<uuid>';
```

Hoac xoa hoan toan:

```sql
DELETE FROM public.user_roles WHERE user_id = '<uuid>';
```

## Co nhieu admin

Lap lai Buoc 2 cho moi user. Khong gioi han so luong admin.

---

## Kiem tra hoat dong

Sau khi promote, mo DevTools console khi vao `/admin`. Network tab phai
thay request `GET /api/admin/check` tra ve `{is_admin: true}`.

Neu van bi 403:
- Verify `user_id` trong `user_roles` khop chinh xac voi `auth.users.id`.
- Verify `is_admin` la `true` (boolean), khong phai string.
- Verify user da sign-out + sign-in lai sau khi promote (cache cu).

---

## Chuc nang Admin Panel hien tai (v0.12)

- ✅ Liet ke tat ca templates (loc theo category)
- ✅ **Tao template moi** qua AI (nhap prompt → generate ~10-30s, ton ~$0.05-$0.20)
- ✅ Sua metadata: name, description, category, emoji, colors, default_prompt, display_order, is_featured
- ✅ **Sua HTML content** inline cho moi page (giong inline edit cua user)
- ✅ Toggle featured nhanh tu list
- ✅ Xoa template
- 🔄 Bulk seed: van co the chay `npm run seed-templates` (idempotent, khong duplicate slug)

## API endpoints (cho dev tham khao)

| Endpoint | Auth | Mo ta |
|---|---|---|
| `GET /api/admin/check` | requireAuth | Tra ve `{is_admin: bool}` |
| `GET /api/admin/templates` | requireAuth + requireAdmin | List metadata (khong kem pages content) |
| `GET /api/admin/templates/:id` | requireAuth + requireAdmin | Full template (co pages content) |
| `POST /api/admin/templates/generate` | requireAuth + requireAdmin | AI generate template moi |
| `POST /api/admin/templates/:id/save-edits` | requireAuth + requireAdmin | Sanitize + save HTML 1 page |
| `PATCH /api/admin/templates/:id` | requireAuth + requireAdmin | Sua metadata (allowlist field) |
| `DELETE /api/admin/templates/:id` | requireAuth + requireAdmin | Xoa hoan toan |

## Security note

- Server dung Supabase **service_role** → bypass RLS → check admin
  thu cong qua middleware `requireAdmin` (xem [server/index.js](server/index.js)).
- Field cho phep update trong PATCH duoc allowlist → user khong gui duoc
  `pages`, `uses_count`, `slug`, `id` qua API.
- Frontend gating chi de UX — server moi la nguon-quyen-thuc-su.
