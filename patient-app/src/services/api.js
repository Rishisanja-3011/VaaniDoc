// ============================================================
// VAANIDOC API CLIENT
// ============================================================

// In development:
// VITE_API_URL=http://127.0.0.1:8000
//
// In production:
// VITE_API_URL=https://your-backend-domain.com

const BASE = (
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:8000'
).replace(/\/$/, '')

const DEFAULT_TIMEOUT_MS = 15_000


// ============================================================
// API FETCH
// ============================================================

export async function apiFetch(path, options = {}) {
  // ----------------------------------------------------------
  // Offline check
  // ----------------------------------------------------------

  if (!navigator.onLine) {
    const error = new Error(
      'You are offline. Please check your internet connection.'
    )

    error.offline = true

    throw error
  }


  // ----------------------------------------------------------
  // Abort timeout
  // ----------------------------------------------------------

  const controller = new AbortController()

  const timer = setTimeout(() => {
    controller.abort()
  }, DEFAULT_TIMEOUT_MS)


  try {
    // --------------------------------------------------------
    // Headers
    // --------------------------------------------------------

    const headers = {
      ...(options.body && !(options.body instanceof FormData)
        ? {
          'Content-Type': 'application/json',
        }
        : {}),
      ...(options.headers || {}),
    }


    // --------------------------------------------------------
    // Authentication
    //
    // Patient endpoints do NOT require the doctor token.
    //
    // If a token exists, we send it.
    // --------------------------------------------------------

    const token = localStorage.getItem(
      'vaanidoc_access_token'
    )

    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`
    }


    // --------------------------------------------------------
    // Request
    // --------------------------------------------------------

    const response = await fetch(
      `${BASE}${path}`,
      {
        ...options,
        headers,
        signal: controller.signal,
      }
    )


    clearTimeout(timer)


    // --------------------------------------------------------
    // 204 No Content
    // --------------------------------------------------------

    if (response.status === 204) {
      return null
    }


    // --------------------------------------------------------
    // Read response
    // --------------------------------------------------------

    let data = null

    const contentType =
      response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch {
        data = null
      }
    } else {
      try {
        data = await response.text()
      } catch {
        data = null
      }
    }


    // --------------------------------------------------------
    // Error response
    // --------------------------------------------------------

    if (!response.ok) {
      let message =
        `Request failed (${response.status})`

      if (
        data &&
        typeof data === 'object' &&
        data.detail
      ) {
        message = data.detail
      } else if (
        typeof data === 'string' &&
        data.length > 0
      ) {
        message = data
      }


      const error = new Error(message)

      error.status = response.status
      error.data = data

      throw error
    }


    return data

  } catch (error) {

    clearTimeout(timer)


    if (error.name === 'AbortError') {
      const timeoutError = new Error(
        'Request timed out. Please check your connection.'
      )

      timeoutError.timeout = true

      throw timeoutError
    }


    throw error
  }
}


// ============================================================
// AUTHENTICATED REQUEST
// ============================================================
//
// Useful for doctor dashboard APIs.
//

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(
    'vaanidoc_access_token'
  )

  return apiFetch(
    path,
    {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token
          ? {
            Authorization: `Bearer ${token}`,
          }
          : {}),
      },
    }
  )
}


// ============================================================
// BASE URL EXPORT
// ============================================================

export { BASE }