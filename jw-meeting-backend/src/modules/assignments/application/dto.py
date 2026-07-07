"""
DTOs for assignments module.
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class AssignmentTypeDTO(BaseModel):
    """Assignment type data transfer object."""
    id: UUID
    code: str
    name: str
    category: str
    requires_assistant: bool
    default_duration: Optional[int] = None
    config: Optional[dict] = None
    
    class Config:
        from_attributes = True


class PersonSummaryDTO(BaseModel):
    """Person summary for assignments."""
    id: UUID
    full_name: str
    
    class Config:
        from_attributes = True


class AssignmentDTO(BaseModel):
    """Assignment data transfer object."""
    id: UUID
    week_id: UUID
    assignment_type: AssignmentTypeDTO
    assignee: Optional[PersonSummaryDTO] = None
    assistant: Optional[PersonSummaryDTO] = None
    title: str
    duration: Optional[int] = None
    order_index: int
    assigned_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class AssignmentHistoryDTO(BaseModel):
    """Assignment history data transfer object."""
    id: UUID
    assignment_id: UUID
    previous_assignee: Optional[PersonSummaryDTO] = None
    new_assignee: Optional[PersonSummaryDTO] = None
    change_reason: Optional[str] = None
    changed_at: datetime
    changed_by: Optional[PersonSummaryDTO] = None
    
    class Config:
        from_attributes = True


class CreateAssignmentRequest(BaseModel):
    """Request to create an assignment."""
    week_id: UUID = Field(..., description="Context ID (e.g., week ID)")
    assignment_type_id: UUID
    title: str = Field(..., min_length=1, max_length=500)
    assignee_id: Optional[UUID] = None
    assistant_id: Optional[UUID] = None
    duration: Optional[int] = Field(None, ge=0, le=120)
    order_index: int = Field(0, ge=0)


class UpdateAssignmentRequest(BaseModel):
    """Request to update an assignment."""
    assignee_id: Optional[UUID] = None
    assistant_id: Optional[UUID] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    duration: Optional[int] = Field(None, ge=0, le=120)


class ReassignRequest(BaseModel):
    """Request to reassign an assignment."""
    new_assignee_id: Optional[UUID] = None
    reason: Optional[str] = Field(None, max_length=500)


class UpdateAssistantRequest(BaseModel):
    """Request to update the assistant of an assignment."""
    assistant_id: Optional[UUID] = None


class UnassignRequest(BaseModel):
    """Request to unassign an assignment."""
    reason: Optional[str] = Field(None, max_length=500)


class AssignmentTypeWorkloadDTO(BaseModel):
    """Workload summary for one assignment type."""
    assignment_type_code: str
    assignment_type_name: str
    assignee_count: int = 0
    assistant_count: int = 0
    total_count: int = 0


class PersonWorkloadSummaryDTO(BaseModel):
    """Aggregated workload for one person."""
    person: PersonSummaryDTO
    total_as_assignee: int = 0
    total_as_assistant: int = 0
    total_count: int = 0
    by_type: List[AssignmentTypeWorkloadDTO] = Field(default_factory=list)


class RecentAssignmentDTO(BaseModel):
    """Recent assignment item for one person."""
    assignment_id: UUID
    week_id: UUID
    week_date: date
    week_label: str
    assignment_type_code: str
    assignment_type_name: str
    title: str
    role: str
    order_index: int


class PairFrequencyDTO(BaseModel):
    """Frequency of assignee/assistant pairs within a program."""
    assignee: PersonSummaryDTO
    assistant: PersonSummaryDTO
    count: int
    assignment_ids: List[UUID] = Field(default_factory=list)


class ValidationFindingDTO(BaseModel):
    """Non-blocking validation finding."""
    level: str
    code: str
    message: str
    assignment_id: Optional[UUID] = None
    person_id: Optional[UUID] = None


class WeekDiagnosticsDTO(BaseModel):
    """Validation findings for one week."""
    week_id: UUID
    findings: List[ValidationFindingDTO] = Field(default_factory=list)


class ProgramDiagnosticsDTO(BaseModel):
    """Validation findings for a full program."""
    program_id: UUID
    findings: List[ValidationFindingDTO] = Field(default_factory=list)
    weeks: List[WeekDiagnosticsDTO] = Field(default_factory=list)
