import {
  ArrowRight,
  UserRound,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'

const API_BASE_URL =
  'http://127.0.0.1:8000'

function Dashboard({ onNavigate }) {
  const [patients, setPatients] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const loadQueue = async () => {
    try {
      setLoading(true)
      setError('')

      const token =
        localStorage.getItem(
          'vaanidoc_access_token',
        )

      if (!token) {
        throw new Error(
          'Doctor authentication token not found.',
        )
      }

      const response =
        await fetch(
          `${API_BASE_URL}/sessions/queue`,
          {
            method: 'GET',
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        )

      if (!response.ok) {
        let message =
          `Unable to load patient queue (${response.status}).`

        try {
          const data =
            await response.json()

          if (data?.detail) {
            message =
              data.detail
          }
        } catch {
          // Keep default message.
        }

        throw new Error(
          message,
        )
      }

      const data =
        await response.json()

      setPatients(
        data.patients || [],
      )

    } catch (err) {
      console.error(
        'Dashboard queue error:',
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

  const formatLanguage = (
    language,
  ) => {
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

  const formatWaitTime = (
    createdAt,
  ) => {
    if (!createdAt) {
      return 'Ready'
    }

    const created =
      new Date(createdAt)

    const now =
      new Date()

    const minutes =
      Math.max(
        0,
        Math.floor(
          (
            now.getTime() -
            created.getTime()
          ) / 60000,
        ),
      )

    if (minutes === 0) {
      return 'Ready now'
    }

    return `Ready ${minutes} min ago`
  }

  const getPatientNumber = (
    index,
  ) => {
    return String(
      index + 1,
    ).padStart(
      3,
      '0',
    )
  }

  const formatUrgency = (
    urgency,
  ) => {
    if (!urgency) {
      return 'Not assessed'
    }

    return (
      urgency.charAt(0).toUpperCase() +
      urgency.slice(1)
    )
  }

  const handleNextPatient =
    () => {
      if (
        !patients.length
      ) {
        return
      }

      onNavigate(
        'current-patient',
        {
          sessionId:
            patients[0]
              .session_id,
        },
      )
    }

  return (
    <div className="page-content">

      {/* ================================================== */}
      {/* WELCOME */}
      {/* ================================================== */}

      <section className="welcome-card">

        <div>

          <span className="eyebrow">
            TODAY'S OVERVIEW
          </span>

          <h3>
            Good morning, Doctor
          </h3>

          <p>
            Review the prepared patient
            queue and continue with the
            next consultation.
          </p>

        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            onNavigate(
              'queue',
            )
          }
        >
          View Patient Queue

          <ArrowRight
            size={17}
          />
        </button>

      </section>

      {/* ================================================== */}
      {/* PATIENT QUEUE */}
      {/* ================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <span className="eyebrow">
              PATIENT QUEUE
            </span>

            <h3>
              Ready for consultation
            </h3>

          </div>

          <button
            type="button"
            className="text-button"
            onClick={() =>
              onNavigate(
                'queue',
              )
            }
          >
            View all

            <ArrowRight
              size={16}
            />
          </button>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="dashboard-queue-card">
            <span>
              Loading patient queue...
            </span>
          </div>
        )}

        {/* ERROR */}

        {!loading &&
          error && (
            <div className="dashboard-queue-card">

              <span>
                {error}
              </span>

            </div>
          )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          patients.length === 0 && (
            <div className="dashboard-queue-card">

              <span>
                No patients are currently
                ready for consultation.
              </span>

            </div>
          )}

        {/* FIRST READY PATIENT */}

        {!loading &&
          !error &&
          patients.length > 0 && (
            <div className="dashboard-queue-card">

              {/* PATIENT */}

              <div className="queue-patient">

                <div className="patient-avatar">

                  <UserRound
                    size={21}
                  />

                </div>

                <div>

                  <strong>
                    Patient #
                    {getPatientNumber(
                      0,
                    )}
                  </strong>

                  <span>
                    {formatLanguage(
                      patients[0]
                        .language,
                    )}

                    {' · '}

                    {formatWaitTime(
                      patients[0]
                        .created_at,
                    )}
                  </span>

                </div>

              </div>

              {/* URGENCY */}

              <span
                className={`status-badge ${patients[0]
                    .urgency ||
                  'waiting'
                  }`}
              >
                {formatUrgency(
                  patients[0]
                    .urgency,
                )}
              </span>

              {/* NEXT */}

              <button
                type="button"
                className="secondary-button"
                onClick={
                  handleNextPatient
                }
              >
                Next Patient

                <ArrowRight
                  size={16}
                />
              </button>

            </div>
          )}

      </section>

    </div>
  )
}

export default Dashboard