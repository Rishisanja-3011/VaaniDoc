import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field, ValidationError

BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / ".env")
MODEL_NAME = "gemini-2.5-flash"


class AIProcessingError(Exception):
    """Raised when Gemini processing fails."""


class EnglishIntake(BaseModel):
    chief_complaint: str
    symptoms: list[str]
    negative_symptoms: list[str]
    duration: str
    relevant_history: list[str]
    medications: list[str]
    allergies: list[str]


class Confidence(BaseModel):
    symptoms: float = Field(ge=0.0, le=1.0)
    category: float = Field(ge=0.0, le=1.0)
    urgency: float = Field(ge=0.0, le=1.0)


class ClinicalIntake(BaseModel):
    language: str
    english_intake: EnglishIntake
    possible_symptom_categories: list[str]
    urgency: str
    confidence: Confidence


SYSTEM_PROMPT = """
You are VaaniDoc, a multilingual health intake assistant.

Convert the patient's description into a structured clinical intake
for a doctor.

IMPORTANT RULES:

1. Understand Indian regional languages including Gujarati, Hindi,
   Marathi, and English.

2. Translate and normalize the patient's meaning into English.

3. Extract ONLY information explicitly supported by the patient's input.

4. Never infer or invent symptoms, history, medications, allergies,
   duration, severity, or other clinical facts.

5. Duration must be copied or normalized ONLY when the patient explicitly
   states a duration or time period.

6. Words such as "today", "now", "currently", "recently", or similar
   expressions MUST NOT be converted into a duration unless the patient
   explicitly gives a measurable time period.

7. If the patient does not explicitly state how long a symptom has been
   present, return duration as an empty string "".

8. Do not infer duration from grammatical tense or context.

9. Extract medications only when explicitly mentioned.

10. Extract allergies only when explicitly mentioned.

11. Identify possible symptom categories, NOT diseases.

12. Classify urgency as exactly one of:
    low, moderate, high.

13. This is NOT a diagnosis.

14. Do not provide treatment recommendations.

15. If information is missing, use an empty string or empty list.

16. Confidence values must be between 0 and 1.

17. When the patient explicitly denies a symptom, put that symptom
    in negative_symptoms.

18. Do not place explicitly denied symptoms inside symptoms.

19. Do not invent negative symptoms that the patient did not mention.

20. Return structured JSON matching the requested schema.

Possible symptom categories include:
- Gastrointestinal
- Respiratory
- Cardiovascular
- Neurological
- Musculoskeletal
- Dermatological
- Genitourinary
- ENT
- General/Systemic
- Other
"""


def process_patient_text(text: str, language: str) -> dict:
    if not text.strip():
        raise ValueError("Patient input cannot be empty.")

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise AIProcessingError(
            "GEMINI_API_KEY is not configured."
        )

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                SYSTEM_PROMPT,
                (
                    f"Patient language: {language}\n\n"
                    f"Patient input:\n{text}"
                ),
            ],
            config={
                "response_mime_type": "application/json",
                "response_json_schema": ClinicalIntake.model_json_schema(),
                "temperature": 0,
            },
        )

        result = ClinicalIntake.model_validate_json(
            response.text
        )

        return result.model_dump()

    except ValidationError as exc:
        raise AIProcessingError(
            "Gemini returned an invalid clinical intake structure."
        ) from exc

    except Exception as exc:
        print(
            f"GEMINI AI ERROR: "
            f"{type(exc).__name__}: {exc}"
        )

        raise AIProcessingError(
            "Gemini AI processing failed."
        ) from exc