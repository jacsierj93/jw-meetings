"""
Base entity models for the domain.
"""
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional


class BaseEntity:
    """Base class for all domain entities."""
    
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime]
    
    def __init__(self):
        self.id = uuid4()
        self.created_at = datetime.utcnow()
        self.updated_at = None
    
    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return False
        return self.id == other.id
    
    def __hash__(self):
        return hash(self.id)
