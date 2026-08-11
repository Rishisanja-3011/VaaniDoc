import {
  ArrowRight,
  Clock3,
  Languages,
  UserRound,
} from 'lucide-react'

function PatientQueue({ onNavigate }) {
  const patients = [
    {
      id: '001',
      language: 'Gujarati',
      waitTime: '8 min',
      complaint: 'Abdominal pain and nausea',
      urgency: 'Moderate',
    },
    {
      id: '002',
      language: 'Hindi',
      waitTime: '14 min',
      complaint: 'Fever and body ache',
      urgency: 'Low',
    },
    {
      id: '003',
      language: 'Marathi',
      waitTime: '21 min',
      complaint: 'Breathing difficulty',
      urgency: 'High',
    },
  ]

  const handleNextPatient = () => {
    onNavigate('current-patient')
  }

  return (
    <div className="page-content">
      <section className="queue-page-header">
        <div>
          <span className="eyebrow">PATIENT QUEUE</span>
          <h3>Patients waiting for consultation</h3>
          <p>
            Review the waiting queue and select the next patient when
            you are ready.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={handleNextPatient}
        >
          Next Patient
          <ArrowRight size={17} />
        </button>
      </section>

      <section className="queue-summary">
        <div className="queue-summary-item">
          <strong>{patients.length}</strong>
          <span>Patients waiting</span>
        </div>

        <div className="queue-summary-divider" />

        <div className="queue-summary-item">
          <strong>1</strong>
          <span>High urgency</span>
        </div>
      </section>

      <section className="queue-list-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">WAITING</span>
            <h3>Consultation queue</h3>
          </div>

          <span className="queue-count">
            {patients.length} patients
          </span>
        </div>

        <div className="patient-queue-list">
          {patients.map((patient, index) => (
            <article
              key={patient.id}
              className="patient-queue-item"
            >
              <div className="queue-position">
                #{index + 1}
              </div>

              <div className="patient-avatar">
                <UserRound size={21} />
              </div>

              <div className="patient-queue-main">
                <div className="patient-queue-name">
                  <strong>Patient #{patient.id}</strong>

                  <span
                    className={`status-badge ${patient.urgency.toLowerCase()}`}
                  >
                    {patient.urgency}
                  </span>
                </div>

                <p>{patient.complaint}</p>

                <div className="patient-queue-meta">
                  <span>
                    <Languages size={14} />
                    {patient.language}
                  </span>

                  <span>
                    <Clock3 size={14} />
                    Waiting {patient.waitTime}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={handleNextPatient}
              >
                View Patient
                <ArrowRight size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="privacy-notice">
        <div className="privacy-notice-icon">
          <Clock3 size={19} />
        </div>

        <div>
          <strong>Active session privacy</strong>
          <p>
            Patient information shown in this queue belongs to active
            consultation sessions and is not intended for permanent
            medical-record storage.
          </p>
        </div>
      </section>
    </div>
  )
}

export default PatientQueue