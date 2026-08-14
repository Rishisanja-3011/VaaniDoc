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
    Safe fallback used when Gemini clinical processing fails.

    This does NOT attempt to diagnose the patient.
    """

    clean_text = (text or "").strip()

    return {
        "language": language or "en",
        "english_intake": {
            "chief_complaint": clean_text,
            "symptoms": [],
            "negative_symptoms": [],
            "duration": "",
            "relevant_history": [],
            "medications": [],
            "allergies": [],
        },
        "possible_symptom_categories": [],
        "urgency": "moderate",
        "confidence": {
            "symptoms": 0.2,
            "category": 0.1,
            "urgency": 0.1,
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