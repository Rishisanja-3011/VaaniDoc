import {
  ArrowLeft,
  Check,
  Copy,
  LogOut,
  Moon,
  Sun,
  UserCircle,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function Header({
  title,
  subtitle,
  onNavigate,
  activePage,
}) {
  const [darkMode, setDarkMode] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [copied, setCopied] = useState(false)

  const profileRef = useRef(null)

  const doctorCode = 'VD-XXXX'

  const handleThemeToggle = () => {
    const nextTheme = !darkMode

    setDarkMode(nextTheme)

    document.documentElement.classList.toggle(
      'vaanidoc-dark',
      nextTheme,
    )
  }

  const handleProfileToggle = () => {
    setShowProfile((current) => !current)
  }

  const handleBackToDashboard = () => {
    setShowProfile(false)
    onNavigate('dashboard')
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowProfile(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside,
      )
    }
  }, [])

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(doctorCode)

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 1800)
    } catch {
      setCopied(false)
    }
  }

  const handleLogout = () => {
    setShowProfile(false)

    document.documentElement.classList.remove('vaanidoc-dark')
    setDarkMode(false)

    onNavigate('login')
  }

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-title">
        {activePage !== 'dashboard' && (
          <button
            type="button"
            className="back-dashboard-button"
            onClick={handleBackToDashboard}
            aria-label="Back to dashboard"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
            <span>Dashboard</span>
          </button>
        )}

        <h2>{title}</h2>

        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="dashboard-header-actions">
        <button
          type="button"
          className="header-icon-button theme-toggle-button"
          onClick={handleThemeToggle}
          aria-label={
            darkMode
              ? 'Switch to light theme'
              : 'Switch to dark theme'
          }
          title={darkMode ? 'Light theme' : 'Dark theme'}
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
            onClick={handleProfileToggle}
            aria-label="Doctor profile"
            aria-expanded={showProfile}
          >
            <UserCircle size={30} />

            <div>
              <strong>Dr. Doctor</strong>
              <span>General Physician</span>
            </div>
          </button>

          {showProfile && (
            <div className="doctor-profile-panel">
              <div className="profile-panel-header">
                <div className="profile-panel-avatar">
                  <UserCircle size={36} />
                </div>

                <div>
                  <strong>Dr. Doctor</strong>
                  <span>General Physician</span>
                </div>

                <button
                  type="button"
                  className="profile-close-button"
                  onClick={() => setShowProfile(false)}
                  aria-label="Close doctor profile"
                  title="Close"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="profile-details">
                <div className="profile-detail">
                  <span>Email</span>
                  <strong>doctor@example.com</strong>
                </div>

                <div className="profile-detail">
                  <span>Phone</span>
                  <strong>9876543210</strong>
                </div>

                <div className="profile-detail">
                  <span>Doctor Code</span>

                  <div className="profile-code-row">
                    <strong>{doctorCode}</strong>

                    <button
                      type="button"
                      className="profile-copy-button"
                      onClick={handleCopyCode}
                      aria-label="Copy doctor code"
                      title="Copy doctor code"
                    >
                      {copied ? (
                        <Check size={15} />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                  </div>

                  {copied && (
                    <span className="copy-success">
                      Copied
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="profile-logout-button"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header