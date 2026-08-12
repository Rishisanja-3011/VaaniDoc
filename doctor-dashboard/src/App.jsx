import { useState } from 'react'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Register from './components/Register'
import DoctorCode from './components/DoctorCode'
import PatientQueue from './components/PatientQueue'
import CurrentPatient from './components/CurrentPatient'
import Settings from './components/Settings'
import './App.css'

function App() {
  const [activePage, setActivePage] = useState('login')
  const [selectedSessionId, setSelectedSessionId] = useState(null)

  const handleNavigate = (page, params = {}) => {
    // Store the selected patient session
    if (params.sessionId) {
      setSelectedSessionId(params.sessionId)
    }

    // Clear selected patient when leaving consultation flow
    if (
      page === 'queue' ||
      page === 'dashboard'
    ) {
      setSelectedSessionId(null)
    }

    setActivePage(page)
  }

  const pageConfig = {
    dashboard: {
      title: 'Dashboard',
      subtitle: "Overview of today's consultations",
    },

    queue: {
      title: 'Patient Queue',
      subtitle: 'Manage patients waiting for consultation',
    },

    'current-patient': {
      title: 'Current Patient',
      subtitle: 'Review the active consultation',
    },

    settings: {
      title: 'Settings',
      subtitle: 'Manage your doctor dashboard preferences',
    },
  }

  // -----------------------------
  // AUTHENTICATION PAGES
  // -----------------------------

  if (activePage === 'login') {
    return <Login onNavigate={handleNavigate} />
  }

  if (activePage === 'register') {
    return <Register onNavigate={handleNavigate} />
  }

  if (activePage === 'doctor-code') {
    return <DoctorCode onNavigate={handleNavigate} />
  }

  // -----------------------------
  // MAIN DASHBOARD
  // -----------------------------

  const currentPage =
    pageConfig[activePage] || pageConfig.dashboard

  return (
    <div className="app-shell">
      <main className="main-content">
        <Header
          title={currentPage.title}
          subtitle={currentPage.subtitle}
          onNavigate={handleNavigate}
          activePage={activePage}
        />

        {/* Dashboard */}
        {activePage === 'dashboard' && (
          <Dashboard
            onNavigate={handleNavigate}
          />
        )}

        {/* Patient Queue */}
        {activePage === 'queue' && (
          <PatientQueue
            onNavigate={handleNavigate}
          />
        )}

        {/* Current Patient */}
        {activePage === 'current-patient' && (
          <CurrentPatient
            onNavigate={handleNavigate}
            sessionId={selectedSessionId}
          />
        )}

        {/* Settings */}
        {activePage === 'settings' && (
          <Settings />
        )}
      </main>
    </div>
  )
}

export default App