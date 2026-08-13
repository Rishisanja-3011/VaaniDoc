from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from postgrest.exceptions import APIError

from app.core.auth import get_current_user
from app.core.supabase import supabase_admin
from app.services.session_service import (
    create_session,
    delete_session,
    get_doctor_sessions,
    get_session,
    get_session_input,
    get_session_intake,
    save_patient_input,
    update_session_status,
)

router = APIRouter(
    prefix="/sessions",
    tags=["Sessions"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class JoinSessionRequest(BaseModel):
    doctor_code: str = Field(
        min_length=1,
        max_length=20,
    )


class PatientInputRequest(BaseModel):
    text: str = Field(
        min_length=1,
    )
    language: str = Field(
        min_length=2,
        max_length=10,
    )


# ============================================================
# DOCTOR HELPERS
# ============================================================

def get_doctor_id(user) -> str:
    """
    Resolve authenticated Supabase user to the VaaniDoc
    doctor profile.
    """

    try:
        response = (
            supabase_admin
            .table("doctors")
            .select("id")
            .eq("auth_user_id", user.id)
            .limit(1)
            .execute()
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to access doctor profile.",
        ) from exc

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found.",
        )

    return response.data[0]["id"]


def require_session_owner(
    session_id: str,
    user,
) -> dict:
    """
    Return a session only if it belongs to the
    authenticated doctor.
    """

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    doctor_id = get_doctor_id(user)

    if session["doctor_id"] != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session.",
        )

    return session


# ============================================================
# PATIENT FLOW
# ============================================================

@router.post(
    "/join",
    status_code=status.HTTP_201_CREATED,
)
async def join_consultation_session(
    request: JoinSessionRequest,
):
    """
    Patient joins a doctor's consultation using the
    doctor's unique QR/code.

    No doctor authentication is required.
    """

    doctor_code = request.doctor_code.strip().upper()

    try:
        doctor_response = (
            supabase_admin
            .table("doctors")
            .select("id, name, doctor_code")
            .eq("doctor_code", doctor_code)
            .limit(1)
            .execute()
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to find doctor.",
        ) from exc

    if not doctor_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found.",
        )

    doctor = doctor_response.data[0]

    try:
        session = create_session(
            doctor["id"],
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to create consultation session.",
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {
        "session_id": session["session_id"],
        "doctor_id": doctor["id"],
        "doctor_name": doctor["name"],
        "doctor_code": doctor["doctor_code"],
        "status": session["status"],
        "created_at": session["created_at"],
    }


# ============================================================
# PATIENT SUBMITS INPUT
# ============================================================

@router.post(
    "/{session_id}/input",
)
async def submit_patient_input(
    session_id: str,
    request: PatientInputRequest,
):
    """
    Patient submits temporary symptom information.

    No doctor authentication is required.

    The temporary session_id identifies the consultation.
    """

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is no longer active.",
        )

    try:
        saved_input = save_patient_input(
            session_id,
            {
                "type": "text",
                "text": request.text,
                "language": request.language,
            },
        )

        if saved_input is None:
            raise RuntimeError(
                "Failed to save patient input."
            )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to save patient input.",
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {
        "session_id": session_id,
        "status": "received",
    }


# ============================================================
# PATIENT STATUS
# ============================================================

@router.get(
    "/{session_id}/patient-status",
)
async def get_patient_session_status(
    session_id: str,
):
    """
    Patient-facing session status endpoint.

    No doctor authentication is required.

    The session UUID acts as the temporary capability
    for the patient's active consultation.

    This endpoint exposes ONLY session status.
    It never exposes patient medical information.
    """

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    return {
        "session_id": session_id,
        "status": session["status"],
    }


# ============================================================
# PATIENT CANCEL
# ============================================================

@router.post(
    "/{session_id}/patient-cancel",
)
async def patient_cancel_session(
    session_id: str,
):
    """
    Patient cancels their own temporary consultation.

    No doctor authentication is required.

    The session UUID identifies the temporary session.
    """

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is already closed.",
        )

    try:
        updated_session = update_session_status(
            session_id,
            "cancelled",
        )

        if updated_session is None:
            raise RuntimeError(
                "Unable to cancel consultation session."
            )

        deleted = delete_session(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to cancel consultation session.",
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session could not be deleted.",
        )

    return {
        "session_id": session_id,
        "status": "cancelled",
        "data_deleted": True,
    }


