// ========================================================================
//  server/index.js — Backend DaisanAI Lite v0.2
// ========================================================================
//  NANG CAP TU v0.1:
//    + Streaming response (SSE) — thay code AI viet tung chu
//    + Iterate — sua project san co bang prompt moi
//    + Markdown fence stripping — fix bug ```html bi leak ra preview
//    + Delete project + Rename project
//    + Better error handling
// ========================================================================

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ─── HELPER: strip markdown code fences ───────────────────────────────────
// Claude hay wrap output trong ```html...``` du da dan system prompt khong wrap.
// Function nay xu ly tat ca cac kieu wrap thuong gap.
function stripCodeFences(text) {
  if (!text) return ''
  let result = text.trim()

  // Bo opening fence: ```html, ```HTML, ```\n, ~~~html...
  result = result.replace(/^[`~]{3,}\s*[a-zA-Z]*\s*\n?/, '')
  // Bo closing fence o cuoi
  result = result.replace(/\n?[`~]{3,}\s*$/, '')

  return result.trim()
}

// ─── HELPER: build system prompts ─────────────────────────────────────────
const SYSTEM_PROMPT_NEW = `Ban la AI chuyen tao landing page chuyen nghiep cho thi truong Viet Nam.

QUY TAC TUYET DOI:
1. Tra ve DUY NHAT mot file HTML hoan chinh, bat dau bang <!DOCTYPE html>
2. TUYET DOI KHONG bao boc trong markdown code fence (khong dung backtick)
3. KHONG them giai thich, KHONG them text ngoai HTML
4. Noi dung 100% bang tieng Viet co dau day du

YEU CAU KY THUAT:
- Dung Tailwind CSS qua CDN: <script src="https://cdn.tailwindcss.com"></script>
- Font: them Google Fonts (Be Vietnam Pro hoac Inter) qua <link>
- Responsive day du (mobile-first)
- Co header / hero / content / footer ro rang
- Nut CTA noi bat
- Hover effects muot, animation tinh te
- SEO meta tags day du (title, description)

YEU CAU NOI DUNG:
- Mau sac chuyen nghiep, phu hop nganh hang user yeu cau
- Them chi tiet Viet Nam: dia chi co quan/huyen/tinh; so dien thoai dang 09xx
- Form lien he hoac so dien thoai noi bat
- Emoji vua phai, dung dung cho`

const SYSTEM_PROMPT_ITERATE = `Ban dang chinh sua mot trang HTML san co. Nguoi dung gui yeu cau thay doi.

QUY TAC:
1. Doc HTML hien tai duoi day
2. Ap dung CHINH XAC thay doi user yeu cau, GIU NGUYEN moi thu khac
3. Tra ve file HTML day du moi (KHONG diff, KHONG patch)
4. TUYET DOI KHONG wrap trong markdown fence
5. KHONG giai thich, chi tra ve HTML`

// ─── API: Health check ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '0.2.0', time: new Date().toISOString() })
})

// ─── API: Sinh code (non-streaming) ───────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body
    if (!prompt || prompt.trim().length < 5) {
      return res.status(400).json({ error: 'Prompt phai co it nhat 5 ky tu' })
    }

    const message = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: SYSTEM_PROMPT_NEW,
      messages: [{ role: 'user', content: prompt.trim() }]
    })

    const rawHtml = message.content.filter(b => b.type === 'text').map(b => b.text).join('')
    const html = stripCodeFences(rawHtml)

    const { data, error } = await supabase
      .from('projects')
      .insert({ name: deriveName(prompt), prompt: prompt.trim(), html, status: 'completed' })
      .select().single()

    if (error) return res.json({ id: null, html, prompt, warning: error.message })
    res.json(data)
  } catch (err) {
    console.error('[generate]', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── API: Sinh code (STREAMING) ───────────────────────────────────────────
// SSE — client doc tung chunk khi AI viet
app.post('/api/generate-stream', async (req, res) => {
  const { prompt, projectId } = req.body

  if (!prompt || prompt.trim().length < 5) {
    return res.status(400).json({ error: 'Prompt phai co it nhat 5 ky tu' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  try {
    let messages, systemPrompt, existingProject = null

    if (projectId) {
      const { data } = await supabase.from('projects').select('*').eq('id', projectId).single()
      if (!data) {
        send('error', { message: 'Project khong ton tai' })
        return res.end()
      }
      existingProject = data
      systemPrompt = SYSTEM_PROMPT_ITERATE
      messages = [{
        role: 'user',
        content: `HTML hien tai:\n\n${data.html}\n\n---\n\nYeu cau thay doi: ${prompt.trim()}`
      }]
      send('start', { mode: 'iterate', projectName: data.name })
    } else {
      systemPrompt = SYSTEM_PROMPT_NEW
      messages = [{ role: 'user', content: prompt.trim() }]
      send('start', { mode: 'new' })
    }

    let fullText = ''
    const stream = claude.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: systemPrompt,
      messages
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const chunk = event.delta.text
        fullText += chunk
        send('chunk', { text: chunk })
      }
    }

    const finalMessage = await stream.finalMessage()
    const html = stripCodeFences(fullText)

    let saved
    if (existingProject) {
      const newPrompt = `${existingProject.prompt}\n\n[+] ${prompt.trim()}`
      const { data } = await supabase
        .from('projects')
        .update({ html, prompt: newPrompt, status: 'completed' })
        .eq('id', projectId).select().single()
      saved = data
    } else {
      const { data } = await supabase
        .from('projects')
        .insert({ name: deriveName(prompt), prompt: prompt.trim(), html, status: 'completed' })
        .select().single()
      saved = data
    }

    send('done', {
      project: saved,
      html,
      usage: {
        input: finalMessage.usage?.input_tokens || 0,
        output: finalMessage.usage?.output_tokens || 0
      }
    })
    res.end()

  } catch (err) {
    console.error('[generate-stream]', err)
    send('error', { message: err.message || 'Co loi xay ra' })
    res.end()
  }
})

// ─── API: List projects ───────────────────────────────────────────────────
app.get('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, prompt, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50)
    if (error) throw error
    res.json({ projects: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── API: Get one project ─────────────────────────────────────────────────
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('projects').select('*').eq('id', req.params.id).single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(404).json({ error: 'Khong tim thay project' })
  }
})

// ─── API: Delete project ──────────────────────────────────────────────────
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── API: Rename project ──────────────────────────────────────────────────
app.patch('/api/projects/:id', async (req, res) => {
  try {
    const { name } = req.body
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: 'Ten khong duoc rong' })
    }
    const { data, error } = await supabase
      .from('projects')
      .update({ name: name.trim().slice(0, 100) })
      .eq('id', req.params.id).select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────
function deriveName(prompt) {
  const clean = prompt.trim().replace(/\s+/g, ' ').slice(0, 60)
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

// ─── Start ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log('')
  console.log('  ┌──────────────────────────────────────────────┐')
  console.log('  │   DaisanAI Lite v0.2 — Server san sang!      │')
  console.log(`  │   API:  http://localhost:${PORT}                │`)
  console.log(`  │   Web:  http://localhost:5173                │`)
  console.log('  └──────────────────────────────────────────────┘')
  console.log('')

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('xxxx')) {
    console.warn('  ⚠️  Chua dien ANTHROPIC_API_KEY trong .env')
  }
  if (!process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY.includes('xxxx')) {
    console.warn('  ⚠️  Chua dien SUPABASE_SERVICE_KEY trong .env')
  }
})
