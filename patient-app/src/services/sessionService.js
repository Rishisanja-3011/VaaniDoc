import { apiFetch } from './api.js'


// ============================================================
// MOCK MODE
// ============================================================
//
// We only use mock mode if explicitly enabled.
//
// Do NOT automatically use mock mode just because
// VITE_API_URL is missing.
//
// This prevents accidental fake sessions.
//

const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true'


// ============================================================
// SESSION CREATION
// ============================================================

/**
 * Create a temporary consultation session.
 *
 * Backend:
 * POST /sessions/join
 *
 * Body:
 * {
 *   doctor_code
 * }
 *
 * Response:
 * {
 *   session_id,
 *   doctor_code,
 *   status
 * }
 */

export async function createSession(
  doctorCode
) {

  if (!doctorCode) {
    throw new Error(
      'Doctor code is required.'
    )
  }


  const cleanDoctorCode =
    doctorCode.trim().toUpperCase()


  // ----------------------------------------------------------
  // MOCK
  // ----------------------------------------------------------

  if (USE_MOCK) {

    await delay(500)

    const sessionId =
      `mock-sess-${Date.now()}`

    return {
      session_id: sessionId,
      doctor_code: cleanDoctorCode,
      status: 'waiting',
    }
  }


  // ----------------------------------------------------------
  // REAL BACKEND
  // ----------------------------------------------------------

  return apiFetch(
    '/sessions/join',
    {
      method: 'POST',

      body: JSON.stringify({
        doctor_code: cleanDoctorCode,
      }),
    }
  )
}


// ============================================================
// PATIENT INPUT
// ============================================================

/**
 * Submit patient text.
 *
 * Backend:
 * POST /sessions/{session_id}/input
 */

export async function submitTextInput(
  sessionId,
  text,
  language
) {

  if (!sessionId) {
    throw new Error(
      'Session ID is missing.'
    )
  }


  if (!text || !text.trim()) {
    throw new Error(
      'Please enter your symptoms.'
    )
  }


  if (USE_MOCK) {

    await delay(500)

    return {
      session_id: sessionId,
      status: 'received',
    }
  }


  return apiFetch(
    `/sessions/${sessionId}/input`,
    {
      method: 'POST',

      body: JSON.stringify({
        text: text.trim(),
        language: language || 'en',
      }),
    }
  )
}


// ============================================================
// AUDIO INPUT
// ============================================================

/**
 * Upload patient voice recording.
 *
 * Backend:
 * POST /sessions/{session_id}/audio
 */

export async function submitAudioInput(
  sessionId,
  audioBlob,
  language
) {

  if (!sessionId) {
    throw new Error(
      'Session ID is missing.'
    )
  }


  if (!audioBlob) {
    throw new Error(
      'Audio recording is missing.'
    )
  }


  if (USE_MOCK) {

    await delay(500)

    return {
      session_id: sessionId,
      status: 'received',
    }
  }


  const form = new FormData()


  form.append(
    'audio',
    audioBlob,
    'recording.webm'
  )


  form.append(
    'language',
    language || 'en'
  )


  return apiFetch(
    `/sessions/${sessionId}/audio`,
    {
      method: 'POST',
      body: form,
    }
  )
}


// ============================================================
// AI PROCESSING
// ============================================================

/**
 * Process patient input.
 *
 * Backend:
 * POST /processing/session/{session_id}
 */

export async function processSession(
  sessionId
) {

  if (!sessionId) {
    throw new Error(
      'Session ID is missing.'
    )
  }


  if (USE_MOCK) {

    await delay(1000)

    return {
      language: 'en',

      english_intake: {
        chief_complaint:
          'Fever and headache',

        symptoms: [
          'Fever',
          'Headache',
        ],

        negative_symptoms: [],

        duration:
          'since yesterday',

        relevant_history: [],

        medications: [],

        allergies: [],
      },

      possible_symptom_categories: [
        'General/Systemic',
        'Neurological',
      ],

      urgency: 'moderate',

      confidence: {
        symptoms: 1,
        category: 0.9,
        urgency: 0.8,
      },
    }
  }


  return apiFetch(
    `/processing/session/${sessionId}`,
    {
      method: 'POST',
    }
  )
}


// ============================================================
// PATIENT STATUS
// ============================================================

/**
 * IMPORTANT:
 *
 * This is the patient-facing endpoint.
 *
 * Backend:
 * GET /sessions/{session_id}/patient-status
 *
 * DO NOT use:
 * GET /sessions/{session_id}/status
 *
 * because /status is doctor-only.
 */

export async function getPatientSessionStatus(
  sessionId
) {

  if (!sessionId) {
    throw new Error(
      'Session ID is missing.'
    )
  }


  // ----------------------------------------------------------
  // MOCK
  // ----------------------------------------------------------

  if (USE_MOCK) {

    await delay(300)

    const created =
      parseInt(
        sessionId.replace(
          'mock-sess-',
          ''
        ),
        10
      )

    const age =
      Date.now() - created


    let status = 'waiting'


    if (age >= 10000) {
      status = 'completed'
    } else if (age >= 6000) {
      status = 'active'
    } else if (age >= 3000) {
      status = 'processing'
    }


    return {
      session_id: sessionId,
      status,
    }
  }


  // ----------------------------------------------------------
  // REAL BACKEND
  // ----------------------------------------------------------

  return apiFetch(
    `/sessions/${sessionId}/patient-status`
  )
}


// ============================================================
// ALIAS
// ============================================================
//
// If any existing component imports:
//
// getSessionStatus()
//
// it will still work.
//

export async function getSessionStatus(
  sessionId
) {
  return getPatientSessionStatus(
    sessionId
  )
}


// ============================================================
// FULL SESSION
// ============================================================

/**
 * Get complete session.
 *
 * IMPORTANT:
 * This endpoint may be protected depending
 * on backend implementation.
 *
 * Patient pages should normally use
 * patient-status instead.
 */

export async function getSession(
  sessionId
) {

  if (!sessionId) {
    throw new Error(
      'Session ID is missing.'
    )
  }


  if (USE_MOCK) {

    await delay(300)

    return {
      session_id: sessionId,
      status: 'active',
      intake: null,
    }
  }


  return apiFetch(
    `/sessions/${sessionId}`
  )
}


// ============================================================
// CANCEL SESSION
// ============================================================

/**
 * Cancel patient consultation.
 *
 * Backend:
 * POST /sessions/{session_id}/cancel
 */

export async function cancelSession(
  sessionId
) {

  if (!sessionId) {
    throw new Error(
      'Session ID is missing.'
    )
  }


  if (USE_MOCK) {

    await delay(300)

    return {
      session_id: sessionId,
      status: 'cancelled',
    }
  }


  return apiFetch(
    `/sessions/${sessionId}/cancel`,
    {
      method: 'POST',
    }
  )
}


// ============================================================
// LOCAL SESSION STORAGE
// ============================================================

const STORAGE_KEY =
  'vaanidoc_patient_session'


export function savePatientSession(
  session
) {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(session)
  )
}


export function getSavedPatientSession() {

  const raw =
    localStorage.getItem(
      STORAGE_KEY
    )


  if (!raw) {
    return null
  }


  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(
      STORAGE_KEY
    )

    return null
  }
}


export function clearPatientSession() {

  localStorage.removeItem(
    STORAGE_KEY
  )
}


// ============================================================
// HELPER
// ============================================================

function delay(ms) {

  return new Promise(
    resolve => {
      setTimeout(
        resolve,
        ms
      )
    }
  )
}