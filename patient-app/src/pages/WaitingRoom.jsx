import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { CheckCircle, Clock, AlertCircle, RotateCcw, Stethoscope, ShieldCheck, X, Loader } from 'lucide-react'
import { getSessionStatus, cancelSession } from '../services/sessionService.js'
import { clearQueue } from '../services/syncQueue.js'
import { useOnlineStatus } from '../hooks/useOnlineStatus.js'
import ConnectionBanner from '../components/ConnectionBanner.jsx'
import { ERR } from '../services/errors.js'

const POLL_INTERVAL_MS = 4000
const MAX_POLLS = 75 // ~5 min ceiling

const STATUS_CONFIG = {
  waiting:    { icon: 'clock',  label: 'Waiting for your doctor',        sub: 'Your symptoms have been received. Please wait nearby.' },
  processing: { icon: 'spin',   label: 'Processing your symptoms',       sub: 'Our system is preparing your intake for the doctor.' },
  active:     { icon: 'clock',  label: 'Doctor is reviewing your intake', sub: 'Your doctor has been notified and will see you shortly.' },
  completed:  { icon: 'done',   label: 'Consultation complete',          sub: null },
  cancelled:  { icon: 'warn',   label: 'Session was cancelled',          sub: 'Please scan the QR code again to start a new session.' },
  expired:    { icon: 'warn',   label: 'Session not found',              sub: ERR.SESSION_EXPIRED },
  timeout:    { icon: 'warn',   label: 'Status check timed out',         sub: 'We could not confirm your status. Please ask clinic staff for assistance.' },
}

function clearPatientData() {
  clearQueue()
  // Audio blobs live only in React state — garbage-collected on unmount.
  // We never write patient data to localStorage/sessionStorage.
}

