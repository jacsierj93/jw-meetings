"""Minimal backend validation for assignment mutations."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.modules.assignments.infrastructure.models import Assignment, AssignmentType
from src.modules.program.infrastructure.models import Person, Week, Program
from src.shared.domain.exceptions import BusinessRuleViolationError, EntityNotFoundError


@dataclass
class AssignmentMutationContext:
    """Context needed to validate assignment changes."""

    week: Week
    program: Program
    assignment_type: AssignmentType
    assignment: Optional[Assignment] = None


class MinimalAssignmentValidator:
    """Enforces only stable, hard backend invariants."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def validate_for_create(
        self,
        week_id: UUID,
        assignment_type_id: UUID,
        assignee_id: Optional[UUID],
        assistant_id: Optional[UUID],
    ) -> AssignmentMutationContext:
        week = await self._get_week(week_id)
        assignment_type = await self._get_assignment_type(assignment_type_id)
        program = week.program
        context = AssignmentMutationContext(
            week=week,
            program=program,
            assignment_type=assignment_type,
        )
        await self._validate_people(context, assignee_id=assignee_id, assistant_id=assistant_id)
        return context

    async def validate_for_reassign(
        self,
        assignment_id: UUID,
        assignee_id: Optional[UUID],
    ) -> AssignmentMutationContext:
        assignment = await self._get_assignment(assignment_id)
        context = AssignmentMutationContext(
            week=assignment.week,
            program=assignment.week.program,
            assignment_type=assignment.assignment_type,
            assignment=assignment,
        )
        await self._validate_people(
            context,
            assignee_id=assignee_id,
            assistant_id=assignment.assistant_id,
        )
        return context

    async def validate_for_assistant_update(
        self,
        assignment_id: UUID,
        assistant_id: Optional[UUID],
    ) -> AssignmentMutationContext:
        assignment = await self._get_assignment(assignment_id)
        context = AssignmentMutationContext(
            week=assignment.week,
            program=assignment.week.program,
            assignment_type=assignment.assignment_type,
            assignment=assignment,
        )
        await self._validate_people(
            context,
            assignee_id=assignment.assignee_id,
            assistant_id=assistant_id,
        )
        return context

    async def _validate_people(
        self,
        context: AssignmentMutationContext,
        assignee_id: Optional[UUID],
        assistant_id: Optional[UUID],
    ) -> None:
        if assistant_id and not bool(context.assignment_type.requires_assistant):
            raise BusinessRuleViolationError(
                f"Assignment type '{context.assignment_type.code}' does not allow an assistant"
            )

        if assignee_id:
            assignee = await self._get_person(assignee_id)
            self._validate_person_membership(
                person=assignee,
                congregation_id=context.program.congregation_id,
                role_label="assignee",
            )

        if assistant_id:
            assistant = await self._get_person(assistant_id)
            self._validate_person_membership(
                person=assistant,
                congregation_id=context.program.congregation_id,
                role_label="assistant",
            )

    def _validate_person_membership(self, person: Person, congregation_id: UUID, role_label: str) -> None:
        if not bool(person.active):
            raise BusinessRuleViolationError(
                f"Selected {role_label} '{person.full_name}' is inactive"
            )
        if person.congregation_id != congregation_id:
            raise BusinessRuleViolationError(
                f"Selected {role_label} '{person.full_name}' does not belong to the program congregation"
            )

    async def _get_week(self, week_id: UUID) -> Week:
        stmt = (
            select(Week)
            .options(joinedload(Week.program))
            .where(Week.id == week_id)
        )
        result = await self.db.execute(stmt)
        week = result.scalar_one_or_none()
        if not week:
            raise EntityNotFoundError(f"Week {week_id} not found")
        return week

    async def _get_assignment_type(self, assignment_type_id: UUID) -> AssignmentType:
        stmt = select(AssignmentType).where(AssignmentType.id == assignment_type_id)
        result = await self.db.execute(stmt)
        assignment_type = result.scalar_one_or_none()
        if not assignment_type:
            raise EntityNotFoundError(f"Assignment type {assignment_type_id} not found")
        return assignment_type

    async def _get_person(self, person_id: UUID) -> Person:
        stmt = select(Person).where(Person.id == person_id)
        result = await self.db.execute(stmt)
        person = result.scalar_one_or_none()
        if not person:
            raise EntityNotFoundError(f"Person {person_id} not found")
        return person

    async def _get_assignment(self, assignment_id: UUID) -> Assignment:
        stmt = (
            select(Assignment)
            .options(
                joinedload(Assignment.week).joinedload(Week.program),
                joinedload(Assignment.assignment_type),
            )
            .where(Assignment.id == assignment_id)
        )
        result = await self.db.execute(stmt)
        assignment = result.scalar_one_or_none()
        if not assignment:
            raise EntityNotFoundError(f"Assignment {assignment_id} not found")
        return assignment
