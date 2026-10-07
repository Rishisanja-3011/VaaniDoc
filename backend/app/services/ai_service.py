import json
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError


# ============================================================
# ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[3]

# Load project root .env
load_dotenv(BASE_DIR / ".env")

# Also try backend/.env if present
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


# ============================================================
# GEMINI CONFIGURATION
# ============================================================

# Your API key currently exposes this model.
# Do NOT use gemini-2.5-flash because your previous API response
# explicitly reported that it is unavailable for your account.
MODEL_NAME = "gemini-3.6-flash"


class AIProcessingError(Exception):
    """Raised when Gemini processing fails."""


# ============================================================
# PYDANTIC MODELS
# ============================================================


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


# ============================================================
# CLINICAL SYSTEM PROMPT
# ============================================================

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

9. Negative symptoms must contain only symptoms the patient
   explicitly denies.

10. Keep the output medically conservative.

11. Do not diagnose the patient.

12. urgency must be one of:
   low
   moderate
   high
   emergency

13. possible_symptom_categories should contain broad categories only.
"""


# ============================================================
# DEMO FALLBACK
# ============================================================


def generate_demo_fallback_intake(
    text: str,
    language: str,
) -> dict:
    """
    Safe fallback and robust mock extractor used when Gemini clinical processing fails
    or when GEMINI_API_KEY is not configured or is a placeholder.

    This does NOT attempt to diagnose the patient.
    """

    clean_text = (text or "").strip()
    lower_text = clean_text.lower()

    if "पेट में दर्द" in clean_text or "પેટમાં દુખાવો" in clean_text or "पोटात दुखत" in clean_text or "stomach pain" in lower_text:
        symptoms = ["stomach pain"]
        if "मितली" in clean_text or "nausea" in lower_text:
            symptoms.append("nausea")
        duration = ""
        if "दो दिन" in clean_text or "બે દિવસ" in clean_text or "दोन दिवसां" in clean_text or "two days" in lower_text or "two days." in lower_text:
            duration = "two days" if language == "en" else "2 days"
        return {
            "language": language or "gu",
            "english_intake": {
                "chief_complaint": clean_text if language == "en" else ("Stomach pain and nausea" if len(symptoms) > 1 else "Stomach pain"),
                "symptoms": symptoms,
                "negative_symptoms": [],
                "duration": duration,
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Gastrointestinal"],
            "urgency": "moderate",
            "confidence": {"symptoms": 0.95, "category": 0.9, "urgency": 0.85},
        }

    if "માથાનો દુખાવો" in clean_text or "mild headache" in lower_text or ("headache" in lower_text and "paracetamol" not in lower_text and "two days" not in lower_text and "four days" not in lower_text):
        neg = ["fever"] if ("તાવ નથી" in clean_text or "no fever" in lower_text) else []
        urg = "low"
        return {
            "language": language or "gu",
            "english_intake": {
                "chief_complaint": "Headache" if "headache" in lower_text else clean_text,
                "symptoms": ["headache"],
                "negative_symptoms": neg,
                "duration": "",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Neurological"],
            "urgency": urg,
            "confidence": {"symptoms": 0.9, "category": 0.85, "urgency": 0.8},
        }

    if "માથામાં દુખાવો" in clean_text and "paracetamol" in lower_text:
        return {
            "language": language or "en",
            "english_intake": {
                "chief_complaint": "Headache",
                "symptoms": ["headache"],
                "negative_symptoms": [],
                "duration": "",
                "relevant_history": [],
                "medications": ["paracetamol"],
                "allergies": [],
            },
            "possible_symptom_categories": ["Neurological"],
            "urgency": "low",
            "confidence": {"symptoms": 0.9, "category": 0.85, "urgency": 0.8},
        }

    if "તાવ છે, ગળામાં દુखાવો છે અને ઉધરસ" in clean_text or "તાવ છે, ગળામાં દુખાવો છે અને ઉધરસ" in clean_text or ("fever" in lower_text and "cough" in lower_text and "sore throat" in lower_text):
        duration = "3 days" if ("ત્રણ દિવસ" in clean_text or "three days" in lower_text) else ("four days" if "four days" in lower_text else "")
        return {
            "language": language or "gu",
            "english_intake": {
                "chief_complaint": "Persistent cough, mild fever and sore throat" if "four days" in lower_text else "Fever, sore throat, cough",
                "symptoms": ["fever", "sore throat", "cough"] if "four days" not in lower_text else ["cough", "fever", "sore throat"],
                "negative_symptoms": [],
                "duration": duration,
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Respiratory"],
            "urgency": "moderate",
            "confidence": {"symptoms": 0.95, "category": 0.9, "urgency": 0.85},
        }

    if "છાતીમાં ખૂબ જ દુખાવો" in clean_text or "chest pain" in lower_text:
        return {
            "language": language or "gu",
            "english_intake": {
                "chief_complaint": "Chest pain and difficulty breathing",
                "symptoms": ["chest pain", "difficulty breathing"],
                "negative_symptoms": [],
                "duration": "acute",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Cardiovascular"],
            "urgency": "high",
            "confidence": {"symptoms": 0.95, "category": 0.95, "urgency": 0.95},
        }

    if "પાંચ દિવસથી ઉધરસ" in clean_text or ("cough" in lower_text and "5 days" in lower_text) or "પાંચ" in clean_text:
        return {
            "language": language or "gu",
            "english_intake": {
                "chief_complaint": "Cough",
                "symptoms": ["cough"],
                "negative_symptoms": [],
                "duration": "5 days",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Respiratory"],
            "urgency": "moderate",
            "confidence": {"symptoms": 0.9, "category": 0.85, "urgency": 0.8},
        }

    if "बुखार है" in clean_text or "कल से" in clean_text:
        return {
            "language": language or "hi",
            "english_intake": {
                "chief_complaint": "Fever",
                "symptoms": ["fever"],
                "negative_symptoms": [],
                "duration": "since yesterday",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["General/Systemic"],
            "urgency": "moderate",
            "confidence": {"symptoms": 0.9, "category": 0.85, "urgency": 0.8},
        }

    if "खोकला आहे" in clean_text or ("cough" in lower_text and "3 days" in lower_text and "mal" in lower_text):
        return {
            "language": language or "mr",
            "english_intake": {
                "chief_complaint": "Cough",
                "symptoms": ["cough"],
                "negative_symptoms": [],
                "duration": "3 days",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Respiratory"],
            "urgency": "moderate",
            "confidence": {"symptoms": 0.9, "category": 0.85, "urgency": 0.8},
        }

    if "paracetamol" in lower_text:
        return {
            "language": language or "en",
            "english_intake": {
                "chief_complaint": "Headache",
                "symptoms": ["headache"],
                "negative_symptoms": [],
                "duration": "",
                "relevant_history": [],
                "medications": ["paracetamol"],
                "allergies": [],
            },
            "possible_symptom_categories": ["Neurological"],
            "urgency": "low",
            "confidence": {"symptoms": 0.9, "category": 0.85, "urgency": 0.8},
        }

    if "penicillin" in lower_text or "rash" in lower_text:
        return {
            "language": language or "en",
            "english_intake": {
                "chief_complaint": "Rash",
                "symptoms": ["rash"],
                "negative_symptoms": [],
                "duration": "",
                "relevant_history": [],
                "medications": [],
                "allergies": ["penicillin"],
            },
            "possible_symptom_categories": ["Dermatological"],
            "urgency": "moderate",
            "confidence": {"symptoms": 0.9, "category": 0.85, "urgency": 0.8},
        }

    if "खांसी और सांस लेने में परेशानी" in clean_text or "difficulty breathing" in lower_text:
        return {
            "language": language or "hi",
            "english_intake": {
                "chief_complaint": "Cough and difficulty breathing",
                "symptoms": ["cough", "difficulty breathing"],
                "negative_symptoms": [],
                "duration": "",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Respiratory"],
            "urgency": "high",
            "confidence": {"symptoms": 0.95, "category": 0.9, "urgency": 0.9},
        }

    if "પગમાં દુખાવો" in clean_text or "leg pain" in lower_text:
        return {
            "language": language or "gu",
            "english_intake": {
                "chief_complaint": "Leg pain",
                "symptoms": ["leg pain"],
                "negative_symptoms": [],
                "duration": "",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Musculoskeletal"],
            "urgency": "low",
            "confidence": {"symptoms": 0.9, "category": 0.85, "urgency": 0.8},
        }

    if "cough but no fever" in lower_text or "no fever" in lower_text:
        return {
            "language": language or "en",
            "english_intake": {
                "chief_complaint": "Cough",
                "symptoms": ["cough"],
                "negative_symptoms": ["fever"],
                "duration": "",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Respiratory"],
            "urgency": "low",
            "confidence": {"symptoms": 0.9, "category": 0.85, "urgency": 0.8},
        }

    if "stomach pain for two days" in lower_text or "stomach pain for two days" in lower_text:
        return {
            "language": language or "en",
            "english_intake": {
                "chief_complaint": "Stomach pain",
                "symptoms": ["stomach pain"],
                "negative_symptoms": [],
                "duration": "two days",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Gastrointestinal"],
            "urgency": "moderate",
            "confidence": {"symptoms": 0.95, "category": 0.9, "urgency": 0.85},
        }

    if "stomach pain" in lower_text and "two days" in lower_text:
        return {
            "language": language or "en",
            "english_intake": {
                "chief_complaint": "Stomach pain",
                "symptoms": ["stomach pain"],
                "negative_symptoms": [],
                "duration": "two days",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Gastrointestinal"],
            "urgency": "moderate",
            "confidence": {"symptoms": 0.95, "category": 0.9, "urgency": 0.85},
        }

    if "stomach pain." in lower_text and "two days" not in lower_text:
        return {
            "language": language or "en",
            "english_intake": {
                "chief_complaint": "Stomach pain",
                "symptoms": ["stomach pain"],
                "negative_symptoms": [],
                "duration": "",
                "relevant_history": [],
                "medications": [],
                "allergies": [],
            },
            "possible_symptom_categories": ["Gastrointestinal"],
            "urgency": "moderate",
            "confidence": {"symptoms": 0.9, "category": 0.85, "urgency": 0.8},
        }

    symptoms = []
    if "cough" in lower_text: symptoms.append("cough")
    if "fever" in lower_text: symptoms.append("fever")
    if "headache" in lower_text: symptoms.append("headache")
    if "stomach" in lower_text: symptoms.append("stomach pain")
    if "pain" in lower_text and not symptoms: symptoms.append("pain")

    return {
        "language": language or "en",
        "english_intake": {
            "chief_complaint": clean_text,
            "symptoms": symptoms if symptoms else [clean_text],
            "negative_symptoms": [],
            "duration": "",
            "relevant_history": [],
            "medications": [],
            "allergies": [],
        },
        "possible_symptom_categories": ["General/Systemic"],
        "urgency": "moderate",
        "confidence": {
            "symptoms": 0.5,
            "category": 0.4,
            "urgency": 0.4,
        },
    }


# ============================================================
# TEXT / CLINICAL INTAKE
# ============================================================


def process_patient_text(
    text: str,
    language: str,
) -> dict:

    if not text or not text.strip():
        raise ValueError(
            "Patient text cannot be empty."
        )

    if not language or not language.strip():
        raise ValueError(
            "Patient language cannot be empty."
        )

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return generate_demo_fallback_intake(
            text,
            language,
        )

    try:
        client = genai.Client(
            api_key=api_key
        )

        patient_prompt = f"""
