"""Diagnostics and read models for assignment analysis."""
from __future__ import annotations

from typing import Dict, List, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.assignments.application.dto import (
    PairFrequencyDTO,
    PersonSummaryDTO,
    PersonWorkloadSummaryDTO,
    ProgramDiagnosticsDTO,
    RecentAssignmentDTO,
    ValidationFindingDTO,
    WeekDiagnosticsDTO,
    AssignmentTypeWorkloadDTO,
)
from src.modules.assignments.infrastructure.models import Assignment
from src.modules.program.infrastructure.models import Person, Program, Week
from src.shared.domain.exceptions import EntityNotFoundError


class AssignmentDiagnosticsService:
    """Read-only diagnostics helpers for agents and API clients."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def get_person_workload(self, person_id: UUID) -> PersonWorkloadSummaryDTO:
        person = await self._get_person(person_id)
        assignments = await self._get_assignments_for_person(person_id)

        by_type: Dict[Tuple[str, str], AssignmentTypeWorkloadDTO] = {}
        total_as_assignee = 0
        total_as_assistant = 0

        for assignment in assignments:
            key = (
                assignment.assignment_type.code,
                assignment.assignment_type.name,
            )
            if key not in by_type:
                by_type[key] = AssignmentTypeWorkloadDTO(
                    assignment_type_code=key[0],
                    assignment_type_name=key[1],
                )
            bucket = by_type[key]
            if assignment.assignee_id == person_id:
                bucket.assignee_count += 1
                total_as_assignee += 1
            if assignment.assistant_id == person_id:
                bucket.assistant_count += 1
                total_as_assistant += 1
            bucket.total_count = bucket.assignee_count + bucket.assistant_count

        return PersonWorkloadSummaryDTO(
            person=PersonSummaryDTO.model_validate(person),
            total_as_assignee=total_as_assignee,
            total_as_assistant=total_as_assistant,
            total_count=total_as_assignee + total_as_assistant,
            by_type=sorted(by_type.values(), key=lambda item: (-item.total_count, item.assignment_type_code)),
        )

    async def get_recent_assignments_for_person(
        self,
        person_id: UUID,
        limit: int = 10,
    ) -> List[RecentAssignmentDTO]:
        await self._get_person(person_id)
        assignments = await self._get_assignments_for_person(person_id)

        ordered = sorted(
            assignments,
            key=lambda item: (item.week.week_date, item.order_index, item.created_at),
            reverse=True,
        )
        results: List[RecentAssignmentDTO] = []
        for assignment in ordered[:limit]:
            role = "assignee" if assignment.assignee_id == person_id else "assistant"
            results.append(
                RecentAssignmentDTO(
                    assignment_id=assignment.id,
                    week_id=assignment.week_id,
                    week_date=assignment.week.week_date,
                    week_label=assignment.week.date_range,
                    assignment_type_code=assignment.assignment_type.code,
                    assignment_type_name=assignment.assignment_type.name,
                    title=assignment.title,
                    role=role,
                    order_index=assignment.order_index,
                )
            )
        return results

    async def get_program_pair_frequency(self, program_id: UUID) -> List[PairFrequencyDTO]:
        await self._get_program(program_id)
        assignments = await self._get_program_assignments(program_id)
        pair_map: Dict[Tuple[UUID, UUID], Dict[str, object]] = {}

        for assignment in assignments:
            if not assignment.assignee or not assignment.assistant:
                continue
            key = (assignment.assignee.id, assignment.assistant.id)
            if key not in pair_map:
                pair_map[key] = {
                    "assignee": PersonSummaryDTO.model_validate(assignment.assignee),
                    "assistant": PersonSummaryDTO.model_validate(assignment.assistant),
                    "count": 0,
                    "assignment_ids": [],
                }
            pair_map[key]["count"] += 1
            pair_map[key]["assignment_ids"].append(assignment.id)

        results = [
            PairFrequencyDTO(
                assignee=value["assignee"],
                assistant=value["assistant"],
                count=value["count"],
                assignment_ids=value["assignment_ids"],
            )
            for value in pair_map.values()
        ]
        return sorted(results, key=lambda item: (-item.count, item.assignee.full_name, item.assistant.full_name))

    async def validate_week(self, week_id: UUID) -> WeekDiagnosticsDTO:
        week = await self._get_week(week_id)
        findings = self._build_findings(week.assignments, week.program.congregation_id)
        return WeekDiagnosticsDTO(week_id=week.id, findings=findings)

    async def validate_program(self, program_id: UUID) -> ProgramDiagnosticsDTO:
        program = await self._get_program(program_id)
        week_diagnostics: List[WeekDiagnosticsDTO] = []
        all_findings: List[ValidationFindingDTO] = []

        for week in sorted(program.weeks, key=lambda item: item.week_number):
            findings = self._build_findings(week.assignments, program.congregation_id)
            week_diagnostics.append(WeekDiagnosticsDTO(week_id=week.id, findings=findings))
            all_findings.extend(findings)

        return ProgramDiagnosticsDTO(
            program_id=program.id,
            findings=all_findings,
            weeks=week_diagnostics,
        )

    def _build_findings(
        self,
        assignments: List[Assignment],
        congregation_id: UUID,
    ) -> List[ValidationFindingDTO]:
        findings: List[ValidationFindingDTO] = []

        for assignment in assignments:
            if assignment.assistant_id and not bool(assignment.assignment_type.requires_assistant):
                findings.append(
                    ValidationFindingDTO(
                        level="error",
                        code="assistant_not_allowed",
                        message=f"Assignment '{assignment.title}' does not allow an assistant",
                        assignment_id=assignment.id,
                        person_id=assignment.assistant_id,
                    )
                )

            for role_label, person in (("assignee", assignment.assignee), ("assistant", assignment.assistant)):
                if not person:
                    continue
                if not bool(person.active):
                    findings.append(
                        ValidationFindingDTO(
                            level="error",
                            code="inactive_person",
                            message=f"{role_label.title()} '{person.full_name}' is inactive",
                            assignment_id=assignment.id,
                            person_id=person.id,
                        )
                    )
                if person.congregation_id != congregation_id:
                    findings.append(
                        ValidationFindingDTO(
                            level="error",
                            code="wrong_congregation",
                            message=f"{role_label.title()} '{person.full_name}' does not belong to the program congregation",
                            assignment_id=assignment.id,
                            person_id=person.id,
                        )
                    )

        return findings

    async def _get_person(self, person_id: UUID) -> Person:
        stmt = select(Person).where(Person.id == person_id)
        result = await self.db.execute(stmt)
        person = result.scalar_one_or_none()
        if not person:
            raise EntityNotFoundError(f"Person {person_id} not found")
        return person

    async def _get_week(self, week_id: UUID) -> Week:
        stmt = (
            select(Week)
            .options(
                selectinload(Week.program),
                selectinload(Week.assignments).selectinload(Assignment.assignment_type),
                selectinload(Week.assignments).selectinload(Assignment.assignee),
                selectinload(Week.assignments).selectinload(Assignment.assistant),
            )
            .where(Week.id == week_id)
        )
        result = await self.db.execute(stmt)
        week = result.scalar_one_or_none()
        if not week:
            raise EntityNotFoundError(f"Week {week_id} not found")
        return week

    async def _get_program(self, program_id: UUID) -> Program:
        stmt = (
            select(Program)
            .options(
                selectinload(Program.weeks).selectinload(Week.assignments).selectinload(Assignment.assignment_type),
                selectinload(Program.weeks).selectinload(Week.assignments).selectinload(Assignment.assignee),
                selectinload(Program.weeks).selectinload(Week.assignments).selectinload(Assignment.assistant),
            )
            .where(Program.id == program_id)
        )
        result = await self.db.execute(stmt)
        program = result.scalar_one_or_none()
        if not program:
            raise EntityNotFoundError(f"Program {program_id} not found")
        return program

    async def _get_assignments_for_person(self, person_id: UUID) -> List[Assignment]:
        stmt = (
            select(Assignment)
            .options(
                selectinload(Assignment.assignment_type),
                selectinload(Assignment.week),
            )
            .where((Assignment.assignee_id == person_id) | (Assignment.assistant_id == person_id))
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _get_program_assignments(self, program_id: UUID) -> List[Assignment]:
        stmt = (
            select(Assignment)
            .join(Week, Week.id == Assignment.week_id)
            .options(
                selectinload(Assignment.assignee),
                selectinload(Assignment.assistant),
            )
            .where(Week.program_id == program_id)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
