import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Mic, MicOff, RotateCcw, Square } from 'lucide-react'
import PageShell from '../components/PageShell.jsx'
import {
  getSavedPatientSession,
  savePatientSession,
} from '../services/sessionService.js'

const LANGUAGES = [
  { code: 'gu', label: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0', english: 'Gujarati' },
  { code: 'hi', label: '\u0939\u093f\u0928\u094d\u0926\u0940', english: 'Hindi' },
  { code: 'mr', label: '\u092e\u0930\u093e\u0920\u0940', english: 'Marathi' },
  { code: 'ta', label: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd', english: 'Tamil' },
  { code: 'te', label: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41', english: 'Telugu' },
  { code: 'kn', label: '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1', english: 'Kannada' },
  { code: 'ml', label: '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02', english: 'Malayalam' },
  { code: 'bn', label: '\u09ac\u09be\u0982\u09b2\u09be', english: 'Bengali' },
  { code: 'pa', label: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40', english: 'Punjabi' },
  { code: 'en', label: 'English', english: 'English' },
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
  const savedSession = getSavedPatientSession()
  const restoredSession =
    savedSession?.doctorCode === doctorCode
      ? savedSession
      : null
  const sessionId =
    routeState?.sessionId ||
    restoredSession?.sessionId
  const doctorName =
    routeState?.doctorName ??
    restoredSession?.doctorName ??
    ''

  const [tab, setTab] = useState('text')
  const [language, setLanguage] = useState('hi')
  const [text, setText] = useState('')
  const [textError, setTextError] = useState('')
  const [recState, setRecState] = useState('idle')
  const [recError, setRecError] = useState('')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcript, setTranscript] = useState('')

  const mediaRecorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    if (!sessionId) {
      navigate(`/confirm/${doctorCode}`, { replace: true })
      return
    }

    savePatientSession({
      currentPath: `/symptoms/${doctorCode}`,
      sessionId,
      doctorCode,
      doctorName,
    })
  }, [doctorCode, doctorName, navigate, sessionId])

  if (!sessionId) {
    return null
  }

  function handleTextContinue() {
    const trimmed = text.trim()

    if (!trimmed) {
      setTextError('Please describe your symptoms before continuing.')
      return
    }

    const reviewState = {
      type: 'text',
      text: trimmed,
      language,
      sessionId,
      doctorName,
    }

    savePatientSession({
      currentPath: `/review/${doctorCode}`,
      sessionId,
      doctorCode,
      doctorName,
      reviewData: reviewState,
    })

    navigate(`/review/${doctorCode}`, {
      state: reviewState,
    })
  }

  async function startRecording() {
    setRecError('')
    setDuration(0)
    setTranscript('')
    chunksRef.current = []

    try {
      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition

      if (!SpeechRecognition) {
        throw new Error('SpeechRecognitionUnavailable')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        })
        setAudioBlob(blob)
        setRecState('done')
      }

      mediaRecorder.start(250)

      const recognition = new SpeechRecognition()
      recognition.lang = 'en-IN'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = (event) => {
        let nextTranscript = ''
        for (let index = 0; index < event.results.length; index += 1) {
          nextTranscript += event.results[index][0].transcript
        }
        setTranscript(nextTranscript.trim())
      }
      recognition.onerror = (event) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          setRecError('Voice transcription was interrupted. Please try again or type your symptoms.')
        }
      }
      recognitionRef.current = recognition
      recognition.start()
      setRecState('recording')
      timerRef.current = setInterval(() => setDuration((value) => value + 1), 1000)
    } catch (err) {
      const msg = String(err)

      if (msg.includes('SpeechRecognitionUnavailable')) {
        setRecError('Voice-to-text is available in recent Chrome and Edge browsers. Please type your symptoms on this browser.')
      } else if (msg.includes('Permission') || msg.includes('NotAllowed')) {
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
    recognitionRef.current?.stop()
  }

  function resetRecording() {
    clearInterval(timerRef.current)
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    mediaRecorderRef.current = null
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setAudioBlob(null)
    setTranscript('')
    setDuration(0)
    setRecState('idle')
    setRecError('')
  }

  function handleVoiceContinue() {
    const trimmed = transcript.trim()

    if (!audioBlob) {
      setRecError('We could not save that recording. Please record again or type your symptoms.')
      return
    }

    const reviewState = {
      type: 'voice',
      text: trimmed,
      audioBlob,
      duration,
      language,
      sessionId,
      doctorName,
    }

    savePatientSession({
      currentPath: `/review/${doctorCode}`,
      sessionId,
      doctorCode,
      doctorName,
      reviewData: {
        type: 'voice',
        text: trimmed,
        duration,
        language,
      },
    })

    navigate(`/review/${doctorCode}`, {
      state: reviewState,
    })
  }

  const selectedLang =
    LANGUAGES.find((item) => item.code === language) ||
    LANGUAGES[0]

  return (
    <PageShell backTo={`/confirm/${doctorCode}`}>
      <h2 style={s.heading}>Describe your symptoms</h2>

      <div style={s.tabs}>
        <button
          style={{ ...s.tab, ...(tab === 'text' ? s.tabActive : {}) }}
          onClick={() => setTab('text')}
        >
          Type
        </button>
        <button
          style={{ ...s.tab, ...(tab === 'voice' ? s.tabActive : {}) }}
          onClick={() => setTab('voice')}
        >
          Voice
        </button>
      </div>

      {tab === 'text' && (
        <div style={s.tabPanel}>
          <div style={s.langRow}>
            <span style={s.langLabel}>Language:</span>
            <select
              style={s.langSelect}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.english} - {item.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            style={{ ...s.textarea, ...(textError ? s.textareaError : {}) }}
            placeholder={`Describe your symptoms in ${selectedLang.english} (${selectedLang.label})...\n\nFor example: "I have a headache and fever since yesterday."`}
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setTextError('')
            }}
            rows={6}
            lang={language}
          />
          {textError && <p style={s.errorText}>{textError}</p>}
          <button style={s.primaryBtn} onClick={handleTextContinue}>
            Review &amp; Submit <ArrowRight size={16} />
          </button>
        </div>
      )}

      {tab === 'voice' && (
        <div style={s.tabPanel}>
          {recState === 'idle' && (
            <div style={s.voiceCenter}>
              <p style={s.voiceHint}>Tap the microphone and speak your symptoms. VaaniDoc will detect the language automatically.</p>
              <button style={s.micBtn} onClick={startRecording}>
                <Mic size={32} color="#fff" />
              </button>
              <p style={s.voiceHint}>Tap to start recording</p>
            </div>
          )}

          {recState === 'recording' && (
            <div style={s.voiceCenter}>
              <p style={{ ...s.voiceHint, color: '#ef4444' }}>Recording...</p>
              <button
                style={{
                  ...s.micBtn,
                  background: '#ef4444',
                  animation: 'pulse 1s ease-in-out infinite',
                }}
                onClick={stopRecording}
              >
                <Square size={28} color="#fff" />
              </button>
              <p style={s.timerText}>{formatDuration(duration)}</p>
              <p style={s.voiceHint}>Tap to stop</p>
            </div>
          )}

          {recState === 'done' && (
            <div style={s.voiceCenter}>
              <div style={s.doneBox}>
                <Mic size={22} color="var(--accent)" />
                <div>
                  <p style={s.doneTitle}>Recording ready</p>
                  <p style={s.doneMeta}>{formatDuration(duration)} - language will be detected automatically</p>
                </div>
              </div>
              {transcript && <p style={s.transcript}>"{transcript}"</p>}
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
  transcript: { margin: 0, width: '100%', color: 'var(--text-h)', fontSize: 14, lineHeight: 1.5 },
}
