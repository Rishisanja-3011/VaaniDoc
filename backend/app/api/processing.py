from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.ai_service import (
    AIProcessingError,
    process_patient_text,
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


@router.post("/text", response_model=ClinicalIntake)
async def process_text(request: ProcessTextRequest):
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