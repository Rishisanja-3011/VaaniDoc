// @vitest-environment jsdom
/**
 * patient-app/tests/flow.test.mjs
 *
 * End-to-end patient flow test — runs against the mock service layer.
 * Run with:  npm test
 *
 * Covers the full patient journey:
 *   Join Doctor → QR/Code → Confirmation → Symptoms → Voice/Text
 *   → Submit → Processing → Waiting → Session Complete
 *
 * Also verifies all error paths and privacy cleanup.
 */

// ─── Service imports (mock mode: VITE_API_URL is '' via vite.config define) ──

import { validateCodeFormat, lookupDoctor, extractCodeFromQR } from '../src/services/doctorService.js'
import { createSession, submitTextInput, submitAudioInput, getSessionStatus, cancelSession } from '../src/services/sessionService.js'
import { enqueue, flush, clearQueue, hasPending, getQueueState } from '../src/services/syncQueue.js'
import { ERR, friendlyApiError } from '../src/services/errors.js'

const delay = ms => new Promise(r => setTimeout(r, ms))

// ─── 1. Doctor code validation ────────────────────────────────────────────────

describe('1. Doctor code validation', () => {
  it('accepts valid VAN-XXXXXX codes', () => {
    expect(validateCodeFormat('VAN-ABC123')).toBe(true)
    expect(validateCodeFormat('VAN-000000')).toBe(true)
    expect(validateCodeFormat('VAN-ZZZZZZ')).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(validateCodeFormat('')).toBe(false)
    expect(validateCodeFormat('ABC123')).toBe(false)
    expect(validateCodeFormat('VAN-AB')).toBe(false)
    expect(validateCodeFormat('VAN-ABCDEFG')).toBe(false)
    expect(validateCodeFormat('DOC-ABC123')).toBe(false)
  })
})

// ─── 2. QR code extraction ────────────────────────────────────────────────────

describe('2. QR code extraction', () => {
  it('extracts doctor code from a VaaniDoc join URL', () => {
    expect(extractCodeFromQR('https://app.vaanidoc.com/join/VAN-ABC123')).toBe('VAN-ABC123')
    expect(extractCodeFromQR('http://localhost:5173/join/VAN-XYZ999')).toBe('VAN-XYZ999')
  })

  it('returns null for invalid QR content', () => {
    expect(extractCodeFromQR('https://example.com')).toBeNull()
    expect(extractCodeFromQR('not-a-url')).toBeNull()
    expect(extractCodeFromQR('')).toBeNull()
  })
})

// ─── 3. Doctor lookup ─────────────────────────────────────────────────────────

describe('3. Doctor lookup (mock)', () => {
  it('resolves for a known code', async () => {
    const doctor = await lookupDoctor('VAN-ABC123')
    expect(doctor.doctor_id).toBeTruthy()
    expect(doctor.doctor_name || doctor.name).toBeTruthy()
  })

  it('rejects with status 404 for unknown code', async () => {
    await expect(lookupDoctor('VAN-XXXXXX')).rejects.toMatchObject({ status: 404 })
  })
})

// ─── 4. Session creation ──────────────────────────────────────────────────────

describe('4. Session creation (mock)', () => {
  it('creates a session with waiting status', async () => {
    const session = await createSession('doctor-001')
    expect(session.session_id).toBeTruthy()
    expect(session.status).toBe('waiting')
  })
})

// ─── 5. Text submission ───────────────────────────────────────────────────────

describe('5. Text submission (mock)', () => {
  it('submits text and returns received', async () => {
    const { session_id } = await createSession('doctor-001')
    const result = await submitTextInput(session_id, 'Mujhe sar dard hai aur bukhar hai.')
    expect(result.status).toBe('received')
  })
})

// ─── 6. Voice submission ──────────────────────────────────────────────────────

describe('6. Voice submission (mock)', () => {
  it('submits audio blob and returns received', async () => {
    const { session_id } = await createSession('doctor-001')
    const fakeBlob = new Uint8Array([0, 1, 2, 3])
    const result = await submitAudioInput(session_id, fakeBlob, 'hi')
    expect(result.status).toBe('received')
  })
})

// ─── 7. Session status lifecycle ──────────────────────────────────────────────

