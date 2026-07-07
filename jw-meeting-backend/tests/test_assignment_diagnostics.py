"""Tests for assignment validation and diagnostics services."""
from datetime import datetime

import pytest

from src.modules.assignments.application.services.assignment_diagnostics import AssignmentDiagnosticsService
from src.modules.assignments.application.services.assignment_validation import MinimalAssignmentValidator
from src.modules.assignments.infrastructure.models import Assignment, AssignmentType
from src.modules.program.infrastructure.models import Congregation, Person, Program, Week
from src.shared.domain.exceptions import BusinessRuleViolationError


async def _build_base_context(db_session):
    congregation = Congregation(name="Diag Congregation")
    db_session.add(congregation)
    await db_session.commit()
    await db_session.refresh(congregation)

    program = Program(
        congregation_id=congregation.id,
        version="2026-05",
        start_date=datetime(2026, 5, 1).date(),
        end_date=datetime(2026, 6, 30).date(),
    )
    db_session.add(program)
    await db_session.commit()
    await db_session.refresh(program)

    week = Week(
        program_id=program.id,
        date_range="4-10 DE MAYO",
        songs={},
        week_number=1,
        week_date=datetime(2026, 5, 4).date(),
    )
    db_session.add(week)
    await db_session.commit()
    await db_session.refresh(week)

    assignment_type = AssignmentType(
        code="empiece_conversaciones",
        name="Empiece conversaciones",
        category="ministerio",
        requires_assistant=1,
    )
    prayer_type = AssignmentType(
        code="oracion_inicial",
        name="Oracion inicial",
        category="oraciones",
        requires_assistant=0,
    )
    db_session.add_all([assignment_type, prayer_type])
    await db_session.commit()
    await db_session.refresh(assignment_type)
    await db_session.refresh(prayer_type)

    return congregation, program, week, assignment_type, prayer_type


@pytest.mark.asyncio
async def test_validator_rejects_inactive_assignee(db_session):
    congregation, program, week, assignment_type, _ = await _build_base_context(db_session)
    inactive_person = Person(
        congregation_id=congregation.id,
        full_name="Inactive Person",
        active=0,
    )
    db_session.add(inactive_person)
    await db_session.commit()
    await db_session.refresh(inactive_person)

    validator = MinimalAssignmentValidator(db_session)

    with pytest.raises(BusinessRuleViolationError):
        await validator.validate_for_create(
            week_id=week.id,
            assignment_type_id=assignment_type.id,
            assignee_id=inactive_person.id,
            assistant_id=None,
        )


@pytest.mark.asyncio
async def test_validator_rejects_assistant_when_type_does_not_allow_it(db_session):
    congregation, program, week, _, prayer_type = await _build_base_context(db_session)
    person = Person(
        congregation_id=congregation.id,
        full_name="Brother One",
        active=1,
    )
    assistant = Person(
        congregation_id=congregation.id,
        full_name="Brother Two",
        active=1,
    )
    db_session.add_all([person, assistant])
    await db_session.commit()
    await db_session.refresh(person)
    await db_session.refresh(assistant)

    validator = MinimalAssignmentValidator(db_session)

    with pytest.raises(BusinessRuleViolationError):
        await validator.validate_for_create(
            week_id=week.id,
            assignment_type_id=prayer_type.id,
            assignee_id=person.id,
            assistant_id=assistant.id,
        )


@pytest.mark.asyncio
async def test_diagnostics_reports_wrong_congregation_and_inactive(db_session):
    congregation, program, week, assignment_type, _ = await _build_base_context(db_session)
    other_congregation = Congregation(name="Other Congregation")
    db_session.add(other_congregation)
    await db_session.commit()
    await db_session.refresh(other_congregation)

    inactive = Person(
        congregation_id=congregation.id,
        full_name="Inactive Brother",
        active=0,
    )
    outsider = Person(
        congregation_id=other_congregation.id,
        full_name="Outsider",
        active=1,
    )
    db_session.add_all([inactive, outsider])
    await db_session.commit()
    await db_session.refresh(inactive)
    await db_session.refresh(outsider)

    assignment = Assignment(
        week_id=week.id,
        assignment_type_id=assignment_type.id,
        assignee_id=inactive.id,
        assistant_id=outsider.id,
        title="Empiece conversaciones",
        order_index=1,
    )
    db_session.add(assignment)
    await db_session.commit()
    await db_session.refresh(assignment)

    service = AssignmentDiagnosticsService(db_session)
    diagnostics = await service.validate_week(week.id)

    codes = {finding.code for finding in diagnostics.findings}
    assert "inactive_person" in codes
    assert "wrong_congregation" in codes
