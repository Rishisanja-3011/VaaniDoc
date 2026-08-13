import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  QrCode,
  Stethoscope,
  Loader,
  AlertCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch } from '../services/api'
import { QRCodeSVG } from 'qrcode.react'

function DoctorCode({ onNavigate }) {
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  useEffect(() => {
    loadDoctorProfile()
  }, [])

  async function loadDoctorProfile() {
    try {
      setLoading(true)
      setError('')

      const data = await apiFetch('/doctors/me')

      setDoctor(data)

      // Keep the real backend values locally as well.
      if (data.doctor_id) {
        localStorage.setItem(
          'vaanidoc_doctor_id',
          data.doctor_id,
        )
      }

      if (data.doctor_code) {
        localStorage.setItem(
          'vaanidoc_doctor_code',
          data.doctor_code,
        )
      }

      if (data.qr_value) {
        localStorage.setItem(
          'vaanidoc_qr_value',
          data.qr_value,
        )
      }

      if (data.name) {
        localStorage.setItem(
          'vaanidoc_doctor_name',
          data.name,
        )
      }
    } catch {
      // Try cached values if the backend is temporarily unavailable.
      const cachedCode =
        localStorage.getItem('vaanidoc_doctor_code')

      const cachedQr =
        localStorage.getItem('vaanidoc_qr_value')

      const cachedName =
        localStorage.getItem('vaanidoc_doctor_name')

      if (cachedCode) {
        setDoctor({
          doctor_code: cachedCode,
          qr_value: cachedQr || '',
          name: cachedName || 'Doctor',
        })
      } else {
        setError('Unable to load your doctor code right now. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const doctorCode =
    doctor?.doctor_code || 'Loading...'

  const doctorName =
    doctor?.name || 'Doctor'

  const qrValue =
    doctor?.qr_value || ''

  async function handleCopy() {
    if (!doctor?.doctor_code) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(doctor.doctor_code)
      } else {
        const input = document.createElement('textarea')
        input.value = doctor.doctor_code
        input.setAttribute('readonly', '')
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        if (!document.execCommand('copy')) throw new Error('Copy unavailable')
        input.remove()
      }

      setCopied(true)
      setCopyError('')

      setTimeout(() => {
        setCopied(false)
      }, 1800)
    } catch {
      setCopyError('Unable to copy the code. Please select it manually.')
    }
  }

  function handleDownloadQR() {
    if (!qrValue) return

    /*
     * The backend already provides the real QR value.
     *
     * For now we open the QR value so the user can access
     * the actual doctor join URL. The visual QR generator
     * can be connected separately without changing the
     * doctor identity flow.
     */
    window.open(qrValue, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="auth-page doctor-code-page">
        <div className="doctor-code-card">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <Stethoscope
                size={25}
                strokeWidth={2.2}
              />
            </div>

            <div>
              <h1>VaaniDoc</h1>
              <span>Doctor Dashboard</span>
            </div>
          </div>

          <div
            className="doctor-code-heading"
            style={{ textAlign: 'center' }}
          >
            <Loader
              size={32}
              style={{
                animation:
                  'spin 0.8s linear infinite',
              }}
            />

            <h2>Loading your doctor code...</h2>

            <p>
              Getting your unique consultation code
              from VaaniDoc.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth-page doctor-code-page">
        <div className="doctor-code-card">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <Stethoscope
                size={25}
                strokeWidth={2.2}
              />
            </div>

            <div>
              <h1>VaaniDoc</h1>
              <span>Doctor Dashboard</span>
            </div>
          </div>

          <div className="doctor-code-heading">
            <div className="success-icon">
              <AlertCircle size={28} />
            </div>

            <span className="eyebrow">
              UNABLE TO LOAD
            </span>

            <h2>Your doctor code could not be loaded</h2>

            <p>{error}</p>
          </div>

          <button
            type="button"
            className="auth-primary-button"
            onClick={loadDoctorProfile}
          >
            Try Again
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page doctor-code-page">
      <div className="doctor-code-card">

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Stethoscope
              size={25}
              strokeWidth={2.2}
            />
          </div>

          <div>
            <h1>VaaniDoc</h1>
            <span>Doctor Dashboard</span>
          </div>
        </div>

        {/* Heading */}
        <div className="doctor-code-heading">
          <div className="success-icon">
            <CheckCircle2 size={28} />
          </div>

          <span className="eyebrow">
            ACCOUNT CREATED
          </span>

          <h2>
            Your consultation code is ready
          </h2>

          <p>
            Patients can scan your QR code or enter
            your doctor code to join your consultation
            queue.
          </p>

          <p
            style={{
              marginTop: 8,
              fontWeight: 600,
            }}
          >
            Welcome, {doctorName}.
          </p>
        </div>

        {/* QR */}
        <div className="qr-placeholder">
          {qrValue ? <QRCodeSVG value={qrValue} size={150} includeMargin /> : <QrCode size={150} strokeWidth={1.4} />}

          <span>
            Doctor QR Code
          </span>

          <small>
            Generated by VaaniDoc
          </small>

        </div>

        <button
          type="button"
          className="download-qr-button"
          onClick={handleDownloadQR}
          disabled={!qrValue}
        >
          <Download size={17} />
          Open Doctor QR Link
        </button>

        {/* REAL DOCTOR CODE */}
        <div className="doctor-code-section">
          <span className="doctor-code-label">
            YOUR DOCTOR CODE
          </span>

          <div className="doctor-code-value">
            <strong>
              {doctorCode}
            </strong>

            <button
              type="button"
              className="copy-code-button"
              onClick={handleCopy}
              aria-label="Copy doctor code"
              title="Copy doctor code"
              disabled={!doctor?.doctor_code}
            >
              {copied ? (
                <CheckCircle2 size={17} />
              ) : (
                <Copy size={17} />
              )}
            </button>
          </div>

          {copied && (
            <small
              style={{
                display: 'block',
                marginTop: 8,
                color: '#16a34a',
                fontWeight: 600,
              }}
            >
              Code copied
            </small>
          )}
          {copyError && <small className="form-error" role="status">{copyError}</small>}
        </div>

        {/* Note */}
        <div className="doctor-code-note">
          <strong>
            Keep this code accessible
          </strong>

          <p>
            This unique code identifies you as the
            selected doctor. It does not contain
            patient information.
          </p>
        </div>

        {/* Continue */}
        <button
          type="button"
          className="auth-primary-button"
          onClick={() =>
            onNavigate('dashboard')
          }
        >
          Continue to Dashboard
          <ArrowRight size={17} />
        </button>

        <p className="auth-privacy">
          Doctor QR and code are for connecting
          patients to your consultation queue.
        </p>
      </div>
    </div>
  )
}

export default DoctorCode
