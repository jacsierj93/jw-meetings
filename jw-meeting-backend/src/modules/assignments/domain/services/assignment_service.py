"""
Domain service for assignment management.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from src.modules.assignments.domain.repositories.assignment_repository import AssignmentRepository
from src.modules.assignments.infrastructure.models import Assignment, AssignmentHistory
from src.shared.domain.exceptions import EntityNotFoundError, BusinessRuleViolationError


class AssignmentService:
    """
    Domain service for managing assignments.
    
    This service is generic and can be used for any type of assignment system,
    not just meeting programs.
    """
    
    def __init__(self, repository: AssignmentRepository):
        self.repository = repository
    
    async def assign_task(
        self,
        context_id: UUID,
        assignment_type_id: UUID,
        title: str,
        assignee_id: Optional[UUID] = None,
        assistant_id: Optional[UUID] = None,
        duration: Optional[int] = None,
        order_index: int = 0,
        assigned_by_id: Optional[UUID] = None
    ) -> Assignment:
        """
        Assign a task to a person.
        
        Args:
            context_id: ID of the context (e.g., week_id)
            assignment_type_id: Type of assignment
            title: Title/description of the assignment
            assignee_id: Person assigned (optional, can be assigned later)
            assistant_id: Assistant person (optional)
            duration: Duration in minutes (optional)
            order_index: Order within the context
            assigned_by_id: Who assigned it (optional)
            
        Returns:
            Created Assignment
        """
        assignment = Assignment(
            week_id=context_id,  # Generic: could be any context
            assignment_type_id=assignment_type_id,
            assignee_id=assignee_id,
            assistant_id=assistant_id,
            title=title,
            duration=duration,
            order_index=order_index,
            assigned_at=datetime.utcnow() if assignee_id else None,
            assigned_by_id=assigned_by_id
        )
        
        return await self.repository.create(assignment)
    
    async def reassign_task(
        self,
        assignment_id: UUID,
        new_assignee_id: Optional[UUID],
        changed_by_id: Optional[UUID] = None,
        reason: Optional[str] = None
    ) -> Assignment:
        """
        Reassign a task to a different person.
        
        Args:
            assignment_id: ID of the assignment
            new_assignee_id: New person to assign
            changed_by_id: Who made the change
            reason: Reason for the change
            
        Returns:
            Updated Assignment
        """
        assignment = await self.repository.get_by_id(assignment_id)
        if not assignment:
            raise EntityNotFoundError(f"Assignment {assignment_id} not found")
        
        # Record history
        history = AssignmentHistory(
            assignment_id=assignment_id,
            previous_assignee_id=assignment.assignee_id,
            new_assignee_id=new_assignee_id,
            change_reason=reason,
            changed_at=datetime.utcnow(),
            changed_by_id=changed_by_id
        )
        await self.repository.add_history(history)
        
        # Update assignment
        assignment.assignee_id = new_assignee_id
        if new_assignee_id:
            assignment.assigned_at = datetime.utcnow()
            assignment.assigned_by_id = changed_by_id
        else:
            assignment.assigned_at = None
            assignment.assigned_by_id = None
        
        return await self.repository.update(assignment)
    
    async def update_assistant(
        self,
        assignment_id: UUID,
        assistant_id: Optional[UUID]
    ) -> Assignment:
        """Update the assistant for an assignment."""
        assignment = await self.repository.get_by_id(assignment_id)
        if not assignment:
            raise EntityNotFoundError(f"Assignment {assignment_id} not found")
        
        assignment.assistant_id = assistant_id
        return await self.repository.update(assignment)

    async def unassign_all(
        self,
        assignment_id: UUID,
        changed_by_id: Optional[UUID] = None,
        reason: Optional[str] = None
    ) -> Assignment:
        """Unassign both assignee and assistant from an assignment."""
        assignment = await self.repository.get_by_id(assignment_id)
        if not assignment:
            raise EntityNotFoundError(f"Assignment {assignment_id} not found")

        history = AssignmentHistory(
            assignment_id=assignment_id,
            previous_assignee_id=assignment.assignee_id,
            new_assignee_id=None,
            change_reason=reason,
            changed_at=datetime.utcnow(),
            changed_by_id=changed_by_id
        )
        await self.repository.add_history(history)

        assignment.assignee_id = None
        assignment.assistant_id = None
        assignment.assigned_at = None
        assignment.assigned_by_id = None

        return await self.repository.update(assignment)
    
    async def get_assignment(self, assignment_id: UUID) -> Assignment:
        """Get an assignment by ID."""
        assignment = await self.repository.get_by_id(assignment_id)
        if not assignment:
            raise EntityNotFoundError(f"Assignment {assignment_id} not found")
        return assignment
    
    async def get_assignments_for_context(
        self,
        context_id: UUID,
        context_type: str = None
    ) -> List[Assignment]:
        """Get all assignments for a context (e.g., all assignments for a week)."""
        return await self.repository.get_by_context(context_id, context_type)
    
    async def get_assignments_for_person(self, person_id: UUID) -> List[Assignment]:
        """Get all assignments for a person."""
        return await self.repository.get_by_assignee(person_id)
    
    async def get_assignment_history(self, assignment_id: UUID) -> List[AssignmentHistory]:
        """Get the history of changes for an assignment."""
        return await self.repository.get_history(assignment_id)
    
    async def delete_assignment(self, assignment_id: UUID) -> bool:
        """Delete an assignment."""
        return await self.repository.delete(assignment_id)
    
    async def bulk_create_assignments(
        self,
        context_id: UUID,
        assignments_data: List[dict]
    ) -> List[Assignment]:
        """
        Create multiple assignments at once.
        
        Useful for creating all assignments for a week at once.
        """
        assignments = []
        for idx, data in enumerate(assignments_data):
            assignment = await self.assign_task(
                context_id=context_id,
                assignment_type_id=data['assignment_type_id'],
                title=data['title'],
                assignee_id=data.get('assignee_id'),
                assistant_id=data.get('assistant_id'),
                duration=data.get('duration'),
                order_index=data.get('order_index', idx),
                assigned_by_id=data.get('assigned_by_id')
            )
            assignments.append(assignment)
        
        return assignments
