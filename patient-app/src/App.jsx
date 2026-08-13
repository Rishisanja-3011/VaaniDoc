import { lazy, Suspense, useEffect } from 'react'
import {
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import JoinDoctor from './pages/JoinDoctor.jsx'
import DoctorConfirm from './pages/DoctorConfirm.jsx'
import SymptomInput from './pages/SymptomInput.jsx'
import InputReview from './pages/InputReview.jsx'
import WaitingRoom from './pages/WaitingRoom.jsx'
import {
  clearPatientSession,
  getPatientSessionStatus,
  getSavedPatientSession,
} from './services/sessionService.js'

const QRScanner = lazy(
  () => import('./pages/QRScanner.jsx')
)


// ============================================================
// WAITING ROOM ROUTE
// ============================================================
//
// React Router keeps :sessionId inside URL params.
// WaitingRoom expects sessionId as a normal prop.
//
// This wrapper connects the two.
//

function WaitingRoomRoute() {
  const { sessionId } = useParams()
  const { state } = useLocation()

  return (
      <WaitingRoom
      sessionId={sessionId}
      doctorName={state?.doctorName}
      doctorCode={state?.doctorCode}
    />
  )
}


// ============================================================
// ANIMATIONS
// ============================================================

const KEYFRAMES = `
  @keyframes spin {
    to {
      transform: rotate(360deg)
    }
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow:
        0 0 0 8px
        rgba(239,68,68,0.15)
    }

    50% {
      box-shadow:
        0 0 0 16px
        rgba(239,68,68,0.05)
    }
  }
`


// ============================================================
// APP
// ============================================================

export default function App() {
  const navigate = useNavigate()

  useEffect(() => {
    const savedSession = getSavedPatientSession()

    if (!savedSession?.sessionId || !savedSession?.currentPath) {
      return
    }

    if (window.location.pathname !== '/') {
      return
    }

    getPatientSessionStatus(savedSession.sessionId)
      .then((data) => {
        if (['completed', 'cancelled'].includes(data?.status)) {
          clearPatientSession()
          return
        }

        navigate(savedSession.currentPath, {
          replace: true,
          state: {
            sessionId: savedSession.sessionId,
            doctorCode: savedSession.doctorCode,
            doctorName: savedSession.doctorName,
            doctorId: savedSession.doctorId,
            ...(savedSession.reviewData || {}),
          },
        })
      })
      .catch((error) => {
        if (error?.status === 404) {
          clearPatientSession()
        }
      })
  }, [navigate])

  return (
    <>
      <style>
        {KEYFRAMES}
      </style>

      <Routes>

        {/* -------------------------------------------------- */}
        {/* DOCTOR JOIN */}
        {/* -------------------------------------------------- */}

        <Route
          path="/"
          element={<JoinDoctor />}
        />

        <Route
          path="/join/:doctorCode"
          element={<JoinDoctor />}
        />


        {/* -------------------------------------------------- */}
        {/* QR SCANNER */}
        {/* -------------------------------------------------- */}

        <Route
          path="/scan"
          element={
            <Suspense fallback={null}>
              <QRScanner />
            </Suspense>
          }
        />


        {/* -------------------------------------------------- */}
        {/* PATIENT CONSULTATION FLOW */}
        {/* -------------------------------------------------- */}

        <Route
          path="/confirm/:doctorCode"
          element={<DoctorConfirm />}
        />

        <Route
          path="/symptoms/:doctorCode"
          element={<SymptomInput />}
        />

        <Route
          path="/review/:doctorCode"
          element={<InputReview />}
        />


        {/* -------------------------------------------------- */}
        {/* WAITING ROOM */}
        {/* -------------------------------------------------- */}

        <Route
          path="/waiting/:sessionId"
          element={<WaitingRoomRoute />}
        />


        {/* -------------------------------------------------- */}
        {/* FALLBACK */}
        {/* -------------------------------------------------- */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </>
  )
}
