import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QrCode, ArrowRight, Activity, Loader, ShieldCheck } from 'lucide-react'
import { validateCodeFormat, lookupDoctor } from '../services/doctorService.js'
import ConnectionBanner from '../components/ConnectionBanner.jsx'

export default function JoinDoctor() {
  const { doctorCode: paramCode } = useParams()
  const [code, setCode] = useState(paramCode ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleContinue(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setError('Please enter a doctor code.'); return }
    if (!validateCodeFormat(trimmed)) {
      setError('Invalid format. Expected: VAN-XXXXXX  (e.g. VAN-ABC123)')
      return
    }
    setLoading(true); setError('')
    try {
      await lookupDoctor(trimmed)
      navigate(`/confirm/${trimmed}`)
    } catch {
      setError('Doctor not found. Please check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.screen}>
      {/* Navy header */}
      <header style={s.header}>
        <div style={s.logoMark}><Activity size={18} color="#fff" strokeWidth={2.5} /></div>
        <div>
          <div style={s.headerTitle}>VaaniDoc</div>
          <div style={s.headerSub}>Multilingual AI Health Intake</div>
        </div>
      </header>

      <ConnectionBanner />

      <div style={s.body}>
        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroIcon}><Activity size={32} color="var(--teal)" strokeWidth={2} /></div>
          <h1 style={s.heroTitle}>Welcome to VaaniDoc</h1>
          <p style={s.heroSub}>Connect with your doctor and share your symptoms in your preferred language.</p>
        </div>

        {/* Card */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Connect to your Doctor</h2>

          {/* QR button */}
          <button type="button" style={s.qrBtn} onClick={() => navigate('/scan')}>
            <div style={s.qrBtnIcon}><QrCode size={22} color="var(--teal)" /></div>
            <div>
              <div style={s.qrBtnLabel}>Scan Doctor QR Code</div>
              <div style={s.qrBtnSub}>Use your camera to scan</div>
            </div>
            <ArrowRight size={16} color="var(--teal)" style={{ marginLeft: 'auto' }} />
          </button>

          <div style={s.divider}><span style={s.dividerText}>OR</span></div>

          {/* Code form */}
          <form onSubmit={handleContinue} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={s.label}>Enter Doctor Code</label>
            <input
              style={{ ...s.input, ...(error ? { borderColor: 'var(--red)', background: 'var(--red-light)' } : {}) }}
              type="text"
              placeholder="VAN-ABC123"
              value={code}
              onChange={e => { setCode(e.target.value); setError('') }}
              autoCapitalize="characters"
              spellCheck={false}
            />
            {error && (
              <div style={s.errorBox}>
                <span>{error}</span>
              </div>
            )}
            <button type="submit" style={{ ...s.continueBtn, opacity: loading ? 0.75 : 1 }} disabled={loading}>
              {loading
                ? <><Loader size={17} style={{ animation: 'spin 0.8s linear infinite' }} /> Checking…</>
                : <>Continue <ArrowRight size={17} /></>
              }
            </button>
          </form>
        </div>

        {/* Privacy note */}
        <div style={s.privacyNote}>
          <ShieldCheck size={14} color="var(--teal)" />
          <span>Your information is used only during this consultation session.</span>
        </div>
      </div>

      <footer style={s.footer}>VaaniDoc is a health intake assistant. It does not provide diagnoses.</footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const s = {
  screen: { minHeight: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)' },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 20px', background: 'var(--navy)',
  },
  logoMark: {
    width: 40, height: 40, borderRadius: 10, background: 'var(--teal)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerTitle: { fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.2 },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 },
  body: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '24px 16px', gap: 20, maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box',
  },
  hero: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  heroIcon: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'var(--teal-light)', border: '2px solid var(--teal-border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.3px' },
  heroSub:   { margin: 0, fontSize: 15, color: 'var(--text)', maxWidth: 320, lineHeight: 1.6 },
  card: {
    width: '100%', background: 'var(--card-bg)', borderRadius: 'var(--r-xl)',
    padding: '24px 20px', boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16,
  },
  cardTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-h)', textAlign: 'center' },
  qrBtn: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
    borderRadius: 'var(--r-md)', border: '1.5px solid var(--teal-border)',
    background: 'var(--teal-light)', cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  qrBtnIcon: {
    width: 44, height: 44, borderRadius: 'var(--r-sm)', background: '#fff',
    border: '1px solid var(--teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  qrBtnLabel: { fontSize: 15, fontWeight: 600, color: 'var(--teal-dark)', lineHeight: 1.3 },
  qrBtnSub:   { fontSize: 12, color: 'var(--text-muted)', marginTop: 1 },
  divider: { display: 'flex', alignItems: 'center', gap: 12 },
  dividerText: {
    flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600,
    color: 'var(--text-muted)', position: 'relative',
    borderTop: '1px solid var(--border)', paddingTop: 8,
  },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 },
  input: {
    width: '100%', padding: '13px 14px', borderRadius: 'var(--r-md)',
    border: '1.5px solid var(--border)', background: 'var(--card-bg)',
    color: 'var(--text-h)', fontSize: 16, outline: 'none',
    fontFamily: 'monospace', letterSpacing: '0.05em',
    transition: 'border-color 0.15s',
  },
  errorBox: {
    padding: '9px 12px', borderRadius: 'var(--r-sm)',
    background: 'var(--red-light)', border: '1px solid var(--red-border)',
    fontSize: 13, color: 'var(--red)',
  },
  continueBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '14px', borderRadius: 'var(--r-md)', border: 'none',
    background: 'var(--blue)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
  },
  privacyNote: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: 'var(--text-muted)',
  },
  footer: {
    fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
    padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--card-bg)',
  },
}
