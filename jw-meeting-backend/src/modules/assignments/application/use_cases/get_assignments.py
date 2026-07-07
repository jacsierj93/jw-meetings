"""
Use case for getting assignments.
"""
from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.assignments.domain.services.assignment_service import AssignmentService
from src.modules.assignments.infrastructure.persistence.sqlalchemy_assignment_repository import SQLAlchemyAssignmentRepository
from src.modules.assignments.infrastructure.models import Assignment


class GetAssignmentsUseCase:
    """Use case for retrieving assignments."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        repository = SQLAlchemyAssignmentRepository(db_session)
        self.service = AssignmentService(repository)
    
    async def get_by_id(self, assignment_id: UUID) -> Assignment:
        """Get assignment by ID."""
        return await self.service.get_assignment(assignment_id)
    
    async def get_by_week(self, week_id: UUID) -> List[Assignment]:
        """Get all assignments for a week."""
        return await self.service.get_assignments_for_context(week_id)
    
    async def get_by_person(self, person_id: UUID) -> List[Assignment]:
        """Get all assignments for a person."""
        return await self.service.get_assignments_for_person(person_id)
