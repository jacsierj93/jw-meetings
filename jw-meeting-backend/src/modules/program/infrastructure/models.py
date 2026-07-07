"""
SQLAlchemy models for the Program module.
"""
from datetime import datetime, date
from uuid import uuid4
from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from src.shared.infrastructure.database import Base


class Congregation(Base):
    """Congregation model."""
    
    __tablename__ = "congregations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(200), nullable=False, unique=True)
    settings = Column(JSONB, nullable=True, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    programs = relationship("Program", back_populates="congregation", cascade="all, delete-orphan")
    persons = relationship("Person", back_populates="congregation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Congregation(id={self.id}, name='{self.name}')>"


class Person(Base):
    """Person model - represents a member of the congregation."""
    
    __tablename__ = "persons"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    congregation_id = Column(UUID(as_uuid=True), ForeignKey("congregations.id"), nullable=False)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=True)
    extra_data = Column(JSONB, nullable=True, default=dict)  # For extensibility (phone, skills, etc.)
    active = Column(Integer, nullable=False, default=1)  # 1=active, 0=inactive
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    congregation = relationship("Congregation", back_populates="persons")
    profile = relationship(
        "PersonProfile",
        back_populates="person",
        uselist=False,
        cascade="all, delete-orphan",
    )
    restrictions = relationship(
        "PersonRestriction",
        back_populates="person",
        cascade="all, delete-orphan",
        order_by="PersonRestriction.starts_on",
    )
    availability_windows = relationship(
        "PersonAvailabilityWindow",
        back_populates="person",
        cascade="all, delete-orphan",
        order_by="PersonAvailabilityWindow.starts_on",
    )
    assignments_as_assignee = relationship(
        "Assignment",
        foreign_keys="Assignment.assignee_id",
        back_populates="assignee"
    )
    assignments_as_assistant = relationship(
        "Assignment",
        foreign_keys="Assignment.assistant_id",
        back_populates="assistant"
    )
    
    def __repr__(self):
        return f"<Person(id={self.id}, name='{self.full_name}')>"


class PersonProfile(Base):
    """Stable person profile used as structured context for the agent."""

    __tablename__ = "person_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=False, unique=True)
    sex = Column(String(20), nullable=True)
    is_elder = Column(Integer, nullable=False, default=0)
    is_ministerial_servant = Column(Integer, nullable=False, default=0)
    hard_capabilities = Column(JSONB, nullable=False, default=dict)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)

    person = relationship("Person", back_populates="profile")

    def __repr__(self):
        return f"<PersonProfile(person_id={self.person_id})>"


class PersonRestriction(Base):
    """Consultable local restriction data. Interpretation stays in the agent."""

    __tablename__ = "person_restrictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=False)
    restriction_type = Column(String(50), nullable=False)
    starts_on = Column(Date, nullable=True)
    ends_on = Column(Date, nullable=True)
    is_hard = Column(Integer, nullable=False, default=0)
    reason = Column(String(500), nullable=True)
    details = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)

    person = relationship("Person", back_populates="restrictions")

    def __repr__(self):
        return f"<PersonRestriction(person_id={self.person_id}, type='{self.restriction_type}')>"


class PersonAvailabilityWindow(Base):
    """Structured availability windows as data for agent-side interpretation."""

    __tablename__ = "person_availability_windows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=False)
    window_type = Column(String(50), nullable=False, default="unavailable")
    starts_on = Column(Date, nullable=False)
    ends_on = Column(Date, nullable=True)
    notes = Column(String(500), nullable=True)
    details = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)

    person = relationship("Person", back_populates="availability_windows")

    def __repr__(self):
        return f"<PersonAvailabilityWindow(person_id={self.person_id}, type='{self.window_type}')>"


class Program(Base):
    """Program model - represents a meeting program (e.g., January 2026)."""
    
    __tablename__ = "programs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    congregation_id = Column(UUID(as_uuid=True), ForeignKey("congregations.id"), nullable=False)
    version = Column(String(50), nullable=False)  # e.g., "2026-01-01"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    source_file = Column(String(500), nullable=True)  # Path to EPUB file
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    congregation = relationship("Congregation", back_populates="programs")
    weeks = relationship("Week", back_populates="program", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Program(id={self.id}, version='{self.version}')>"


class Week(Base):
    """Week model - represents a single week in the program."""
    
    __tablename__ = "weeks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    date_range = Column(String(100), nullable=False)  # e.g., "5-11 DE ENERO"
    reading = Column(String(200), nullable=True)  # e.g., "Isaías 17-20"
    songs = Column(JSONB, nullable=False, default=dict)  # {apertura: {numero: 153, oracion: ""}, medio: 148, cierre: {...}}
    week_number = Column(Integer, nullable=False)
    week_date = Column(Date, nullable=False)  # First day of the week
    extra_data = Column(JSONB, nullable=True, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    program = relationship("Program", back_populates="weeks")
    content = relationship("WeekContent", back_populates="week", uselist=False, cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="week", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Week(id={self.id}, date_range='{self.date_range}')>"


class WeekContent(Base):
    """Week content model - stores detailed content for a week."""
    
    __tablename__ = "week_contents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    week_id = Column(UUID(as_uuid=True), ForeignKey("weeks.id"), nullable=False, unique=True)
    treasures = Column(JSONB, nullable=False, default=dict)  # {titulo1: {...}, lecturaBiblica: {...}}
    ministry_items = Column(JSONB, nullable=False, default=list)  # [{tipo, titulo, duracion}, ...]
    christian_life_items = Column(JSONB, nullable=False, default=list)  # [{titulo, duracion}, ...]
    raw_content = Column(JSONB, nullable=True, default=dict)  # Full parsed content for future use
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    week = relationship("Week", back_populates="content")
    
    def __repr__(self):
        return f"<WeekContent(id={self.id}, week_id={self.week_id})>"
