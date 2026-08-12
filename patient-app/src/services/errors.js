// Central map of user-facing error messages.
// All patient-facing strings must be non-diagnostic and non-technical.
// Never say "You have X disease." — VaaniDoc is an intake assistant, not a diagnosis system.

export const ERR = {
  // Network / connectivity
  OFFLINE:          'You are not connected to the internet. Please check your connection and try again.',
  TIMEOUT:          'The request took too long. Please check your connection and try again.',
  NETWORK:          'Could not reach the server. Please check your connection and try again.',

  // Doctor lookup
  DOCTOR_NOT_FOUND: 'No doctor was found with that code. Please check the code and try again.',
  DOCTOR_UNAVAILABLE: 'This doctor is not available right now. Please try a different code.',

  // Session
  SESSION_START:    'Could not start your session. Please try again.',
  SESSION_EXPIRED:  'Your session has expired. Please scan the QR code or enter the doctor code again.',
  SESSION_NOT_FOUND:'Your session could not be found. Please start a new session.',

  // Submission
  SUBMIT_FAILED:    'Your symptoms could not be sent. Please try again.',
  SUBMIT_CONFLICT:  'This session is no longer active. Please start a new session.',

  // QR / camera
  CAMERA_DENIED:    'Camera access was denied. Please allow camera access in your browser settings and try again.',
  CAMERA_NOT_FOUND: 'No camera was found on this device.',
  CAMERA_ERROR:     'Could not start the camera. Please try again.',
  QR_INVALID:       'This QR code is not a valid VaaniDoc doctor code. Please ask your doctor for the correct QR.',

  // Microphone / recording
  MIC_DENIED:       'Microphone access was denied. Please allow microphone access in your browser settings and try again.',
  MIC_NOT_FOUND:    'No microphone was found on this device.',
  MIC_ERROR:        'Could not start recording. Please try again.',
  RECORD_FAILED:    'Recording failed unexpectedly. Please try again.',

  // Generic fallback
  UNKNOWN:          'Something went wrong. Please try again.',
}

/**
 * Map an API error (from apiFetch) to a user-friendly message.
 * Never exposes raw server error strings to the patient.
 */
export function friendlyApiError(err) {
  if (err?.offline)       return ERR.OFFLINE
  if (err?.name === 'AbortError' || err?.message?.includes('timed out')) return ERR.TIMEOUT
  if (err?.status === 404) return ERR.SESSION_NOT_FOUND
  if (err?.status === 409) return ERR.SUBMIT_CONFLICT
  if (err?.status === 503 || err?.status === 502) return ERR.NETWORK
  if (!navigator.onLine)  return ERR.OFFLINE
  return ERR.NETWORK
}
