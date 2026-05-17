// ========================================================================
//  App.jsx v0.3 — DaisanAI Lite voi Authentication
// ========================================================================
//  Luong:
//    - Khi load: check session (useAuth hook)
//    - Neu chua dang nhap: hien Auth screen
//    - Neu da dang nhap: hien main app
//    - Moi API call deu kem JWT trong header
//    - Moi user chi thay project cua minh (filter o server + RLS o DB)
// ========================================================================

import { useState, useEffect, useCallback } from 'react'
import PromptInput from './components/PromptInput'
import ProjectList from './components/ProjectList'
import Preview from './components/Preview'
import Toast from './components/Toast'
import Auth from './components/Auth'
import UserMenu from './components/UserMenu'
import { useAuth } from './hooks/useAuth'
import { apiGet, apiDelete, apiPatch, apiPost, apiPostStream } from './lib/api'

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()

  // ─── Neu dang check auth: show splash ──────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-lg shadow-soft mx-auto mb-3 animate-pulse-slow">D</div>
          <p className="text-sm text-ink-500">Dang tai...</p>
        </div>
      </div>
    )
  }

  // ─── Chua dang nhap: hien login ────────────────────────────────────────
  if (!user) {
    return <Auth />
  }

  // ─── Da dang nhap: app chinh ───────────────────────────────────────────
  return <MainApp user={user} onSignOut={signOut} />
}

// ════════════════════════════════════════════════════════════════════════
//  MAIN APP — chi render khi co user
// ════════════════════════════════════════════════════════════════════════

function MainApp({ user, onSignOut }) {
  const [current, setCurrent] = useState(null)
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamMode, setStreamMode] = useState(null)
  const [projects, setProjects] = useState([])
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    try {
      const data = await apiGet('/api/projects')
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Loi tai project:', err)
      // Neu token het han, useAuth se tu detect va redirect
    }
  }

  async function handleStream(prompt, projectId = null) {
    setIsStreaming(true)
    setStreamText('')
    setStreamMode(projectId ? 'iterate' : 'new')

    try {
      const res = await apiPostStream('/api/generate-stream', { prompt, projectId })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue
          const lines = eventBlock.split('\n')
          let eventType = 'message'
          let dataStr = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7)
            else if (line.startsWith('data: ')) dataStr = line.slice(6)
          }
          if (!dataStr) continue

          try {
            const data = JSON.parse(dataStr)
            if (eventType === 'chunk') {
              accumulated += data.text
              setStreamText(accumulated)
            } else if (eventType === 'done') {
              setCurrent(data.project)
              setStreamText('')
              showToast(
                projectId
                  ? `✓ Da cap nhat (${data.usage.pageCount} trang)`
                  : `✓ Da tao ${data.usage.pageCount} trang website`,
                'success'
              )
              fetchProjects()
            } else if (eventType === 'error') {
              throw new Error(data.message)
            }
          } catch (e) {
            console.error('SSE parse error:', e)
          }
        }
      }
    } catch (err) {
      showToast('Loi: ' + err.message, 'error')
    } finally {
      setIsStreaming(false)
      setStreamMode(null)
    }
  }

  async function handleSelectProject(id) {
    if (isStreaming) return
    try {
      const data = await apiGet(`/api/projects/${id}`)
      setCurrent(data)
    } catch (err) {
      showToast('Loi tai project', 'error')
    }
  }

  async function handleDeleteProject(id) {
    if (!confirm('Xoa project nay? Khong the hoan tac.')) return
    try {
      await apiDelete(`/api/projects/${id}`)
      if (current?.id === id) setCurrent(null)
      fetchProjects()
      showToast('Da xoa project', 'success')
    } catch (err) {
      showToast('Loi khi xoa: ' + err.message, 'error')
    }
  }

  async function handleRenameProject(id, newName) {
    try {
      await apiPatch(`/api/projects/${id}`, { name: newName })
      fetchProjects()
      if (current?.id === id) setCurrent({ ...current, name: newName })
      showToast('Da doi ten', 'success')
    } catch (err) {
      showToast('Loi khi doi ten', 'error')
    }
  }

  // ─── Publish handlers (v0.5) ──────────────────────────────────────────
  const [publishLoading, setPublishLoading] = useState(false)

  async function handlePublish(id) {
    setPublishLoading(true)
    try {
      const data = await apiPost(`/api/projects/${id}/publish`, {})
      // Update current project state
      if (current?.id === id) {
        setCurrent({
          ...current,
          slug: data.slug,
          is_published: true,
          published_at: new Date().toISOString()
        })
      }
      fetchProjects()
      showToast('🚀 Da publish! Click "Live" de copy link', 'success')
    } catch (err) {
      showToast('Loi publish: ' + err.message, 'error')
    } finally {
      setPublishLoading(false)
    }
  }

  async function handleUnpublish(id) {
    if (!confirm('Unpublish website? URL hien tai se khong con truy cap duoc.')) return
    setPublishLoading(true)
    try {
      await apiPost(`/api/projects/${id}/unpublish`, {})
      if (current?.id === id) setCurrent({ ...current, is_published: false })
      fetchProjects()
      showToast('Da unpublish', 'success')
    } catch (err) {
      showToast('Loi unpublish: ' + err.message, 'error')
    } finally {
      setPublishLoading(false)
    }
  }

  function handleNewProject() {
    if (isStreaming) return
    setCurrent(null)
    setStreamText('')
  }

  // ─── Template clone handler (v0.6) ──────────────────────────────────
  function handleTemplateCloned(newProject) {
    setCurrent(newProject)
    fetchProjects()
  }

  return (
    <div className="h-full flex flex-col bg-ink-50">

      {/* ─── Header ──────────────────────────────────────── */}
      <header className="bg-white border-b border-ink-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
        <button
          onClick={handleNewProject}
          className="flex items-center gap-3 group"
          disabled={isStreaming}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold shadow-soft group-hover:shadow-card transition-shadow">
            D
          </div>
          <div className="text-left">
            <h1 className="font-semibold text-base leading-tight">
              DaisanAI <span className="text-xs font-normal text-ink-400 ml-0.5">Lite</span>
            </h1>
            <p className="text-[11px] text-ink-500 leading-tight">Tao web bang tieng Viet</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-400 font-mono">v0.3</span>
          {current && (
            <button
              onClick={handleNewProject}
              disabled={isStreaming}
              className="text-xs px-3 py-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-700 font-medium transition disabled:opacity-50"
            >
              + Project moi
            </button>
          )}
          <div className="w-px h-6 bg-ink-200 mx-1"></div>
          <UserMenu user={user} onSignOut={onSignOut} />
        </div>
      </header>

      {/* ─── Main: 2 cot ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[400px] border-r border-ink-200 bg-white flex flex-col">
          <PromptInput
            onSubmit={handleStream}
            isStreaming={isStreaming}
            streamMode={streamMode}
            currentProjectId={current?.id}
            currentProjectName={current?.name}
          />
          <ProjectList
            projects={projects}
            currentId={current?.id}
            onSelect={handleSelectProject}
            onDelete={handleDeleteProject}
            onRename={handleRenameProject}
            disabled={isStreaming}
          />
        </aside>

        <main className="flex-1 bg-ink-100 flex flex-col overflow-hidden">
          <Preview
            current={current}
            streamText={streamText}
            isStreaming={isStreaming}
            streamMode={streamMode}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            publishLoading={publishLoading}
            onTemplateCloned={handleTemplateCloned}
            showToast={showToast}
          />
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