describe('7. Session status lifecycle (mock)', () => {
  it('progresses: waiting → processing → active → completed', async () => {
    const { session_id } = await createSession('doctor-001')

    expect((await getSessionStatus(session_id)).status).toBe('waiting')

    await delay(3100)
    expect((await getSessionStatus(session_id)).status).toBe('processing')

    await delay(3100)
    expect((await getSessionStatus(session_id)).status).toBe('active')

    await delay(4100)
    expect((await getSessionStatus(session_id)).status).toBe('completed')
  }, 15000)
})

// ─── 8. Session cancellation ──────────────────────────────────────────────────

describe('8. Session cancellation (mock)', () => {
  it('cancels a session', async () => {
    const { session_id } = await createSession('doctor-001')
    const result = await cancelSession(session_id)
    expect(result.status).toBe('cancelled')
  })
})

// ─── 9. Offline sync queue ────────────────────────────────────────────────────

describe('9. Offline sync queue', () => {
  beforeEach(() => clearQueue())

  it('starts empty', () => {
    expect(hasPending()).toBe(false)
    expect(getQueueState()).toBe('idle')
  })

  it('enqueues an item', () => {
    enqueue({ sessionId: 'sess-1', type: 'text', text: 'test', language: 'hi' })
    expect(hasPending()).toBe(true)
  })

  it('flushes successfully', async () => {
    enqueue({ sessionId: 'sess-1', type: 'text', text: 'test', language: 'hi' })
    let flushed = null
    await flush(async item => { flushed = item })
    expect(getQueueState()).toBe('sent')
    expect(flushed.sessionId).toBe('sess-1')
  })

  it('clearQueue removes all data (privacy cleanup)', () => {
    enqueue({ sessionId: 'priv', type: 'text', text: 'sensitive', language: 'gu' })
    expect(hasPending()).toBe(true)
    clearQueue()
    expect(hasPending()).toBe(false)
    expect(getQueueState()).toBe('idle')
  })

  it('marks failed when submit throws', async () => {
    enqueue({ sessionId: 'sess-2', type: 'text', text: 'test', language: 'hi' })
    await flush(async () => { throw new Error('network error') })
    expect(getQueueState()).toBe('failed')
  })
})

// ─── 10. Error messages ───────────────────────────────────────────────────────

describe('10. Error messages — non-diagnostic, user-friendly', () => {
  it('all ERR values are non-empty strings', () => {
    for (const [key, val] of Object.entries(ERR)) {
      expect(typeof val, `ERR.${key}`).toBe('string')
      expect(val.length, `ERR.${key} empty`).toBeGreaterThan(0)
    }
  })

  it('no ERR message contains diagnostic language', () => {
    const forbidden = ['you have', 'diagnosed', 'disease', 'condition is']
    for (const [key, val] of Object.entries(ERR)) {
      for (const phrase of forbidden) {
        expect(val.toLowerCase(), `ERR.${key} contains "${phrase}"`).not.toContain(phrase)
      }
    }
  })

  it('friendlyApiError: offline', () => {
    expect(friendlyApiError({ offline: true })).toBe(ERR.OFFLINE)
  })

  it('friendlyApiError: 404', () => {
    expect(friendlyApiError({ status: 404 })).toBe(ERR.SESSION_NOT_FOUND)
  })

  it('friendlyApiError: 409', () => {
    expect(friendlyApiError({ status: 409 })).toBe(ERR.SUBMIT_CONFLICT)
  })

  it('friendlyApiError: timeout (AbortError)', () => {
    expect(friendlyApiError({ name: 'AbortError' })).toBe(ERR.TIMEOUT)
  })
})

// ─── 11. Privacy ──────────────────────────────────────────────────────────────

describe('11. Privacy — patient data not persisted', () => {
  it('syncQueue is memory-only (no localStorage writes)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    enqueue({ sessionId: 'p1', type: 'text', text: 'symptom', language: 'gu' })
    clearQueue()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('clearQueue removes all pending patient data', () => {
    enqueue({ sessionId: 'p2', type: 'text', text: 'symptom', language: 'mr' })
    expect(hasPending()).toBe(true)
    clearQueue()
    expect(hasPending()).toBe(false)
  })
})
