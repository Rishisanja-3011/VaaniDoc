import { apiFetch } from './api.js'

// Doctor code format: VAN-XXXXXX (6 uppercase letters/digits)
export const DOCTOR_CODE_REGEX = /^VAN-[A-Z0-9]{6}$/

export function validateCodeFormat(code) {
  return DOCTOR_CODE_REGEX.test(code.trim().toUpperCase())
}

// Mock fallback used when VITE_API_URL is not set or backend returns 501.
const MOCK_DOCTORS = {
  'VAN-ABC123': { doctor_id: 'doc-1', doctor_name: 'Dr. Priya Sharma', doctor_code: 'VAN-ABC123', available: true, specialty: 'General Physician', clinic: 'Rural Health Centre, Anand' },
  'VAN-DEF456': { doctor_id: 'doc-2', doctor_name: 'Dr. Rajan Mehta',  doctor_code: 'VAN-DEF456', available: true, specialty: 'Pediatrician',       clinic: 'Community Clinic, Nadiad' },
  'VAN-GHI789': { doctor_id: 'doc-3', doctor_name: 'Dr. Sunita Patel', doctor_code: 'VAN-GHI789', available: true, specialty: 'General Physician',  clinic: 'PHC Balasinor' },
}

/**
 * Look up a doctor by code.
 * Backend: GET /doctors/{doctor_code}/join
 * Returns: { doctor_id, doctor_name, doctor_code, available }
 * Falls back to mock when backend is unavailable (501 / no VITE_API_URL).
 */
export async function lookupDoctor(code) {
  const key = code.trim().toUpperCase()

  // Vitest uses the mock service layer.
  if (import.meta.env.MODE === 'test' || !import.meta.env.VITE_API_URL) {
    await new Promise(r => setTimeout(r, 10))

    const doctor = MOCK_DOCTORS[key]

    if (!doctor) {
      const error = new Error('Doctor not found')
      error.status = 404
      throw error
    }

    return doctor
  }

  try {
    return await apiFetch(`/doctors/${key}/join`)
  } catch (err) {
    // Backend stub returns 501 — fall back to mock.
    if (err.status === 501) {
      const doctor = MOCK_DOCTORS[key]

      if (!doctor) {
        const error = new Error('Doctor not found')
        error.status = 404
        throw error
      }

      return doctor
    }

    throw err
  }
}

/**
 * Extract a doctor code from a scanned QR string.
 * Accepts: https://<host>/join/VAN-XXXXXX  OR  plain VAN-XXXXXX
 */
export function extractCodeFromQR(qrText) {
  try {
    const url = new URL(qrText)
    const parts = url.pathname.split('/')
    const idx = parts.indexOf('join')
    if (idx !== -1 && parts[idx + 1]) {
      const candidate = parts[idx + 1].toUpperCase()
      if (DOCTOR_CODE_REGEX.test(candidate)) return candidate
    }
  } catch {
    // not a URL
  }
  const candidate = qrText.trim().toUpperCase()
  return DOCTOR_CODE_REGEX.test(candidate) ? candidate : null
}
