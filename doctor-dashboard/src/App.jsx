import { useState } from 'react'
import Sidebar from './components/Sidebar'
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

  const handleNavigate = (page) => {
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

  if (activePage === 'login') {
    return <Login onNavigate={handleNavigate} />
  }

  if (activePage === 'register') {
    return <Register onNavigate={handleNavigate} />
  }

  if (activePage === 'doctor-code') {
    return <DoctorCode onNavigate={handleNavigate} />
  }

  const currentPage = pageConfig[activePage] || pageConfig.dashboard

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
      />

      <main className="main-content">
        <Header
          title={currentPage.title}
          subtitle={currentPage.subtitle}
        />

        {activePage === 'dashboard' && (
          <Dashboard onNavigate={handleNavigate} />
        )}

        {activePage === 'queue' && (
          <PatientQueue onNavigate={handleNavigate} />
        )}

        {activePage === 'current-patient' && (
          <CurrentPatient onNavigate={handleNavigate} />
        )}

        {activePage === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default App