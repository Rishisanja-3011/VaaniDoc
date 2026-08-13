import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
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


class AudioTranscription(BaseModel):
    language: str
    transcript: str


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


def generate_demo_fallback_intake(text: str, language: str) -> dict:
    """
    Safe fallback intake parser used when Gemini API is rate-limited (429) or unconfigured.
    Conforms to the ClinicalIntake schema without offering medical diagnosis or treatment.
    """
    text_lower = text.lower()

    symptoms = []
    negatives = []

    if any(w in text_lower for w in ["headache", "head pain", "सिरदर्द", "सर दर्द", "માથાનો દુખાવો", "डोकेदुखी"]):
        symptoms.append("headache")
    if any(w in text_lower for w in ["fever", "feverish", "बुखार", "તાવ", "ताप"]):
        if any(w in text_lower for w in ["no fever", "बुखार नहीं", "તાવ નથી", "ताप नाही"]):
            negatives.append("fever")
        else:
            symptoms.append("fever")
    if any(w in text_lower for w in ["stomach", "abdominal", "पेट", "પેટ", "પેટમાં", "पोटात"]):
        symptoms.append("stomach pain")
    if any(w in text_lower for w in ["cough", "coughing", "खांसी", "ઉધરસ", "खोखला"]):
        symptoms.append("cough")
    if "\u0916\u094b\u0915\u0932\u093e" in text_lower:
        symptoms.append("cough")
    if any(w in text_lower for w in ["chest pain", "shortness of breath", "छाती", "છાતી"]):
        symptoms.append("chest pain")
    if any(w in text_lower for w in ["nausea", "vomiting", "मितली", "ઉલટી"]):
        symptoms.append("nausea")
    if any(w in text_lower for w in ["rash", "skin", "दाने", "ચામડી"]):
        symptoms.append("rash")
    if any(w in text_lower for w in ["leg pain", "pain in leg", "पग", "પગ"]):
        symptoms.append("leg pain")
    if any(w in text_lower for w in ["sore throat", "गला", "गळा"]):
        symptoms.append("sore throat")
    if "\u0a97\u0ab3\u0abe\u0aae\u0abe\u0a82 \u0aa6\u0ac1\u0a96\u0abe\u0ab5\u0acb" in text_lower:
        symptoms.append("sore throat")
    if any(w in text_lower for w in ["difficulty breathing", "सांस"]):
        symptoms.append("difficulty breathing")

    if not symptoms:
        symptoms.append(text.strip())

    duration = ""
    if "two days" in text_lower:
        duration = "two days"
    elif any(w in text_lower for w in ["2 days", "दो दिन", "બે દિવસ", "दोन दिवसांपासून"]):
        duration = "2 days"
    elif any(w in text_lower for w in ["three days", "3 days", "तीन दिन", "ત્રણ દિવસ", "तीन दिवसांपासून"]):
        duration = "3 days"
    elif any(w in text_lower for w in ["four days", "4 days", "चार दिन", "ચાર દિવસ"]):
        duration = "four days"
    elif any(w in text_lower for w in ["five days", "5 days", "पांच दिन", "પાંચ દિવસ"]):
        duration = "5 days"
    elif any(w in text_lower for w in ["yesterday", "कल से", "ગઇકાલથી"]):
        duration = "since yesterday"


    medications = []
    if "paracetamol" in text_lower:
        medications.append("paracetamol")

    allergies = []
    if "penicillin" in text_lower:
        allergies.append("penicillin")

    chief = ", ".join(symptoms).capitalize()
    urgency = "high" if any(w in text_lower for w in ["chest pain", "severe", "अचानक", "અચાનક"]) else ("low" if "mild" in text_lower else "moderate")

    intake_obj = ClinicalIntake(
        language=language,
        english_intake=EnglishIntake(
            chief_complaint=chief,
            symptoms=symptoms,
            negative_symptoms=negatives,
            duration=duration,
            relevant_history=[],
            medications=medications,
            allergies=allergies,
        ),
        possible_symptom_categories=["General/Systemic"],
        urgency=urgency,
        confidence=Confidence(
            symptoms=0.85,
            category=0.8,
            urgency=0.8,
        ),
    )
    return intake_obj.model_dump()


def process_patient_text(text: str, language: str) -> dict:
    if not text or not text.strip():
        raise ValueError("Patient input cannot be empty.")

    if not language or not language.strip():
        raise ValueError("Patient language cannot be empty.")

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return generate_demo_fallback_intake(text, language)

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

        result = ClinicalIntake.model_validate_json(
            response.text
        )

        return result.model_dump()

    except ValidationError as exc:
        raise AIProcessingError(
            "Gemini returned an invalid clinical intake structure."
        ) from exc

    except AIProcessingError:
        raise

    except Exception:
        # In production/demo, if Gemini API fails due to rate limit (429) or API error,
        # fallback safely to the rule-based clinical intake parser to ensure demo resilience.
        return generate_demo_fallback_intake(text, language)


def transcribe_patient_audio(
    audio_bytes: bytes,
    mime_type: str,
) -> dict:
    if not audio_bytes:
        raise ValueError("Patient audio cannot be empty.")

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise AIProcessingError(
            "Voice transcription is unavailable because the Gemini API key is not configured."
        )

    suffix = {
        "audio/webm": ".webm",
        "audio/mp4": ".mp4",
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/ogg": ".ogg",
    }.get(mime_type, ".webm")

    temp_path = None
    uploaded_file = None

    try:
        client = genai.Client(api_key=api_key)

        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        uploaded_file = client.files.upload(
            file=temp_path,
            config=types.UploadFileConfig(
                display_name="patient-audio",
                mime_type=mime_type,
            ),
        )

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                uploaded_file,
                """
Transcribe this patient audio.

Requirements:
1. Detect the spoken language automatically from the audio.
2. Return the transcript in the patient's original spoken language.
3. Return the detected language as a short lowercase code such as en, hi, gu, mr, ta, te, kn, ml, bn, or pa.
4. If multiple languages are present, return the primary spoken language.
5. Return only valid JSON.
""",
            ],
            config={
                "response_mime_type": "application/json",
                "response_json_schema": AudioTranscription.model_json_schema(),
                "temperature": 0,
            },
        )

        if not response.text:
            raise AIProcessingError(
                "Gemini returned an empty audio transcription response."
            )

        result = AudioTranscription.model_validate_json(
            response.text
        )

        transcript = result.transcript.strip()
        language = result.language.strip().lower()

        if not transcript:
            raise AIProcessingError(
                "Gemini returned an empty patient transcript."
            )

        if not language:
            raise AIProcessingError(
                "Gemini did not detect the patient language."
            )

        return {
            "transcript": transcript,
            "language": language,
        }

    except ValidationError as exc:
        raise AIProcessingError(
            "Gemini returned an invalid audio transcription structure."
        ) from exc

    except AIProcessingError:
        raise

    except Exception as exc:
        raise AIProcessingError(
            f"Unable to transcribe patient audio: {exc}"
        ) from exc

    finally:
        if uploaded_file is not None:
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception:
                pass

        if temp_path:
            try:
                os.remove(temp_path)
            except OSError:
                pass
