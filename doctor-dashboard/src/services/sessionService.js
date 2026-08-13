import { apiRequest } from './api.js'

// ============================================================
// DOCTOR QUEUE
// ============================================================

export async function getSessionQueue() {
  return apiRequest(
    '/sessions/queue'
  )
}


// ============================================================
// SINGLE QUEUE PATIENT
// ============================================================

export async function getQueuePatient(sessionId) {
  return apiRequest(
    `/sessions/queue/${sessionId}`
  )
}


// ============================================================
// GET FULL SESSION
// ============================================================

export async function getSession(sessionId) {
  return apiRequest(
    `/sessions/${sessionId}`
  )
}


// ============================================================
// GET SESSION STATUS
// ============================================================

export async function getSessionStatus(sessionId) {
  return apiRequest(
    `/sessions/${sessionId}/status`
  )
}


// ============================================================
// START CONSULTATION
// ============================================================

export async function startSession(sessionId) {
  return apiRequest(
    `/sessions/${sessionId}/start`,
    {
      method: 'POST',
    }
  )
}


// ============================================================
// UPDATE SESSION STATUS
// ============================================================

export async function updateSessionStatus(
  sessionId,
  status
) {
  return apiRequest(
    `/sessions/${sessionId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status,
      }),
    }
  )
}


// ============================================================
// COMPLETE CONSULTATION
// ============================================================

export async function completeSession(sessionId) {
  return apiRequest(
    `/sessions/${sessionId}/complete`,
    {
      method: 'POST',
    }
  )
}


// ============================================================
// CANCEL CONSULTATION
// ============================================================

export async function cancelSession(sessionId) {
  return apiRequest(
    `/sessions/${sessionId}/cancel`,
    {
      method: 'POST',
    }
  )
}