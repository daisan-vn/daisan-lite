// Toast — thong bao goc duoi man hinh
export default function Toast({ message, type = 'info' }) {
  const styles = {
    success: 'bg-green-600 text-white',
    error:   'bg-red-600 text-white',
    info:    'bg-ink-900 text-white'
  }
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 toast">
      <div className={`px-4 py-2.5 rounded-lg shadow-card text-sm font-medium ${styles[type] || styles.info}`}>
        {message}
      </div>
    </div>
  )
}