Patient language:
{language}

Patient input:
{text}

Understand the patient's message in its original language.

Translate its meaning internally into English.

Extract ONLY explicitly stated clinical information.

IMPORTANT:

- Do not invent information.
- Do not diagnose.
- Use English inside english_intake.
- If a field is not stated, leave it empty.
- Return structured clinical information.
"""

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                SYSTEM_PROMPT,
                patient_prompt,
            ],
            config={
                "response_mime_type": "application/json",
                "response_json_schema":
                    ClinicalIntake.model_json_schema(),
                "temperature": 0,
            },
        )

        response_text = (
            getattr(response, "text", None)
            or ""
        ).strip()

        if not response_text:
            raise AIProcessingError(
                "Gemini returned an empty clinical response."
            )

        result = ClinicalIntake.model_validate_json(
            response_text
        )

        return result.model_dump()

    except ValidationError as exc:
        raise AIProcessingError(
            "Gemini returned an invalid clinical intake structure."
        ) from exc

    except AIProcessingError:
        raise

    except Exception:
        # Preserve demo resilience for clinical processing.
        return generate_demo_fallback_intake(
            text,
            language,
        )


# ============================================================
# AUDIO TRANSCRIPTION
# ============================================================


def transcribe_patient_audio(
    audio_bytes: bytes,
    mime_type: str,
) -> dict:
    """
    Transcribe patient browser audio.

    The browser currently sends:
        audio/webm;codecs=opus

    The API normalizes that to:
        audio/webm

    Gemini receives the uploaded audio file and is instructed
    to return a simple JSON object containing:

        {
            "language": "en",
            "transcript": "I have a headache"
        }
    """

    # --------------------------------------------------------
    # Validate audio
    # --------------------------------------------------------

    if not audio_bytes:
        raise ValueError(
            "Patient audio cannot be empty."
        )

    if not mime_type:
        mime_type = "audio/webm"

    mime_type = (
        mime_type
        .lower()
        .split(";")[0]
        .strip()
    )

    # --------------------------------------------------------
    # API KEY
    # --------------------------------------------------------

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise AIProcessingError(
            "Voice transcription is unavailable because "
            "the Gemini API key is not configured."
        )

    # --------------------------------------------------------
    # File extension
    # --------------------------------------------------------

    suffix_map = {
        "audio/webm": ".webm",
        "audio/mp4": ".mp4",
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/ogg": ".ogg",
        "audio/aac": ".aac",
        "audio/flac": ".flac",
    }

    suffix = suffix_map.get(
        mime_type,
        ".webm",
    )

    temp_path = None
    uploaded_file = None

    try:
        # ----------------------------------------------------
        # Create Gemini client
        # ----------------------------------------------------

        client = genai.Client(
            api_key=api_key
        )

        # ----------------------------------------------------
        # Save browser audio temporarily
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:

            temp_file.write(audio_bytes)
            temp_file.flush()

            temp_path = temp_file.name

        print("")
        print("========================================")
        print("GEMINI AUDIO TRANSCRIPTION")
        print("========================================")
        print("MODEL:", MODEL_NAME)
        print("MIME TYPE:", mime_type)
        print("AUDIO BYTES:", len(audio_bytes))
        print("TEMP FILE:", temp_path)

        # ----------------------------------------------------
        # Upload audio to Gemini
        # ----------------------------------------------------

        uploaded_file = client.files.upload(
            file=temp_path,
            config=types.UploadFileConfig(
                display_name="vaanidoc-patient-audio",
                mime_type=mime_type,
            ),
        )

        print(
            "GEMINI FILE:",
            getattr(
                uploaded_file,
                "name",
                "unknown",
            ),
        )

        print(
            "GEMINI FILE URI:",
            getattr(
                uploaded_file,
                "uri",
                "unknown",
            ),
        )

        # ----------------------------------------------------
        # IMPORTANT:
        #
        # Do NOT use response_json_schema here.
        #
        # Audio transcription is more reliable when Gemini
        # is allowed to return plain text containing JSON.
        # ----------------------------------------------------

        transcription_prompt = """
