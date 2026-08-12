import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ArrowLeft, AlertCircle, Loader, CheckCircle, Activity, UserRound } from 'lucide-react'
import { lookupDoctor } from '../services/doctorService.js'
import { createSession } from '../services/sessionService.js'
import { ERR, friendlyApiError } from '../services/errors.js'
import ConnectionBanner from '../components/ConnectionBanner.jsx'

export default function DoctorConfirm() {
  const { doctorCode } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState('loading')
  const [doctor, setDoctor] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!doctorCode) { navigate('/'); return }
    lookupDoctor(doctorCode)
      .then(d => { setDoctor(d); setState('found') })
      .catch(err => {
        setErrorMsg(err?.status === 404 ? ERR.DOCTOR_NOT_FOUND : friendlyApiError(err))
        setState('error')
      })
  }, [doctorCode]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleContinue() {
    setState('creating')
    try {
      const session = await createSession(doctor.doctor_id)
      navigate(`/symptoms/${doctorCode}`, {
        state: { sessionId: session.session_id, doctorId: doctor.doctor_id, doctorName: displayName },
      })
    } catch (err) {
      setErrorMsg(friendlyApiError(err) ?? ERR.SESSION_START)
      setState('found')
    }
  }

  const displayName = doctor?.doctor_name ?? doctor?.name ?? ''
  const initials = displayName ? displayName.split(' ').slice(0, 2).map(w => w[0]).join('') : '?'

  return (
    <div style={s.screen}>
      <header style={s.header}>
        <div style={s.logoMark}><Activity size={16} color="#fff" strokeWidth={2.5} /></div>
        <div>
          <div style={s.headerTitle}>VaaniDoc</div>
          <div style={s.headerSub}>Multilingual AI Health Intake</div>
        </div>
      </header>

      <ConnectionBanner />

      <div style={s.body}>
        {state === 'loading' && (
          <div style={s.card}>
            <div style={s.centerBox}>
              <div style={s.spinner} />
              <p style={s.mutedText}>Looking up doctor…</p>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div style={s.card}>
            <div style={s.centerBox}>
              <div style={s.errorIcon}><AlertCircle size={32} color="var(--red)" /></div>
              <p style={s.errorTitle}>Doctor Not Found</p>
              <p style={s.errorMsg}>{errorMsg}</p>
              <button style={s.primaryBtn} onClick={() => navigate('/')}>
                <ArrowLeft size={16} /> Try Again
              </button>
            </div>
          </div>
        )}

        {(state === 'found' || state === 'creating') && doctor && (
          <>
            {/* Found badge */}
            <div style={s.foundBadge}>
              <CheckCircle size={15} color="var(--green)" />
              <span>Doctor Found</span>
            </div>

            <div style={s.card}>
              <p style={s.confirmLabel}>You are requesting consultation with:</p>

              {/* Doctor profile */}
              <div style={s.doctorProfile}>
                <div style={s.avatar}>{initials}</div>
                <div style={s.doctorInfo}>
                  <p style={s.doctorName}>{displayName}</p>
                  {doctor.specialty && <p style={s.doctorMeta}>{doctor.specialty}</p>}
                  {doctor.clinic    && <p style={s.doctorClinic}>{doctor.clinic}</p>}
                </div>
              </div>

              <div style={s.codePill}>
                <span style={s.codeLabel}>Doctor Code</span>
                <span style={s.codeValue}>{doctorCode}</span>
              </div>

              {errorMsg && (
                <div style={s.errorStrip}>
                  <AlertCircle size={13} color="var(--red)" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={s.actions}>
                <button style={s.backBtn} onClick={() => navigate('/')} disabled={state === 'creating'}>
                  <ArrowLeft size={15} /> Change Doctor
                </button>
                <button
                  style={{ ...s.confirmBtn, opacity: state === 'creating' ? 0.75 : 1 }}
                  onClick={handleContinue}
                  disabled={state === 'creating'}
                >
                  {state === 'creating'
                    ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Starting…</>
                    : <>Confirm Doctor <ArrowRight size={15} /></>
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <footer style={s.footer}>Your information is used only during this consultation session.</footer>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const s = {
  screen: { minHeight: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)' },
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'var(--navy)' },
  logoMark: { width: 40, height: 40, borderRadius: 10, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerTitle: { fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.2 },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 },
  body: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: 16, maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' },
  foundBadge: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
    borderRadius: 20, background: 'var(--green-light)', border: '1px solid var(--green-border)',
    fontSize: 13, fontWeight: 600, color: 'var(--green)',
  },
  card: { width: '100%', background: 'var(--card-bg)', borderRadius: 'var(--r-xl)', padding: '24px 20px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' },
  centerBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '12px 0' },
  spinner: { width: 36, height: 36, border: '3px solid var(--border)', borderTop: '3px solid var(--teal)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' },
  mutedText: { margin: 0, fontSize: 14, color: 'var(--text-muted)' },
  errorIcon: { width: 64, height: 64, borderRadius: '50%', background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  errorTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-h)' },
  errorMsg: { margin: 0, fontSize: 14, color: 'var(--text)', textAlign: 'center', lineHeight: 1.6 },
  confirmLabel: { margin: '0 0 16px', fontSize: 14, color: 'var(--text)', textAlign: 'center' },
  doctorProfile: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px', borderRadius: 'var(--r-md)', background: 'var(--teal-light)', border: '1px solid var(--teal-border)', marginBottom: 14 },
  avatar: { width: 56, height: 56, borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 },
  doctorInfo: { flex: 1 },
  doctorName: { margin: '0 0 3px', fontSize: 17, fontWeight: 700, color: 'var(--text-h)' },
  doctorMeta: { margin: '0 0 2px', fontSize: 13, color: 'var(--teal-dark)', fontWeight: 500 },
  doctorClinic: { margin: 0, fontSize: 12, color: 'var(--text-muted)' },
  codePill: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--page-bg)', border: '1px solid var(--border)', marginBottom: 16 },
  codeLabel: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 },
  codeValue: { fontSize: 14, fontWeight: 700, color: 'var(--text-h)', fontFamily: 'monospace' },
  errorStrip: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-light)', border: '1px solid var(--red-border)', fontSize: 13, color: 'var(--red)', marginBottom: 12 },
  actions: { display: 'flex', gap: 10 },
  backBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, padding: '12px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-h)', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  confirmBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 2, padding: '13px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--blue)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--blue)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  footer: { fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--card-bg)' },
}
