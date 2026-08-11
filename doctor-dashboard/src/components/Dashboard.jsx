import {
  Users,
  Activity,
  ArrowRight,
  UserRound,
} from 'lucide-react'

function Dashboard({ onNavigate }) {
  return (
    <div className="page-content">
      <section className="welcome-card">
        <div>
          <span className="eyebrow">TODAY'S OVERVIEW</span>
          <h3>Good morning, Doctor</h3>
          <p>
            Review your patient queue and continue with the next consultation.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => onNavigate('queue')}
        >
          View Patient Queue
          <ArrowRight size={17} />
        </button>
      </section>

      <section className="stats-grid" aria-label="Dashboard statistics">
        <article className="stat-card">
          <div className="stat-card-icon">
            <Users size={21} />
          </div>

          <div>
            <span>Patients Waiting</span>
            <strong>3</strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card-icon">
            <Activity size={21} />
          </div>

          <div>
            <span>Consultations Today</span>
            <strong>8</strong>
          </div>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PATIENT QUEUE</span>
            <h3>Waiting for consultation</h3>
          </div>

          <button
            type="button"
            className="text-button"
            onClick={() => onNavigate('queue')}
          >
            View all
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="dashboard-queue-card">
          <div className="queue-patient">
            <div className="patient-avatar">
              <UserRound size={21} />
            </div>

            <div>
              <strong>Patient #001</strong>
              <span>Gujarati · Waiting 8 min</span>
            </div>
          </div>

          <span className="status-badge waiting">Waiting</span>

          <button
            type="button"
            className="secondary-button"
            onClick={() => onNavigate('current-patient')}
          >
            Next Patient
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="privacy-notice">
        <div className="privacy-notice-icon">
          <Activity size={19} />
        </div>

        <div>
          <strong>Privacy-first consultation</strong>
          <p>
            Patient information is available only during the active
            consultation session and is removed when the session ends.
          </p>
        </div>
      </section>
    </div>
  )
}

export default Dashboard