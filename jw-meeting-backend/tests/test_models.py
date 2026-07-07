"""
Test for database models.
"""
import pytest
from datetime import date, datetime
from src.modules.program.infrastructure.models import Congregation, Person, Program, Week
from src.modules.assignments.infrastructure.models import AssignmentType, Assignment


@pytest.mark.asyncio
async def test_create_congregation(db_session):
    """Test creating a congregation."""
    congregation = Congregation(
        name="Test Congregation",
        settings={"timezone": "America/Argentina/Buenos_Aires"}
    )
    
    db_session.add(congregation)
    await db_session.commit()
    await db_session.refresh(congregation)
    
    assert congregation.id is not None
    assert congregation.name == "Test Congregation"
    assert congregation.settings["timezone"] == "America/Argentina/Buenos_Aires"


@pytest.mark.asyncio
async def test_create_person(db_session):
    """Test creating a person."""
    congregation = Congregation(name="Test Congregation")
    db_session.add(congregation)
    await db_session.commit()
    await db_session.refresh(congregation)
    
    person = Person(
        congregation_id=congregation.id,
        full_name="Juan Pérez",
        email="juan@example.com",
        active=1
    )
    
    db_session.add(person)
    await db_session.commit()
    await db_session.refresh(person)
    
    assert person.id is not None
    assert person.full_name == "Juan Pérez"
    assert person.congregation_id == congregation.id


@pytest.mark.asyncio
async def test_create_program_with_weeks(db_session):
    """Test creating a program with weeks."""
    congregation = Congregation(name="Test Congregation")
    db_session.add(congregation)
    await db_session.commit()
    await db_session.refresh(congregation)
    
    program = Program(
        congregation_id=congregation.id,
        version="2026-01",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 1, 31),
        source_file="test.epub"
    )
    
    db_session.add(program)
    await db_session.commit()
    await db_session.refresh(program)
    
    week = Week(
        program_id=program.id,
        date_range="5-11 DE ENERO",
        reading="Isaías 17-20",
        songs={"apertura": {"numero": 153, "oracion": ""}, "medio": 148, "cierre": {"numero": 73, "oracion": ""}},
        week_number=1,
        week_date=date(2026, 1, 5)
    )
    
    db_session.add(week)
    await db_session.commit()
    await db_session.refresh(week)
    
    assert week.id is not None
    assert week.program_id == program.id
    assert week.songs["apertura"]["numero"] == 153


@pytest.mark.asyncio
async def test_create_assignment_type(db_session):
    """Test creating an assignment type."""
    assignment_type = AssignmentType(
        code="test_assignment",
        name="Test Assignment",
        category="test",
        requires_assistant=0,
        default_duration=10
    )
    
    db_session.add(assignment_type)
    await db_session.commit()
    await db_session.refresh(assignment_type)
    
    assert assignment_type.id is not None
    assert assignment_type.code == "test_assignment"
    assert assignment_type.requires_assistant == 0
