import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


from app.services.ai_service import process_patient_text


TEST_CASES = [
    {
        "name": "Gujarati stomach pain",
        "language": "gu",
        "text": "મને બે દિવસથી પેટમાં દુખાવો છે.",
        "expected_symptom": "stomach pain",
        "expected_duration": "2 days",
    },
    {
        "name": "Hindi stomach pain and nausea",
        "language": "hi",
        "text": "मुझे दो दिन से पेट में दर्द है और थोड़ी मितली हो रही है।",
        "expected_symptom": "stomach pain",
        "expected_duration": "2 days",
    },
    {
        "name": "Marathi stomach pain",
        "language": "mr",
        "text": "मला दोन दिवसांपासून पोटात दुखत आहे.",
        "expected_symptom": "stomach pain",
        "expected_duration": "2 days",
    },
    {
        "name": "English baseline",
        "language": "en",
        "text": "I have had stomach pain for two days.",
        "expected_symptom": "stomach pain",
        "expected_duration": "two days",
    },
    {
        "name": "Gujarati headache without duration",
        "language": "gu",
        "text": "મને આજે થોડો માથાનો દુખાવો છે.",
        "expected_symptom": "headache",
        "expected_duration": "",
    },
    {
        "name": "Gujarati negation",
        "language": "gu",
        "text": "મને તાવ નથી પરંતુ માથાનો દુખાવો છે.",
        "expected_symptom": "headache",
        "expected_negative": "fever",
    },
    {
        "name": "Multiple symptoms",
        "language": "gu",
        "text": "મને ત્રણ દિવસથી તાવ છે, ગળામાં દુખાવો છે અને ઉધરસ આવે છે.",
        "expected_symptoms": [
            "fever",
            "sore throat",
            "cough",
        ],
        "expected_duration": "3 days",
    },
    {
        "name": "High urgency chest pain",
        "language": "gu",
        "text": "મને અચાનક છાતીમાં ખૂબ જ દુખાવો થાય છે અને શ્વાસ લેવામાં તકલીફ છે.",
        "expected_urgency": "high",
    },
    {
        "name": "Low urgency headache",
        "language": "en",
        "text": "I have a mild headache.",
        "expected_urgency": "low",
    },
    {
        "name": "Moderate respiratory symptoms",
        "language": "en",
        "text": "I have had fever, cough and sore throat for three days.",
        "expected_urgency": "moderate",
    },
    {
        "name": "Gujarati cough",
        "language": "gu",
        "text": "મને પાંચ દિવસથી ઉધરસ આવે છે.",
        "expected_symptom": "cough",
        "expected_duration": "5 days",
    },
    {
        "name": "Hindi fever",
        "language": "hi",
        "text": "मुझे कल से बुखार है।",
        "expected_symptom": "fever",
        "expected_duration": "since yesterday",
    },
    {
        "name": "Marathi cough",
        "language": "mr",
        "text": "मला तीन दिवसांपासून खोकला आहे.",
        "expected_symptom": "cough",
        "expected_duration": "3 days",
    },
    {
        "name": "No duration",
        "language": "en",
        "text": "I have stomach pain.",
        "expected_symptom": "stomach pain",
        "expected_duration": "",
    },
    {
        "name": "Medication mentioned",
        "language": "en",
        "text": "I have a headache and I take paracetamol.",
        "expected_symptom": "headache",
        "expected_medication": "paracetamol",
    },
    {
        "name": "Allergy mentioned",
        "language": "en",
        "text": "I have a rash and I am allergic to penicillin.",
        "expected_symptom": "rash",
        "expected_allergy": "penicillin",
    },
    {
        "name": "Respiratory symptoms",
        "language": "hi",
        "text": "मुझे खांसी और सांस लेने में परेशानी है।",
        "expected_symptoms": [
            "cough",
            "difficulty breathing",
        ],
    },
    {
        "name": "Musculoskeletal",
        "language": "gu",
        "text": "મારા પગમાં દુખાવો થાય છે.",
        "expected_symptom": "leg pain",
    },
    {
        "name": "Longer description",
        "language": "en",
        "text": (
            "For the last four days I have had a persistent cough, "
            "mild fever and sore throat. I have not taken any medicine."
        ),
        "expected_symptoms": [
            "cough",
            "fever",
            "sore throat",
        ],
        "expected_duration": "four days",
    },
    {
        "name": "Explicit negative symptom",
        "language": "en",
        "text": "I have a cough but no fever.",
        "expected_symptom": "cough",
        "expected_negative": "fever",
    },
]


def contains_value(values: list[str], expected: str) -> bool:
    expected = expected.lower()

    return any(
        expected in value.lower()
        for value in values
    )


@pytest.mark.parametrize(
    "case",
    TEST_CASES,
    ids=[case["name"] for case in TEST_CASES],
)
def test_ai_intake(case):
    result = process_patient_text(
        text=case["text"],
        language=case["language"],
    )

    intake = result["english_intake"]

    assert result["language"] == case["language"]

    if "expected_symptom" in case:
        assert contains_value(
            intake["symptoms"],
            case["expected_symptom"],
        )

    if "expected_symptoms" in case:
        for symptom in case["expected_symptoms"]:
            assert contains_value(
                intake["symptoms"],
                symptom,
            )

    if "expected_negative" in case:
        assert contains_value(
            intake["negative_symptoms"],
            case["expected_negative"],
        )

    if "expected_duration" in case:
        actual_duration = intake["duration"].lower().strip()
        expected_duration = case["expected_duration"].lower().strip()
    
        if expected_duration == "":
            assert actual_duration == ""
        else:
            duration_aliases = {
            "2 days": ["2 days", "two days"],
            "3 days": ["3 days", "three days"],
            "4 days": ["4 days", "four days"],
            "5 days": ["5 days", "five days"],
            "since yesterday": [
                "since yesterday",
                "from yesterday",
                "yesterday",
            ],
        }

        accepted_values = duration_aliases.get(
            expected_duration,
            [expected_duration],
        )

        assert any(
            value in actual_duration
            for value in accepted_values
        )
        

    if "expected_urgency" in case:
        assert result["urgency"] == case["expected_urgency"]

    if "expected_medication" in case:
        assert contains_value(
            intake["medications"],
            case["expected_medication"],
        )

    if "expected_allergy" in case:
        assert contains_value(
            intake["allergies"],
            case["expected_allergy"],
        )