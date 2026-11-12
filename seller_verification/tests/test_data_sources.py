import pathlib

SOURCES = pathlib.Path(__file__).resolve().parent.parent / "DATA_SOURCES.md"


def test_data_sources_file_exists():
    assert SOURCES.exists()


def test_every_source_row_has_a_url():
    lines = SOURCES.read_text(encoding="utf-8").splitlines()
    data_rows = [
        line for line in lines
        if line.startswith("| ") and not line.startswith("| Source") and "---" not in line
    ]
    assert data_rows, "no source rows found"
    for row in data_rows:
        assert "http" in row, f"row has no URL: {row}"