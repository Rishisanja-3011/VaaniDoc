from datetime import datetime, timezone
from uuid import uuid4


SESSIONS: dict[str, dict] = {}


VALID_STATUSES = {
    "waiting",
    "active",
    "completed",
    "cancelled",
}


def create_session(doctor_id: str) -> dict:
    session_id = str(uuid4())

    session = {
        "session_id": session_id,
        "doctor_id": doctor_id,
        "status": "waiting",
        "input": None,
        "intake": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    SESSIONS[session_id] = session
    return session


def get_session(session_id: str) -> dict | None:
    return SESSIONS.get(session_id)


def update_session_status(session_id: str, status: str) -> dict | None:
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid session status: {status}")

    session = SESSIONS.get(session_id)

    if session is None:
        return None

    session["status"] = status
    return session


def save_patient_input(session_id: str, input_data: dict) -> dict | None:
    session = SESSIONS.get(session_id)

    if session is None:
        return None

    session["input"] = input_data
    return session


def save_intake(session_id: str, intake: dict) -> dict | None:
    session = SESSIONS.get(session_id)

    if session is None:
        return None

    session["intake"] = intake
    return session


def delete_session(session_id: str) -> bool:
    return SESSIONS.pop(session_id, None) is not None