from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from postgrest.exceptions import APIError

from app.core.auth import get_current_user
from app.core.supabase import supabase_admin
from app.services.ai_service import (
    AIProcessingError,
    process_patient_text,
)
from app.services.session_service import (
    get_session,
    save_intake,
    update_session_status,
)

router = APIRouter(
    prefix="/processing",
    tags=["AI Processing"],
)


class ProcessTextRequest(BaseModel):
    text: str = Field(min_length=1)
    language: str = Field(min_length=2, max_length=10)


class EnglishIntake(BaseModel):
    chief_complaint: str
    symptoms: list[str]
    negative_symptoms: list[str]
    duration: str
    relevant_history: list[str]
    medications: list[str]
    allergies: list[str]


class ClinicalIntake(BaseModel):
    language: str
    english_intake: EnglishIntake
    possible_symptom_categories: list[str]
    urgency: str
    confidence: dict[str, float]


def restore_session_to_active(session_id: str) -> None:
    """
    Best-effort recovery after AI/database processing fails.
    Prevents a consultation from being permanently stuck
    in 'processing'.
    """
    try:
        update_session_status(session_id, "active")
    except Exception:
        # Preserve the original processing error.
        pass


def get_doctor_id(user) -> str:
    """
    Resolve the authenticated Supabase user to the VaaniDoc
    doctor profile.
    """
    response = (
        supabase_admin
        .table("doctors")
        .select("id")
        .eq("auth_user_id", user.id)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Doctor profile not found.",
        )

    return response.data[0]["id"]


def require_session_owner(
    session: dict,
    user,
) -> None:
    """
    Ensure the authenticated doctor owns the session.
    """
    doctor_id = get_doctor_id(user)

    if session["doctor_id"] != doctor_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this session.",
        )


@router.post(
    "/text",
    response_model=ClinicalIntake,
)
async def process_text(
    request: ProcessTextRequest,
):
    try:
        result = process_patient_text(
            text=request.text,
            language=request.language,
        )

        return ClinicalIntake(**result)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except AIProcessingError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


@router.post(
    "/session/{session_id}",
    response_model=ClinicalIntake,
)
async def process_session(
    session_id: str,
    user=Depends(get_current_user),
):
    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found.",
        )

    require_session_owner(
        session,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=409,
            detail="Session is no longer active.",
        )

    try:
        input_response = (
            supabase_admin
            .table("temporary_inputs")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

    except APIError as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to read patient input from the database.",
        ) from exc

    if not input_response.data:
        raise HTTPException(
            status_code=404,
            detail="No patient input found for this session.",
        )

    patient_input = input_response.data[0]

    text = patient_input.get("text_content")
    language = patient_input.get("language")

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Patient input does not contain text.",
        )

    if not language:
        raise HTTPException(
            status_code=400,
            detail="Patient input language is missing.",
        )

    try:
        update_session_status(
            session_id,
            "processing",
        )

        result = process_patient_text(
            text=text,
            language=language,
        )

        saved_intake = save_intake(
            session_id,
            result,
        )

        if saved_intake is None:
            raise RuntimeError(
                "Failed to save AI intake."
            )

        update_session_status(
            session_id,
            "ready",
        )

        return ClinicalIntake(**result)

    except ValueError as exc:
        restore_session_to_active(session_id)

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except AIProcessingError as exc:
        restore_session_to_active(session_id)

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except APIError as exc:
        restore_session_to_active(session_id)

        raise HTTPException(
            status_code=503,
            detail="AI intake could not be saved to the database.",
        ) from exc

    except RuntimeError as exc:
        restore_session_to_active(session_id)

        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc