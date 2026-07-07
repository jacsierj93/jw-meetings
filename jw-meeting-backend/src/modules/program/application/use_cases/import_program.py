"""
Use case for importing a complete program from EPUB.
"""
from datetime import date, datetime, timedelta
import re
import unicodedata
from typing import Dict, Any, List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.modules.scraper.domain.services.epub_scraper_service import EpubScraperService
from src.modules.program.infrastructure.models import Program, Week, WeekContent
from src.modules.assignments.domain.services.assignment_service import AssignmentService
from src.modules.assignments.infrastructure.persistence.sqlalchemy_assignment_repository import SQLAlchemyAssignmentRepository
from src.modules.assignments.infrastructure.models import AssignmentType


DEFAULT_PROGRAM_VERSION = "unknown"


class ImportProgramFromEpubUseCase:
    """
    Use case for importing a complete program from an EPUB file.
    
    This orchestrates:
    1. Scraping the EPUB (via scraper service)
    2. Creating program and weeks (program domain)
    3. Creating assignment types and assignments (via assignment service)
    """
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.scraper_service = EpubScraperService()
        
        assignment_repo = SQLAlchemyAssignmentRepository(db_session)
        self.assignment_service = AssignmentService(assignment_repo)
    
    async def execute(
        self,
        epub_path: str,
        congregation_id: UUID,
        source_filename: Optional[str] = None
    ) -> Program:
        """
        Import a program from an EPUB file.
        
        Args:
            epub_path: Path to the EPUB file
            congregation_id: ID of the congregation
            source_filename: Original filename to store with the program
            
        Returns:
            Created Program with all weeks and assignments
        """
        # Step 1: Scrape the EPUB
        program_data = self.scraper_service.scrape_epub(epub_path)
        weeks_data = program_data.get("semanas", [])
        week_ranges = self._build_week_ranges(weeks_data)
        start_date, end_date = self._program_date_range(week_ranges)
        
        # Step 2: Create the program
        program = Program(
            congregation_id=congregation_id,
            version=DEFAULT_PROGRAM_VERSION,
            start_date=start_date,
            end_date=end_date,
            source_file=source_filename or epub_path
        )
        self.db.add(program)
        await self.db.flush()
        
        # Step 3: Get assignment types (they should already exist from seed data)
        assignment_types = await self._get_assignment_types()
        
        # Step 4: Create weeks with content and assignments
        for week_index, week_data in enumerate(weeks_data):
            week_range = week_ranges[week_index] if week_index < len(week_ranges) else None
            await self._create_week_with_assignments(
                program.id,
                week_index,
                week_data,
                assignment_types,
                week_range
            )
        
        await self.db.commit()
        await self.db.refresh(program)
        
        return program
    
    async def _get_assignment_types(self) -> Dict[str, AssignmentType]:
        """Get all assignment types and map by code."""
        stmt = select(AssignmentType)
        result = await self.db.execute(stmt)
        types = result.scalars().all()
        
        return {at.code: at for at in types}
    
    async def _create_week_with_assignments(
        self,
        program_id: UUID,
        week_index: int,
        week_data: Dict[str, Any],
        assignment_types: Dict[str, AssignmentType],
        week_range: Optional[Tuple[date, date]]
    ) -> Week:
        """Create a week with its content and assignments."""
        week_date = self._week_date_from_range(week_range, week_index)
        
        week = Week(
            program_id=program_id,
            date_range=week_data["fecha"],
            reading=week_data.get("lectura"),
            songs=week_data["canciones"],
            week_number=week_index + 1,
            week_date=week_date
        )
        self.db.add(week)
        await self.db.flush()
        
        # Create week content
        content = WeekContent(
            week_id=week.id,
            treasures=week_data.get("tesoros", {}),
            ministry_items=week_data.get("mejoresMaestros", []),
            christian_life_items=week_data.get("vidaCristiana", []),
            raw_content=week_data
        )
        self.db.add(content)
        
        # Create assignments
        order_index = 0

        # President and opening prayer
        await self._create_assignment(
            week.id,
            assignment_types.get("presidente"),
            "Presidente",
            order_index
        )
        order_index += 1

        await self._create_assignment(
            week.id,
            assignment_types.get("oracion_inicial"),
            "Oracion inicial",
            order_index
        )
        order_index += 1
        
        # Tesoros assignments
        tesoros = week_data.get("tesoros", {})
        if tesoros.get("titulo1"):
            await self._create_assignment(
                week.id,
                assignment_types.get("tesoros_discurso"),
                tesoros["titulo1"],
                order_index
            )
            order_index += 1
        
        if tesoros.get("lecturaBiblica"):
            await self._create_assignment(
                week.id,
                assignment_types.get("lectura_biblica"),
                f"Lectura: {tesoros['lecturaBiblica']}",
                order_index
            )
            order_index += 1
        
        # Ministry assignments
        for item in week_data.get("mejoresMaestros", []):
            tipo = item["tipo"]
            type_code = self._map_ministry_type(tipo)
            assignment_type = assignment_types.get(type_code)
            
            if assignment_type:
                await self._create_assignment(
                    week.id,
                    assignment_type,
                    item["titulo"],
                    order_index,
                    duration=item.get("duracion")
                )
                order_index += 1
        
        # Christian life assignments
        for item in week_data.get("vidaCristiana", []):
            await self._create_assignment(
                week.id,
                assignment_types.get("vida_cristiana_parte"),
                item["titulo"],
                order_index,
                duration=item.get("duracion")
            )
            order_index += 1
        
        # Bible study assignments
        estudio = week_data.get("estudioBiblico", {})
        if estudio:
            await self._create_assignment(
                week.id,
                assignment_types.get("conductor_estudio"),
                "Conductor del Estudio Bíblico",
                order_index
            )
            order_index += 1
            
            await self._create_assignment(
                week.id,
                assignment_types.get("lector_estudio"),
                "Lector del Estudio Bíblico",
                order_index
            )
            order_index += 1

        await self._create_assignment(
            week.id,
            assignment_types.get("oracion_final"),
            "Oracion final",
            order_index
        )
        order_index += 1
        
        return week
    
    async def _create_assignment(
        self,
        week_id: UUID,
        assignment_type: AssignmentType,
        title: str,
        order_index: int,
        duration: int = None
    ):
        """Create an assignment."""
        if not assignment_type:
            return
        
        await self.assignment_service.assign_task(
            context_id=week_id,
            assignment_type_id=assignment_type.id,
            title=title,
            assignee_id=None,  # Unassigned initially
            assistant_id=None,
            duration=duration or assignment_type.default_duration,
            order_index=order_index
        )
    
    def _map_ministry_type(self, tipo: str) -> str:
        """Map ministry type from scraper to assignment type code."""
        mapping = {
            "empiece": "empiece_conversaciones",
            "revisita": "haga_revisitas",
            "discipulos": "haga_discipulos",
            "explique": "explique_creencias",
            "discurso": "discurso_ministerio"
        }
        return mapping.get(tipo, "empiece_conversaciones")

    def _build_week_ranges(
        self,
        weeks_data: List[Dict[str, Any]]
    ) -> List[Optional[Tuple[date, date]]]:
        base_year = self._infer_base_year(weeks_data)
        parsed_ranges: List[Optional[Tuple[date, date]]] = []
        for week_data in weeks_data:
            parsed_ranges.append(self._parse_date_range(week_data.get("fecha", ""), base_year))
        return self._fill_missing_week_ranges(parsed_ranges, base_year)

    def _program_date_range(
        self,
        week_ranges: List[Optional[Tuple[date, date]]]
    ) -> Tuple[date, date]:
        if not week_ranges:
            today = datetime.utcnow().date()
            return today, today
        first = next((r for r in week_ranges if r), None)
        last = next((r for r in reversed(week_ranges) if r), None)
        if not first or not last:
            today = datetime.utcnow().date()
            return today, today
        return first[0], last[1]

    def _week_date_from_range(
        self,
        week_range: Optional[Tuple[date, date]],
        week_index: int
    ) -> date:
        if week_range:
            return week_range[0]
        base = datetime.utcnow().date()
        return base + timedelta(days=week_index * 7)

    def _infer_base_year(self, weeks_data: List[Dict[str, Any]]) -> int:
        for week_data in weeks_data:
            raw = week_data.get("fecha", "")
            year = self._extract_year(raw)
            if year:
                return year
        return datetime.utcnow().year

    def _extract_year(self, text: str) -> Optional[int]:
        norm = self._normalize_text(text)
        match = re.search(r"\b(20\d{2})\b", norm)
        return int(match.group(1)) if match else None

    def _normalize_text(self, text: str) -> str:
        if not text:
            return ""
        normalized = unicodedata.normalize("NFD", text)
        normalized = "".join(
            ch for ch in normalized if unicodedata.category(ch) != "Mn"
        )
        normalized = normalized.upper()
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    def _parse_date_range(
        self,
        date_range: str,
        base_year: int
    ) -> Optional[Tuple[date, date]]:
        if not date_range:
            return None
        norm = self._normalize_text(date_range)
        year = self._extract_year(norm) or base_year

        months = {
            "ENERO": 1,
            "FEBRERO": 2,
            "MARZO": 3,
            "ABRIL": 4,
            "MAYO": 5,
            "JUNIO": 6,
            "JULIO": 7,
            "AGOSTO": 8,
            "SEPTIEMBRE": 9,
            "SETIEMBRE": 9,
            "OCTUBRE": 10,
            "NOVIEMBRE": 11,
            "DICIEMBRE": 12,
        }

        match = re.search(r"(\d{1,2})\s*[-\u2013]\s*(\d{1,2})\s+DE\s+([A-Z]+)", norm)
        if match:
            start_day = int(match.group(1))
            end_day = int(match.group(2))
            month = months.get(match.group(3))
            if month:
                return self._build_date_range(year, start_day, month, end_day, month)

        match = re.search(
            r"(\d{1,2})\s+DE\s+([A-Z]+)\s*(?:[-\u2013]|A)\s*(\d{1,2})\s+DE\s+([A-Z]+)",
            norm
        )
        if match:
            start_day = int(match.group(1))
            start_month = months.get(match.group(2))
            end_day = int(match.group(3))
            end_month = months.get(match.group(4))
            if start_month and end_month:
                return self._build_date_range(year, start_day, start_month, end_day, end_month)

        match = re.search(r"DE(L)?\s+(\d{1,2})\s+AL\s+(\d{1,2})\s+DE\s+([A-Z]+)", norm)
        if match:
            start_day = int(match.group(2))
            end_day = int(match.group(3))
            month = months.get(match.group(4))
            if month:
                return self._build_date_range(year, start_day, month, end_day, month)

        match = re.search(r"(\d{1,2})\s+DE\s+([A-Z]+)", norm)
        if match:
            day = int(match.group(1))
            month = months.get(match.group(2))
            if month:
                return self._build_date_range(year, day, month, day, month)

        return None

    def _build_date_range(
        self,
        year: int,
        start_day: int,
        start_month: int,
        end_day: int,
        end_month: int
    ) -> Optional[Tuple[date, date]]:
        end_year = year
        if end_month < start_month:
            end_year += 1
        try:
            return date(year, start_month, start_day), date(end_year, end_month, end_day)
        except ValueError:
            return None

    def _fill_missing_week_ranges(
        self,
        week_ranges: List[Optional[Tuple[date, date]]],
        base_year: int
    ) -> List[Optional[Tuple[date, date]]]:
        if not week_ranges:
            return week_ranges
        first_idx = next((i for i, r in enumerate(week_ranges) if r), None)
        if first_idx is None:
            start = date(base_year, 1, 1)
            return [
                (start + timedelta(days=i * 7), start + timedelta(days=i * 7 + 6))
                for i in range(len(week_ranges))
            ]
        first_start = week_ranges[first_idx][0]
        for i in range(first_idx - 1, -1, -1):
            start = first_start - timedelta(days=(first_idx - i) * 7)
            week_ranges[i] = (start, start + timedelta(days=6))
        for i in range(first_idx + 1, len(week_ranges)):
            if week_ranges[i]:
                continue
            prev_start = week_ranges[i - 1][0]
            start = prev_start + timedelta(days=7)
            week_ranges[i] = (start, start + timedelta(days=6))
        return week_ranges
