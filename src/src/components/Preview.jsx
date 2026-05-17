// Preview v0.2 — streaming view, download, open in new tab
import { useState, useEffect, useRef } from 'react'

export default function Preview({ current, streamText, isStreaming, streamMode }) {
  const [mode, setMode] = useState('preview')  // 'preview' | 'code'
  const [viewport, setViewport] = useState('desktop')  // 'desktop' | 'tablet' | 'mobile'
  const codeRef = useRef(null)

  // Khi bat dau streaming, tu dong sang code view (de thay AI dang go)
  useEffect(() => {
    if (isStreaming) setMode('code')
  }, [isStreaming])

  // Khi xong streaming, tu dong sang preview
  useEffect(() => {
    if (!isStreaming && current?.html && streamText === '') {
      setMode('preview')
    }
  }, [isStreaming, current?.html, streamText])

  // Auto scroll code view xuong duoi khi co chunk moi
  useEffect(() => {
    if (codeRef.current && isStreaming) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight
    }
  }, [streamText, isStreaming])

  // Empty state
  if (!current && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-400">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">✨</div>
          <p className="text-lg font-semibold text-ink-700">San sang sang tao</p>
          <p className="text-sm mt-2 text-ink-500">
            Mo ta trang web ban can o ben trai. AI Claude se sinh code HTML va hien thi o day.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] text-ink-400">
            <div className="p-2 rounded-lg bg-white border border-ink-200">
              <div className="text-base mb-1">🇻🇳</div>
              Tieng Viet
            </div>
            <div className="p-2 rounded-lg bg-white border border-ink-200">
              <div className="text-base mb-1">⚡</div>
              Streaming
            </div>
            <div className="p-2 rounded-lg bg-white border border-ink-200">
              <div className="text-base mb-1">💬</div>
              Iterate
            </div>
          </div>
        </div>
      </div>
    )
  }

  const html = isStreaming ? streamText : (current?.html || '')

  // Strip code fences khi dang streaming (de preview khong bi vo)
  const cleanHtml = html.replace(/^[`~]{3,}\s*[a-zA-Z]*\s*\n?/, '').replace(/\n?[`~]{3,}\s*$/, '')

  const viewportWidth = {
    desktop: '100%',
    tablet:  '768px',
    mobile:  '375px'
  }[viewport]

  function downloadHtml() {
    if (!current?.html) return
    const blob = new Blob([current.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(current.name || 'daisan').slice(0, 40).replace(/[^a-zA-Z0-9-]/g, '_')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function openInNewTab() {
    if (!current?.html) return
    const blob = new Blob([current.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="bg-white border-b border-ink-200 px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0">

        {/* Tab toggle */}
        <div className="flex gap-0.5 p-0.5 bg-ink-100 rounded-lg">
          <button
            onClick={() => setMode('preview')}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              mode === 'preview' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Xem truoc
          </button>
          <button
            onClick={() => setMode('code')}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              mode === 'code' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Ma nguon
          </button>
        </div>

        {/* Status / Name */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isStreaming ? (
            <div className="flex items-center gap-2 text-xs text-brand-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
              {streamMode === 'iterate' ? 'AI dang sua...' : 'AI dang tao...'}
            </div>
          ) : (
            <div className="text-xs text-ink-500 truncate font-medium">
              {current?.name}
            </div>
          )}
        </div>

        {/* Viewport switcher (chi hien khi preview mode) */}
        {mode === 'preview' && !isStreaming && (
          <div className="flex gap-0.5 p-0.5 bg-ink-100 rounded-lg">
            {[
              ['desktop', 'Desktop'],
              ['tablet',  'Tablet'],
              ['mobile',  'Mobile']
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setViewport(key)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition ${
                  viewport === key ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {current && !isStreaming && (
          <div className="flex gap-1">
            <button
              onClick={openInNewTab}
              title="Mo trong tab moi"
              className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg text-ink-600 hover:bg-ink-100 transition flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Mo
            </button>
            <button
              onClick={downloadHtml}
              title="Tai file HTML"
              className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg text-ink-600 hover:bg-ink-100 transition flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Tai ve
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'preview' ? (
          <div className="h-full bg-ink-100 flex items-center justify-center p-4 overflow-auto">
            <iframe
              srcDoc={cleanHtml || '<div style="padding:2rem;font-family:sans-serif;color:#717a90;text-align:center">Dang tai...</div>'}
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
              className="bg-white shadow-card rounded-lg transition-all duration-300"
              style={{
                width: viewportWidth,
                height: '100%',
                maxWidth: '100%',
                border: viewport !== 'desktop' ? '1px solid #dde1ea' : 'none'
              }}
            />
          </div>
        ) : (
          <div ref={codeRef} className="h-full overflow-auto code-pane">
            <pre className="p-4 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
              <code className={isStreaming ? 'streaming-caret' : ''}>
                {cleanHtml || (isStreaming ? '' : '<!-- Khong co code -->')}
              </code>
            </pre>
          </div>
        )}
      </div>
    </>
  )
}
