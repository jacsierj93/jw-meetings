"""
DTOs for program module.
"""
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class CongregationDTO(BaseModel):
    """Congregation data transfer object."""
    id: UUID
    name: str
    settings: Optional[dict] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class PersonProfileDTO(BaseModel):
    """Stable structured profile for a person."""
    id: UUID
    person_id: UUID
    sex: Optional[str] = None
    is_elder: bool
    is_ministerial_servant: bool
    hard_capabilities: dict = Field(default_factory=dict)
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PersonRestrictionDTO(BaseModel):
    """Consultable person restriction."""
    id: UUID
    person_id: UUID
    restriction_type: str
    starts_on: Optional[date] = None
    ends_on: Optional[date] = None
    is_hard: bool
    reason: Optional[str] = None
    details: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PersonAvailabilityWindowDTO(BaseModel):
    """Consultable availability window."""
    id: UUID
    person_id: UUID
    window_type: str
    starts_on: date
    ends_on: Optional[date] = None
    notes: Optional[str] = None
    details: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PersonDTO(BaseModel):
    """Person data transfer object."""
    id: UUID
    congregation_id: UUID
    full_name: str
    email: Optional[str] = None
    extra_data: Optional[dict] = None
    active: bool
    profile: Optional[PersonProfileDTO] = None
    restrictions: List[PersonRestrictionDTO] = Field(default_factory=list)
    availability_windows: List[PersonAvailabilityWindowDTO] = Field(default_factory=list)
    created_at: datetime
    
    class Config:
        from_attributes = True


class WeekContentDTO(BaseModel):
    """Week content data transfer object."""
    treasures: dict
    ministry_items: List[dict]
    christian_life_items: List[dict]
    
    class Config:
        from_attributes = True


class WeekDTO(BaseModel):
    """Week data transfer object."""
    id: UUID
    program_id: UUID
    date_range: str
    reading: Optional[str] = None
    songs: dict
    week_number: int
    week_date: date
    extra_data: Optional[dict] = None
    content: Optional[WeekContentDTO] = None
    
    class Config:
        from_attributes = True


class ProgramDTO(BaseModel):
    """Program data transfer object."""
    id: UUID
    congregation_id: UUID
    version: str
    start_date: date
    end_date: date
    source_file: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProgramWithWeeksDTO(ProgramDTO):
    """Program with weeks data transfer object."""
    weeks: List[WeekDTO] = []


class UpdateWeekRequest(BaseModel):
    """Request to update a week."""
    extra_data: Optional[dict] = None


class CreateCongregationRequest(BaseModel):
    """Request to create a congregation."""
    name: str = Field(..., min_length=1, max_length=200)
    settings: Optional[dict] = None


class CreatePersonRequest(BaseModel):
    """Request to create a person."""
    congregation_id: UUID
    full_name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    extra_data: Optional[dict] = None


class UpsertPersonProfileRequest(BaseModel):
    """Create or update a stable person profile."""
    sex: Optional[str] = Field(None, max_length=20)
    is_elder: Optional[bool] = None
    is_ministerial_servant: Optional[bool] = None
    hard_capabilities: Optional[dict] = None
    notes: Optional[str] = None


class CreatePersonRestrictionRequest(BaseModel):
    """Create a consultable person restriction."""
    restriction_type: str = Field(..., min_length=1, max_length=50)
    starts_on: Optional[date] = None
    ends_on: Optional[date] = None
    is_hard: bool = False
    reason: Optional[str] = Field(None, max_length=500)
    details: Optional[dict] = None


class UpdatePersonRestrictionRequest(BaseModel):
    """Update a consultable person restriction."""
    restriction_type: Optional[str] = Field(None, min_length=1, max_length=50)
    starts_on: Optional[date] = None
    ends_on: Optional[date] = None
    is_hard: Optional[bool] = None
    reason: Optional[str] = Field(None, max_length=500)
    details: Optional[dict] = None


class CreatePersonAvailabilityWindowRequest(BaseModel):
    """Create a consultable availability window."""
    window_type: str = Field(..., min_length=1, max_length=50)
    starts_on: date
    ends_on: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=500)
    details: Optional[dict] = None


class UpdatePersonAvailabilityWindowRequest(BaseModel):
    """Update a consultable availability window."""
    window_type: Optional[str] = Field(None, min_length=1, max_length=50)
    starts_on: Optional[date] = None
    ends_on: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=500)
    details: Optional[dict] = None


class UpdatePersonRequest(BaseModel):
    """Request to update a person."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    extra_data: Optional[dict] = None
    active: Optional[bool] = None
