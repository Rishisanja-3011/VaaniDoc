// Base URL: set VITE_API_URL in .env  (e.g. http://localhost:8000)
// Falls back to same-origin /api for production deployments behind a reverse proxy.
const BASE = import.meta.env.VITE_API_URL ?? ''

const DEFAULT_TIMEOUT_MS = 15_000

/**
 * Thin fetch wrapper used by all service modules.
 * Throws a plain Error with a user-readable `.message` on any failure.
 */
export async function apiFetch(path, options = {}) {
  // Short-circuit immediately when the browser knows it is offline.
  // Avoids waiting for the full timeout on known-offline conditions.
  if (!navigator.onLine) {
    const err = new Error('You are offline. Please check your connection.')
    err.offline = true
    throw err
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        // Only set Content-Type for JSON bodies; let FormData set its own boundary.
        ...(options.body && !(options.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...options.headers,
      },
    })

    clearTimeout(timer)

    if (!res.ok) {
      let detail = `Request failed (${res.status})`
      try {
        const body = await res.json()
        if (body?.detail) detail = body.detail
      } catch { /* ignore parse errors */ }
      const err = new Error(detail)
      err.status = res.status
      throw err
    }

    // 204 No Content
    if (res.status === 204) return null
    return res.json()
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') throw new Error('Request timed out. Please check your connection.')
    throw err
  }
}
