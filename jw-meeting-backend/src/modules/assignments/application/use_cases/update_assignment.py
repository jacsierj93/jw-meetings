"""
Use case for updating assignments.
"""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.assignments.application.services.assignment_validation import MinimalAssignmentValidator
from src.modules.assignments.domain.services.assignment_service import AssignmentService
from src.modules.assignments.infrastructure.persistence.sqlalchemy_assignment_repository import SQLAlchemyAssignmentRepository
from src.modules.assignments.infrastructure.models import Assignment


class UpdateAssignmentUseCase:
    """Use case for updating assignments."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        repository = SQLAlchemyAssignmentRepository(db_session)
        self.service = AssignmentService(repository)
        self.validator = MinimalAssignmentValidator(db_session)
    
    async def reassign(
        self,
        assignment_id: UUID,
        new_assignee_id: UUID = None,
        changed_by_id: UUID = None,
        reason: str = None
    ) -> Assignment:
        """Reassign an assignment to a different person."""
        await self.validator.validate_for_reassign(
            assignment_id=assignment_id,
            assignee_id=new_assignee_id,
        )

        assignment = await self.service.reassign_task(
            assignment_id=assignment_id,
            new_assignee_id=new_assignee_id,
            changed_by_id=changed_by_id,
            reason=reason
        )
        
        await self.db.commit()
        await self.db.refresh(assignment)
        
        return assignment
    
    async def update_assistant(
        self,
        assignment_id: UUID,
        assistant_id: UUID = None
    ) -> Assignment:
        """Update the assistant for an assignment."""
        await self.validator.validate_for_assistant_update(
            assignment_id=assignment_id,
            assistant_id=assistant_id,
        )

        assignment = await self.service.update_assistant(
            assignment_id=assignment_id,
            assistant_id=assistant_id
        )
        
        await self.db.commit()
        await self.db.refresh(assignment)
        
        return assignment

    async def unassign_all(
        self,
        assignment_id: UUID,
        changed_by_id: UUID = None,
        reason: str = None
    ) -> Assignment:
        """Unassign both assignee and assistant."""
        assignment = await self.service.unassign_all(
            assignment_id=assignment_id,
            changed_by_id=changed_by_id,
            reason=reason
        )

        await self.db.commit()
        await self.db.refresh(assignment)

        return assignment
