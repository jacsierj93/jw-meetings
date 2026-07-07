"""
FastAPI routes for programs.
"""
import os
import shutil
import tempfile
from datetime import datetime
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.shared.infrastructure.database import get_db
from src.modules.program.application.dto import (
    ProgramDTO,
    ProgramWithWeeksDTO,
    WeekDTO,
    CongregationDTO,
    PersonDTO,
    PersonProfileDTO,
    PersonRestrictionDTO,
    PersonAvailabilityWindowDTO,
    CreateCongregationRequest,
    CreatePersonRequest,
    UpsertPersonProfileRequest,
    CreatePersonRestrictionRequest,
    UpdatePersonRestrictionRequest,
    CreatePersonAvailabilityWindowRequest,
    UpdatePersonAvailabilityWindowRequest,
    UpdatePersonRequest,
    UpdateWeekRequest,
)
from src.modules.program.application.use_cases.import_program import ImportProgramFromEpubUseCase
from src.modules.program.infrastructure.models import (
    Program,
    Week,
    Congregation,
    Person,
    PersonProfile,
    PersonRestriction,
    PersonAvailabilityWindow,
)


router = APIRouter()


def _serialize_person(person: Person) -> PersonDTO:
    return PersonDTO(
        id=person.id,
        congregation_id=person.congregation_id,
        full_name=person.full_name,
        email=person.email,
        extra_data=person.extra_data or {},
        active=bool(person.active),
        profile=(
            PersonProfileDTO.from_orm(person.profile) if person.profile else None
        ),
        restrictions=[
            PersonRestrictionDTO.from_orm(restriction)
            for restriction in person.restrictions
        ],
        availability_windows=[
            PersonAvailabilityWindowDTO.from_orm(window)
            for window in person.availability_windows
        ],
        created_at=person.created_at,
    )


async def _get_person_or_404(db: AsyncSession, person_id: UUID) -> Person:
    stmt = (
        select(Person)
        .options(
            selectinload(Person.profile),
            selectinload(Person.restrictions),
            selectinload(Person.availability_windows),
        )
        .where(Person.id == person_id)
    )
    result = await db.execute(stmt)
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person {person_id} not found"
        )
    return person


