import re

_SUFFIX_MAP = {
    "private": "pvt",
    "limited": "ltd",
}
LEGAL_SUFFIXES = {"pvt", "ltd"}


def normalize_name(name: str) -> str:
    text = name.lower()
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    words = [_SUFFIX_MAP.get(word, word) for word in text.split()]
    return " ".join(words)


def _core_words(name: str) -> set[str]:
    return {w for w in normalize_name(name).split() if w not in LEGAL_SUFFIXES}


def compare_names(a: str, b: str) -> str:
    """Return 'match', 'near' or 'different'.

    'near' means one name contains every word of the other plus extra words,
    such as 'Sri Sharma Medical' and 'Sharma Medical'. A reviewer must decide.
    """
    core_a = _core_words(a)
    core_b = _core_words(b)
    if not core_a or not core_b:
        return "different"
    if core_a == core_b:
        return "match"
    if core_a <= core_b or core_b <= core_a:
        return "near"
    return "different"


def names_match(a: str, b: str) -> bool:
    return compare_names(a, b) == "match"