const API_BASE_URL = 'http://127.0.0.1:8000'


// ============================================================
// GET AUTH TOKEN
// ============================================================

function getToken() {
    return localStorage.getItem(
        'vaanidoc_access_token'
    )
}


// ============================================================
// GENERIC API REQUEST
// ============================================================

export async function apiRequest(
    url,
    options = {}
) {
    const token = getToken()

    const response = await fetch(
        `${API_BASE_URL}${url}`,
        {
            ...options,

            headers: {
                ...(options.body
                    ? {
                        'Content-Type':
                            'application/json',
                    }
                    : {}),

                ...(token
                    ? {
                        Authorization:
                            `Bearer ${token}`,
                    }
                    : {}),

                ...(options.headers || {}),
            },
        }
    )

    const text = await response.text()

    let data = null

    try {
        data = text
            ? JSON.parse(text)
            : null
    } catch {
        data = text
    }

    if (!response.ok) {
        throw new Error(
            data?.detail ||
            `Request failed with status ${response.status}`
        )
    }

    return data
}


// ============================================================
// COMPATIBILITY API FETCH
// ============================================================
//
// Some existing dashboard components use apiFetch()
// while the newer session service uses apiRequest().
//
// Keep both available so the existing components continue
// working without changing every import.
//

export async function apiFetch(
    url,
    options = {}
) {
    return apiRequest(
        url,
        options
    )
}


// ============================================================
// AUTH TOKEN
// ============================================================

export function getAuthToken() {
    return getToken()
}


// ============================================================
// API BASE URL
// ============================================================

export { API_BASE_URL }