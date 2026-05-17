// ========================================================================
//  src/lib/imageUpload.js (v0.13) — Upload anh user len Supabase Storage
// ========================================================================
//  Flow: User click <img> trong edit mode → file picker → file nay duoc
//  validate + (optional) compress → upload truc tiep len bucket project-images
//  qua Supabase JS SDK (RLS protect — chi user upload duoc vao folder
//  cua chinh ho).
// ========================================================================

import { supabase } from './supabase'

const BUCKET = 'project-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024  // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const IMAGE_UPLOAD_ERRORS = {
  NOT_AUTH:    'Ban chua dang nhap',
  TOO_LARGE:   'Anh qua 5MB. Hay resize truoc khi upload.',
  WRONG_TYPE:  'Chi cho phep JPG, PNG, WebP, GIF.',
  UPLOAD_FAIL: 'Upload that bai'
}

/**
 * Validate + upload 1 image file len Supabase Storage.
 * @param {File} file — file tu input type="file"
 * @param {string} projectId — UUID project, dung lam folder
 * @returns {Promise<{publicUrl: string, path: string}>}
 */
export async function uploadProjectImage(file, projectId) {
  // Validate
  if (!file) throw new Error('Khong co file')
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(IMAGE_UPLOAD_ERRORS.WRONG_TYPE)
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(IMAGE_UPLOAD_ERRORS.TOO_LARGE)
  }

  // Get session — RLS yeu cau auth
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) throw new Error(IMAGE_UPLOAD_ERRORS.NOT_AUTH)
  const userId = session.user.id

  // Path: {user_id}/{project_id}/{timestamp}-{random}.{ext}
  // user_id phai la first folder de match RLS policy
  const ext = file.name.split('.').pop()?.toLowerCase().slice(0, 5) || 'jpg'
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`
  const path = `${userId}/${projectId}/${fileName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    })

  if (error) {
    console.error('[image-upload]', error)
    throw new Error(IMAGE_UPLOAD_ERRORS.UPLOAD_FAIL + ': ' + error.message)
  }

  // Get public URL (bucket = public)
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { publicUrl: urlData.publicUrl, path }
}

/**
 * Resize anh tren client truoc khi upload (giam dung luong).
 * Tra ve File moi, dung type JPEG.
 * @param {File} file
 * @param {number} maxWidth
 * @param {number} quality 0..1
 */
export async function resizeImage(file, maxWidth = 1600, quality = 0.85) {
  if (!file.type.startsWith('image/')) return file
  if (file.type === 'image/gif') return file   // skip gif (giu animation)

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('Canvas toBlob failed'))
        const resized = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
          type: 'image/jpeg', lastModified: Date.now()
        })
        resolve(resized)
      }, 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Khong load duoc anh')) }
    img.src = url
  })
}
