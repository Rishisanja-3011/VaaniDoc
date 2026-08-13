import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, WifiOff } from 'lucide-react'
import { getPatientSessionStatus, cancelSession, clearPatientSession } from '../services/sessionService.js'
import PageShell from '../components/PageShell.jsx'

const TERMINAL = new Set(['completed', 'cancelled'])

const STATUS = {
  waiting: { title: 'Waiting for your doctor', text: 'Your information has been received. Your doctor will receive it shortly.', icon: Clock3, tone: 'waiting' },
  processing: { title: 'Preparing your intake', text: 'We are preparing your patient-reported information for the doctor.', icon: LoaderCircle, tone: 'processing' },
  ready: { title: 'Your doctor has your intake', text: 'Your information is ready for doctor review. Please stay nearby.', icon: CheckCircle2, tone: 'ready' },
  active: { title: 'Your doctor is ready', text: 'Your consultation is active. Please continue with your doctor.', icon: CheckCircle2, tone: 'ready' },
}

export default function WaitingRoom({ sessionId, doctorName, doctorCode }) {
  const [status, setStatus] = useState('waiting')
  const [networkNotice, setNetworkNotice] = useState('')
  const [ended, setEnded] = useState('')
  const attempts = useRef(0)

  useEffect(() => {
    if (!sessionId) { setEnded('Your consultation session is unavailable. Please join your doctor again.'); return undefined }
    let disposed = false
    let timer
    const schedule = (delay) => { timer = window.setTimeout(poll, delay) }
    const poll = async () => {
      if (disposed || document.hidden) { schedule(8000); return }
      try {
        const data = await getPatientSessionStatus(sessionId)
        if (disposed) return
        attempts.current = 0
        setNetworkNotice('')
        const next = data?.status || 'waiting'
        setStatus(next)
        if (TERMINAL.has(next)) {
          clearPatientSession()
          setEnded(next === 'completed' ? 'This consultation has been completed. Your temporary information has been removed.' : 'This consultation was cancelled. Your temporary information has been removed.')
          return
        }
        schedule(next === 'processing' ? 4000 : 6000)
      } catch (error) {
        if (disposed) return
        if (error.status === 404) {
          clearPatientSession()
          setEnded('This consultation has ended or expired. Please join your doctor again.')
          return
        }
        attempts.current += 1
        setNetworkNotice('Connection temporarily unavailable. We’ll retry when the connection returns.')
        schedule(Math.min(30000, 3000 * 2 ** attempts.current))
      }
    }
    const resume = () => { if (!document.hidden) { window.clearTimeout(timer); void poll() } }
    document.addEventListener('visibilitychange', resume)
    void poll()
    return () => { disposed = true; window.clearTimeout(timer); document.removeEventListener('visibilitychange', resume) }
  }, [sessionId])

  const cancel = async () => {
    try { await cancelSession(sessionId) } catch { /* cancellation is best effort; session data remains protected by expiry */ }
    clearPatientSession()
    setEnded('This consultation was cancelled. Your temporary information has been removed.')
  }

  if (ended) return <PageShell><section style={s.card} role="status"><AlertCircle size={30} color="var(--amber)" /><h1 style={s.title}>Consultation ended</h1><p style={s.text}>{ended}</p><a href="/" style={s.primary}>Join a doctor</a></section></PageShell>

  const details = STATUS[status] || STATUS.waiting
  const Icon = details.icon
  return <PageShell title="Consultation status"><section style={s.card} aria-live="polite"><div style={{ ...s.icon, ...(details.tone === 'ready' ? s.ready : {}) }}><Icon size={30} /></div><p style={s.eyebrow}>CONNECTED CONSULTATION</p><h1 style={s.title}>{details.title}</h1><p style={s.text}>{details.text}</p>{doctorName && <div style={s.doctor}><strong>You’re connected to Dr. {doctorName.replace(/^Dr\.\s*/i, '')}</strong>{doctorCode && <span>VAN code: {doctorCode}</span>}</div>}{networkNotice && <div style={s.network} role="status"><WifiOff size={16} />{networkNotice}</div>}<p style={s.note}>VaaniDoc provides AI-assisted intake support. It does not diagnose or prescribe treatment.</p><button type="button" style={s.cancel} onClick={cancel}>Cancel consultation</button></section></PageShell>
}

const s = {
  card: { margin: 'auto 0', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '30px 22px', boxShadow: 'var(--shadow-md)', textAlign: 'center' },
  icon: { margin: '0 auto 16px', width: 64, height: 64, borderRadius: '50%', background: 'var(--blue-light)', color: 'var(--blue)', display: 'grid', placeItems: 'center' },
  ready: { background: 'var(--green-light)', color: 'var(--green)' }, eyebrow: { color: 'var(--teal-dark)', fontSize: 12, fontWeight: 700, letterSpacing: '.08em' }, title: { color: 'var(--text-h)', fontSize: 24, margin: '6px 0 10px' }, text: { color: 'var(--text)', lineHeight: 1.6, margin: '0 auto 20px', maxWidth: 360 },
  doctor: { display: 'grid', gap: 4, textAlign: 'left', padding: '14px', border: '1px solid var(--teal-border)', background: 'var(--teal-light)', borderRadius: 'var(--r-md)', color: 'var(--text-h)' }, network: { display: 'flex', gap: 8, textAlign: 'left', alignItems: 'center', color: '#92400e', background: 'var(--amber-light)', border: '1px solid var(--amber-border)', borderRadius: 'var(--r-sm)', padding: '10px', marginTop: 14, fontSize: 13 }, note: { fontSize: 12, color: 'var(--text-muted)', margin: '20px 0' }, cancel: { border: '1px solid var(--border-dark)', background: '#fff', color: 'var(--text)', borderRadius: 'var(--r-sm)', minHeight: 44, padding: '0 18px', fontWeight: 600, cursor: 'pointer' }, primary: { display: 'inline-flex', minHeight: 44, alignItems: 'center', padding: '0 18px', borderRadius: 'var(--r-sm)', background: 'var(--blue)', color: '#fff', textDecoration: 'none', fontWeight: 600 },
}
