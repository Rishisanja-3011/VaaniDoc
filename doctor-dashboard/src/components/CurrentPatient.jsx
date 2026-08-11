import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Languages,
  UserRound,
} from 'lucide-react'

function CurrentPatient({ onNavigate }) {
  const patient = {
    id: '001',
    language: 'Gujarati',
    chiefComplaint: 'Abdominal pain',
    symptoms: [
      'Lower abdominal pain',
      'Mild nausea',
    ],
    duration: '2 days',
    history: 'No relevant history reported',
    medications: 'None reported',
    allergies: 'None reported',
    category: 'Gastrointestinal',
    urgency: 'Moderate',
  }

  return (
    <div className="page-content consultation-page">
      <section className="consultation-topbar">
        <div className="current-patient-heading">
          <div className="patient-avatar large">
            <UserRound size={24} />
          </div>

          <div>
            <span className="eyebrow">CURRENT PATIENT</span>
            <h3>Patient #{patient.id}</h3>

            <div className="patient-heading-meta">
              <span>
                <Languages size={14} />
                {patient.language}
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

      <section className="ai-intake-banner">
        <div className="ai-intake-icon">
          <FileText size={20} />
        </div>

        <div>
          <strong>AI-generated clinical intake</strong>
          <p>
            This information is an AI-assisted summary for the doctor.
            It is not a diagnosis.
          </p>
        </div>
      </section>

      <section className="consultation-grid">
        <div className="consultation-main-column">
          <article className="clinical-card">
            <div className="clinical-card-heading">
              <div>
                <span className="eyebrow">CLINICAL INTAKE</span>
                <h3>Patient summary</h3>
              </div>

              <span className="language-badge">
                <Languages size={14} />
                {patient.language}
              </span>
            </div>

            <div className="chief-complaint">
              <span>Chief Complaint</span>
              <strong>{patient.chiefComplaint}</strong>
            </div>

            <div className="clinical-divider" />

            <div className="clinical-field">
              <span>Symptoms</span>

              <ul className="symptom-list">
                {patient.symptoms.map((symptom) => (
                  <li key={symptom}>{symptom}</li>
                ))}
              </ul>
            </div>

            <div className="clinical-field">
              <span>Duration</span>
              <strong>{patient.duration}</strong>
            </div>

            <div className="clinical-field">
              <span>Relevant History</span>
              <strong>{patient.history}</strong>
            </div>

            <div className="clinical-field">
              <span>Medications</span>
              <strong>{patient.medications}</strong>
            </div>

            <div className="clinical-field">
              <span>Allergies</span>
              <strong>{patient.allergies}</strong>
            </div>
          </article>
        </div>

        <aside className="consultation-side-column">
          <article className="classification-card">
            <span className="eyebrow">AI-ASSISTED CLASSIFICATION</span>

            <div className="classification-field">
              <span>Possible Symptom Category</span>

              <div className="category-value">
                {patient.category}
              </div>
            </div>

            <div className="classification-field">
              <span>AI-Assisted Urgency</span>

              <div className="urgency-value moderate">
                <AlertCircle size={18} />
                <strong>{patient.urgency}</strong>
              </div>
            </div>

            <div className="classification-disclaimer">
              <AlertCircle size={15} />

              <p>
                AI classification is intended to assist the doctor and
                does not replace clinical judgment.
              </p>
            </div>
          </article>

          <article className="session-card">
            <div className="session-card-icon">
              <CalendarDays size={19} />
            </div>

            <div>
              <strong>Active consultation</strong>
              <p>
                Patient information is available only during this
                active session.
              </p>
            </div>
          </article>
        </aside>
      </section>

      <section className="consultation-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onNavigate('queue')}
        >
          Back to Queue
        </button>

        <button
          type="button"
          className="complete-consultation-button"
          onClick={() => onNavigate('queue')}
        >
          <CheckCircle2 size={17} />
          Complete Consultation
        </button>
      </section>
    </div>
  )
}

export default CurrentPatient