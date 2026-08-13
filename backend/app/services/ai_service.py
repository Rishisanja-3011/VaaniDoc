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
You are VaaniDoc, a multilingual clinical intake extraction assistant.

You receive a patient's message in Hindi, Gujarati, Marathi, English,
or another Indian regional language.

Your job is to understand the patient's message and produce a
structured clinical intake in ENGLISH.

IMPORTANT RULES:

1. Understand the patient's original language semantically.

2. Translate the meaning internally into English before filling
   english_intake.

3. Every field inside english_intake MUST be written in English.

4. Never copy a regional-language sentence into chief_complaint.

5. Extract ONLY information explicitly stated by the patient.

6. NEVER invent symptoms, diseases, duration, medical history,
   medications, allergies, severity, or other clinical information.

7. If information is missing:
   - missing string = ""
   - missing list = []

8. Symptoms must be individual English symptom descriptions.

9. chief_complaint must be a short English description of the
   patient's main complaint.

10. If the patient explicitly mentions a duration, translate it
    into English.

11. If the patient does not mention a duration:
    "duration": ""

12. Extract medications ONLY if explicitly mentioned.

13. Extract allergies ONLY if explicitly mentioned.

14. Extract relevant medical history ONLY if explicitly mentioned.

15. Extract explicitly denied symptoms into negative_symptoms.

16. Never invent negative symptoms.

17. possible_symptom_categories must contain symptom categories,
    NOT diagnoses.

Allowed categories:

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

18. urgency MUST be exactly one of:

- low
- moderate
- high

19. This system does not diagnose diseases.

20. Do not provide treatment recommendations.

21. Confidence values must be between 0 and 1.

22. Confidence represents extraction confidence,
    NOT medical certainty.

IMPORTANT LANGUAGE EXAMPLES:

Hindi:

"मुझे बुखार है"
means:
"I have fever"

"मुझे सिरदर्द है"
means:
"I have a headache"

"मुझे कल से बुखार और सिरदर्द है"
means:
"I have had fever and headache since yesterday"

"मुझे पेट में दर्द है"
means:
"I have stomach pain"

"मुझे खांसी है"
means:
"I have a cough"

"मुझे उल्टी हो रही है"
means:
"I am vomiting"

"मुझे दस्त हैं"
means:
"I have diarrhea"

Gujarati:

"મને તાવ છે"
means:
"I have fever"

"મને માથાનો દુખાવો છે"
means:
"I have a headache"

Marathi:

"मला ताप आहे"
means:
"I have fever"

"मला डोकेदुखी आहे"
means:
"I have a headache"

Always understand the actual patient input.
The examples are only language-understanding examples.

EXAMPLE:

Patient language:
hi

Patient input:
मुझे कल से बुखार और सिरदर्द है।

Return:

{
  "language": "hi",
  "english_intake": {
    "chief_complaint": "Fever and headache",
    "symptoms": [
      "fever",
      "headache"
    ],
    "negative_symptoms": [],
    "duration": "since yesterday",
    "relevant_history": [],
    "medications": [],
    "allergies": []
  },
  "possible_symptom_categories": [
    "General/Systemic",
    "Neurological"
  ],
  "urgency": "moderate",
  "confidence": {
    "symptoms": 0.95,
    "category": 0.9,
    "urgency": 0.8
  }
}

Return ONLY valid JSON matching the requested schema.
"""


def process_patient_text(text: str, language: str) -> dict:
    if not text or not text.strip():
        raise ValueError("Patient input cannot be empty.")

    if not language or not language.strip():
        raise ValueError("Patient language cannot be empty.")

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise AIProcessingError(
            "GEMINI_API_KEY is not configured."
        )

    try:
        client = genai.Client(api_key=api_key)

        patient_prompt = f"""
Patient language: {language}

Patient input:
{text}

Understand the patient's message in its original language.

Translate its meaning internally into English.

Extract only explicitly stated clinical information.

IMPORTANT:
The output must contain actual English values inside
english_intake.

Do not return empty fields when the patient's message
clearly contains the corresponding information.

Return the structured English clinical intake.
"""

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                SYSTEM_PROMPT,
                patient_prompt,
            ],
            config={
                "response_mime_type": "application/json",
                "response_json_schema": ClinicalIntake.model_json_schema(),
                "temperature": 0,
            },
        )

        if not response.text:
            raise AIProcessingError(
                "Gemini returned an empty response."
            )

        print("GEMINI RAW RESPONSE:")
        print(response.text)

        result = ClinicalIntake.model_validate_json(
            response.text
        )

        return result.model_dump()

    except ValidationError as exc:
        print(
            "GEMINI VALIDATION ERROR:",
            exc,
        )

        raise AIProcessingError(
            "Gemini returned an invalid clinical intake structure."
        ) from exc

    except AIProcessingError:
        raise

    except Exception as exc:
        print(
            f"GEMINI AI ERROR: "
            f"{type(exc).__name__}: {exc}"
        )

        raise AIProcessingError(
            "Gemini AI processing failed."
        ) from exc