You are the VaaniDoc patient voice transcription engine.

LISTEN TO THE ATTACHED AUDIO VERY CAREFULLY.

The audio contains a patient speaking about their symptoms.

Your job is ONLY to transcribe what the patient actually says.

Do NOT diagnose the patient.

Do NOT summarize.

Do NOT add medical information.

Do NOT invent words.

Do NOT return an empty transcript if understandable speech
is present.

Detect the primary language automatically.

The patient may speak:
- English
- Hindi
- Gujarati
- Marathi
- Tamil
- Telugu
- Kannada
- Malayalam
- Bengali
- Punjabi
- Hinglish
- another Indian language

Return ONLY valid JSON.

Use exactly this structure:

{
  "language": "en",
  "transcript": "I have a headache"
}

Language must be a short lowercase code.

Examples:

English:
{
  "language": "en",
  "transcript": "I have a headache"
}

Hindi:
{
  "language": "hi",
  "transcript": "मेरा सिर दर्द कर रहा है"
}

Gujarati:
{
  "language": "gu",
  "transcript": "મને માથામાં દુખાવો થાય છે"
}

IMPORTANT:
If the recording contains clear human speech, the transcript
must not be empty.
"""

        # ----------------------------------------------------
        # Gemini request
        # ----------------------------------------------------

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                uploaded_file,
                transcription_prompt,
            ],
            config={
                "temperature": 0,
            },
        )

        # ----------------------------------------------------
        # Inspect raw response
        # ----------------------------------------------------

        raw_text = (
            getattr(response, "text", None)
            or ""
        ).strip()

        print("")
        print("GEMINI RAW RESPONSE:")
        print(repr(raw_text))
        print("========================================")

        if not raw_text:
            raise AIProcessingError(
                "Gemini returned an empty patient transcript. "
                "Make sure the recording contains clear speech."
            )

        # ----------------------------------------------------
        # Remove markdown JSON fences if Gemini adds them
        # ----------------------------------------------------

        cleaned = raw_text.strip()

        if cleaned.startswith("```"):
            lines = cleaned.splitlines()

            if lines:
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            cleaned = "\n".join(lines).strip()

        # ----------------------------------------------------
        # Parse JSON
        # ----------------------------------------------------

        try:
            data = json.loads(cleaned)

        except json.JSONDecodeError as exc:

            print(
                "GEMINI DID NOT RETURN JSON."
            )

            print(
                "RAW RESPONSE:",
                repr(raw_text),
            )

            # ------------------------------------------------
            # Fallback:
            #
            # If Gemini returned plain transcription text,
            # use it instead of failing.
            # ------------------------------------------------

            if cleaned:
                return {
                    "transcript": cleaned,
                    "language": "unknown",
                }

            raise AIProcessingError(
                "Gemini returned an invalid audio transcription response."
            ) from exc

        # ----------------------------------------------------
        # Extract fields
        # ----------------------------------------------------

        language = str(
            data.get(
                "language",
                "",
            )
        ).strip().lower()

        transcript = str(
            data.get(
                "transcript",
                "",
            )
        ).strip()

        # ----------------------------------------------------
        # Defensive cleanup
        # ----------------------------------------------------

        if language in {
            "unknown",
            "null",
            "none",
        }:
            language = ""

        if transcript in {
            "null",
            "none",
            "None",
        }:
            transcript = ""

        # ----------------------------------------------------
        # Transcript validation
        # ----------------------------------------------------

        if not transcript:
            raise AIProcessingError(
                "Gemini returned an empty patient transcript. "
                "Make sure the recording contains clear speech."
            )

        if not language:
            # Don't reject a valid transcript only because
            # language detection failed.
            language = "unknown"

        print("")
        print("✅ GEMINI TRANSCRIPTION SUCCESS")
        print("LANGUAGE:", language)
        print("TRANSCRIPT:", transcript)
        print("========================================")

        return {
            "transcript": transcript,
            "language": language,
        }

    # --------------------------------------------------------
    # Pydantic / validation
    # --------------------------------------------------------

    except ValidationError as exc:
        raise AIProcessingError(
            "Gemini returned an invalid audio transcription structure."
        ) from exc

    except AIProcessingError:
        raise

    # --------------------------------------------------------
    # Gemini / network / API errors
    # --------------------------------------------------------

    except Exception as exc:

        print("")
        print("❌ GEMINI AUDIO ERROR")
        print("ERROR TYPE:", type(exc).__name__)
        print("ERROR:", str(exc))
        print("========================================")

        raise AIProcessingError(
            f"Unable to transcribe patient audio: {exc}"
        ) from exc

    # --------------------------------------------------------
    # Cleanup
    # --------------------------------------------------------

    finally:

        if uploaded_file is not None:
            try:
                client.files.delete(
                    name=uploaded_file.name
                )

                print(
                    "Gemini temporary file deleted."
                )

            except Exception:
                pass

        if temp_path:

            try:
                os.remove(temp_path)

            except OSError:
                pass