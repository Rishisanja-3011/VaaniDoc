// In-memory queue for a single pending submission.
// PRIVACY: this is never written to localStorage, sessionStorage, or any
// persistent store. It lives only in JS memory and is explicitly cleared
// when the session ends or the page unloads.

let _pending = null          // { sessionId, type, text?, audioBlob?, language }
let _state   = 'idle'        // idle | syncing | sent | failed
let _listeners = []

function notify() {
  _listeners.forEach(fn => fn(_state))
}

export function getQueueState() { return _state }

export function onQueueStateChange(fn) {
  _listeners.push(fn)
  return () => { _listeners = _listeners.filter(l => l !== fn) }
}

/**
 * Enqueue a submission to be sent when online.
 * Replaces any existing pending item (there is only ever one active session).
 */
export function enqueue(item) {
  _pending = item
  _state = 'idle'
  notify()
}

/**
 * Attempt to flush the queue using the provided submit function.
 * submitFn receives the pending item and must return a Promise.
 * Called automatically when the browser comes back online.
 */
export async function flush(submitFn) {
  if (!_pending || _state === 'syncing' || _state === 'sent') return
  _state = 'syncing'
  notify()
  try {
    await submitFn(_pending)
    _state = 'sent'
    _pending = null
    notify()
  } catch {
    _state = 'failed'
    notify()
  }
}

/**
 * Clear the queue and reset state.
 * Must be called when the session ends (complete/cancelled) to satisfy
 * the privacy requirement that patient data is not retained.
 */
export function clearQueue() {
  _pending = null
  _state = 'idle'
  notify()
}

export function hasPending() { return _pending !== null }

// Privacy: clear on page unload so data doesn't linger if the user closes the tab.
window.addEventListener('unload', clearQueue)