# ============================================================
# DOCTOR SESSION CREATION
# ============================================================

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
async def create_consultation_session(
    user=Depends(get_current_user),
):
    """
    Doctor can manually create a consultation session.

    Patient-facing flow should normally use /sessions/join.
    """

    doctor_id = get_doctor_id(user)

    try:
        return create_session(
            doctor_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to create consultation session.",
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


# ============================================================
# DOCTOR QUEUE
# IMPORTANT:
# THESE MUST COME BEFORE /{session_id}
# ============================================================

@router.get(
    "/queue",
)
async def get_session_queue(
    user=Depends(get_current_user),
):
    """
    Return active consultation sessions belonging
    to the authenticated doctor.
    """

    doctor_id = get_doctor_id(user)

    try:
        sessions = get_doctor_sessions(
            doctor_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load patient queue.",
        ) from exc

    patients = []

    for session in sessions:

        try:
            patient_input = get_session_input(
                session["session_id"],
            )

            intake = get_session_intake(
                session["session_id"],
            )

        except APIError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to load patient information.",
            ) from exc

        patients.append(
            {
                "session_id": session["session_id"],
                "status": session["status"],
                "created_at": session["created_at"],
                "language": (
                    patient_input.get("language")
                    if patient_input
                    else None
                ),
                "complaint": (
                    intake.get("chief_complaint")
                    if intake
                    else None
                ),
                "urgency": (
                    intake.get("urgency")
                    if intake
                    else None
                ),
            }
        )

    return {
        "doctor_id": doctor_id,
        "patients": patients,
        "count": len(patients),
    }


# ============================================================
# DOCTOR QUEUE PATIENT
# ============================================================

@router.get(
    "/queue/{session_id}",
)
async def get_queue_patient(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Return complete temporary consultation information
    for the authenticated doctor.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    try:
        patient_input = get_session_input(
            session_id,
        )

        intake = get_session_intake(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load patient information.",
        ) from exc

    return {
        "session": session,
        "input": patient_input,
        "intake": intake,
    }


# ============================================================
# DOCTOR-ONLY SESSION ACCESS
# ============================================================

@router.get(
    "/{session_id}",
)
async def get_consultation_session(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Doctor can view their own consultation session
    together with temporary patient input and AI intake.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    try:
        patient_input = get_session_input(
            session_id,
        )

        intake = get_session_intake(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load patient information.",
        ) from exc

    return {
        "session": session,
        "input": patient_input,
        "intake": intake,
    }


# ============================================================
# DOCTOR STATUS
# ============================================================

@router.get(
    "/{session_id}/status",
)
async def get_session_status(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Doctor-only session status endpoint.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    return {
        "session_id": session_id,
        "status": session["status"],
    }


# ============================================================
# DOCTOR START SESSION
# ============================================================

@router.post(
    "/{session_id}/start",
)
async def start_session(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Doctor starts the consultation.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is no longer active.",
        )

    try:
        updated_session = update_session_status(
            session_id,
            "active",
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to start consultation session.",
        ) from exc

    if updated_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    return {
        "session_id": session_id,
        "status": updated_session["status"],
    }


# ============================================================
# DOCTOR COMPLETE SESSION
# ============================================================

@router.post(
    "/{session_id}/complete",
)
async def complete_session(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Doctor completes consultation.

    The session and dependent temporary patient data
    are deleted.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is already closed.",
        )

    try:
        updated_session = update_session_status(
            session_id,
            "completed",
        )

        if updated_session is None:
            raise RuntimeError(
                "Unable to complete consultation session."
            )

        deleted = delete_session(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to complete consultation session.",
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session could not be deleted.",
        )

    return {
        "session_id": session_id,
        "status": "completed",
        "data_deleted": True,
    }


# ============================================================
# DOCTOR CANCEL SESSION
# ============================================================

@router.post(
    "/{session_id}/cancel",
)
async def cancel_session(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    Doctor cancels consultation.

    Cancelled sessions are deleted immediately.
    """

    session = require_session_owner(
        session_id,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is already closed.",
        )

    try:
        updated_session = update_session_status(
            session_id,
            "cancelled",
        )

        if updated_session is None:
            raise RuntimeError(
                "Unable to cancel consultation session."
            )

        deleted = delete_session(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to cancel consultation session.",
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session could not be deleted.",
        )

    return {
        "session_id": session_id,
        "status": "cancelled",
        "data_deleted": True,
    }