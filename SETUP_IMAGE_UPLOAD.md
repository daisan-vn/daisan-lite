# Setup Image Upload (v0.13)

User co the click vao `<img>` trong edit mode → chon file tu may tinh
→ upload len Supabase Storage → anh duoc thay ngay trong preview.
Sau khi Save edits, anh moi duoc luu vinh vien vao project.

## Buoc 1: Chay migration

Mo Supabase Dashboard → SQL Editor → paste va run:

```
supabase/migration_v0.13.sql
```

Migration nay tao:
- Bucket `project-images` (public read, 5MB limit, JPG/PNG/WebP/GIF)
- RLS policies tren `storage.objects`:
  - Anyone read (de serve published site)
  - Authenticated user chi upload vao folder `{their_user_id}/*`
  - User chi delete file cua minh

Khong can config gi them tren Dashboard — bucket va RLS tao tu SQL.

## Buoc 2: Test

1. Mo 1 project trong app → click "Sua text"
2. Edit mode bat → hover len anh thay outline xanh la, cursor pointer
3. Click anh → file picker mo → chon JPG/PNG
4. Anh hien spinner trong 1-2 giay → swap sang anh moi
5. Click "Luu" → server save HTML voi src moi
6. Refresh → anh van dung (URL Supabase Storage public)

Check duong dan file tren Supabase:
- Storage → `project-images` bucket
- Folder structure: `{user_id}/{project_id}/{timestamp}-{rand}.jpg`

## Han che hien tai (v0.13)

- ✅ Upload anh trong inline edit mode
- ✅ Resize tu dong < 1600px width, JPEG quality 85% truoc upload
- ✅ Hien progress spinner len anh dang upload
- ❌ **Khong xoa anh tu Storage khi xoa project** — anh cu se nam lai
  trong bucket (de don gian, tranh accidental delete). Co the them
  cleanup trigger sau hoac chay manual cleanup.
- ❌ Khong co media library — user upload moi anh thay 1 lan, khong
  reuse duoc tu cac upload truoc.
- ❌ Admin template editor chua co image upload (chua wire vao
  AdminTemplateEditor) — defer.

## Free tier limits

Supabase free tier:
- Storage: 1GB total
- Bandwidth: 5GB/month

Voi 5 anh × 200KB/SME = 1MB/SME → ~1000 SME truoc khi het free tier.
Sau do tinh:
- Pro plan Supabase: $25/month cho 100GB → ~100k SME

## API hoat dong

Khong co endpoint server moi — upload direct tu frontend qua Supabase
JS SDK. Authorize bang JWT cua user (RLS tu enforce).

Helper: `src/lib/imageUpload.js`
- `uploadProjectImage(file, projectId)` → validate + upload, return URL
- `resizeImage(file, maxWidth, quality)` → canvas-based resize truoc upload

## Postmessage protocol (iframe ↔ parent)

```
iframe → parent:
  daisan:imageClick { id, currentSrc, alt }
    User click anh trong edit mode

parent → iframe:
  daisan:setImageUploading { id, on }
    Toggle loading state (opacity + blur)

  daisan:replaceImageSrc { id, src }
    Swap img.src sau khi upload xong → trigger dirty
```

## Security note

- RLS dam bao user khac KHONG ghi vao folder cua nguoi khac
- Bucket public read → published site co the load anh khong can auth
- File MIME bi enforce bang `allowed_mime_types` cua bucket → khong
  upload SVG (XSS risk) duoc
- 5MB hard limit tu bucket config → khong abuse storage
- Filename random + timestamp → khong path traversal
