"""
FastAPI routes for assignments.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.assignments.application.dto import (
    AssignmentDTO,
    AssignmentHistoryDTO,
    CreateAssignmentRequest,
    PairFrequencyDTO,
    PersonWorkloadSummaryDTO,
    ProgramDiagnosticsDTO,
    RecentAssignmentDTO,
    ReassignRequest,
    UnassignRequest,
    UpdateAssistantRequest,
    WeekDiagnosticsDTO,
)
from src.modules.assignments.application.services.assignment_diagnostics import AssignmentDiagnosticsService
from src.modules.assignments.application.use_cases.create_assignment import CreateAssignmentUseCase
from src.modules.assignments.application.use_cases.get_assignments import GetAssignmentsUseCase
from src.modules.assignments.application.use_cases.update_assignment import UpdateAssignmentUseCase
from src.modules.assignments.domain.services.assignment_service import AssignmentService
from src.modules.assignments.infrastructure.persistence.sqlalchemy_assignment_repository import SQLAlchemyAssignmentRepository
from src.shared.domain.exceptions import BusinessRuleViolationError, EntityNotFoundError
from src.shared.infrastructure.database import get_db


router = APIRouter()


def _map_domain_error(exc: Exception) -> HTTPException:
    if isinstance(exc, EntityNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, BusinessRuleViolationError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    raise exc


@router.post("/", response_model=AssignmentDTO, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    request: CreateAssignmentRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new assignment."""
    try:
        use_case = CreateAssignmentUseCase(db)
        assignment = await use_case.execute(
            week_id=request.week_id,
            assignment_type_id=request.assignment_type_id,
            title=request.title,
            assignee_id=request.assignee_id,
            assistant_id=request.assistant_id,
            duration=request.duration,
            order_index=request.order_index
        )
        return AssignmentDTO.from_orm(assignment)
    except (EntityNotFoundError, BusinessRuleViolationError) as exc:
        raise _map_domain_error(exc)


@router.get("/week/{week_id}", response_model=List[AssignmentDTO])
async def get_assignments_by_week(
    week_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all assignments for a week."""
    use_case = GetAssignmentsUseCase(db)
    assignments = await use_case.get_by_week(week_id)
    return [AssignmentDTO.from_orm(a) for a in assignments]


@router.get("/week/{week_id}/diagnostics", response_model=WeekDiagnosticsDTO)
async def get_week_diagnostics(
    week_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Run non-blocking validation diagnostics for one week."""
    service = AssignmentDiagnosticsService(db)
    try:
        return await service.validate_week(week_id)
    except (EntityNotFoundError, BusinessRuleViolationError) as exc:
        raise _map_domain_error(exc)


@router.get("/person/{person_id}", response_model=List[AssignmentDTO])
async def get_assignments_by_person(
    person_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all assignments for a person."""
    use_case = GetAssignmentsUseCase(db)
    assignments = await use_case.get_by_person(person_id)
    return [AssignmentDTO.from_orm(a) for a in assignments]


@router.get("/person/{person_id}/workload", response_model=PersonWorkloadSummaryDTO)
async def get_person_workload(
    person_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get aggregated workload for a person."""
    service = AssignmentDiagnosticsService(db)
    try:
        return await service.get_person_workload(person_id)
    except (EntityNotFoundError, BusinessRuleViolationError) as exc:
        raise _map_domain_error(exc)


@router.get("/person/{person_id}/recent", response_model=List[RecentAssignmentDTO])
async def get_recent_assignments_for_person(
    person_id: UUID,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get recent assignments for a person across assignee and assistant roles."""
    service = AssignmentDiagnosticsService(db)
    try:
        return await service.get_recent_assignments_for_person(person_id, limit=limit)
    except (EntityNotFoundError, BusinessRuleViolationError) as exc:
        raise _map_domain_error(exc)


@router.get("/program/{program_id}/pairings", response_model=List[PairFrequencyDTO])
async def get_program_pairings(
    program_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get pair frequency counts for one program."""
    service = AssignmentDiagnosticsService(db)
    try:
        return await service.get_program_pair_frequency(program_id)
    except (EntityNotFoundError, BusinessRuleViolationError) as exc:
        raise _map_domain_error(exc)


@router.get("/program/{program_id}/diagnostics", response_model=ProgramDiagnosticsDTO)
async def get_program_diagnostics(
    program_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Run non-blocking validation diagnostics for a full program."""
    service = AssignmentDiagnosticsService(db)
    try:
        return await service.validate_program(program_id)
    except (EntityNotFoundError, BusinessRuleViolationError) as exc:
        raise _map_domain_error(exc)


@router.get("/{assignment_id}", response_model=AssignmentDTO)
async def get_assignment(
    assignment_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get an assignment by ID."""
    try:
        use_case = GetAssignmentsUseCase(db)
        assignment = await use_case.get_by_id(assignment_id)
        return AssignmentDTO.from_orm(assignment)
    except (EntityNotFoundError, BusinessRuleViolationError) as exc:
        raise _map_domain_error(exc)


@router.post("/{assignment_id}/reassign", response_model=AssignmentDTO)
async def reassign_assignment(
    assignment_id: UUID,
    request: ReassignRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reassign an assignment to a different person."""
    try:
        use_case = UpdateAssignmentUseCase(db)
        assignment = await use_case.reassign(
            assignment_id=assignment_id,
            new_assignee_id=request.new_assignee_id,
            reason=request.reason
        )
        return AssignmentDTO.from_orm(assignment)
    except (EntityNotFoundError, BusinessRuleViolationError) as exc:
        raise _map_domain_error(exc)


@router.post("/{assignment_id}/assistant", response_model=AssignmentDTO)
async def update_assignment_assistant(
    assignment_id: UUID,
    request: UpdateAssistantRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update assistant for an assignment."""
    try:
        use_case = UpdateAssignmentUseCase(db)
        assignment = await use_case.update_assistant(
            assignment_id=assignment_id,
            assistant_id=request.assistant_id
        )
        return AssignmentDTO.from_orm(assignment)
    except (EntityNotFoundError, BusinessRuleViolationError) as exc:
        raise _map_domain_error(exc)


@router.post("/{assignment_id}/unassign", response_model=AssignmentDTO)
async def unassign_assignment(
    assignment_id: UUID,
    request: UnassignRequest,
    db: AsyncSession = Depends(get_db)
):
    """Unassign both assignee and assistant from an assignment."""
    try:
        use_case = UpdateAssignmentUseCase(db)
        assignment = await use_case.unassign_all(
            assignment_id=assignment_id,
            reason=request.reason
        )
        return AssignmentDTO.from_orm(assignment)
    except (EntityNotFoundError, BusinessRuleViolationError) as exc:
        raise _map_domain_error(exc)


@router.get("/{assignment_id}/history", response_model=List[AssignmentHistoryDTO])
async def get_assignment_history(
    assignment_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get the history of changes for an assignment."""
    repository = SQLAlchemyAssignmentRepository(db)
    service = AssignmentService(repository)
    history = await service.get_assignment_history(assignment_id)
    return [AssignmentHistoryDTO.from_orm(h) for h in history]


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete an assignment."""
    repository = SQLAlchemyAssignmentRepository(db)
    service = AssignmentService(repository)
    deleted = await service.delete_assignment(assignment_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment {assignment_id} not found"
        )

    await db.commit()
