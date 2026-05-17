// ========================================================================
//  App.jsx v0.10 — DaisanAI Lite voi Client Invite System
// ========================================================================
//  Luong:
//    - Khi load: check session (useAuth hook)
//    - Neu chua dang nhap: hien Auth screen
//    - Neu da dang nhap: hien main app
//    - User co the la OWNER hoac CLIENT cua moi project
//    - Client: UI bi gioi han (khong AI chat, khong publish, khong delete)
// ========================================================================

import { useState, useEffect, useCallback } from 'react'
import PromptInput from './components/PromptInput'
import ProjectList from './components/ProjectList'
import Preview from './components/Preview'
import Toast from './components/Toast'
import Auth from './components/Auth'
import UserMenu from './components/UserMenu'
import BillingPage from './components/BillingPage'
import PaymentReturn from './components/PaymentReturn'
import ClientInviteAccept from './components/ClientInviteAccept'
import InviteClientModal from './components/InviteClientModal'
import LanguageToggle from './components/LanguageToggle'
import AdminPanel from './components/AdminPanel'
import { useAuth } from './hooks/useAuth'
import { useAdmin } from './hooks/useAdmin'
import { useT } from './hooks/useLanguage'
import { apiGet, apiDelete, apiPatch, apiPost, apiPostStream } from './lib/api'

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const path = window.location.pathname

  // v0.10: Client invite accept page (PUBLIC — no auth check here)
  if (path === '/client-invite') {
    return <ClientInviteAccept />
  }

  // VNPay redirect handler
  if (path === '/billing/return') {
    if (authLoading) return <SplashScreen />
    if (!user) return <Auth />
    return <PaymentReturn />
  }

  if (authLoading) return <SplashScreen />
  if (!user) return <Auth />

  // v0.12: Admin panel — server tu reject 403 neu khong phai admin
  if (path === '/admin') {
    return <AdminRoute user={user} onSignOut={signOut} />
  }

  return <MainApp user={user} onSignOut={signOut} />
}

// ════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTE (v0.12)
// ════════════════════════════════════════════════════════════════════════
function AdminRoute({ user }) {
  const { isAdmin, loading } = useAdmin(user)
  const [toast, setToast] = useState(null)
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  if (loading) return <SplashScreen />
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 p-4">
        <div className="bg-white rounded-2xl shadow-card max-w-md w-full p-6 text-center">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-lg font-bold text-ink-900 mb-1">Khong co quyen admin</h1>
          <p className="text-sm text-ink-600 mb-4">
            Tai khoan <strong>{user.email}</strong> chua duoc cap quyen admin.
            Lien he chu DaisanAI hoac xem <code className="bg-ink-100 px-1 rounded">SETUP_ADMIN.md</code> de promote.
          </p>
          <a href="/" className="inline-block px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold">
            Quay ve trang chu
          </a>
        </div>
      </div>
    )
  }
  return (
    <>
      <AdminPanel onBack={() => window.location.href = '/'} showToast={showToast} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}

