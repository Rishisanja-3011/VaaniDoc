import { apiFetch } from './api.js'


// ============================================================
// MOCK MODE
// ============================================================
//
// Mock mode is enabled only when explicitly requested:
//
// VITE_USE_MOCK=true
//
// Otherwise the real VaaniDoc backend is always used.
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

  if (USE_MOCK) {
    await delay(500)

    return {
      session_id:
        `mock-sess-${Date.now()}`,
      doctor_code:
        cleanDoctorCode,
      status: 'waiting',
    }
  }

  return apiFetch(
    '/sessions/join',
    {
      method: 'POST',
      body: JSON.stringify({
        doctor_code:
          cleanDoctorCode,
      }),
    }
  )
}


// ============================================================
// PATIENT TEXT INPUT
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
      session_id:
        sessionId,
      status: 'received',
    }
  }

  return apiFetch(
    `/sessions/${sessionId}/input`,
    {
      method: 'POST',
      body: JSON.stringify({
        text:
          text.trim(),
        language:
          language || 'en',
      }),
    }
  )
}


// ============================================================
// PATIENT AUDIO INPUT
// ============================================================

/**
 * Submit patient voice recording.
 *
 * IMPORTANT:
 * This endpoint must exist in the backend before
 * the patient app can use it.
 *
 * Backend expected:
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
      session_id:
        sessionId,
      status: 'received',
    }
  }

  const form =
    new FormData()

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

      urgency:
        'moderate',

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
 * Get patient-facing session status.
 *
 * Backend:
 * GET /sessions/{session_id}/patient-status
 *
 * IMPORTANT:
 * Do NOT use /status here.
 * /status is doctor-only.
 */

export async function getPatientSessionStatus(
  sessionId
) {
  if (!sessionId) {
    throw new Error(
      'Session ID is missing.'
    )
  }

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

    let sessionStatus =
      'waiting'

    if (age >= 10000) {
      sessionStatus =
        'completed'
    } else if (age >= 6000) {
      sessionStatus =
        'active'
    } else if (age >= 3000) {
      sessionStatus =
        'processing'
    }

    return {
      session_id:
        sessionId,
      status:
        sessionStatus,
    }
  }

  return apiFetch(
    `/sessions/${sessionId}/patient-status`
  )
}


// ============================================================
// STATUS ALIAS
// ============================================================

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
 * Get consultation session.
 *
 * Patient pages should normally prefer
 * getPatientSessionStatus().
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
      session_id:
        sessionId,
      status:
        'active',
      intake:
        null,
    }
  }

  return apiFetch(
    `/sessions/${sessionId}`
  )
}


// ============================================================
// PATIENT CANCEL
// ============================================================

/**
 * Cancel the patient consultation.
 *
 * Backend:
 * POST /sessions/{session_id}/patient-cancel
 *
 * IMPORTANT:
 * This is intentionally different from
 * the doctor cancellation endpoint.
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
      session_id:
        sessionId,
      status:
        'cancelled',
    }
  }

  return apiFetch(
    `/sessions/${sessionId}/patient-cancel`,
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