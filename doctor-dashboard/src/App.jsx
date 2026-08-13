import { useEffect, useState } from 'react'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Register from './components/Register'
import DoctorCode from './components/DoctorCode'
import PatientQueue from './components/PatientQueue'
import CurrentPatient from './components/CurrentPatient'
import Settings from './components/Settings'
import { apiFetch, getAuthToken } from './services/api'
import './App.css'

const DASHBOARD_STATE_KEY = 'vaanidoc_dashboard_state'

function getInitialDashboardState() {
  const token = getAuthToken()

  if (!token) {
    return {
      activePage: 'login',
      selectedSessionId: null,
      initializing: false,
    }
  }

  try {
    const raw = localStorage.getItem(DASHBOARD_STATE_KEY)

    if (!raw) {
      return {
        activePage: 'dashboard',
        selectedSessionId: null,
        initializing: true,
      }
    }

    const saved = JSON.parse(raw)
    const savedPage =
      saved?.activePage &&
      !['login', 'register'].includes(saved.activePage)
        ? saved.activePage
        : 'dashboard'

    return {
      activePage: savedPage,
      selectedSessionId: saved?.selectedSessionId || null,
      initializing: true,
    }
  } catch {
    localStorage.removeItem(DASHBOARD_STATE_KEY)

    return {
      activePage: 'dashboard',
      selectedSessionId: null,
      initializing: true,
    }
  }
}

function App() {
  const initialState = getInitialDashboardState()
  const [activePage, setActivePage] = useState(initialState.activePage)
  const [selectedSessionId, setSelectedSessionId] = useState(initialState.selectedSessionId)
  const [initializing, setInitializing] = useState(initialState.initializing)

  useEffect(() => {
    const token = getAuthToken()

    if (!token) {
      setInitializing(false)
      return
    }

    let cancelled = false

    apiFetch('/doctors/me')
      .then(() => {
        if (cancelled) {
          return
        }

        setActivePage((currentPage) =>
          ['login', 'register'].includes(currentPage)
            ? 'dashboard'
            : currentPage,
        )
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        localStorage.removeItem('vaanidoc_access_token')
        localStorage.removeItem('vaanidoc_refresh_token')
        localStorage.removeItem(DASHBOARD_STATE_KEY)
        setSelectedSessionId(null)
        setActivePage('login')
      })
      .finally(() => {
        if (!cancelled) {
          setInitializing(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (initializing) {
      return
    }

    if (!getAuthToken() || ['login', 'register'].includes(activePage)) {
      localStorage.removeItem(DASHBOARD_STATE_KEY)
      return
    }

    localStorage.setItem(
      DASHBOARD_STATE_KEY,
      JSON.stringify({
        activePage,
        selectedSessionId,
      }),
    )
  }, [activePage, initializing, selectedSessionId])

  const handleNavigate = (page, params = {}) => {
    if (page === 'login') {
      localStorage.removeItem(DASHBOARD_STATE_KEY)
      setSelectedSessionId(null)
    }

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

  if (initializing) {
    return null
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