function SplashScreen() {
  const t = useT()
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-lg shadow-soft mx-auto mb-3 animate-pulse-slow">D</div>
        <p className="text-sm text-ink-500">{t('common.loading')}</p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════════════

function MainApp({ user, onSignOut }) {
  const t = useT()
  const { isAdmin } = useAdmin(user)
  const [current, setCurrent] = useState(null)
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamMode, setStreamMode] = useState(null)
  const [projects, setProjects] = useState([])
  const [toast, setToast] = useState(null)
  const [view, setView] = useState('main')
  const [showInviteModal, setShowInviteModal] = useState(false)

  // v0.10: Detect role for selected project
  const currentRole = current?.role
  const isClient = currentRole === 'client'

  // v0.10: User is "client-only" if has only client projects
  const ownedProjects = projects.filter(p => p.role === 'owner')
  const clientProjects = projects.filter(p => p.role === 'client')
  const isClientOnly = ownedProjects.length === 0 && clientProjects.length > 0

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => { fetchProjects() }, [])

  // v0.15: Deep link cho email notify: ?project=<id>&openLeads=1
  const [autoOpenLeads, setAutoOpenLeads] = useState(false)

  // v0.10: Auto-select project from URL (after client accept invite hoac email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const projectId = params.get('project')
    if (projectId && projects.length > 0 && !current) {
      handleSelectProject(projectId)
      // v0.15: neu URL co openLeads=1, set flag de Preview auto-mo panel
      if (params.get('openLeads') === '1') setAutoOpenLeads(true)
      window.history.replaceState({}, '', '/')
    }
  }, [projects])

  // v0.10: Auto-select client's only project
  useEffect(() => {
    if (isClientOnly && !current && clientProjects.length === 1) {
      handleSelectProject(clientProjects[0].id)
    }
  }, [isClientOnly, projects.length])

  async function fetchProjects() {
    try {
      const data = await apiGet('/api/projects')
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Loi tai project:', err)
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
      const isLimit = err.message.includes('Da het quota') ||
                      err.message.includes('Da dat gioi han') ||
                      err.message.includes('Nang cap')
      if (isLimit) {
        showToast(err.message + ' → Click "Nang cap goi"', 'error')
        setTimeout(() => setView('billing'), 1500)
      } else {
        showToast('Loi: ' + err.message, 'error')
      }
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

  const [publishLoading, setPublishLoading] = useState(false)

  async function handlePublish(id) {
    setPublishLoading(true)
    try {
      const data = await apiPost(`/api/projects/${id}/publish`, {})
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

  function handleTemplateCloned(newProject) {
    setCurrent(newProject)
    fetchProjects()
  }

  return (
    <div className="h-full flex flex-col bg-ink-50">

      {/* ─── Header ──────────────────────────────────────── */}
      <header className="bg-white border-b border-ink-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => { setView('main'); !isClient && handleNewProject() }}
          className="flex items-center gap-3 group"
          disabled={isStreaming}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold shadow-soft group-hover:shadow-card transition-shadow">
            D
          </div>
          <div className="text-left">
            <h1 className="font-semibold text-base leading-tight">
              DaisanAI <span className="text-xs font-normal text-ink-400 ml-0.5">Lite</span>
              {isClient && <span className="text-[10px] font-normal text-amber-600 ml-1.5 px-1.5 py-0.5 bg-amber-100 rounded">CLIENT</span>}
            </h1>
            <p className="text-[11px] text-ink-500 leading-tight">
              {isClient ? t('header.clientMode') : t('header.tagline')}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-400 font-mono">v0.12</span>

          {/* Owner-only: Invite client button */}
          {!isClient && current && (
            <button
              onClick={() => setShowInviteModal(true)}
              disabled={isStreaming}
              className="text-xs px-3 py-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-700 font-medium transition disabled:opacity-50"
              title={t('header.inviteClient')}
            >
              {t('header.inviteClient')}
            </button>
          )}

          {/* Owner-only: New project button */}
          {!isClient && current && (
            <button
              onClick={handleNewProject}
              disabled={isStreaming}
              className="text-xs px-3 py-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-700 font-medium transition disabled:opacity-50"
            >
              {t('header.newProject')}
            </button>
          )}
          <div className="w-px h-6 bg-ink-200 mx-1"></div>
          <LanguageToggle />
          <UserMenu
            user={user}
            onSignOut={onSignOut}
            onShowBilling={isClient ? null : () => setView('billing')}
            hideBilling={isClient}
            isAdmin={isAdmin}
          />
        </div>
      </header>

      {/* ─── Main view ─────────────────────────── */}
      {view === 'billing' && !isClient ? (
        <BillingPage onBack={() => setView('main')} showToast={showToast} />
      ) : (
      <div className="flex-1 flex overflow-hidden">
        {/* Owner sidebar — full controls */}
        {!isClient && (
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
        )}

        {/* Client sidebar — minimal, guidance only */}
        {isClient && current && (
          <aside className="w-[280px] border-r border-ink-200 bg-white flex flex-col p-5">
            <div className="text-xs uppercase tracking-wide text-ink-500 font-semibold mb-2">
              {t('clientSidebar.youAreEditing')}
            </div>
            <h2 className="font-bold text-ink-900 mb-1">{current.name}</h2>
            <p className="text-xs text-ink-500 mb-4">{current.site_name || ''}</p>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 mb-3">
              <div className="font-semibold mb-1">{t('clientSidebar.guideTitle')}</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>{t('clientSidebar.guideStep1')} <strong>"{t('preview.editText')}"</strong> {t('clientSidebar.guideStep1End')}</li>
                <li>{t('clientSidebar.guideStep2')}</li>
                <li>{t('clientSidebar.guideStep3')} <strong>"{t('preview.save')}"</strong> {t('clientSidebar.guideStep3End')}</li>
              </ol>
            </div>

            <div className="p-3 rounded-lg bg-ink-50 border border-ink-200 text-xs text-ink-600">
              <div className="font-semibold mb-1 text-ink-700">{t('clientSidebar.permsTitle')}</div>
              <ul className="space-y-0.5">
                <li>{t('clientSidebar.perm1')}</li>
                <li>{t('clientSidebar.perm2')}</li>
                <li>{t('clientSidebar.perm3')}</li>
                <li>{t('clientSidebar.perm4')}</li>
              </ul>
            </div>

            <div className="mt-auto pt-4 text-[10px] text-ink-400 text-center">
              {t('clientSidebar.contactOwner')}
            </div>
          </aside>
        )}

        <main className="flex-1 bg-ink-100 flex flex-col overflow-hidden">
          <Preview
            current={current}
            streamText={streamText}
            isStreaming={isStreaming}
            streamMode={streamMode}
            onPublish={isClient ? null : handlePublish}
            onUnpublish={isClient ? null : handleUnpublish}
            publishLoading={publishLoading}
            onTemplateCloned={isClient ? null : handleTemplateCloned}
            showToast={showToast}
            onProjectUpdate={() => current?.id && handleSelectProject(current.id)}
            isClient={isClient}
            autoOpenLeads={autoOpenLeads}
            onLeadsOpened={() => setAutoOpenLeads(false)}
          />
        </main>
      </div>
      )}

      {showInviteModal && current && (
        <InviteClientModal
          project={current}
          onClose={() => setShowInviteModal(false)}
          showToast={showToast}
          onUpdate={() => current?.id && handleSelectProject(current.id)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