# Congregation endpoints
@router.post("/congregations", response_model=CongregationDTO, status_code=status.HTTP_201_CREATED)
async def create_congregation(
    request: CreateCongregationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new congregation."""
    congregation = Congregation(
        name=request.name,
        settings=request.settings or {}
    )
    
    db.add(congregation)
    await db.commit()
    await db.refresh(congregation)
    
    return CongregationDTO.from_orm(congregation)


@router.get("/congregations", response_model=List[CongregationDTO])
async def list_congregations(db: AsyncSession = Depends(get_db)):
    """List all congregations."""
    stmt = select(Congregation)
    result = await db.execute(stmt)
    congregations = result.scalars().all()
    
    return [CongregationDTO.from_orm(c) for c in congregations]


# Person endpoints
@router.post("/persons", response_model=PersonDTO, status_code=status.HTTP_201_CREATED)
async def create_person(
    request: CreatePersonRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new person."""
    person = Person(
        congregation_id=request.congregation_id,
        full_name=request.full_name,
        email=request.email,
        extra_data=request.extra_data or {},
        active=1
    )
    
    db.add(person)
    await db.commit()
    person = await _get_person_or_404(db, person.id)

    return _serialize_person(person)


@router.get("/persons", response_model=List[PersonDTO])
async def list_persons(
    congregation_id: UUID = None,
    db: AsyncSession = Depends(get_db)
):
    """List all persons, optionally filtered by congregation."""
    stmt = select(Person).options(
        selectinload(Person.profile),
        selectinload(Person.restrictions),
        selectinload(Person.availability_windows),
    )
    if congregation_id:
        stmt = stmt.where(Person.congregation_id == congregation_id)
    
    result = await db.execute(stmt)
    persons = result.scalars().all()
    
    return [_serialize_person(p) for p in persons]


@router.get("/persons/{person_id}", response_model=PersonDTO)
async def get_person(
    person_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a person with stable profile, restrictions and availability windows."""
    person = await _get_person_or_404(db, person_id)
    return _serialize_person(person)


@router.patch("/persons/{person_id}", response_model=PersonDTO)
async def update_person(
    person_id: UUID,
    request: UpdatePersonRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update a person."""
    person = await _get_person_or_404(db, person_id)

    payload = request.model_dump(exclude_unset=True)
    if "active" in payload:
        payload["active"] = 1 if payload["active"] else 0

    for key, value in payload.items():
        setattr(person, key, value)

    await db.commit()
    person = await _get_person_or_404(db, person_id)

    return _serialize_person(person)


@router.put("/persons/{person_id}/profile", response_model=PersonProfileDTO)
async def upsert_person_profile(
    person_id: UUID,
    request: UpsertPersonProfileRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create or update the stable structured profile of a person."""
    person = await _get_person_or_404(db, person_id)

    profile = person.profile
    payload = request.model_dump(exclude_unset=True)
    if not profile:
        profile = PersonProfile(person_id=person_id)
        db.add(profile)

    if "is_elder" in payload:
        payload["is_elder"] = 1 if payload["is_elder"] else 0
    if "is_ministerial_servant" in payload:
        payload["is_ministerial_servant"] = 1 if payload["is_ministerial_servant"] else 0

    for key, value in payload.items():
        setattr(profile, key, value)

    await db.commit()
    await db.refresh(profile)
    return PersonProfileDTO.from_orm(profile)


@router.get("/persons/{person_id}/profile", response_model=PersonProfileDTO)
async def get_person_profile(
    person_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get the stable structured profile of a person."""
    person = await _get_person_or_404(db, person_id)
    if not person.profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile for person {person_id} not found"
        )
    return PersonProfileDTO.from_orm(person.profile)


@router.get("/persons/{person_id}/restrictions", response_model=List[PersonRestrictionDTO])
async def list_person_restrictions(
    person_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """List consultable restriction data for a person."""
    await _get_person_or_404(db, person_id)
    stmt = (
        select(PersonRestriction)
        .where(PersonRestriction.person_id == person_id)
        .order_by(PersonRestriction.starts_on, PersonRestriction.created_at)
    )
    result = await db.execute(stmt)
    restrictions = result.scalars().all()
    return [PersonRestrictionDTO.from_orm(r) for r in restrictions]


@router.post("/persons/{person_id}/restrictions", response_model=PersonRestrictionDTO, status_code=status.HTTP_201_CREATED)
async def create_person_restriction(
    person_id: UUID,
    request: CreatePersonRestrictionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create consultable restriction data for a person."""
    await _get_person_or_404(db, person_id)
    restriction = PersonRestriction(
        person_id=person_id,
        restriction_type=request.restriction_type,
        starts_on=request.starts_on,
        ends_on=request.ends_on,
        is_hard=1 if request.is_hard else 0,
        reason=request.reason,
        details=request.details or {},
    )
    db.add(restriction)
    await db.commit()
    await db.refresh(restriction)
    return PersonRestrictionDTO.from_orm(restriction)


@router.patch("/persons/{person_id}/restrictions/{restriction_id}", response_model=PersonRestrictionDTO)
async def update_person_restriction(
    person_id: UUID,
    restriction_id: UUID,
    request: UpdatePersonRestrictionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update consultable restriction data for a person."""
    await _get_person_or_404(db, person_id)
    stmt = select(PersonRestriction).where(
        PersonRestriction.id == restriction_id,
        PersonRestriction.person_id == person_id,
    )
    result = await db.execute(stmt)
    restriction = result.scalar_one_or_none()
    if not restriction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restriction {restriction_id} not found for person {person_id}"
        )

    payload = request.model_dump(exclude_unset=True)
    if "is_hard" in payload:
        payload["is_hard"] = 1 if payload["is_hard"] else 0
    for key, value in payload.items():
        setattr(restriction, key, value)

    await db.commit()
    await db.refresh(restriction)
    return PersonRestrictionDTO.from_orm(restriction)


@router.delete("/persons/{person_id}/restrictions/{restriction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person_restriction(
    person_id: UUID,
    restriction_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete consultable restriction data for a person."""
    await _get_person_or_404(db, person_id)
    stmt = select(PersonRestriction).where(
        PersonRestriction.id == restriction_id,
        PersonRestriction.person_id == person_id,
    )
    result = await db.execute(stmt)
    restriction = result.scalar_one_or_none()
    if not restriction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restriction {restriction_id} not found for person {person_id}"
        )

    await db.delete(restriction)
    await db.commit()


@router.get("/persons/{person_id}/availability-windows", response_model=List[PersonAvailabilityWindowDTO])
async def list_person_availability_windows(
    person_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """List consultable availability windows for a person."""
    await _get_person_or_404(db, person_id)
    stmt = (
        select(PersonAvailabilityWindow)
        .where(PersonAvailabilityWindow.person_id == person_id)
        .order_by(PersonAvailabilityWindow.starts_on, PersonAvailabilityWindow.created_at)
    )
    result = await db.execute(stmt)
    windows = result.scalars().all()
    return [PersonAvailabilityWindowDTO.from_orm(w) for w in windows]


@router.post("/persons/{person_id}/availability-windows", response_model=PersonAvailabilityWindowDTO, status_code=status.HTTP_201_CREATED)
async def create_person_availability_window(
    person_id: UUID,
    request: CreatePersonAvailabilityWindowRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create consultable availability window data for a person."""
    await _get_person_or_404(db, person_id)
    window = PersonAvailabilityWindow(
        person_id=person_id,
        window_type=request.window_type,
        starts_on=request.starts_on,
        ends_on=request.ends_on,
        notes=request.notes,
        details=request.details or {},
    )
    db.add(window)
    await db.commit()
    await db.refresh(window)
    return PersonAvailabilityWindowDTO.from_orm(window)


@router.patch("/persons/{person_id}/availability-windows/{window_id}", response_model=PersonAvailabilityWindowDTO)
async def update_person_availability_window(
    person_id: UUID,
    window_id: UUID,
    request: UpdatePersonAvailabilityWindowRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update consultable availability window data for a person."""
    await _get_person_or_404(db, person_id)
    stmt = select(PersonAvailabilityWindow).where(
        PersonAvailabilityWindow.id == window_id,
        PersonAvailabilityWindow.person_id == person_id,
    )
    result = await db.execute(stmt)
    window = result.scalar_one_or_none()
    if not window:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Availability window {window_id} not found for person {person_id}"
        )

    payload = request.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(window, key, value)

    await db.commit()
    await db.refresh(window)
    return PersonAvailabilityWindowDTO.from_orm(window)


@router.delete("/persons/{person_id}/availability-windows/{window_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person_availability_window(
    person_id: UUID,
    window_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete consultable availability window data for a person."""
    await _get_person_or_404(db, person_id)
    stmt = select(PersonAvailabilityWindow).where(
        PersonAvailabilityWindow.id == window_id,
        PersonAvailabilityWindow.person_id == person_id,
    )
    result = await db.execute(stmt)
    window = result.scalar_one_or_none()
    if not window:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Availability window {window_id} not found for person {person_id}"
        )

    await db.delete(window)
    await db.commit()


# Program endpoints
@router.post("/import", response_model=ProgramDTO, status_code=status.HTTP_201_CREATED)
async def import_program(
    congregation_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Import a program from an EPUB file."""
    if not file.filename or not file.filename.lower().endswith(".epub"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .epub files are supported."
        )

    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".epub")
    tmp_path = tmp_file.name
    try:
        with tmp_file:
            shutil.copyfileobj(file.file, tmp_file)

        use_case = ImportProgramFromEpubUseCase(db)
        program = await use_case.execute(
            epub_path=tmp_path,
            congregation_id=congregation_id,
            source_filename=file.filename
        )
    finally:
        await file.close()
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return ProgramDTO.from_orm(program)


@router.get("/", response_model=List[ProgramDTO])
async def list_programs(
    congregation_id: UUID = None,
    db: AsyncSession = Depends(get_db)
):
    """List all programs, optionally filtered by congregation."""
    stmt = select(Program).where(Program.deleted_at.is_(None))
    if congregation_id:
        stmt = stmt.where(Program.congregation_id == congregation_id)
    
    stmt = stmt.order_by(Program.start_date.desc())
    result = await db.execute(stmt)
    programs = result.scalars().all()
    
    return [ProgramDTO.from_orm(p) for p in programs]


@router.get("/{program_id}", response_model=ProgramWithWeeksDTO)
async def get_program(
    program_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a program with all its weeks."""
    stmt = (
        select(Program)
        .options(selectinload(Program.weeks).selectinload(Week.content))
        .where(Program.id == program_id, Program.deleted_at.is_(None))
    )
    result = await db.execute(stmt)
    program = result.scalar_one_or_none()
    
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Program {program_id} not found"
        )
    
    return ProgramWithWeeksDTO.from_orm(program)


@router.get("/{program_id}/weeks", response_model=List[WeekDTO])
async def get_program_weeks(
    program_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all weeks for a program."""
    stmt = (
        select(Week)
        .options(selectinload(Week.content))
        .join(Program, Program.id == Week.program_id)
        .where(Week.program_id == program_id, Program.deleted_at.is_(None))
        .order_by(Week.week_number)
    )
    result = await db.execute(stmt)
    weeks = result.scalars().all()
    
    return [WeekDTO.from_orm(w) for w in weeks]


@router.get("/weeks/{week_id}", response_model=WeekDTO)
async def get_week(
    week_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific week with its content."""
    stmt = (
        select(Week)
        .options(selectinload(Week.content))
        .join(Program, Program.id == Week.program_id)
        .where(Week.id == week_id, Program.deleted_at.is_(None))
    )
    result = await db.execute(stmt)
    week = result.scalar_one_or_none()
    
    if not week:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Week {week_id} not found"
        )
    
    return WeekDTO.from_orm(week)


@router.delete("/weeks/{week_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_week(
    week_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific week and its related data."""
    stmt = select(Week).options(selectinload(Week.content)).where(Week.id == week_id)
    result = await db.execute(stmt)
    week = result.scalar_one_or_none()

    if not week:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Week {week_id} not found"
        )

    await db.delete(week)
    await db.commit()


@router.patch("/weeks/{week_id}", response_model=WeekDTO)
async def update_week(
    week_id: UUID,
    request: UpdateWeekRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update a week."""
    stmt = select(Week).where(Week.id == week_id)
    result = await db.execute(stmt)
    week = result.scalar_one_or_none()

    if not week:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Week {week_id} not found"
        )

    payload = request.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(week, key, value)

    await db.commit()
    await db.refresh(week)

    # Ensure content is loaded to avoid lazy-load in response serialization
    stmt = select(Week).options(selectinload(Week.content)).where(Week.id == week_id)
    result = await db.execute(stmt)
    week = result.scalar_one_or_none()
    return WeekDTO.from_orm(week)


@router.delete("/{program_id}", response_model=ProgramDTO)
async def delete_program(
    program_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a program."""
    stmt = select(Program).where(Program.id == program_id)
    result = await db.execute(stmt)
    program = result.scalar_one_or_none()

    if not program or program.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Program {program_id} not found"
        )

    program.deleted_at = datetime.utcnow()
    await db.commit()
    await db.refresh(program)

    return ProgramDTO.from_orm(program)
