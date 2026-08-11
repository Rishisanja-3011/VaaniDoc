from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.translation import translate_and_normalize
from app.services.symptom_extraction import extract_symptoms
from app.services.urgency import classify_urgency


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
    normalized_text = translate_and_normalize(
        request.text,
        request.language,
    )

    extracted = extract_symptoms(normalized_text)

    urgency = classify_urgency(
        normalized_text,
        extracted,
    )

    return ClinicalIntake(
        language=request.language,
        english_intake=EnglishIntake(
            chief_complaint=extracted["chief_complaint"],
            symptoms=extracted["symptoms"],
            duration=extracted["duration"],
            relevant_history=extracted["relevant_history"],
            medications=extracted["medications"],
            allergies=extracted["allergies"],
        ),
        possible_symptom_categories=extracted[
            "possible_symptom_categories"
        ],
        urgency=urgency["urgency"],
        confidence={
            "symptoms": extracted["confidence"],
            "urgency": urgency["confidence"],
        },
    )