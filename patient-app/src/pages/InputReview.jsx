import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom'

import {
  FileText,
  Mic,
  Edit2,
  RotateCcw,
  Send,
  Loader,
  CheckCircle,
  WifiOff,
  RefreshCw,
} from 'lucide-react'

import PageShell from '../components/PageShell.jsx'

import {
  submitTextInput,
  submitAudioInput,
  processSession,
} from '../services/sessionService.js'

import {
  enqueue,
  flush,
  clearQueue,
  onQueueStateChange,
  getQueueState,
} from '../services/syncQueue.js'

import { useOnlineStatus } from '../hooks/useOnlineStatus.js'

import { friendlyApiError } from '../services/errors.js'


// ============================================================
// LANGUAGE NAMES
// ============================================================

const LANG_NAMES = {
  gu: 'Gujarati',
  hi: 'Hindi',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  bn: 'Bengali',
  pa: 'Punjabi',
  en: 'English',
}


// ============================================================
// HELPERS
// ============================================================

function formatDuration(secs) {
  const m = String(
    Math.floor(secs / 60),
  ).padStart(2, '0')

  const s = String(
    secs % 60,
  ).padStart(2, '0')

  return `${m}:${s}`
}


// ============================================================
// COMPONENT
// ============================================================

export default function InputReview() {
  const { doctorCode } = useParams()

  const navigate = useNavigate()

  const { state } = useLocation()

  const { online } = useOnlineStatus()


  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [submitState, setSubmitState] =
    useState('idle')

  const [errorMsg, setErrorMsg] =
    useState('')

  const submittedRef =
    useRef(false)


  // ----------------------------------------------------------
  // SESSION DATA
  // ----------------------------------------------------------

  const valid = !!(
    state?.type &&
    state?.sessionId
  )

  const {
    type,
    language,
    sessionId,
    doctorName,
  } = state ?? {}

  const langName =
    LANG_NAMES[language] ?? language


  // ----------------------------------------------------------
  // SUBMIT + AI PROCESSING
  // ----------------------------------------------------------

  const doSubmit = useCallback(
    async item => {

      // ------------------------------------------------------
      // 1. Send patient input
      // ------------------------------------------------------

      if (item.type === 'text') {

        await submitTextInput(
          item.sessionId,
          item.text,
          item.language,
        )

      } else {

        await submitAudioInput(
          item.sessionId,
          item.audioBlob,
          item.language,
        )
      }


      // ------------------------------------------------------
      // 2. Run AI processing
      // ------------------------------------------------------

      await processSession(
        item.sessionId,
      )
    },
    [],
  )


  // ----------------------------------------------------------
  // QUEUE STATE
  // ----------------------------------------------------------

  useEffect(() => {

    if (!valid) {
      return
    }

    const unsubscribe =
      onQueueStateChange(qs => {

        setSubmitState(
          qs === 'idle'
            ? 'idle'
            : qs,
        )

        if (qs === 'sent') {

          clearQueue()

          navigate(
            `/waiting/${sessionId}`,
            {
              state: {
                doctorCode,
                doctorName,
              },
              replace: true,
            },
          )
        }
      })

    return unsubscribe

  }, [
    valid,
    sessionId,
    doctorCode,
    doctorName,
    navigate,
  ])


  // ----------------------------------------------------------
  // AUTO FLUSH WHEN ONLINE
  // ----------------------------------------------------------

  useEffect(() => {

    if (
      online &&
      getQueueState() === 'failed'
    ) {
      flush(doSubmit)
    }

  }, [
    online,
    doSubmit,
  ])


  // ----------------------------------------------------------
  // INVALID STATE
  // ----------------------------------------------------------

  if (!valid) {

    navigate(
      `/confirm/${doctorCode}`,
      {
        replace: true,
      },
    )

    return null
  }


  // ----------------------------------------------------------
  // SUBMIT
  // ----------------------------------------------------------

  async function handleSubmit() {

    if (submittedRef.current) {
      return
    }

    submittedRef.current = true

    setErrorMsg('')


    const item = {
      sessionId,
      type,
      language,
      text: state.text,
      audioBlob: state.audioBlob,
    }


    // --------------------------------------------------------
    // OFFLINE
    // --------------------------------------------------------

    if (!online) {

      enqueue(item)

      setSubmitState('offline')

      submittedRef.current = false

      return
    }


    // --------------------------------------------------------
    // ONLINE
    // --------------------------------------------------------

    setSubmitState('loading')


    try {

      await doSubmit(item)

      clearQueue()

      setSubmitState('sent')


      // Give the user a moment to see "Sent"
      // before moving to the waiting room.

      setTimeout(() => {

        navigate(
          `/waiting/${sessionId}`,
          {
            state: {
              doctorCode,
              doctorName,
            },
            replace: true,
          },
        )

      }, 500)


    } catch (err) {

      submittedRef.current = false


      if (err.offline) {

        enqueue(item)

        setSubmitState('offline')

      } else {

        setErrorMsg(
          friendlyApiError(err),
        )

        setSubmitState('failed')
      }
    }
  }


  // ----------------------------------------------------------
  // RETRY
  // ----------------------------------------------------------

  function handleRetry() {

    submittedRef.current = false

    setSubmitState('idle')

    setErrorMsg('')

    clearQueue()

    handleSubmit()
  }


  // ----------------------------------------------------------
  // EDIT
  // ----------------------------------------------------------

  function handleEdit() {

    clearQueue()

    submittedRef.current = false

    navigate(
      `/symptoms/${doctorCode}`,
      {
        state: {
          sessionId,
          doctorId: state.doctorId,
          doctorName,
        },
      },
    )
  }


  // ----------------------------------------------------------
  // LOCK UI
  // ----------------------------------------------------------

  const isLocked =
    submitState === 'loading' ||
    submitState === 'syncing' ||
    submitState === 'sent'


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageShell
      backTo={`/symptoms/${doctorCode}`}
    >

      <h2 style={s.heading}>
        Review your input
      </h2>

      <p style={s.sub}>
        Please confirm what you want to send
        to your doctor.
      </p>


      {/* ====================================================
          INPUT PREVIEW
      ==================================================== */}

      <div style={s.previewCard}>

        <div style={s.previewHeader}>

          {type === 'text' ? (
            <>
              <FileText
                size={16}
                color="var(--accent)"
              />

              <span>
                Text input
              </span>
            </>
          ) : (
            <>
              <Mic
                size={16}
                color="var(--accent)"
              />

              <span>
                Voice recording
              </span>
            </>
          )}

          <span style={s.langBadge}>
            {langName}
          </span>

        </div>


        {/* TEXT */}

        {type === 'text' && (
          <p style={s.previewText}>
            {state.text}
          </p>
        )}


        {/* VOICE */}

        {type === 'voice' && (

          <div style={s.voiceSummary}>

            <div style={s.voiceIcon}>
              <Mic
                size={24}
                color="var(--accent)"
              />
            </div>

            <div>

              <p style={s.voiceDuration}>
                {formatDuration(
                  state.duration ?? 0,
                )}
              </p>

              <p style={s.voiceMeta}>
                Recording ready · {langName}
              </p>

            </div>

          </div>
        )}

      </div>


      {/* ====================================================
          OFFLINE
      ==================================================== */}

      {submitState === 'offline' && (

        <div
          style={{
            ...s.statusStrip,
            ...s.stripOffline,
          }}
        >

          <WifiOff size={14} />

          <span>
            No connection — will send
            automatically when you reconnect.
          </span>

        </div>
      )}


      {/* ====================================================
          PROCESSING
      ==================================================== */}

      {submitState === 'loading' && (

        <div
          style={{
            ...s.statusStrip,
            ...s.stripSyncing,
          }}
        >

          <Loader
            size={14}
            style={{
              animation:
                'spin 0.8s linear infinite',
            }}
          />

          <span>
            Sending to VaaniDoc AI…
          </span>

        </div>
      )}


      {/* ====================================================
          SYNCING
      ==================================================== */}

      {submitState === 'syncing' && (

        <div
          style={{
            ...s.statusStrip,
            ...s.stripSyncing,
          }}
        >

          <Loader
            size={14}
            style={{
              animation:
                'spin 0.8s linear infinite',
            }}
          />

          <span>
            Sending…
          </span>

        </div>
      )}


      {/* ====================================================
          SENT
      ==================================================== */}

      {submitState === 'sent' && (

        <div
          style={{
            ...s.statusStrip,
            ...s.stripSent,
          }}
        >

          <CheckCircle size={14} />

          <span>
            AI intake generated successfully.
          </span>

        </div>
      )}


      {/* ====================================================
          ERROR
      ==================================================== */}

      {(
        submitState === 'failed' ||
        submitState === 'error'
      ) && (

          <div
            style={{
              ...s.statusStrip,
              ...s.stripFailed,
            }}
          >

            <span>
              {errorMsg ||
                'Submission failed. Please try again.'}
            </span>

          </div>
        )}


      {/* ====================================================
          ACTIONS
      ==================================================== */}

      <div style={s.actions}>

        {/* EDIT */}

        <button
          style={s.editBtn}
          onClick={handleEdit}
          disabled={isLocked}
        >

          {type === 'text' ? (
            <>
              <Edit2 size={15} />
              Edit
            </>
          ) : (
            <>
              <RotateCcw size={15} />
              Record Again
            </>
          )}

        </button>


        {/* SUBMIT / RETRY */}

        {(
          submitState === 'failed' ||
          submitState === 'error'
        ) ? (

          <button
            style={s.submitBtn}
            onClick={handleRetry}
          >

            <RefreshCw size={15} />

            Retry

          </button>

        ) : (

          <button
            style={{
              ...s.submitBtn,
              opacity:
                isLocked ? 0.7 : 1,
            }}
            onClick={handleSubmit}
            disabled={
              isLocked ||
              submitState === 'offline'
            }
          >

            {submitState === 'loading' ? (

              <>
                <Loader
                  size={15}
                  style={{
                    animation:
                      'spin 0.8s linear infinite',
                  }}
                />

                Processing…
              </>

            ) : submitState === 'syncing' ? (

              <>
                <Loader
                  size={15}
                  style={{
                    animation:
                      'spin 0.8s linear infinite',
                  }}
                />

                Syncing…
              </>

            ) : submitState === 'offline' ? (

              <>
                <WifiOff size={15} />

                Waiting for connection
              </>

            ) : submitState === 'sent' ? (

              <>
                <CheckCircle size={15} />

                Sent
              </>

            ) : (

              <>
                <Send size={15} />

                Submit
              </>
            )}

          </button>
        )}

      </div>

    </PageShell>
  )
}


