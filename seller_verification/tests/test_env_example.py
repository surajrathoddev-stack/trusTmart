import pathlib

ENV_EXAMPLE = pathlib.Path(__file__).resolve().parent.parent / ".env.example"


def test_env_example_exists():
    assert ENV_EXAMPLE.exists()


def test_env_example_contains_only_placeholder_values():
    for line in ENV_EXAMPLE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        assert "=" in line
        key, value = line.split("=", 1)
        assert value == "" or "your_" in value.lower(), f"{key} must hold a placeholder, not a real value"