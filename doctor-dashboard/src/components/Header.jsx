import { Bell, Moon, Sun, UserCircle } from 'lucide-react'
import { useState } from 'react'

function Header({ title, subtitle }) {
  const [darkMode, setDarkMode] = useState(false)

  const handleThemeToggle = () => {
    const nextTheme = !darkMode

    setDarkMode(nextTheme)

    document.documentElement.classList.toggle(
      'vaanidoc-dark',
      nextTheme,
    )
  }

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-title">
        <h2>{title}</h2>

        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="dashboard-header-actions">
        <button
          type="button"
          className="header-icon-button"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={19} />

          <span className="notification-dot" />
        </button>

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
          {darkMode ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        <button
          type="button"
          className="doctor-profile-button"
          aria-label="Doctor profile"
        >
          <UserCircle size={30} />

          <div>
            <strong>Dr. Doctor</strong>
            <span>General Physician</span>
          </div>
        </button>
      </div>
    </header>
  )
}

export default Header