// ============================================================
// STYLES
// ============================================================

const s = {

  heading: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-h)',
  },

  sub: {
    margin: 0,
    fontSize: 14,
    color: 'var(--text)',
  },

  previewCard: {
    border:
      '1.5px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
  },

  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderBottom:
      '1px solid var(--border)',
    background:
      'var(--accent-bg)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-h)',
  },

  langBadge: {
    marginLeft: 'auto',
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 20,
    background:
      'var(--accent)',
    color: '#fff',
  },

  previewText: {
    margin: 0,
    padding: '14px',
    fontSize: 15,
    color: 'var(--text-h)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },

  voiceSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px',
  },

  voiceIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background:
      'var(--accent-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  voiceDuration: {
    margin: '0 0 2px',
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-h)',
    fontVariantNumeric:
      'tabular-nums',
  },

  voiceMeta: {
    margin: 0,
    fontSize: 13,
    color: 'var(--text)',
  },

  statusStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },

  stripOffline: {
    background:
      'rgba(245,158,11,0.1)',
    border:
      '1px solid rgba(245,158,11,0.3)',
    color: '#92400e',
  },

  stripSyncing: {
    background:
      'var(--accent-bg)',
    border:
      '1px solid var(--accent-border)',
    color: 'var(--accent)',
  },

  stripSent: {
    background:
      'rgba(34,197,94,0.1)',
    border:
      '1px solid rgba(34,197,94,0.3)',
    color: '#166534',
  },

  stripFailed: {
    background:
      'rgba(239,68,68,0.1)',
    border:
      '1px solid rgba(239,68,68,0.3)',
    color: '#991b1b',
  },

  actions: {
    display: 'flex',
    gap: 10,
  },

  editBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    padding: '12px',
    borderRadius: 10,
    border:
      '1.5px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-h)',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
  },

  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 2,
    padding: '12px',
    borderRadius: 10,
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
}