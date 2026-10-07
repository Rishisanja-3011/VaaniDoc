from app.services.language import normalize_language


def test_normalize_language_aliases_to_canonical_codes():
    assert normalize_language("English (US)") == "en"
    assert normalize_language("gu-IN") == "gu"
    assert normalize_language("Hindi") == "hi"
    assert normalize_language("mr_in") == "mr"


def test_normalize_language_can_report_unsupported_values():
    assert normalize_language("xx-XX", fallback=None) is None
