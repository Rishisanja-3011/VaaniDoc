import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import JoinDoctor from './pages/JoinDoctor.jsx'
import DoctorConfirm from './pages/DoctorConfirm.jsx'
import SymptomInput from './pages/SymptomInput.jsx'
import InputReview from './pages/InputReview.jsx'
import WaitingRoom from './pages/WaitingRoom.jsx'
const QRScanner = lazy(() => import('./pages/QRScanner.jsx'))

const KEYFRAMES = `
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 0 8px rgba(239,68,68,0.15) } 50% { box-shadow: 0 0 0 16px rgba(239,68,68,0.05) } }
`

export default function App() {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <Routes>
        <Route path="/" element={<JoinDoctor />} />
        <Route path="/join/:doctorCode" element={<JoinDoctor />} />
        <Route path="/scan" element={<Suspense fallback={null}><QRScanner /></Suspense>} />
        <Route path="/confirm/:doctorCode" element={<DoctorConfirm />} />
        <Route path="/symptoms/:doctorCode" element={<SymptomInput />} />
        <Route path="/review/:doctorCode" element={<InputReview />} />
        <Route path="/waiting/:sessionId" element={<WaitingRoom />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
