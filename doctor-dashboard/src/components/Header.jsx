import {
  ArrowLeft,
  Check,
  Copy,
  LogOut,
  Mail,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../services/api'

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'DR'

function copyText(value) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value)
  }

  const field = document.createElement('textarea')
  field.value = value
  field.style.position = 'fixed'
  field.style.opacity = '0'

  document.body.appendChild(field)
  field.select()

  const copied = document.execCommand('copy')
  field.remove()

  return copied
    ? Promise.resolve()
    : Promise.reject(new Error('Copy unavailable'))
}

function Header({
  title,
  subtitle,
  onNavigate,
  activePage,
}) {
  const [darkMode, setDarkMode] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [doctor, setDoctor] = useState(null)
  const [notice, setNotice] = useState('')

  const profileRef = useRef(null)

  useEffect(() => {
    let mounted = true

    apiFetch('/doctors/me')
      .then((data) => {
        if (mounted) {
          setDoctor(data)
        }
      })
      .catch(() => { })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const close = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowProfile(false)
      }
    }

    document.addEventListener('mousedown', close)

    return () => {
      document.removeEventListener('mousedown', close)
    }
  }, [])

  const copyCode = async () => {
    if (!doctor?.doctor_code) return

    try {
      await copyText(doctor.doctor_code)
      setNotice('Doctor code copied!')
    } catch {
      setNotice(
        'Unable to copy. Please select the code manually.'
      )
    }

    window.setTimeout(() => {
      setNotice('')
    }, 2200)
  }

  const logout = () => {
    localStorage.removeItem('vaanidoc_access_token')
    localStorage.removeItem('vaanidoc_refresh_token')
    localStorage.removeItem('vaanidoc_dashboard_state')

    setShowProfile(false)

    onNavigate('login')
  }

  const toggleTheme = () => {
    const next = !darkMode

    setDarkMode(next)

    document.documentElement.classList.toggle(
      'vaanidoc-dark',
      next
    )
  }

  return (
    <header className="dashboard-header">

      {/* =====================================================
          VAANIDOC BRANDING
          ===================================================== */}

      <div className="dashboard-brand">

        {/* VaaniDoc heartbeat symbol */}
        <div className="dashboard-brand-icon">
          <svg
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M5 25h9l4-12 7 24 5-16 3 4h10"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="dashboard-brand-text">
          <strong>VaaniDoc</strong>
          <span>Multilingual AI Health Intake</span>
        </div>

      </div>

      {/* =====================================================
          BACK BUTTON
          Only shown on non-dashboard pages
          ===================================================== */}

      <div className="dashboard-header-center">

        {activePage !== 'dashboard' && (
          <button
            type="button"
            className="back-dashboard-button"
            onClick={() => onNavigate('dashboard')}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} />
            <span>Dashboard</span>
          </button>
        )}

      </div>

      {/* =====================================================
          RIGHT SIDE
          ===================================================== */}

      <div className="dashboard-header-actions">

        <button
          type="button"
          className="header-icon-button theme-toggle-button"
          onClick={toggleTheme}
          aria-label={
            darkMode
              ? 'Switch to light theme'
              : 'Switch to dark theme'
          }
        >
          {darkMode ? (
            <Sun size={19} />
          ) : (
            <Moon size={19} />
          )}
        </button>

        <div
          className="doctor-profile-wrapper"
          ref={profileRef}
        >

          <button
            type="button"
            className="doctor-profile-button"
            onClick={() =>
              setShowProfile((value) => !value)
            }
            aria-label="Open doctor profile"
            aria-expanded={showProfile}
          >

            <span className="header-doctor-avatar">
              {initials(doctor?.name)}
            </span>

            <div>
              <strong>
                {doctor?.name || 'Your profile'}
              </strong>

              <span>
                VaaniDoc doctor
              </span>
            </div>

          </button>

          {showProfile && (
            <section
              className="doctor-profile-panel"
              aria-label="Doctor profile"
            >

              <div className="profile-panel-header">

                <span className="profile-initials">
                  {initials(doctor?.name)}
                </span>

                <div>
                  <strong>
                    {doctor?.name ||
                      'Loading profile…'}
                  </strong>

                  <span>
                    Authenticated VaaniDoc doctor
                  </span>
                </div>

                <button
                  type="button"
                  className="profile-close-button"
                  onClick={() =>
                    setShowProfile(false)
                  }
                  aria-label="Close doctor profile"
                >
                  <X size={17} />
                </button>

              </div>

              {doctor ? (
                <div className="profile-details">

                  <div className="profile-detail">

                    <span>
                      <Mail size={14} />
                      Email
                    </span>

                    <strong>
                      {doctor.email}
                    </strong>

                  </div>

                  <div className="profile-detail profile-code-detail">

                    <span>
                      Permanent doctor code
                    </span>

                    <div className="profile-code-row">

                      <strong>
                        {doctor.doctor_code}
                      </strong>

                      <button
                        type="button"
                        className="profile-copy-button"
                        onClick={copyCode}
                        aria-label="Copy permanent doctor code"
                      >
                        {notice ===
                          'Doctor code copied!' ? (
                          <Check size={15} />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>

                    </div>

                  </div>

                  {notice && (
                    <div
                      className="copy-success"
                      role="status"
                    >
                      {notice}
                    </div>
                  )}

                </div>
              ) : (
                <p className="profile-loading">
                  Profile details are temporarily
                  unavailable.
                </p>
              )}

              <button
                type="button"
                className="profile-logout-button"
                onClick={logout}
              >
                <LogOut size={17} />
                Logout
              </button>

            </section>
          )}

        </div>
      </div>
    </header>
  )
}

export default Header
