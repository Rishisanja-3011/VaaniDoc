import {
  ArrowRight,
  Clock3,
  Languages,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const API_BASE_URL = 'http://127.0.0.1:8000'

function PatientQueue({ onNavigate }) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadQueue = async () => {
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

      const response = await fetch(
        `${API_BASE_URL}/sessions/queue`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        let message = `Unable to load patient queue (${response.status}).`

        try {
          const data = await response.json()

          if (data?.detail) {
            message = data.detail
          }
        } catch {
          // Keep default error message.
        }

        throw new Error(message)
      }

      const data = await response.json()

      setPatients(data.patients || [])
    } catch (err) {
      console.error(
        'Queue loading error:',
        err,
      )

      setError(
        err.message ||
        'Unable to load patient queue.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
  }, [])

  const handleViewPatient = (sessionId) => {
    onNavigate(
      'current-patient',
      {
        sessionId,
      },
    )
  }

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

  return (
    <div className="page-content">

      {/* ================================================== */}
      {/* PAGE HEADER */}
      {/* ================================================== */}

      <section className="queue-page-header">
        <div>
          <span className="eyebrow">
            PATIENT QUEUE
          </span>

          <h3>
            Patients ready for consultation
          </h3>

          <p>
            Review the prepared patient intake and
            select the next patient when you are ready.
          </p>
        </div>

        {patients.length > 0 && (
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              handleViewPatient(
                patients[0].session_id,
              )
            }
          >
            Next Patient
            <ArrowRight size={17} />
          </button>
        )}
      </section>

      {/* ================================================== */}
      {/* QUEUE */}
      {/* ================================================== */}

      <section className="queue-list-section">

        <div className="section-heading">
          <div>
            <span className="eyebrow">
              READY
            </span>

            <h3>
              Consultation queue
            </h3>
          </div>

          <span className="queue-count">
            {patients.length}{' '}
            {patients.length === 1
              ? 'patient'
              : 'patients'}
          </span>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="empty-state">
            Loading patient queue...
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="empty-state">
            <p>{error}</p>

            <button
              type="button"
              className="secondary-button"
              onClick={loadQueue}
            >
              Try Again
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          patients.length === 0 && (
            <div className="empty-state">
              No patients are currently ready
              for consultation.
            </div>
          )}

        {/* PATIENTS */}

        {!loading &&
          !error &&
          patients.length > 0 && (
            <div className="patient-queue-list">

              {patients.map(
                (patient, index) => {
                  const urgency =
                    formatUrgency(
                      patient.urgency,
                    )

                  return (
                    <article
                      key={
                        patient.session_id
                      }
                      className="patient-queue-item"
                    >

                      {/* POSITION */}

                      <div className="queue-position">
                        #{index + 1}
                      </div>

                      {/* AVATAR */}

                      <div className="patient-avatar">
                        <UserRound
                          size={21}
                        />
                      </div>

                      {/* MAIN INFO */}

                      <div className="patient-queue-main">

                        <div className="patient-queue-name">

                          <strong>
                            Patient #
                            {String(
                              index + 1,
                            ).padStart(
                              3,
                              '0',
                            )}
                          </strong>

                          <span
                            className={`status-badge ${patient.urgency ||
                              'unknown'
                              }`}
                          >
                            {urgency}
                          </span>

                        </div>

                        <p>
                          {patient.complaint ||
                            'Complaint not available'}
                        </p>

                        <div className="patient-queue-meta">

                          <span>
                            <Languages
                              size={14}
                            />

                            {formatLanguage(
                              patient.language,
                            )}
                          </span>

                          <span>
                            <Clock3
                              size={14}
                            />

                            Ready for consultation
                          </span>

                        </div>

                      </div>

                      {/* ACTION */}

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          handleViewPatient(
                            patient.session_id,
                          )
                        }
                      >
                        View Patient

                        <ArrowRight
                          size={16}
                        />
                      </button>

                    </article>
                  )
                },
              )}

            </div>
          )}

      </section>

      {/* ================================================== */}
      {/* PRIVACY */}
      {/* ================================================== */}

      <section className="privacy-notice">

        <div className="privacy-notice-icon">
          <Clock3 size={19} />
        </div>

        <div>

          <strong>
            Active session privacy
          </strong>

          <p>
            Patient information shown in this
            queue belongs to active consultation
            sessions and is not intended for
            permanent medical-record storage.
          </p>

        </div>

      </section>

    </div>
  )
}

export default PatientQueue