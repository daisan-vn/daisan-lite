// ========================================================================
//  App.jsx v0.2 — DaisanAI Lite
// ========================================================================
//  Tinh nang moi:
//    + Streaming UI (thay code AI viet real-time)
//    + Chat-style iteration (sua project san co)
//    + Toast notifications
//    + Download HTML + Open in new tab
//    + Delete + Rename project
// ========================================================================

import { useState, useEffect, useCallback } from 'react'
import PromptInput from './components/PromptInput'
import ProjectList from './components/ProjectList'
import Preview from './components/Preview'
import Toast from './components/Toast'

export default function App() {
  const [current, setCurrent] = useState(null)
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamMode, setStreamMode] = useState(null)  // 'new' | 'iterate'
  const [projects, setProjects] = useState([])
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Load projects on mount
  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Loi tai project:', err)
    }
  }

  // ─── Streaming via SSE ─────────────────────────────────────────────────
  async function handleStream(prompt, projectId = null) {
    setIsStreaming(true)
    setStreamText('')
    setStreamMode(projectId ? 'iterate' : 'new')

    try {
      const res = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, projectId })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Loi khong xac dinh' }))
        throw new Error(err.error)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE format: "event: X\ndata: Y\n\n"
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
                  ? '✓ Da cap nhat thanh cong!'
                  : `✓ Da tao xong (${data.usage.output} tokens)`,
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
      const res = await fetch(`/api/projects/${id}`)
      const data = await res.json()
      setCurrent(data)
    } catch (err) {
      showToast('Loi tai project', 'error')
    }
  }

  async function handleDeleteProject(id) {
    if (!confirm('Xoa project nay? Khong the hoan tac.')) return
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (current?.id === id) setCurrent(null)
      fetchProjects()
      showToast('Da xoa project', 'success')
    } catch (err) {
      showToast('Loi khi xoa: ' + err.message, 'error')
    }
  }

  async function handleRenameProject(id, newName) {
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })
      fetchProjects()
      if (current?.id === id) setCurrent({ ...current, name: newName })
      showToast('Da doi ten', 'success')
    } catch (err) {
      showToast('Loi khi doi ten', 'error')
    }
  }

  function handleNewProject() {
    if (isStreaming) return
    setCurrent(null)
    setStreamText('')
  }

  return (
    <div className="h-full flex flex-col bg-ink-50">

      {/* ─── Header ──────────────────────────────────────── */}
      <header className="bg-white border-b border-ink-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
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

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-ink-400 font-mono">v0.2</span>
          {current && (
            <button
              onClick={handleNewProject}
              disabled={isStreaming}
              className="text-xs px-3 py-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-700 font-medium transition disabled:opacity-50"
            >
              + Project moi
            </button>
          )}
        </div>
      </header>

      {/* ─── Main: 2 cot ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar trai */}
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

        {/* Preview */}
        <main className="flex-1 bg-ink-100 flex flex-col overflow-hidden">
          <Preview
            current={current}
            streamText={streamText}
            isStreaming={isStreaming}
            streamMode={streamMode}
          />
        </main>
      </div>

      {/* Toast notifications */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
