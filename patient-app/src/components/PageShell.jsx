import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity } from 'lucide-react'
import ConnectionBanner from './ConnectionBanner.jsx'

export default function PageShell({ backTo = '/', title, children }) {
  const navigate = useNavigate()
  return (
    <div style={s.screen}>
      {/* Navy header */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(backTo)} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div style={s.brand}>
          <div style={s.logoMark}><Activity size={16} color="#fff" strokeWidth={2.5} /></div>
          <div>
            <div style={s.brandName}>VaaniDoc</div>
            <div style={s.brandSub}>Multilingual AI Health Intake</div>
          </div>
        </div>
        <div style={{ width: 40 }} />
      </header>

      <ConnectionBanner />

      {/* Page title strip */}
      {title && (
        <div style={s.titleStrip}>
          <span style={s.titleText}>{title}</span>
        </div>
      )}

      <div style={s.content}>{children}</div>

      <footer style={s.footer}>
        <Activity size={12} color="var(--teal)" />
        Your information is used only during this consultation session.
      </footer>
    </div>
  )
}

const s = {
  screen: {
    minHeight: '100svh', display: 'flex', flexDirection: 'column',
    background: 'var(--page-bg)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'var(--navy)',
  },
  backBtn: {
    width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 'var(--r-sm)', cursor: 'pointer', color: '#fff', flexShrink: 0,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 34, height: 34, borderRadius: 'var(--r-sm)',
    background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  brandName: { fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.2 },
  brandSub:  { fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 },
  titleStrip: {
    background: 'var(--card-bg)', borderBottom: '1px solid var(--border)',
    padding: '10px 16px',
  },
  titleText: { fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  content: {
    flex: 1, display: 'flex', flexDirection: 'column',
    padding: '16px', maxWidth: 520, width: '100%',
    margin: '0 auto', gap: 14, boxSizing: 'border-box',
  },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
    padding: '12px 16px', borderTop: '1px solid var(--border)',
    background: 'var(--card-bg)',
  },
}