export default function WaitingRoom() {
  const { sessionId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { online } = useOnlineStatus()

  const doctorName = state?.doctorName ?? ''
  const doctorCode = state?.doctorCode ?? ''

  const [status, setStatus] = useState('waiting')
  const [pollError, setPollError] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const pollCount = useRef(0)
  const timerRef = useRef(null)
  const pausedRef = useRef(false)

  const poll = useCallback(async () => {
    if (pausedRef.current) return
    if (pollCount.current >= MAX_POLLS) {
      setStatus('timeout')
      clearPatientData()
      return
    }
    pollCount.current += 1
    try {
      const data = await getSessionStatus(sessionId)
      setPollError(false)
      setStatus(data.status)
      if (data.status === 'completed' || data.status === 'cancelled') {
        clearPatientData()
        return
      }
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    } catch (err) {
      if (err?.status === 404) {
        setStatus('expired')
        clearPatientData()
        return
      }
      setPollError(true)
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionId) { navigate('/'); return }
    poll()
    return () => clearTimeout(timerRef.current)
  }, [sessionId, poll]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pause polling when offline, resume when back online
  useEffect(() => {
    if (!online) {
      pausedRef.current = true
      clearTimeout(timerRef.current)
    } else if (pausedRef.current) {
      pausedRef.current = false
      poll()
    }
  }, [online, poll]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCancel() {
    setCancelling(true)
    clearTimeout(timerRef.current)
    try {
      await cancelSession(sessionId)
    } catch { /* best-effort */ }
    clearPatientData()
    setStatus('cancelled')
    setCancelling(false)
  }

  function handleStartNew() {
    clearPatientData()
    navigate('/', { replace: true })
  }

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting
  const isTerminal = ['completed', 'cancelled', 'expired', 'timeout'].includes(status)
  const isCompleted = status === 'completed'

  // ── Completion screen ──────────────────────────────────────────
  if (isCompleted) {
    return (
      <div style={s.screen}>
        <div style={s.topBar}>
          <Stethoscope size={18} color="var(--accent)" />
          <span style={s.brandName}>VaaniDoc</span>
        </div>

        <div style={s.body}>
          <div style={{ ...s.iconWrap, borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)' }}>
            <CheckCircle size={48} color="#16a34a" />
          </div>

          <h2 style={s.statusLabel}>Consultation complete</h2>
          <p style={s.statusSub}>Thank you. Your session has ended.</p>

          {doctorName && (
            <p style={{ ...s.statusSub, fontWeight: 500, color: 'var(--text-h)' }}>
              You were seen by {doctorName}.
            </p>
          )}

          <div style={s.privacyBox}>
            <ShieldCheck size={16} color="#16a34a" />
            <p style={s.privacyText}>
              Your symptom information has been deleted from this device and our temporary records, as required.
            </p>
          </div>

          <button style={s.newBtn} onClick={handleStartNew}>
            <RotateCcw size={15} /> Start New Session
          </button>
        </div>

        <p style={s.footer}>VaaniDoc is a health intake assistant. It does not provide diagnoses.</p>
      </div>
    )
  }

  // ── Waiting / processing / error screens ──────────────────────
  return (
    <div style={s.screen}>
      <div style={s.topBar}>
        <Stethoscope size={18} color="var(--accent)" />
        <span style={s.brandName}>VaaniDoc</span>
      </div>
      <ConnectionBanner />

      <div style={s.body}>
        <div style={s.iconWrap}>
          {cfg.icon === 'done'  && <CheckCircle size={48} color="var(--accent)" />}
          {cfg.icon === 'warn'  && <AlertCircle size={48} color="#f59e0b" />}
          {cfg.icon === 'spin'  && (
            <Loader size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
          )}
          {cfg.icon === 'clock' && (
            <div style={s.spinnerWrap}>
              <Clock size={26} color="var(--accent)" />
              <div style={s.spinnerRing} />
            </div>
          )}
        </div>

        <h2 style={s.statusLabel}>{cfg.label}</h2>
        {cfg.sub && <p style={s.statusSub}>{cfg.sub}</p>}

        {/* Doctor info — shown while waiting */}
        {(doctorName || doctorCode) && !isTerminal && (
          <div style={s.infoBox}>
            {doctorName && <p style={s.infoName}>{doctorName}</p>}
            {doctorCode && <p style={s.infoCode}>{doctorCode}</p>}
          </div>
        )}

        {/* Connection / poll error */}
        {pollError && !isTerminal && (
          <div style={s.warnBox}>
            <AlertCircle size={13} color="#f59e0b" />
            <span>{online ? 'Connection issue — retrying…' : 'Waiting for connection…'}</span>
          </div>
        )}

        {/* Animated dots while waiting */}
        {!isTerminal && (
          <div style={s.dots}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ ...s.dot, animationDelay: `${i * 0.3}s` }} />
            ))}
          </div>
        )}

        {/* Cancel — only while non-terminal */}
        {!isTerminal && (
          <button
            style={s.cancelBtn}
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Cancelling…</>
              : <><X size={14} /> Cancel Session</>
            }
          </button>
        )}

        {/* Terminal action */}
        {isTerminal && (
          <button style={s.newBtn} onClick={handleStartNew}>
            <RotateCcw size={15} /> Start New Session
          </button>
        )}
      </div>

      <p style={s.footer}>VaaniDoc is a health intake assistant. It does not provide diagnoses.</p>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1);   }
        }
      `}</style>
    </div>
  )
}

const s = {
  screen: { minHeight: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 16px', borderBottom: '1px solid var(--border)',
  },
  brandName: { fontSize: 16, fontWeight: 700, color: 'var(--text-h)' },
  body: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 16, padding: '32px 24px',
    maxWidth: 400, width: '100%', margin: '0 auto', boxSizing: 'border-box',
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: '50%',
    background: 'var(--accent-bg)', border: '1.5px solid var(--accent-border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  spinnerWrap: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinnerRing: {
    position: 'absolute', width: 54, height: 54,
    border: '3px solid var(--accent-border)', borderTop: '3px solid var(--accent)',
    borderRadius: '50%', animation: 'spin 1.2s linear infinite',
  },
  statusLabel: { margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-h)', textAlign: 'center' },
  statusSub: { margin: 0, fontSize: 14, color: 'var(--text)', textAlign: 'center', maxWidth: 300 },
  infoBox: {
    padding: '12px 20px', borderRadius: 12,
    border: '1px solid var(--accent-border)', background: 'var(--accent-bg)', textAlign: 'center',
  },
  infoName: { margin: '0 0 2px', fontSize: 15, fontWeight: 600, color: 'var(--text-h)' },
  infoCode: { margin: 0, fontSize: 12, color: 'var(--text)', fontFamily: 'monospace' },
  warnBox: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
    fontSize: 13, color: '#92400e',
  },
  dots: { display: 'flex', gap: 8, marginTop: 4 },
  dot: {
    width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
    animation: 'dotPulse 1.4s ease-in-out infinite',
  },
  cancelBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', borderRadius: 8, marginTop: 8,
    border: '1px solid var(--border)', background: 'transparent',
    color: 'var(--text)', fontSize: 13, cursor: 'pointer',
  },
  privacyBox: {
    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px',
    borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
    maxWidth: 320,
  },
  privacyText: { margin: 0, fontSize: 13, color: '#166534', lineHeight: 1.5 },
  newBtn: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
    borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-h)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
  },
  footer: {
    fontSize: 12, color: 'var(--text)', textAlign: 'center',
    padding: '12px 16px', margin: 0, borderTop: '1px solid var(--border)',
  },
}
