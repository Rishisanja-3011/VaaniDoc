import {
  ChevronRight,
  Copy,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'

function Settings() {
  const doctorCode = 'VAN-ABC123'
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(doctorCode)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="page-content settings-page">
      <section className="settings-header">
        <span className="eyebrow">SETTINGS</span>

        <h3>Doctor settings</h3>

        <p>
          Manage your doctor profile and view your consultation
          information.
        </p>
      </section>

      <section className="settings-grid">
        <article className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-card-icon">
              <UserRound size={19} />
            </div>

            <div>
              <h4>Doctor Profile</h4>
              <p>
                Basic information about your VaaniDoc doctor account.
              </p>
            </div>
          </div>

          <div className="settings-list">
            <button type="button" className="settings-row">
              <div>
                <strong>Doctor name</strong>
                <span>Dr. Doctor</span>
              </div>

              <ChevronRight size={17} />
            </button>

            <button type="button" className="settings-row">
              <div>
                <strong>Specialization</strong>
                <span>General Physician</span>
              </div>

              <ChevronRight size={17} />
            </button>

            <div className="settings-doctor-code">
              <div>
                <strong>Doctor code</strong>
                <span>{doctorCode}</span>
              </div>

              <button
                type="button"
                className="settings-copy-button"
                onClick={handleCopyCode}
                aria-label="Copy doctor code"
                title="Copy doctor code"
              >
                <Copy size={16} />
              </button>
            </div>

            {copied && (
              <div className="settings-copy-success">
                Doctor code copied
              </div>
            )}
          </div>
        </article>

        <article className="settings-card privacy-settings-card">
          <div className="settings-card-heading">
            <div className="settings-card-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <h4>Privacy</h4>
              <p>
                Information about consultation data handling.
              </p>
            </div>
          </div>

          <div className="privacy-settings-note">
            <strong>Session-based patient information</strong>

            <p>
              Patient information displayed during consultations is
              intended for the active session and is not intended for
              permanent storage in the doctor dashboard.
            </p>
          </div>
        </article>
      </section>
    </div>
  )
}

export default Settings