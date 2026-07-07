"""
SQLAlchemy implementation of AssignmentRepository.
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.modules.assignments.domain.repositories.assignment_repository import AssignmentRepository
from src.modules.assignments.infrastructure.models import Assignment, AssignmentHistory


class SQLAlchemyAssignmentRepository(AssignmentRepository):
    """SQLAlchemy implementation of assignment repository."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, assignment: Assignment) -> Assignment:
        """Create a new assignment."""
        self.session.add(assignment)
        await self.session.flush()
        await self.session.refresh(assignment)
        return assignment
    
    async def get_by_id(self, assignment_id: UUID) -> Optional[Assignment]:
        """Get assignment by ID."""
        stmt = (
            select(Assignment)
            .options(
                selectinload(Assignment.assignee),
                selectinload(Assignment.assistant),
                selectinload(Assignment.assignment_type)
            )
            .where(Assignment.id == assignment_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_by_context(self, context_id: UUID, context_type: str = None) -> List[Assignment]:
        """Get all assignments for a context (e.g., a week)."""
        # In our case, context_id is week_id
        stmt = (
            select(Assignment)
            .options(
                selectinload(Assignment.assignee),
                selectinload(Assignment.assistant),
                selectinload(Assignment.assignment_type)
            )
            .where(Assignment.week_id == context_id)
            .order_by(Assignment.order_index)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def get_by_assignee(self, assignee_id: UUID) -> List[Assignment]:
        """Get all assignments for a person."""
        stmt = (
            select(Assignment)
            .options(
                selectinload(Assignment.week),
                selectinload(Assignment.assignment_type)
            )
            .where(Assignment.assignee_id == assignee_id)
            .order_by(Assignment.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def update(self, assignment: Assignment) -> Assignment:
        """Update an assignment."""
        await self.session.flush()
        await self.session.refresh(assignment)
        return assignment
    
    async def delete(self, assignment_id: UUID) -> bool:
        """Delete an assignment."""
        assignment = await self.get_by_id(assignment_id)
        if assignment:
            await self.session.delete(assignment)
            await self.session.flush()
            return True
        return False
    
    async def add_history(self, history: AssignmentHistory) -> AssignmentHistory:
        """Add a history entry."""
        self.session.add(history)
        await self.session.flush()
        await self.session.refresh(history)
        return history
    
    async def get_history(self, assignment_id: UUID) -> List[AssignmentHistory]:
        """Get history for an assignment."""
        stmt = (
            select(AssignmentHistory)
            .options(
                selectinload(AssignmentHistory.previous_assignee),
                selectinload(AssignmentHistory.new_assignee),
                selectinload(AssignmentHistory.changed_by)
            )
            .where(AssignmentHistory.assignment_id == assignment_id)
            .order_by(AssignmentHistory.changed_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
