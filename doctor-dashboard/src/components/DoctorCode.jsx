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
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
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

  // Get the QR SVG that is already rendered on this page.
  const qrSvg = document.getElementById('vaanidoc-doctor-qr')

  if (!qrSvg) {
    setError('Unable to prepare the QR code. Please try again.')
    return
  }

  // Open a new tab immediately so browsers don't block the popup.
  const qrWindow = window.open('', '_blank')

  if (!qrWindow) {
    setError('Please allow pop-ups for VaaniDoc to view your QR code.')
    return
  }

  const svgMarkup = qrSvg.outerHTML

  qrWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>VaaniDoc Doctor QR Code</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f1f5f9;
            font-family: Arial, sans-serif;
            color: #0f172a;
          }

          .card {
            width: 100%;
            max-width: 430px;
            background: white;
            border-radius: 20px;
            padding: 32px 24px;
            text-align: center;
            box-shadow: 0 10px 35px rgba(15, 23, 42, 0.12);
          }

          .brand {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 6px;
          }

          .subtitle {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 24px;
          }

          .qr {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
          }

          .doctor-name {
            margin-top: 22px;
            font-size: 18px;
            font-weight: 700;
          }

          .doctor-code {
            margin-top: 6px;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #0f766e;
          }

          .url {
            margin-top: 12px;
            padding: 10px;
            border-radius: 10px;
            background: #f8fafc;
            color: #64748b;
            font-size: 11px;
            word-break: break-all;
          }

          button {
            width: 100%;
            margin-top: 24px;
            padding: 14px 18px;
            border: 0;
            border-radius: 12px;
            background: #2563eb;
            color: white;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
          }

          button:active {
            transform: scale(0.98);
          }

          .note {
            margin-top: 14px;
            color: #64748b;
            font-size: 12px;
            line-height: 1.5;
          }

          @media print {
            body {
              background: white;
            }

            button,
            .note {
              display: none;
            }

            .card {
              box-shadow: none;
            }
          }
        </style>
      </head>

      <body>
        <div class="card">
          <div class="brand">VaaniDoc</div>
          <div class="subtitle">Doctor Consultation QR Code</div>

          <div class="qr">
            ${svgMarkup}
          </div>

          <div class="doctor-name">
            ${escapeHtml(doctorName)}
          </div>

          <div class="doctor-code">
            ${escapeHtml(doctorCode)}
          </div>

          <div class="url">
            ${escapeHtml(qrValue)}
          </div>

          <button id="downloadQr">
            Download QR Code
          </button>

          <div class="note">
            This QR code is permanent for your doctor account.
            Patients can scan it to connect with you.
          </div>
        </div>

        <script>
          function downloadQrCode() {
            const svg = document.querySelector('.qr svg')

            if (!svg) {
              alert('Unable to find QR code.')
              return
            }

            const serializer = new XMLSerializer()
            const svgString = serializer.serializeToString(svg)

            const svgBlob = new Blob(
              [svgString],
              { type: 'image/svg+xml;charset=utf-8' }
            )

            const url = URL.createObjectURL(svgBlob)

            const image = new Image()

            image.onload = function () {
              const canvas = document.createElement('canvas')

              const padding = 40
              const size = 800

              canvas.width = size + padding * 2
              canvas.height = size + padding * 2

              const context = canvas.getContext('2d')

              context.fillStyle = '#ffffff'
              context.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
              )

              context.drawImage(
                image,
                padding,
                padding,
                size,
                size
              )

              URL.revokeObjectURL(url)

              canvas.toBlob(function (blob) {
                if (!blob) {
                  alert('Unable to download QR code.')
                  return
                }

                const downloadUrl =
                  URL.createObjectURL(blob)

                const link =
                  document.createElement('a')

                link.href = downloadUrl
                link.download =
                  'VaaniDoc-${doctorCode}-QR.png'

                document.body.appendChild(link)
                link.click()
                link.remove()

                setTimeout(function () {
                  URL.revokeObjectURL(downloadUrl)
                }, 1000)
              }, 'image/png')
            }

            image.onerror = function () {
              URL.revokeObjectURL(url)
              alert('Unable to prepare QR code.')
            }

            image.src = url
          }

          document
            .getElementById('downloadQr')
            .addEventListener(
              'click',
              downloadQrCode
            )
        </script>
      </body>
    </html>
  `)

  qrWindow.document.close()
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
          {qrValue ? (
  <QRCodeSVG
    id="vaanidoc-doctor-qr"
    value={qrValue}
    size={150}
    includeMargin
  />
) : (
  <QrCode
    size={150}
    strokeWidth={1.4}
  />
)}

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
           View / Download QR Code
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
