import { apiFetch } from './api.js'

const USE_MOCK = !import.meta.env.VITE_API_URL

// ─── Session creation ────────────────────────────────────────────────────────

/**
 * Create a temporary consultation session for a doctor.
 * Backend: POST /sessions  { doctor_id }
 * Returns: { session_id, doctor_id, status, created_at }
 */
export async function createSession(doctorId) {
  if (USE_MOCK) {
    await delay(600)
    return { session_id: `mock-sess-${Date.now()}`, doctor_id: doctorId, status: 'waiting' }
  }
  return apiFetch('/sessions', {
    method: 'POST',
    body: JSON.stringify({ doctor_id: doctorId }),
  })
}

// ─── Input submission ────────────────────────────────────────────────────────

/**
 * Submit regional-language text for a session.
 * Backend: POST /sessions/{session_id}/input  { text }
 * Returns: { session_id, status: "received" }
 *
 * Note: language is sent to /processing/text by Person 3's pipeline after this.
 * We store language in session state only — not sent here per the backend contract.
 */
export async function submitTextInput(sessionId, text) {
  if (USE_MOCK) {
    await delay(800)
    return { session_id: sessionId, status: 'received' }
  }
  return apiFetch(`/sessions/${sessionId}/input`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

/**
 * Upload a voice recording blob for a session.
 * Backend: POST /sessions/{session_id}/audio  (multipart/form-data)
 *
 * This endpoint is not yet implemented by Person 3.
 * The FormData shape is agreed: field "audio" = Blob, field "language" = BCP-47 code.
 * Falls back to mock until the endpoint exists.
 */
export async function submitAudioInput(sessionId, audioBlob, language) {
  if (USE_MOCK) {
    await delay(1000)
    return { session_id: sessionId, status: 'received' }
  }
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.webm')
  form.append('language', language)
  return apiFetch(`/sessions/${sessionId}/audio`, {
    method: 'POST',
    body: form,
  })
}

// ─── Status polling ──────────────────────────────────────────────────────────

/**
 * Get current session status.
 * Backend: GET /sessions/{session_id}/status
 * Returns: { session_id, status }  — status: waiting | processing | active | completed | cancelled
 */
export async function getSessionStatus(sessionId) {
  if (USE_MOCK) {
    await delay(400)
    // Mock: advance status so the full UI flow can be tested end-to-end.
    const created = parseInt(sessionId.replace('mock-sess-', ''), 10)
    const age = Date.now() - created
    const status =
      age < 3000  ? 'waiting'    :
      age < 6000  ? 'processing' :
      age < 10000 ? 'active'     : 'completed'
    return { session_id: sessionId, status }
  }
  return apiFetch(`/sessions/${sessionId}/status`)
}

/**
 * Get full session (includes intake once AI processing is done).
 * Backend: GET /sessions/{session_id}
 */
export async function getSession(sessionId) {
  if (USE_MOCK) {
    await delay(400)
    return { session_id: sessionId, status: 'active', intake: null }
  }
  return apiFetch(`/sessions/${sessionId}`)
}

/**
 * Cancel an active session (patient-initiated).
 * Backend: POST /sessions/{session_id}/cancel
 */
export async function cancelSession(sessionId) {
  if (USE_MOCK) {
    await delay(300)
    return { session_id: sessionId, status: 'cancelled' }
  }
  return apiFetch(`/sessions/${sessionId}/cancel`, { method: 'POST' })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }
