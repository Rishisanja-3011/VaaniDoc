from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from postgrest.exceptions import APIError

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


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================

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


# ============================================================
# ERROR RECOVERY
# ============================================================

def restore_session_to_active(session_id: str) -> None:
    """
    Best-effort recovery if AI processing fails.

    Prevents a consultation from being permanently stuck
    in the 'processing' state.
    """
    try:
        update_session_status(
            session_id,
            "active",
        )
    except Exception:
        # Preserve the original processing error.
        pass


# ============================================================
# DIRECT TEXT PROCESSING
# ============================================================

@router.post(
    "/text",
    response_model=ClinicalIntake,
)
async def process_text(
    request: ProcessTextRequest,
):
    """
    Direct AI processing endpoint.

    Useful for development/testing.
    """

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


# ============================================================
# SESSION AI PROCESSING
# ============================================================

@router.post(
    "/session/{session_id}",
    response_model=ClinicalIntake,
)
async def process_session(
    session_id: str,
):
    """
    Process the latest patient input belonging to a temporary
    consultation session.

    No doctor authentication is required here because the
    temporary session_id identifies the consultation.

    Doctor authorization is enforced separately on
    doctor-facing session endpoints.
    """

    # --------------------------------------------------------
    # 1. Find session
    # --------------------------------------------------------

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found.",
        )

    # --------------------------------------------------------
    # 2. Reject closed sessions
    # --------------------------------------------------------

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=409,
            detail="Session is no longer active.",
        )

    # --------------------------------------------------------
    # 3. Read latest temporary patient input
    # --------------------------------------------------------

    try:
        from app.core.supabase import supabase_admin

        input_response = (
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

    # --------------------------------------------------------
    # 4. Validate patient input
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # 5. AI processing
    # --------------------------------------------------------

    try:
        update_session_status(
            session_id,
            "processing",
        )

        result = process_patient_text(
            text=text,
            language=language,
        )

        # ----------------------------------------------------
        # 6. Save structured AI intake
        # ----------------------------------------------------

        saved_intake = save_intake(
            session_id,
            result,
        )

        if saved_intake is None:
            raise RuntimeError(
                "Failed to save AI intake."
            )

        # ----------------------------------------------------
        # 7. Mark session ready for doctor
        # ----------------------------------------------------

        update_session_status(
            session_id,
            "ready",
        )

        return ClinicalIntake(**result)

    # --------------------------------------------------------
    # AI validation error
    # --------------------------------------------------------

    except ValueError as exc:

        restore_session_to_active(
            session_id,
        )

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # Gemini/API processing error
    # --------------------------------------------------------

    except AIProcessingError as exc:

        restore_session_to_active(
            session_id,
        )

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # Supabase/database error
    # --------------------------------------------------------

    except APIError as exc:

        restore_session_to_active(
            session_id,
        )

        raise HTTPException(
            status_code=503,
            detail="AI intake could not be saved to the database.",
        ) from exc

    # --------------------------------------------------------
    # Other processing error
    # --------------------------------------------------------

    except RuntimeError as exc:

        restore_session_to_active(
            session_id,
        )

        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc