"""Tests for program date range parsing."""
from datetime import date

import pytest

from src.modules.program.application.use_cases.import_program import (
    ImportProgramFromEpubUseCase,
)


@pytest.mark.parametrize(
    ("date_range", "expected"),
    [
        (
            "27 DE JULIO A 2 DE AGOSTO",
            (date(2026, 7, 27), date(2026, 8, 2)),
        ),
        (
            "31 DE AGOSTO A 6 DE SEPTIEMBRE",
            (date(2026, 8, 31), date(2026, 9, 6)),
        ),
        (
            "27 DE JULIO - 2 DE AGOSTO",
            (date(2026, 7, 27), date(2026, 8, 2)),
        ),
    ],
)
def test_parse_cross_month_date_range(date_range, expected):
    use_case = ImportProgramFromEpubUseCase.__new__(ImportProgramFromEpubUseCase)

    assert use_case._parse_date_range(date_range, 2026) == expected
