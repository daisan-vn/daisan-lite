// ========================================================================
//  Preview v0.9 — Multi-page + Publish + Templates + Inline Edit
// ========================================================================

import { useState, useEffect, useRef } from 'react'
import TemplatesGrid from './TemplatesGrid'
import DomainSettings from './DomainSettings'
import { apiPost } from '../lib/api'

export default function Preview({
  current, streamText, isStreaming, streamMode,
  onPublish, onUnpublish, publishLoading,
  onTemplateCloned, showToast, onProjectUpdate
}) {
  const [mode, setMode] = useState('preview')
  const [viewport, setViewport] = useState('desktop')
  const [currentPath, setCurrentPath] = useState('index.html')
  const [publishOpen, setPublishOpen] = useState(false)
  const [showDomain, setShowDomain] = useState(false)
  // v0.9: Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [editDirty, setEditDirty] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const iframeRef = useRef(null)
  const codeRef = useRef(null)
  const publishRef = useRef(null)

  useEffect(() => { if (isStreaming) setMode('code') }, [isStreaming])
  useEffect(() => {
    if (!isStreaming && current?.pages && streamText === '') {
      setMode('preview')
      if (!Object.keys(current.pages).includes(currentPath)) {
        setCurrentPath('index.html')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, current?.id])

  useEffect(() => {
    if (codeRef.current && isStreaming) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight
    }
  }, [streamText, isStreaming])

  // Exit edit mode khi doi project / page / streaming
  useEffect(() => {
    if (editMode) {
      setEditMode(false)
      setEditDirty(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, currentPath, isStreaming])

  useEffect(() => {
    function handleMessage(e) {
      const d = e.data || {}
      if (d.type === 'daisan:navigate') {
        const path = d.path
        if (current?.pages?.[path]) setCurrentPath(path)
      }
      // v0.9 edit mode events
      if (d.type === 'daisan:editModeReady') {
        showToast?.(`✏️ Edit mode bat: ${d.editableCount} text co the sua`, 'info')
      }
      if (d.type === 'daisan:dirty') {
        setEditDirty(true)
      }
      if (d.type === 'daisan:cleanHtml') {
        saveCleanHtmlToServer(d.html)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, currentPath])

  // v0.9: Toggle edit mode → send message to iframe
  function toggleEditMode() {
    if (!iframeRef.current?.contentWindow) return
    const next = !editMode
    iframeRef.current.contentWindow.postMessage({
      type: 'daisan:setEditMode',
      enabled: next
    }, '*')
    setEditMode(next)
    if (!next) setEditDirty(false)
  }

  // v0.9: User click "Save edits" → request HTML from iframe
  function saveEdits() {
    if (!iframeRef.current?.contentWindow) return
    setEditSaving(true)
    iframeRef.current.contentWindow.postMessage({
      type: 'daisan:requestCleanHtml'
    }, '*')
    // Iframe se reply voi 'daisan:cleanHtml' → handled in message listener
  }

  // v0.9: Cancel edits → reload iframe (discard changes)
  function cancelEdits() {
    if (!confirm('Huy thay doi? Cac sua doi se mat.')) return
    setEditMode(false)
    setEditDirty(false)
    // Reload iframe by forcing re-render
    if (iframeRef.current) {
      const src = iframeRef.current.srcdoc
      iframeRef.current.srcdoc = ''
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.srcdoc = src
      }, 10)
    }
  }

  async function saveCleanHtmlToServer(html) {
    try {
      await apiPost(`/api/projects/${current.id}/save-edits`, {
        filename: currentPath,
        html
      })
      showToast?.('✓ Da luu thay doi', 'success')
      setEditMode(false)
      setEditDirty(false)
      onProjectUpdate?.()
    } catch (err) {
      showToast?.('Loi luu: ' + err.message, 'error')
    } finally {
      setEditSaving(false)
    }
  }

  // Close publish popover khi click ngoai
  useEffect(() => {
    function handleClickOutside(e) {
      if (publishRef.current && !publishRef.current.contains(e.target)) {
        setPublishOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─── Empty state → TemplatesGrid ─────────────────────────────────────
  if (!current && !isStreaming) {
    return (
      <TemplatesGrid
        onCloned={onTemplateCloned}
        showToast={showToast}
      />
    )
  }

  const pages = current?.pages || {}
  const pagePaths = Object.keys(pages)
  const currentHtml = isStreaming ? streamText : (pages[currentPath] || '')
  const viewportWidth = { desktop: '100%', tablet: '768px', mobile: '375px' }[viewport]
  const publishedUrl = current?.slug
    ? `${window.location.origin}/site/${current.slug}/`
    : null
  const isPublished = current?.is_published

  function downloadCurrentPage() {
    const html = pages[currentPath]
    if (!html) return
    const cleanHtml = html.replace(/<script>\s*\(function\(\)[\s\S]*?\}\)\(\);?\s*<\/script>/g, '')
    const blob = new Blob([cleanHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = currentPath
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function openCurrentPageInNewTab() {
    const html = pages[currentPath]
    if (!html) return
    const cleanHtml = html.replace(/<script>\s*\(function\(\)[\s\S]*?\}\)\(\);?\s*<\/script>/g, '')
    const blob = new Blob([cleanHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  function getPageDisplayName(path) {
    if (current?.navigation) {
      const nav = current.navigation.find(n => n.path === path)
      if (nav) return nav.name
    }
    return path.replace('.html', '')
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
  }

  async function handlePublishClick() {
    if (isPublished) {
      setPublishOpen(v => !v)
    } else {
      // Publish lan dau
      await onPublish?.(current.id)
      setPublishOpen(true)   // mo popover ngay sau khi publish
    }
  }

  return (
    <>
      {/* ─── Toolbar ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-ink-200 px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0">

        <div className="flex gap-0.5 p-0.5 bg-ink-100 rounded-lg">
          <button onClick={() => setMode('preview')} disabled={isStreaming}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              mode === 'preview' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
            } disabled:opacity-40`}>Xem truoc</button>
          <button onClick={() => setMode('code')}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              mode === 'code' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
            }`}>Ma nguon</button>
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isStreaming ? (
            <div className="flex items-center gap-2 text-xs text-brand-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
              {streamMode === 'iterate' ? 'AI dang sua...' : 'AI dang tao multi-page...'}
            </div>
          ) : current?.site_name ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-ink-700 truncate">{current.site_name}</span>
              <span className="text-[10px] text-ink-400 px-1.5 py-0.5 rounded bg-ink-100 font-mono flex-shrink-0">
                {pagePaths.length} trang
              </span>
              {isPublished && (
                <span className="text-[10px] text-green-700 px-1.5 py-0.5 rounded bg-green-100 font-medium flex-shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Live
                </span>
              )}
            </div>
          ) : null}
        </div>

        {mode === 'preview' && !isStreaming && (
          <div className="flex gap-0.5 p-0.5 bg-ink-100 rounded-lg">
            {[['desktop','Desktop'],['tablet','Tablet'],['mobile','Mobile']].map(([k,l]) => (
              <button key={k} onClick={() => setViewport(k)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition ${
                  viewport === k ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
                }`}>{l}</button>
            ))}
          </div>
        )}

        {current && !isStreaming && (
          <div className="flex gap-1 items-center">
            {/* v0.9: Edit toggle */}
            {!editMode ? (
              <button onClick={toggleEditMode} title="Sua text truc tiep (mien phi)"
                className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg text-ink-700 hover:bg-brand-50 hover:text-brand-700 transition flex items-center gap-1.5 border border-ink-200">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Sua text
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1 px-2 py-1 bg-brand-50 border border-brand-300 rounded-lg text-[11px] text-brand-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                  Edit mode {editDirty && '(co thay doi)'}
                </div>
                <button onClick={saveEdits} disabled={editSaving || !editDirty}
                  className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:bg-ink-300 transition shadow-soft">
                  {editSaving ? 'Dang luu...' : '✓ Luu'}
                </button>
                <button onClick={cancelEdits} disabled={editSaving}
                  className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg text-red-600 hover:bg-red-50 transition">
                  Huy
                </button>
              </>
            )}

            <button onClick={openCurrentPageInNewTab} title="Mo trong tab moi" disabled={editMode}
              className="px-2 py-1.5 text-[11px] font-medium rounded-lg text-ink-600 hover:bg-ink-100 transition flex items-center gap-1.5 disabled:opacity-40">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Mo
            </button>
            <button onClick={downloadCurrentPage} title={`Tai ${currentPath}`} disabled={editMode}
              className="px-2 py-1.5 text-[11px] font-medium rounded-lg text-ink-600 hover:bg-ink-100 transition flex items-center gap-1.5 disabled:opacity-40">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Tai
            </button>

            {/* ─── PUBLISH BUTTON / POPOVER ───────────────────────────── */}
            <div className="relative" ref={publishRef}>
              <button
                onClick={handlePublishClick}
                disabled={publishLoading || editMode}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition flex items-center gap-1.5 shadow-soft ${
                  isPublished
                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    : 'bg-brand-500 text-white hover:bg-brand-600'
                } disabled:opacity-60 disabled:cursor-wait`}
              >
                {publishLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin"></span>
                    Publishing...
                  </>
                ) : isPublished ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Live
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="19" x2="12" y2="5"/>
                      <polyline points="5 12 12 5 19 12"/>
                    </svg>
                    Publish
                  </>
                )}
              </button>

              {/* Popover khi published */}
              {publishOpen && isPublished && publishedUrl && (
                <div className="absolute right-0 top-full mt-1.5 w-80 bg-white border border-ink-200 rounded-xl shadow-card overflow-hidden z-50">
                  <div className="px-3 py-2.5 border-b border-ink-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-semibold text-ink-900">Website dang live</span>
                  </div>

                  <div className="p-3 space-y-2.5">
                    <div>
                      <label className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">URL chia se</label>
                      <div className="mt-1 flex items-center gap-1 px-2 py-1.5 bg-ink-50 border border-ink-200 rounded-lg">
                        <code className="text-[11px] text-ink-700 flex-1 truncate font-mono">{publishedUrl}</code>
                        <button
                          onClick={() => { copyToClipboard(publishedUrl); setPublishOpen(false) }}
                          className="px-2 py-0.5 text-[10px] font-medium rounded bg-white border border-ink-200 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {current.view_count > 0 && (
                      <div className="text-[11px] text-ink-500">
                        👁  <strong className="text-ink-700">{current.view_count}</strong> lugot xem
                      </div>
                    )}

                    <a
                      href={publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition"
                    >
                      🌐  Mo website live
                    </a>
                  </div>

                  {/* v0.8: Custom domain section */}
                  <div className="border-t border-ink-100 p-3">
                    {current.custom_domain && current.custom_domain_verified ? (
                      <div className="space-y-2">
                        <div className="text-[10px] font-semibold text-green-700 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Custom domain active
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                          <code className="text-[11px] text-green-900 flex-1 truncate font-mono">
                            https://{current.custom_domain}
                          </code>
                          <button
                            onClick={() => { setPublishOpen(false); setShowDomain(true) }}
                            className="text-[10px] text-brand-600 hover:text-brand-700 font-semibold"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    ) : current.custom_domain ? (
                      <button
                        onClick={() => { setPublishOpen(false); setShowDomain(true) }}
                        className="w-full text-left text-[11px] text-amber-700 hover:bg-amber-50 px-2 py-1.5 rounded transition flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {current.custom_domain} — chua verify
                      </button>
                    ) : (
                      <button
                        onClick={() => { setPublishOpen(false); setShowDomain(true) }}
                        className="w-full text-left text-[11px] text-ink-600 hover:bg-ink-50 px-2 py-1.5 rounded transition flex items-center gap-1.5"
                      >
                        🌍  Gan custom domain (Pro+)
                      </button>
                    )}
                  </div>

                  <div className="border-t border-ink-100 px-3 py-2">
                    <button
                      onClick={() => { onUnpublish?.(current.id); setPublishOpen(false) }}
                      className="w-full text-left text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded transition"
                    >
                      ⊘  Unpublish (an website)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Page tabs ───────────────────────────────────────────────── */}
      {pagePaths.length > 0 && !isStreaming && (
        <div className="bg-ink-50 border-b border-ink-200 px-3 py-1.5 flex items-center gap-1 overflow-x-auto flex-shrink-0">
          {pagePaths.map(path => {
            const isActive = path === currentPath
            const isHome = path === 'index.html'
            return (
              <button key={path} onClick={() => setCurrentPath(path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-ink-900 shadow-soft border border-ink-200'
                    : 'text-ink-500 hover:text-ink-700 hover:bg-white/50'
                }`}>
                {isHome ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                )}
                <span>{getPageDisplayName(path)}</span>
                <span className="text-[9px] text-ink-400 font-mono">{path}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {mode === 'preview' ? (
          <div className="h-full bg-ink-100 flex items-center justify-center p-4 overflow-auto">
            <iframe
              ref={iframeRef}
              key={currentPath + (current?.id || '')}
              srcDoc={currentHtml || '<div style="padding:2rem;font-family:sans-serif;color:#717a90;text-align:center">Dang tai...</div>'}
              title={`Preview: ${currentPath}`}
              sandbox="allow-scripts allow-same-origin allow-forms"
              className="bg-white shadow-card rounded-lg transition-all duration-300"
              style={{
                width: viewportWidth, height: '100%', maxWidth: '100%',
                border: viewport !== 'desktop' ? '1px solid #dde1ea' : 'none'
              }}
            />
          </div>
        ) : (
          <div ref={codeRef} className="h-full overflow-auto code-pane">
            <pre className="p-4 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
              <code className={isStreaming ? 'streaming-caret' : ''}>
                {currentHtml || (isStreaming ? '' : '<!-- Khong co code -->')}
              </code>
            </pre>
          </div>
        )}
      </div>

      {/* v0.8: Domain settings modal */}
      {showDomain && current && (
        <DomainSettings
          project={current}
          onClose={() => setShowDomain(false)}
          onUpdated={() => onProjectUpdate?.()}
          showToast={showToast}
        />
      )}
    </>
  )
}
