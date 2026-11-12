import re

_SUFFIX_MAP = {
    "private": "pvt",
    "limited": "ltd",
}


def normalize_name(name: str) -> str:
    text = name.lower()
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    words = [_SUFFIX_MAP.get(word, word) for word in text.split()]
    return " ".join(words)


def names_match(a: str, b: str) -> bool:
    return normalize_name(a) == normalize_name(b)