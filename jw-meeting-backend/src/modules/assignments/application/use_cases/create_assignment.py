"""
Use case for creating an assignment.
"""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.assignments.application.services.assignment_validation import MinimalAssignmentValidator
from src.modules.assignments.domain.services.assignment_service import AssignmentService
from src.modules.assignments.infrastructure.persistence.sqlalchemy_assignment_repository import SQLAlchemyAssignmentRepository
from src.modules.assignments.infrastructure.models import Assignment


class CreateAssignmentUseCase:
    """Use case for creating an assignment."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        repository = SQLAlchemyAssignmentRepository(db_session)
        self.service = AssignmentService(repository)
        self.validator = MinimalAssignmentValidator(db_session)
    
    async def execute(
        self,
        week_id: UUID,
        assignment_type_id: UUID,
        title: str,
        assignee_id: UUID = None,
        assistant_id: UUID = None,
        duration: int = None,
        order_index: int = 0,
        assigned_by_id: UUID = None
    ) -> Assignment:
        """Create a new assignment."""
        await self.validator.validate_for_create(
            week_id=week_id,
            assignment_type_id=assignment_type_id,
            assignee_id=assignee_id,
            assistant_id=assistant_id,
        )

        assignment = await self.service.assign_task(
            context_id=week_id,
            assignment_type_id=assignment_type_id,
            title=title,
            assignee_id=assignee_id,
            assistant_id=assistant_id,
            duration=duration,
            order_index=order_index,
            assigned_by_id=assigned_by_id
        )
        
        await self.db.commit()
        await self.db.refresh(assignment)
        
        return assignment
