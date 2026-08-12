import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Languages,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const API_BASE_URL = 'http://127.0.0.1:8000'

function CurrentPatient({
  onNavigate,
  sessionId,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completing, setCompleting] = useState(false)

  // ============================================================
  // LOAD CURRENT PATIENT
  // ============================================================

  useEffect(() => {
    if (!sessionId) {
      setError('No patient session selected.')
      setLoading(false)
      return
    }

    const loadPatient = async () => {
      try {
        setLoading(true)
        setError('')

        const token = localStorage.getItem(
          'vaanidoc_access_token',
        )

        if (!token) {
          throw new Error(
            'Doctor authentication token not found.',
          )
        }

        // IMPORTANT:
        // This endpoint returns:
        // session + patient input + AI-generated intake
        const response = await fetch(
          `${API_BASE_URL}/sessions/queue/${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.detail ||
            `Unable to load patient (${response.status}).`,
          )
        }

        setData(result)
      } catch (err) {
        console.error(
          'Current patient loading error:',
          err,
        )

        setError(
          err.message ||
          'Unable to load patient information.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadPatient()
  }, [sessionId])

  // ============================================================
  // COMPLETE CONSULTATION
  // ============================================================

  const handleCompleteConsultation = async () => {
    if (!sessionId || completing) {
      return
    }

    try {
      setCompleting(true)
      setError('')

      const token = localStorage.getItem(
        'vaanidoc_access_token',
      )

      if (!token) {
        throw new Error(
          'Doctor authentication token not found.',
        )
      }

      const response = await fetch(
        `${API_BASE_URL}/sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.detail ||
          'Unable to complete consultation.',
        )
      }

      // Backend has completed and deleted
      // the temporary consultation data.
      onNavigate('queue')
    } catch (err) {
      console.error(
        'Complete consultation error:',
        err,
      )

      setError(
        err.message ||
        'Unable to complete consultation.',
      )
    } finally {
      setCompleting(false)
    }
  }

  // ============================================================
  // FORMAT HELPERS
  // ============================================================

  const formatLanguage = (language) => {
    const languages = {
      gu: 'Gujarati',
      hi: 'Hindi',
      mr: 'Marathi',
      en: 'English',
    }

    return (
      languages[language] ||
      language ||
      'Unknown'
    )
  }

  const formatUrgency = (urgency) => {
    if (!urgency) {
      return 'Not assessed'
    }

    return (
      urgency.charAt(0).toUpperCase() +
      urgency.slice(1)
    )
  }

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          Loading patient information...
        </div>
      </div>
    )
  }

  // ============================================================
  // ERROR STATE
  // ============================================================

  if (error && !data) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <p>{error}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => onNavigate('queue')}
          >
            Back to Queue
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // BACKEND DATA
  // ============================================================

  const session = data?.session
  const input = data?.input
  const intake = data?.intake

  const language = formatLanguage(
    input?.language,
  )

  const symptoms = intake?.symptoms || []

  const history =
    intake?.relevant_history?.length > 0
      ? intake.relevant_history.join(', ')
      : 'No relevant history reported'

  const medications =
    intake?.medications?.length > 0
      ? intake.medications.join(', ')
      : 'None reported'

  const allergies =
    intake?.allergies?.length > 0
      ? intake.allergies.join(', ')
      : 'None reported'

  const category =
    intake?.possible_symptom_categories?.length > 0
      ? intake.possible_symptom_categories.join(', ')
      : 'Not assessed'

  const urgency = formatUrgency(
    intake?.urgency,
  )

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="page-content consultation-page">

      {/* ======================================================
          TOP BAR
      ====================================================== */}

      <section className="consultation-topbar">
        <div className="current-patient-heading">

          <div className="patient-avatar large">
            <UserRound size={24} />
          </div>

          <div>
            <span className="eyebrow">
              CURRENT PATIENT
            </span>

            <h3>
              Patient #{sessionId?.slice(0, 6)}
            </h3>

            <div className="patient-heading-meta">

              <span>
                <Languages size={14} />
                {language}
              </span>

              <span>
                <Clock3 size={14} />
                Consultation active
              </span>

            </div>
          </div>
        </div>

        <span className="consultation-status">
          <span />
          Active session
        </span>
      </section>

      {/* ======================================================
          AI BANNER
      ====================================================== */}

      <section className="ai-intake-banner">

        <div className="ai-intake-icon">
          <FileText size={20} />
        </div>

        <div>
          <strong>
            AI-generated clinical intake
          </strong>

          <p>
            This information is an AI-assisted summary
            for the doctor. It is not a diagnosis.
          </p>
        </div>

      </section>

      {/* ======================================================
          INLINE ERROR
      ====================================================== */}

      {error && (
        <div className="empty-state">
          {error}
        </div>
      )}

      {/* ======================================================
          CONSULTATION GRID
      ====================================================== */}

      <section className="consultation-grid">

        {/* ====================================================
            MAIN COLUMN
        ==================================================== */}

        <div className="consultation-main-column">

          <article className="clinical-card">

            <div className="clinical-card-heading">

              <div>
                <span className="eyebrow">
                  CLINICAL INTAKE
                </span>

                <h3>
                  Patient summary
                </h3>
              </div>

              <span className="language-badge">
                <Languages size={14} />
                {language}
              </span>

            </div>

            {/* Chief Complaint */}

            <div className="chief-complaint">

              <span>
                Chief Complaint
              </span>

              <strong>
                {intake?.chief_complaint ||
                  'Not reported'}
              </strong>

            </div>

            <div className="clinical-divider" />

            {/* Symptoms */}

            <div className="clinical-field">

              <span>
                Symptoms
              </span>

              {symptoms.length > 0 ? (
                <ul className="symptom-list">

                  {symptoms.map((symptom) => (
                    <li key={symptom}>
                      {symptom}
                    </li>
                  ))}

                </ul>
              ) : (
                <strong>
                  No symptoms reported
                </strong>
              )}

            </div>

            {/* Duration */}

            <div className="clinical-field">

              <span>
                Duration
              </span>

              <strong>
                {intake?.duration ||
                  'Not reported'}
              </strong>

            </div>

            {/* History */}

            <div className="clinical-field">

              <span>
                Relevant History
              </span>

              <strong>
                {history}
              </strong>

            </div>

            {/* Medications */}

            <div className="clinical-field">

              <span>
                Medications
              </span>

              <strong>
                {medications}
              </strong>

            </div>

            {/* Allergies */}

            <div className="clinical-field">

              <span>
                Allergies
              </span>

              <strong>
                {allergies}
              </strong>

            </div>

          </article>

        </div>

        {/* ====================================================
            SIDE COLUMN
        ==================================================== */}

        <aside className="consultation-side-column">

          {/* AI CLASSIFICATION */}

          <article className="classification-card">

            <span className="eyebrow">
              AI-ASSISTED CLASSIFICATION
            </span>

            {/* Category */}

            <div className="classification-field">

              <span>
                Possible Symptom Category
              </span>

              <div className="category-value">
                {category}
              </div>

            </div>

            {/* Urgency */}

            <div className="classification-field">

              <span>
                AI-Assisted Urgency
              </span>

              <div
                className={`urgency-value ${intake?.urgency || 'unknown'
                  }`}
              >
                <AlertCircle size={18} />

                <strong>
                  {urgency}
                </strong>
              </div>

            </div>

            {/* Disclaimer */}

            <div className="classification-disclaimer">

              <AlertCircle size={15} />

              <p>
                AI classification is intended to assist
                the doctor and does not replace clinical
                judgment.
              </p>

            </div>

          </article>

          {/* SESSION INFO */}

          <article className="session-card">

            <div className="session-card-icon">
              <CalendarDays size={19} />
            </div>

            <div>

              <strong>
                Active consultation
              </strong>

              <p>
                Patient information is available only
                during this active session.
              </p>

            </div>

          </article>

        </aside>

      </section>

      {/* ======================================================
          ACTIONS
      ====================================================== */}

      <section className="consultation-actions">

        <button
          type="button"
          className="secondary-button"
          onClick={() => onNavigate('queue')}
          disabled={completing}
        >
          Back to Queue
        </button>

        <button
          type="button"
          className="complete-consultation-button"
          onClick={handleCompleteConsultation}
          disabled={completing}
        >
          <CheckCircle2 size={17} />

          {completing
            ? 'Completing...'
            : 'Complete Consultation'}
        </button>

      </section>

    </div>
  )
}

export default CurrentPatient