import { useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Mic, MicOff, Square, ArrowRight, RotateCcw } from 'lucide-react'
import PageShell from '../components/PageShell.jsx'

const LANGUAGES = [
  { code: 'gu', label: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'hi', label: 'हिन्दी',   english: 'Hindi' },
  { code: 'mr', label: 'मराठी',    english: 'Marathi' },
  { code: 'ta', label: 'தமிழ்',    english: 'Tamil' },
  { code: 'te', label: 'తెలుగు',   english: 'Telugu' },
  { code: 'kn', label: 'ಕನ್ನಡ',    english: 'Kannada' },
  { code: 'ml', label: 'മലയാളം',   english: 'Malayalam' },
  { code: 'bn', label: 'বাংলা',    english: 'Bengali' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ',   english: 'Punjabi' },
  { code: 'en', label: 'English',  english: 'English' },
]

function formatDuration(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function SymptomInput() {
  const { doctorCode } = useParams()
  const navigate = useNavigate()
  const { state: routeState } = useLocation()
  const sessionId = routeState?.sessionId
  const doctorName = routeState?.doctorName ?? ''

  // All hooks must be called before any conditional return (Rules of Hooks).
  const [tab, setTab] = useState('text')           // 'text' | 'voice'
  const [language, setLanguage] = useState('hi')

  // --- text state ---
  const [text, setText] = useState('')
  const [textError, setTextError] = useState('')

  // --- voice state ---
  const [recState, setRecState] = useState('idle') // idle | recording | done | error
  const [recError, setRecError] = useState('')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  if (!sessionId) {
    navigate(`/confirm/${doctorCode}`)
    return null
  }

  // ── Text handlers ──────────────────────────────────────────────
  function handleTextContinue() {
    if (!text.trim()) { setTextError('Please describe your symptoms before continuing.'); return }
    navigate(`/review/${doctorCode}`, {
      state: { type: 'text', text: text.trim(), language, sessionId, doctorName },
    })
  }

  // ── Voice handlers ─────────────────────────────────────────────
  async function startRecording() {
    setRecError('')
    setDuration(0)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        setAudioBlob(blob)
        setRecState('done')
      }
      mr.start(250) // collect chunks every 250ms
      setRecState('recording')
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch (err) {
      const msg = String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setRecError('Microphone permission denied. Please allow microphone access and try again.')
      } else if (msg.includes('NotFound')) {
        setRecError('No microphone found on this device.')
      } else {
        setRecError('Could not start recording. Please try again.')
      }
      setRecState('error')
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }

  function resetRecording() {
    clearInterval(timerRef.current)
    // Only stop if the recorder is in a stoppable state (not errored/never started).
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') mr.stop()
    mediaRecorderRef.current = null
    setAudioBlob(null)
    setDuration(0)
    setRecState('idle')
    setRecError('')
  }

  function handleVoiceContinue() {
    navigate(`/review/${doctorCode}`, {
      state: { type: 'voice', audioBlob, duration, language, sessionId, doctorName },
    })
  }

  const selectedLang = LANGUAGES.find(l => l.code === language)

  return (
    <PageShell backTo={`/confirm/${doctorCode}`}>
      <h2 style={s.heading}>Describe your symptoms</h2>

      {/* Language selector */}
      <div style={s.langRow}>
        <span style={s.langLabel}>Language:</span>
        <select
          style={s.langSelect}
          value={language}
          onChange={e => setLanguage(e.target.value)}
        >
          {LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.english} — {l.label}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'text' ? s.tabActive : {}) }} onClick={() => setTab('text')}>
          Type
        </button>
        <button style={{ ...s.tab, ...(tab === 'voice' ? s.tabActive : {}) }} onClick={() => setTab('voice')}>
          Voice
        </button>
      </div>

      {/* ── TEXT TAB ── */}
      {tab === 'text' && (
        <div style={s.tabPanel}>
          <textarea
            style={{ ...s.textarea, ...(textError ? s.textareaError : {}) }}
            placeholder={`Describe your symptoms in ${selectedLang.english} (${selectedLang.label})…\n\nFor example: "I have a headache and fever since yesterday."`}
            value={text}
            onChange={e => { setText(e.target.value); setTextError('') }}
            rows={6}
            lang={language}
          />
          {textError && <p style={s.errorText}>{textError}</p>}
          <button
            style={s.primaryBtn}
            onClick={handleTextContinue}
            onMouseEnter={e => Object.assign(e.currentTarget.style, { background: '#1d4ed8', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, { background: '#2563eb', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' })}
            onMouseDown={e => Object.assign(e.currentTarget.style, { transform: 'translateY(1px)', boxShadow: '0 1px 4px rgba(37,99,235,0.2)' })}
            onMouseUp={e => Object.assign(e.currentTarget.style, { transform: 'translateY(0)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' })}
          >
            Review &amp; Submit <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── VOICE TAB ── */}
      {tab === 'voice' && (
        <div style={s.tabPanel}>
          {/* Idle */}
          {recState === 'idle' && (
            <div style={s.voiceCenter}>
              <p style={s.voiceHint}>Tap the microphone and speak your symptoms in {selectedLang.english}.</p>
              <button style={s.micBtn} onClick={startRecording}>
                <Mic size={32} color="#fff" />
              </button>
              <p style={s.voiceHint}>Tap to start recording</p>
            </div>
          )}

          {/* Recording */}
          {recState === 'recording' && (
            <div style={s.voiceCenter}>
              <p style={{ ...s.voiceHint, color: '#ef4444' }}>Recording…</p>
              <button style={{ ...s.micBtn, background: '#ef4444', animation: 'pulse 1s ease-in-out infinite' }} onClick={stopRecording}>
                <Square size={28} color="#fff" />
              </button>
              <p style={s.timerText}>{formatDuration(duration)}</p>
              <p style={s.voiceHint}>Tap to stop</p>
            </div>
          )}

          {/* Done */}
          {recState === 'done' && (
            <div style={s.voiceCenter}>
              <div style={s.doneBox}>
                <Mic size={22} color="var(--accent)" />
                <div>
                  <p style={s.doneTitle}>Recording ready</p>
                  <p style={s.doneMeta}>{formatDuration(duration)} · {selectedLang.english}</p>
                </div>
              </div>
              <div style={s.voiceActions}>
                <button style={s.secondaryBtn} onClick={resetRecording}>
                  <RotateCcw size={15} /> Record Again
                </button>
                <button style={s.primaryBtn} onClick={handleVoiceContinue}>
                  Review & Submit <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {recState === 'error' && (
            <div style={s.voiceCenter}>
              <MicOff size={36} color="#ef4444" />
              <p style={s.errorText}>{recError}</p>
              <button style={s.secondaryBtn} onClick={resetRecording}>
                <RotateCcw size={15} /> Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}

const s = {
  heading: { margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-h)' },
  langRow: { display: 'flex', alignItems: 'center', gap: 10 },
  langLabel: { fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap' },
  langSelect: {
    flex: 1, padding: '8px 10px', borderRadius: 8,
    border: '1.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-h)', fontSize: 14, cursor: 'pointer',
  },
  tabs: {
    display: 'flex', borderRadius: 10, overflow: 'hidden',
    border: '1.5px solid var(--border)',
  },
  tab: {
    flex: 1, padding: '10px', border: 'none', background: 'var(--bg)',
    color: 'var(--text)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
  },
  tabActive: { background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 600 },
  tabPanel: { display: 'flex', flexDirection: 'column', gap: 12 },
  textarea: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-h)', fontSize: 16, resize: 'vertical',
    fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
    outline: 'none',
  },
  textareaError: { borderColor: '#ef4444' },
  errorText: { margin: 0, fontSize: 13, color: '#ef4444', textAlign: 'center' },
  primaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '13px 20px', borderRadius: 10, border: 'none',
    background: '#2563eb', color: '#ffffff',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
    transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
  },
  secondaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '11px 16px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-h)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  voiceCenter: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 16, padding: '16px 0',
  },
  voiceHint: { margin: 0, fontSize: 14, color: 'var(--text)', textAlign: 'center' },
  micBtn: {
    width: 80, height: 80, borderRadius: '50%', border: 'none',
    background: 'var(--accent)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
    boxShadow: '0 0 0 8px var(--accent-bg)',
  },
  timerText: { margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--text-h)', fontVariantNumeric: 'tabular-nums' },
  doneBox: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
    borderRadius: 12, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
    width: '100%', boxSizing: 'border-box',
  },
  doneTitle: { margin: '0 0 2px', fontSize: 15, fontWeight: 600, color: 'var(--text-h)' },
  doneMeta: { margin: 0, fontSize: 13, color: 'var(--text)' },
  voiceActions: { display: 'flex', gap: 10, width: '100%' },
}
