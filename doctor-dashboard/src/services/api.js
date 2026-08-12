const API_URL =
    import.meta.env.VITE_API_URL ||
    'http://127.0.0.1:8000'

export async function apiFetch(
    path,
    options = {},
) {
    const token = localStorage.getItem(
        'vaanidoc_access_token',
    )

    const headers = {
        ...(options.body
            ? {
                'Content-Type':
                    'application/json',
            }
            : {}),
        ...(options.headers || {}),
    }

    if (token) {
        headers.Authorization =
            `Bearer ${token}`
    }

    const response = await fetch(
        `${API_URL}${path}`,
        {
            ...options,
            headers,
        },
    )

    let data = null

    try {
        data = await response.json()
    } catch {
        // No JSON body.
    }

    if (!response.ok) {
        const error = new Error(
            data?.detail ||
            `Request failed (${response.status})`,
        )

        error.status = response.status

        throw error
    }

    return data
}