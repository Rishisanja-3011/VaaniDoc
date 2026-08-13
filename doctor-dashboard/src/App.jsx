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
    /*
     * PatientQueue sends:
     *
     * onNavigate('current-patient', {
     *   sessionId: patient.session_id
     * })
     *
     * We must save that ID here so CurrentPatient
     * knows which patient to load.
     */
    if (params.sessionId) {
      setSelectedSessionId(params.sessionId)
    }

    /*
     * When leaving the consultation flow,
     * remove the previously selected patient.
     */
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

  // ============================================================
  // AUTHENTICATION PAGES
  // ============================================================

  if (activePage === 'login') {
    return (
      <Login
        onNavigate={handleNavigate}
      />
    )
  }

  if (activePage === 'register') {
    return (
      <Register
        onNavigate={handleNavigate}
      />
    )
  }

  if (activePage === 'doctor-code') {
    return (
      <DoctorCode
        onNavigate={handleNavigate}
      />
    )
  }

  // ============================================================
  // MAIN DASHBOARD
  // ============================================================

  const currentPage =
    pageConfig[activePage] ||
    pageConfig.dashboard

  return (
    <div className="app-shell">
      <main className="main-content">

        <Header
          title={currentPage.title}
          subtitle={currentPage.subtitle}
          onNavigate={handleNavigate}
          activePage={activePage}
        />

        {/* ======================================================
            DASHBOARD
        ====================================================== */}

        {activePage === 'dashboard' && (
          <Dashboard
            onNavigate={handleNavigate}
          />
        )}

        {/* ======================================================
            PATIENT QUEUE
        ====================================================== */}

        {activePage === 'queue' && (
          <PatientQueue
            onNavigate={handleNavigate}
          />
        )}

        {/* ======================================================
            CURRENT PATIENT
        ====================================================== */}

        {activePage === 'current-patient' && (
          <CurrentPatient
            onNavigate={handleNavigate}
            sessionId={selectedSessionId}
          />
        )}

        {/* ======================================================
            SETTINGS
        ====================================================== */}

        {activePage === 'settings' && (
          <Settings />
        )}

      </main>
    </div>
  )
}

export default App