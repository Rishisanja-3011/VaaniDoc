import { apiFetch } from './api'

export async function getPatientQueue() {
    return apiFetch('/sessions/queue')
}

export async function getPatientSession(
    sessionId,
) {
    return apiFetch(
        `/sessions/queue/${sessionId}`,
    )
}

export async function startPatientSession(
    sessionId,
) {
    return apiFetch(
        `/sessions/${sessionId}/start`,
        {
            method: 'POST',
        },
    )
}

export async function completePatientSession(
    sessionId,
) {
    return apiFetch(
        `/sessions/${sessionId}/complete`,
        {
            method: 'POST',
        },
    )
}