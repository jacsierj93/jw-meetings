"""
Repository interface for assignments.
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from src.modules.assignments.infrastructure.models import Assignment, AssignmentHistory


class AssignmentRepository(ABC):
    """Abstract repository for assignments."""
    
    @abstractmethod
    async def create(self, assignment: Assignment) -> Assignment:
        """Create a new assignment."""
        pass
    
    @abstractmethod
    async def get_by_id(self, assignment_id: UUID) -> Optional[Assignment]:
        """Get assignment by ID."""
        pass
    
    @abstractmethod
    async def get_by_context(self, context_id: UUID, context_type: str = None) -> List[Assignment]:
        """Get all assignments for a context (e.g., a week)."""
        pass
    
    @abstractmethod
    async def get_by_assignee(self, assignee_id: UUID) -> List[Assignment]:
        """Get all assignments for a person."""
        pass
    
    @abstractmethod
    async def update(self, assignment: Assignment) -> Assignment:
        """Update an assignment."""
        pass
    
    @abstractmethod
    async def delete(self, assignment_id: UUID) -> bool:
        """Delete an assignment."""
        pass
    
    @abstractmethod
    async def add_history(self, history: AssignmentHistory) -> AssignmentHistory:
        """Add a history entry."""
        pass
    
    @abstractmethod
    async def get_history(self, assignment_id: UUID) -> List[AssignmentHistory]:
        """Get history for an assignment."""
        pass
