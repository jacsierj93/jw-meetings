"""
Tests for assignment service and API.
"""
import pytest
from uuid import uuid4
from datetime import datetime
from src.modules.assignments.infrastructure.models import Assignment, AssignmentType, AssignmentHistory
from src.modules.program.infrastructure.models import Congregation, Person, Program, Week


@pytest.mark.asyncio
async def test_create_assignment_type(db_session):
    """Test creating an assignment type."""
    assignment_type = AssignmentType(
        code="test_type",
        name="Test Assignment Type",
        category="test",
        requires_assistant=0,
        default_duration=10
    )
    
    db_session.add(assignment_type)
    await db_session.commit()
    await db_session.refresh(assignment_type)
    
    assert assignment_type.id is not None
    assert assignment_type.code == "test_type"


@pytest.mark.asyncio
async def test_create_assignment_with_assignee(db_session):
    """Test creating an assignment with an assignee."""
    # Create congregation
    congregation = Congregation(name="Test Congregation")
    db_session.add(congregation)
    await db_session.commit()
    await db_session.refresh(congregation)
    
    # Create person
    person = Person(
        congregation_id=congregation.id,
        full_name="Test Person",
        active=1
    )
    db_session.add(person)
    await db_session.commit()
    await db_session.refresh(person)
    
    # Create program and week
    program = Program(
        congregation_id=congregation.id,
        version="2026-01",
        start_date=datetime(2026, 1, 1).date(),
        end_date=datetime(2026, 1, 31).date()
    )
    db_session.add(program)
    await db_session.commit()
    await db_session.refresh(program)
    
    week = Week(
        program_id=program.id,
        date_range="Test Week",
        songs={},
        week_number=1,
        week_date=datetime(2026, 1, 1).date()
    )
    db_session.add(week)
    await db_session.commit()
    await db_session.refresh(week)
    
    # Create assignment type
    assignment_type = AssignmentType(
        code="test_assignment",
        name="Test Assignment",
        category="test",
        requires_assistant=0
    )
    db_session.add(assignment_type)
    await db_session.commit()
    await db_session.refresh(assignment_type)
    
    # Create assignment
    assignment = Assignment(
        week_id=week.id,
        assignment_type_id=assignment_type.id,
        assignee_id=person.id,
        title="Test Assignment",
        duration=10,
        order_index=0,
        assigned_at=datetime.utcnow()
    )
    
    db_session.add(assignment)
    await db_session.commit()
    await db_session.refresh(assignment)
    
    assert assignment.id is not None
    assert assignment.assignee_id == person.id
    assert assignment.title == "Test Assignment"


@pytest.mark.asyncio
async def test_assignment_history(db_session):
    """Test creating assignment history."""
    # Setup (similar to previous test)
    congregation = Congregation(name="Test Congregation")
    db_session.add(congregation)
    await db_session.commit()
    await db_session.refresh(congregation)
    
    person1 = Person(congregation_id=congregation.id, full_name="Person 1", active=1)
    person2 = Person(congregation_id=congregation.id, full_name="Person 2", active=1)
    db_session.add_all([person1, person2])
    await db_session.commit()
    await db_session.refresh(person1)
    await db_session.refresh(person2)
    
    program = Program(
        congregation_id=congregation.id,
        version="2026-01",
        start_date=datetime(2026, 1, 1).date(),
        end_date=datetime(2026, 1, 31).date()
    )
    db_session.add(program)
    await db_session.commit()
    await db_session.refresh(program)
    
    week = Week(
        program_id=program.id,
        date_range="Test Week",
        songs={},
        week_number=1,
        week_date=datetime(2026, 1, 1).date()
    )
    db_session.add(week)
    await db_session.commit()
    await db_session.refresh(week)
    
    assignment_type = AssignmentType(
        code="test_type",
        name="Test Type",
        category="test",
        requires_assistant=0
    )
    db_session.add(assignment_type)
    await db_session.commit()
    await db_session.refresh(assignment_type)
    
    assignment = Assignment(
        week_id=week.id,
        assignment_type_id=assignment_type.id,
        assignee_id=person1.id,
        title="Test Assignment",
        order_index=0
    )
    db_session.add(assignment)
    await db_session.commit()
    await db_session.refresh(assignment)
    
    # Create history
    history = AssignmentHistory(
        assignment_id=assignment.id,
        previous_assignee_id=person1.id,
        new_assignee_id=person2.id,
        change_reason="Testing reassignment",
        changed_at=datetime.utcnow()
    )
    
    db_session.add(history)
    await db_session.commit()
    await db_session.refresh(history)
    
    assert history.id is not None
    assert history.previous_assignee_id == person1.id
    assert history.new_assignee_id == person2.id
