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

import {
  getSession,
  startSession,
  completeSession,
} from '../services/sessionService'


function CurrentPatient({
  onNavigate,
  sessionId,
}) {
  const [data, setData] = useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [starting, setStarting] =
    useState(false)

  const [completing, setCompleting] =
    useState(false)


  // ============================================================
  // LOAD CURRENT PATIENT
  // ============================================================

  const loadPatient = async () => {
    if (!sessionId) {
      setError(
        'No patient session selected.'
      )

      setLoading(false)

      return
    }

    try {
      setLoading(true)
      setError('')

      const result =
        await getSession(sessionId)

      setData(result)

    } catch (err) {
      console.error(
        'Current patient loading error:',
        err
      )

      setError(
        err.message ||
        'Unable to load patient information.'
      )

    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadPatient()
  }, [sessionId])


  // ============================================================
  // START CONSULTATION
  // ============================================================

  const handleStartConsultation =
    async () => {

      if (
        !sessionId ||
        starting ||
        completing
      ) {
        return
      }

      try {
        setStarting(true)
        setError('')

        await startSession(sessionId)

        /*
         * Reload the complete session from the backend.
         *
         * This makes sure the UI reflects the actual
         * backend status instead of assuming the response.
         */

        const updatedSession =
          await getSession(sessionId)

        setData(updatedSession)

      } catch (err) {
        console.error(
          'Start consultation error:',
          err
        )

        setError(
          err.message ||
          'Unable to start consultation.'
        )

      } finally {
        setStarting(false)
      }
    }


  // ============================================================
  // COMPLETE CONSULTATION
  // ============================================================

  const handleCompleteConsultation =
    async () => {

      if (
        !sessionId ||
        starting ||
        completing
      ) {
        return
      }

      try {
        setCompleting(true)
        setError('')

        await completeSession(sessionId)

        /*
         * Backend has completed the consultation
         * and removed the temporary session data.
         *
         * Return the doctor to the queue.
         */

        onNavigate('queue')

      } catch (err) {
        console.error(
          'Complete consultation error:',
          err
        )

        setError(
          err.message ||
          'Unable to complete consultation.'
        )

      } finally {
        setCompleting(false)
      }
    }


  // ============================================================
  // FORMAT LANGUAGE
  // ============================================================

  const formatLanguage =
    (language) => {

      const languages = {
        gu: 'Gujarati',
        hi: 'Hindi',
        mr: 'Marathi',
        en: 'English',
        ta: 'Tamil',
        te: 'Telugu',
        kn: 'Kannada',
        ml: 'Malayalam',
        bn: 'Bengali',
        pa: 'Punjabi',
      }

      return (
        languages[language] ||
        language ||
        'Unknown'
      )
    }


  // ============================================================
  // FORMAT URGENCY
  // ============================================================

  const formatUrgency =
    (urgency) => {

      if (!urgency) {
        return 'Not assessed'
      }

      return (
        urgency
          .charAt(0)
          .toUpperCase() +
        urgency.slice(1)
      )
    }


  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate =
    (createdAt) => {

      if (!createdAt) {
        return 'Unknown'
      }

      const date =
        new Date(createdAt)

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return 'Unknown'
      }

      return date.toLocaleString(
        undefined,
        {
          dateStyle: 'medium',
          timeStyle: 'short',
        }
      )
    }


  // ============================================================
  // LOADING
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
  // ERROR
  // ============================================================

  if (
    error &&
    !data
  ) {
    return (
      <div className="page-content">

        <div className="empty-state">

          <p>
            {error}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              onNavigate('queue')
            }
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

  const session =
    data?.session

  const input =
    data?.input

  const intake =
    data?.intake


  // ============================================================
  // PATIENT LANGUAGE
  // ============================================================

  const language =
    formatLanguage(
      input?.language
    )


  // ============================================================
  // SYMPTOMS
  // ============================================================

  const symptoms =
    intake?.symptoms || []


  const negativeSymptoms =
    intake?.negative_symptoms || []


  // ============================================================
  // HISTORY
  // ============================================================

  const history =
    intake?.relevant_history?.length
      ? intake.relevant_history.join(
        ', '
      )
      : 'No relevant history reported'


  // ============================================================
  // MEDICATIONS
  // ============================================================

  const medications =
    intake?.medications?.length
      ? intake.medications.join(
        ', '
      )
      : 'None reported'


  // ============================================================
  // ALLERGIES
  // ============================================================

  const allergies =
    intake?.allergies?.length
      ? intake.allergies.join(
        ', '
      )
      : 'None reported'


  // ============================================================
  // SYMPTOM CATEGORIES
  // ============================================================

  const categories =
    intake
      ?.possible_symptom_categories
      ?.length
      ? intake.possible_symptom_categories.join(
        ', '
      )
      : 'Not assessed'


  // ============================================================
  // URGENCY
  // ============================================================

  const urgency =
    formatUrgency(
      intake?.urgency
    )


  // ============================================================
  // SESSION STATUS
  // ============================================================

  const status =
    session?.status ||
    'unknown'


  const isActive =
    status === 'active'


  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="page-content consultation-page">


      {/* ======================================================
          CURRENT PATIENT HEADER
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
              Patient #
              {sessionId?.slice(0, 6)}
            </h3>

            <div className="patient-heading-meta">

              <span>
                <Languages size={14} />

                {language}
              </span>

              <span>
                <Clock3 size={14} />

                {isActive
                  ? 'Consultation active'
                  : `Status: ${status}`}
              </span>

            </div>

          </div>

        </div>


        <span className="consultation-status">

          <span />

          {isActive
            ? 'Active session'
            : 'Ready for consultation'}

        </span>

      </section>


      {/* ======================================================
          ERROR BANNER
      ====================================================== */}

      {error && (
        <section className="privacy-notice">

          <div className="privacy-notice-icon">
            <AlertCircle size={19} />
          </div>

          <div>

            <strong>
              Consultation notice
            </strong>

            <p>
              {error}
            </p>

          </div>

        </section>
      )}


      {/* ======================================================
          AI INTAKE BANNER
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
            This information is an AI-assisted
            summary for the doctor. It is not
            a diagnosis.
          </p>

        </div>

      </section>


      {/* ======================================================
          PATIENT SUMMARY
      ====================================================== */}

      <section className="consultation-card">

        <div className="section-heading">

          <div>

            <span className="eyebrow">
              PATIENT SUMMARY
            </span>

            <h3>
              Clinical intake
            </h3>

          </div>

          <span
            className={`status-badge ${intake?.urgency || 'unknown'
              }`}
          >
            {urgency}
          </span>

        </div>


        <div className="summary-grid">


          {/* Chief Complaint */}

          <div className="summary-item">

            <span>
              Chief complaint
            </span>

            <strong>
              {intake?.chief_complaint ||
                'Not available'}
            </strong>

          </div>


          {/* Duration */}

          <div className="summary-item">

            <span>
              Duration
            </span>

            <strong>
              {intake?.duration ||
                'Not reported'}
            </strong>

          </div>


          {/* Language */}

          <div className="summary-item">

            <span>
              Patient language
            </span>

            <strong>
              {language}
            </strong>

          </div>


          {/* Category */}

          <div className="summary-item">

            <span>
              Possible symptom category
            </span>

            <strong>
              {categories}
            </strong>

          </div>

        </div>

      </section>


      {/* ======================================================
          SYMPTOMS
      ====================================================== */}

      <section className="consultation-card">

        <div className="section-heading">

          <div>

            <span className="eyebrow">
              SYMPTOMS
            </span>

            <h3>
              Reported symptoms
            </h3>

          </div>

        </div>


        {symptoms.length > 0 ? (

          <div className="symptom-list">

            {symptoms.map(
              (symptom, index) => (

                <div
                  className="symptom-item"
                  key={`${symptom}-${index}`}
                >

                  <CheckCircle2
                    size={17}
                  />

                  <span>
                    {symptom}
                  </span>

                </div>

              )
            )}

          </div>

        ) : (

          <p className="muted-text">
            No symptoms extracted.
          </p>

        )}


        {negativeSymptoms.length > 0 && (

          <div className="consultation-subsection">

            <span className="eyebrow">
              NEGATIVE SYMPTOMS
            </span>

            <p>
              {negativeSymptoms.join(', ')}
            </p>

          </div>

        )}

      </section>


      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <section className="consultation-card">

        <div className="section-heading">

          <div>

            <span className="eyebrow">
              BACKGROUND
            </span>

            <h3>
              Relevant information
            </h3>

          </div>

        </div>


        <div className="summary-grid">


          {/* History */}

          <div className="summary-item">

            <span>
              Relevant history
            </span>

            <strong>
              {history}
            </strong>

          </div>


          {/* Medications */}

          <div className="summary-item">

            <span>
              Medications
            </span>

            <strong>
              {medications}
            </strong>

          </div>


          {/* Allergies */}

          <div className="summary-item">

            <span>
              Allergies
            </span>

            <strong>
              {allergies}
            </strong>

          </div>


          {/* Created */}

          <div className="summary-item">

            <span>
              Session created
            </span>

            <strong>
              {formatDate(
                session?.created_at
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* ======================================================
          ORIGINAL PATIENT MESSAGE
      ====================================================== */}

      <section className="consultation-card">

        <div className="section-heading">

          <div>

            <span className="eyebrow">
              PATIENT INPUT
            </span>

            <h3>
              Original patient message
            </h3>

          </div>

          <Languages size={18} />

        </div>


        <div className="patient-original-input">

          {input?.text_content ||
            input?.text ||
            'No text input available.'}

        </div>

      </section>


      {/* ======================================================
          PRIVACY NOTICE
      ====================================================== */}

      <section className="privacy-notice">

        <div className="privacy-notice-icon">
          <CalendarDays size={19} />
        </div>

        <div>

          <strong>
            Temporary consultation data
          </strong>

          <p>
            Patient information is available
            only during the active consultation.
            Completing the consultation removes
            the temporary session data.
          </p>

        </div>

      </section>


      {/* ======================================================
          ACTIONS
      ====================================================== */}

      <section className="consultation-actions">

        <button
          type="button"
          className="secondary-button"
          disabled={
            starting ||
            completing
          }
          onClick={() =>
            onNavigate('queue')
          }
        >
          Back to Queue
        </button>


        {/* ====================================================
            READY → ACTIVE
            ==================================================== */}

        {!isActive && (

          <button
            type="button"
            className="primary-button"
            disabled={
              starting ||
              completing
            }
            onClick={
              handleStartConsultation
            }
          >

            <CheckCircle2 size={17} />

            {starting
              ? 'Starting...'
              : 'Start Consultation'}

          </button>

        )}


        {/* ====================================================
            ACTIVE → COMPLETED
            ==================================================== */}

        {isActive && (

          <button
            type="button"
            className="primary-button"
            disabled={
              completing
            }
            onClick={
              handleCompleteConsultation
            }
          >

            <CheckCircle2 size={17} />

            {completing
              ? 'Completing...'
              : 'Complete Consultation'}

          </button>

        )}

      </section>

    </div>
  )
}

export default CurrentPatient