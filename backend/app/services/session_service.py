from datetime import datetime, timezone

from app.core.supabase import supabase_admin


VALID_STATUSES = {
    "waiting",
    "processing",
    "ready",
    "active",
    "completed",
    "cancelled",
}


def _first_row(response):
    if not response.data:
        return None

    return response.data[0]


def create_session(doctor_id: str) -> dict:
    response = (
        supabase_admin
        .table("active_sessions")
        .insert(
            {
                "doctor_id": doctor_id,
                "status": "waiting",
            }
        )
        .execute()
    )

    session = _first_row(response)

    if session is None:
        raise RuntimeError("Failed to create consultation session.")

    return {
        "session_id": session["id"],
        "doctor_id": session["doctor_id"],
        "status": session["status"],
        "input": None,
        "intake": None,
        "created_at": session["created_at"],
    }


def get_session(session_id: str) -> dict | None:
    response = (
        supabase_admin
        .table("active_sessions")
        .select("*")
        .eq("id", session_id)
        .limit(1)
        .execute()
    )

    session = _first_row(response)

    if session is None:
        return None

    return {
        "session_id": session["id"],
        "doctor_id": session["doctor_id"],
        "status": session["status"],
        "created_at": session["created_at"],
        "started_at": session.get("started_at"),
        "completed_at": session.get("completed_at"),
        "expires_at": session.get("expires_at"),
    }


def update_session_status(
    session_id: str,
    status: str,
) -> dict | None:

    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid session status: {status}")

    update_data = {
        "status": status,
    }

    if status == "active":
        update_data["started_at"] = (
            datetime.now(timezone.utc).isoformat()
        )

    if status in {"completed", "cancelled"}:
        update_data["completed_at"] = (
            datetime.now(timezone.utc).isoformat()
        )

    response = (
        supabase_admin
        .table("active_sessions")
        .update(update_data)
        .eq("id", session_id)
        .execute()
    )

    session = _first_row(response)

    if session is None:
        return None

    return {
        "session_id": session["id"],
        "doctor_id": session["doctor_id"],
        "status": session["status"],
        "created_at": session["created_at"],
        "started_at": session.get("started_at"),
        "completed_at": session.get("completed_at"),
        "expires_at": session.get("expires_at"),
    }


def save_patient_input(
    session_id: str,
    input_data: dict,
) -> dict | None:

    session = get_session(session_id)

    if session is None:
        return None

    response = (
        supabase_admin
        .table("temporary_inputs")
        .insert(
            {
                "session_id": session_id,
                "input_type": input_data.get("type", "text"),
                "language": input_data.get("language"),
                "text_content": input_data.get("text"),
                "audio_reference": input_data.get(
                    "audio_reference"
                ),
            }
        )
        .execute()
    )

    row = _first_row(response)

    if row is None:
        return None

    return row


def save_intake(
    session_id: str,
    intake: dict,
) -> dict | None:

    session = get_session(session_id)

    if session is None:
        return None

    english = intake["english_intake"]

    payload = {
        "session_id": session_id,
        "chief_complaint": english["chief_complaint"],
        "symptoms": english["symptoms"],
        "negative_symptoms": english["negative_symptoms"],
        "duration": english["duration"],
        "relevant_history": english["relevant_history"],
        "medications": english["medications"],
        "allergies": english["allergies"],
        "possible_symptom_categories": (
            intake["possible_symptom_categories"]
        ),
        "urgency": intake["urgency"],
        "confidence": intake["confidence"],
    }

    response = (
        supabase_admin
        .table("temporary_intakes")
        .upsert(
            payload,
            on_conflict="session_id",
        )
        .execute()
    )

    return _first_row(response)


def delete_session(session_id: str) -> bool:
    response = (
        supabase_admin
        .table("active_sessions")
        .delete()
        .eq("id", session_id)
        .execute()
    )

    return bool(response.data)