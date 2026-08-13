import { useEffect, useRef, useState } from 'react'

import {
  getPatientSessionStatus,
  cancelSession,
  clearPatientSession,
} from '../services/sessionService.js'


export default function WaitingRoom({
  sessionId,
  patientName,
  doctorCode,
  onCancelled,
  onActive,
  onCompleted,
}) {

  const [status, setStatus] =
    useState('waiting')

  const [error, setError] =
    useState(null)

  const pollingRef =
    useRef(null)


  // ==========================================================
  // POLL SESSION STATUS
  // ==========================================================

  useEffect(() => {

    if (!sessionId) {
      setError(
        'No consultation session was found.'
      )

      return
    }


    let cancelled = false


    async function checkStatus() {

      try {

        const data =
          await getPatientSessionStatus(
            sessionId
          )


        if (cancelled) {
          return
        }


        const currentStatus =
          data?.status


        if (!currentStatus) {
          return
        }


        setStatus(
          currentStatus
        )


        // ----------------------------------------------------
        // DOCTOR STARTED
        // ----------------------------------------------------

        if (
          currentStatus === 'active'
        ) {

          if (pollingRef.current) {
            clearInterval(
              pollingRef.current
            )
          }

          onActive?.(data)

          return
        }


        // ----------------------------------------------------
        // CONSULTATION COMPLETED
        // ----------------------------------------------------

        if (
          currentStatus === 'completed'
        ) {

          if (pollingRef.current) {
            clearInterval(
              pollingRef.current
            )
          }

          onCompleted?.(data)

          return
        }


        // ----------------------------------------------------
        // CANCELLED
        // ----------------------------------------------------

        if (
          currentStatus === 'cancelled'
        ) {

          if (pollingRef.current) {
            clearInterval(
              pollingRef.current
            )
          }

          clearPatientSession()

          onCancelled?.(data)
        }

      } catch (err) {

        console.error(
          'Patient status error:',
          err
        )


        // ----------------------------------------------------
        // SESSION NO LONGER EXISTS
        // ----------------------------------------------------

        if (
          err.status === 404
        ) {

          if (pollingRef.current) {
            clearInterval(
              pollingRef.current
            )
          }


          clearPatientSession()


          setError(
            'This consultation session is no longer available. Please reconnect with your doctor.'
          )

          return
        }


        // ----------------------------------------------------
        // TEMPORARY CONNECTION PROBLEM
        // ----------------------------------------------------

        setError(
          'Connection issue — retrying...'
        )
      }
    }


    // Check immediately
    checkStatus()


    // Then poll every 3 seconds
    pollingRef.current =
      setInterval(
        checkStatus,
        3000
      )


    return () => {

      cancelled = true

      if (pollingRef.current) {
        clearInterval(
          pollingRef.current
        )
      }
    }

  }, [
    sessionId,
    onActive,
    onCompleted,
    onCancelled,
  ])


  // ==========================================================
  // CANCEL
  // ==========================================================

  async function handleCancel() {

    try {

      if (sessionId) {

        await cancelSession(
          sessionId
        )
      }

    } catch (err) {

      console.error(
        'Cancel session failed:',
        err
      )

    } finally {

      clearPatientSession()

      onCancelled?.()
    }
  }


  // ==========================================================
  // SESSION MISSING
  // ==========================================================

  if (!sessionId) {

    return (
      <div className="waiting-room">

        <h2>
          Consultation unavailable
        </h2>

        <p>
          No active consultation session
          was found.
        </p>

      </div>
    )
  }


  // ==========================================================
  // SESSION EXPIRED / DELETED
  // ==========================================================

  if (
    error &&
    error !== 'Connection issue — retrying...'
  ) {

    return (
      <div className="waiting-room">

        <h2>
          Consultation unavailable
        </h2>

        <p>
          {error}
        </p>

        <button
          onClick={() => {
            clearPatientSession()
            onCancelled?.()
          }}
        >
          Connect Again
        </button>

      </div>
    )
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="waiting-room">

      <h1>
        Waiting for your doctor
      </h1>


      <p>
        Your symptoms have been received.
        Please wait nearby.
      </p>


      {patientName && (
        <strong>
          {patientName}
        </strong>
      )}


      {doctorCode && (
        <span>
          {doctorCode}
        </span>
      )}


      <div className="status">

        {status === 'waiting' && (
          <>
            <span>
              ●
            </span>

            Waiting for doctor
          </>
        )}


        {status === 'processing' && (
          <>
            <span>
              ●
            </span>

            Preparing your consultation
          </>
        )}


        {status === 'active' && (
          <>
            <span>
              ●
            </span>

            Doctor is ready
          </>
        )}


        {error ===
          'Connection issue — retrying...' && (
            <p>
              Connection issue — retrying...
            </p>
          )}

      </div>


      <button
        type="button"
        onClick={handleCancel}
      >
        Cancel Session
      </button>

    </div>
  )
}