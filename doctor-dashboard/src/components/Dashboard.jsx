import {
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
    </div>
  )
}

export default Dashboard