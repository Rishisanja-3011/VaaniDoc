from datetime import datetime, timedelta, timezone

from app.core.supabase import supabase_admin


VALID_STATUSES = {
    "waiting",
    "processing",
    "ready",
    "active",
    "completed",
    "cancelled",
}


# ============================================================
# VALID SESSION STATE TRANSITIONS
# ============================================================

ALLOWED_TRANSITIONS = {
    "waiting": {
        "processing",
        "cancelled",
    },
    "processing": {
        "waiting",
        "ready",
        "cancelled",
    },
    "ready": {
        "active",
        "cancelled",
    },
    "active": {
        "completed",
        "cancelled",
    },
    "completed": set(),
    "cancelled": set(),
}


# Abandoned sessions are temporary and should not remain forever.
SESSION_TTL_MINUTES = 30


def _first_row(response):
    if not response.data:
        return None

    return response.data[0]


def _session_response(session: dict) -> dict:
    return {
        "session_id": session["id"],
        "doctor_id": session["doctor_id"],
        "status": session["status"],
        "created_at": session["created_at"],
        "started_at": session.get("started_at"),
        "completed_at": session.get("completed_at"),
        "expires_at": session.get("expires_at"),
    }


# ============================================================
# CREATE SESSION
# ============================================================

def create_session(doctor_id: str) -> dict:
    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=SESSION_TTL_MINUTES)
    ).isoformat()

    response = (
        supabase_admin
        .table("active_sessions")
        .insert(
            {
                "doctor_id": doctor_id,
                "status": "waiting",
                "expires_at": expires_at,
            }
        )
        .execute()
    )

    session = _first_row(response)

    if session is None:
        raise RuntimeError(
            "Failed to create consultation session."
        )

    return {
        "session_id": session["id"],
        "doctor_id": session["doctor_id"],
        "status": session["status"],
        "input": None,
        "intake": None,
        "created_at": session["created_at"],
        "expires_at": session.get("expires_at"),
    }


# ============================================================
# GET SESSION
# ============================================================

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

    return _session_response(session)


# ============================================================
# GET DOCTOR QUEUE
# ============================================================

def get_doctor_sessions(
    doctor_id: str,
) -> list[dict]:
    """
    Return patients whose AI intake is ready for consultation.

    Waiting / processing patients are intentionally excluded.
    Completed / cancelled patients are also excluded.
    """

    response = (
        supabase_admin
        .table("active_sessions")
        .select("*")
        .eq("doctor_id", doctor_id)
        .eq("status", "ready")
        .order(
            "created_at",
            desc=False,
        )
        .execute()
    )

    sessions = []

    for session in response.data or []:
        sessions.append(
            _session_response(session)
        )

    return sessions


# ============================================================
# GET LATEST PATIENT INPUT
# ============================================================

def get_session_input(
    session_id: str,
) -> dict | None:
    """
    Return the latest temporary patient input.
    """

    response = (
        supabase_admin
        .table("temporary_inputs")
        .select("*")
        .eq("session_id", session_id)
        .order(
            "created_at",
            desc=True,
        )
        .limit(1)
        .execute()
    )

    return _first_row(response)


# ============================================================
# GET AI INTAKE
# ============================================================

def get_session_intake(
    session_id: str,
) -> dict | None:
    """
    Return the temporary AI-generated intake.
    """

    response = (
        supabase_admin
        .table("temporary_intakes")
        .select("*")
        .eq("session_id", session_id)
        .limit(1)
        .execute()
    )

    return _first_row(response)


# ============================================================
# UPDATE SESSION STATUS
# ============================================================

def update_session_status(
    session_id: str,
    status: str,
) -> dict | None:

    if status not in VALID_STATUSES:
        raise ValueError(
            f"Invalid session status: {status}"
        )

    current_session = get_session(session_id)

    if current_session is None:
        return None

    current_status = current_session["status"]

    if status == current_status:
        raise ValueError(
            f"Session is already in status: {status}"
        )

    allowed_statuses = ALLOWED_TRANSITIONS.get(
        current_status,
        set(),
    )

    if status not in allowed_statuses:
        raise ValueError(
            f"Invalid session transition: "
            f"{current_status} -> {status}"
        )

    update_data = {
        "status": status,
    }

    if status == "active":
        update_data["started_at"] = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

    if status in {
        "completed",
        "cancelled",
    }:
        update_data["completed_at"] = (
            datetime.now(
                timezone.utc
            ).isoformat()
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

    return _session_response(session)


# ============================================================
# SAVE PATIENT INPUT
# ============================================================

def save_patient_input(
    session_id: str,
    input_data: dict,
) -> dict | None:

    session = get_session(session_id)

    if session is None:
        return None

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        return None

    response = (
        supabase_admin
        .table("temporary_inputs")
        .insert(
            {
                "session_id": session_id,
                "input_type": input_data.get(
                    "type",
                    "text",
                ),
                "language": input_data.get(
                    "language"
                ),
                "text_content": input_data.get(
                    "text"
                ),
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


# ============================================================
# SAVE AI INTAKE
# ============================================================

def save_intake(
    session_id: str,
    intake: dict,
) -> dict | None:

    session = get_session(session_id)

    if session is None:
        return None

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        return None

    english = intake["english_intake"]

    payload = {
        "session_id": session_id,
        "chief_complaint": english[
            "chief_complaint"
        ],
        "symptoms": english[
            "symptoms"
        ],
        "negative_symptoms": english[
            "negative_symptoms"
        ],
        "duration": english[
            "duration"
        ],
        "relevant_history": english[
            "relevant_history"
        ],
        "medications": english[
            "medications"
        ],
        "allergies": english[
            "allergies"
        ],
        "possible_symptom_categories": (
            intake[
                "possible_symptom_categories"
            ]
        ),
        "urgency": intake[
            "urgency"
        ],
        "confidence": intake[
            "confidence"
        ],
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


# ============================================================
# DELETE SESSION
# ============================================================

def delete_session(
    session_id: str,
) -> bool:

    response = (
        supabase_admin
        .table("active_sessions")
        .delete()
        .eq("id", session_id)
        .execute()
    )

    return bool(response.data)


def cleanup_expired_sessions(max_age_hours: int = 4) -> int:
    """
    Deletes active_sessions older than max_age_hours (default 4 hours).
    Cascading foreign keys in Supabase automatically delete temporary_inputs and temporary_intakes.
    """
    try:
        from datetime import datetime, timezone
        cutoff = datetime.now(timezone.utc).isoformat()

        response = (
            supabase_admin
            .table("active_sessions")
            .delete()
            .lt("expires_at", cutoff)
            .execute()
        )
        return len(response.data) if response.data else 0
    except Exception:
        return 0
