"""
SQLAlchemy models for the Assignments module.
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from src.shared.infrastructure.database import Base


class AssignmentType(Base):
    """Assignment type model - defines types of assignments."""
    
    __tablename__ = "assignment_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    code = Column(String(50), nullable=False, unique=True)  # e.g., "tesoros_discurso", "lectura_biblica"
    name = Column(String(200), nullable=False)  # e.g., "Discurso de Tesoros"
    category = Column(String(50), nullable=False)  # e.g., "tesoros", "ministerio", "vida_cristiana"
    requires_assistant = Column(Integer, nullable=False, default=0)  # 1=yes, 0=no
    default_duration = Column(Integer, nullable=True)  # Duration in minutes
    config = Column(JSONB, nullable=True, default=dict)  # Additional configuration
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    assignments = relationship("Assignment", back_populates="assignment_type")
    
    def __repr__(self):
        return f"<AssignmentType(code='{self.code}', name='{self.name}')>"


class Assignment(Base):
    """Assignment model - represents a task assignment."""
    
    __tablename__ = "assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    week_id = Column(UUID(as_uuid=True), ForeignKey("weeks.id"), nullable=False)
    assignment_type_id = Column(UUID(as_uuid=True), ForeignKey("assignment_types.id"), nullable=False)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=True)  # Can be null (unassigned)
    assistant_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=True)
    title = Column(String(500), nullable=False)  # Full title of the assignment
    duration = Column(Integer, nullable=True)  # Duration in minutes
    order_index = Column(Integer, nullable=False, default=0)  # Order within the week
    assigned_at = Column(DateTime, nullable=True)  # When it was assigned
    assigned_by_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=True)  # Who assigned it
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    week = relationship("Week", back_populates="assignments")
    assignment_type = relationship("AssignmentType", back_populates="assignments")
    assignee = relationship("Person", foreign_keys=[assignee_id], back_populates="assignments_as_assignee")
    assistant = relationship("Person", foreign_keys=[assistant_id], back_populates="assignments_as_assistant")
    assigned_by = relationship("Person", foreign_keys=[assigned_by_id])
    history = relationship("AssignmentHistory", back_populates="assignment", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Assignment(id={self.id}, title='{self.title[:30]}...')>"


class AssignmentHistory(Base):
    """Assignment history model - tracks changes to assignments."""
    
    __tablename__ = "assignment_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id"), nullable=False)
    previous_assignee_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=True)
    new_assignee_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=True)
    change_reason = Column(Text, nullable=True)
    changed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    changed_by_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=True)
    
    # Relationships
    assignment = relationship("Assignment", back_populates="history")
    previous_assignee = relationship("Person", foreign_keys=[previous_assignee_id])
    new_assignee = relationship("Person", foreign_keys=[new_assignee_id])
    changed_by = relationship("Person", foreign_keys=[changed_by_id])
    
    def __repr__(self):
        return f"<AssignmentHistory(id={self.id}, assignment_id={self.assignment_id})>"
