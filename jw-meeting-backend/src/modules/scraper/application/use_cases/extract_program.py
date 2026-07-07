"""
Use case for extracting program from EPUB.
"""
from datetime import date, datetime
from typing import Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.scraper.domain.services.epub_scraper_service import EpubScraperService
from src.modules.program.infrastructure.models import Program, Week, WeekContent, Congregation


class ExtractProgramUseCase:
    """Use case for extracting a program from an EPUB file."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.scraper_service = EpubScraperService()
    
    async def execute(
        self,
        epub_path: str,
        congregation_id: UUID,
        version: str,
        start_date: date,
        end_date: date
    ) -> Program:
        """
        Extract program from EPUB and persist to database.
        
        Args:
            epub_path: Path to the EPUB file
            congregation_id: ID of the congregation
            version: Program version (e.g., "2026-01")
            start_date: Start date of the program
            end_date: End date of the program
            
        Returns:
            Created Program entity
        """
        # Scrape the EPUB
        program_data = self.scraper_service.scrape_epub(epub_path)
        
        # Create program
        program = Program(
            congregation_id=congregation_id,
            version=version,
            start_date=start_date,
            end_date=end_date,
            source_file=epub_path
        )
        self.db.add(program)
        await self.db.flush()  # Get program ID
        
        # Create weeks
        for week_index, week_data in enumerate(program_data["semanas"]):
            week = await self._create_week(program.id, week_index, week_data)
            self.db.add(week)
        
        await self.db.commit()
        await self.db.refresh(program)
        
        return program
    
    async def _create_week(self, program_id: UUID, week_index: int, week_data: Dict[str, Any]) -> Week:
        """Create a week entity from scraped data."""
        # Parse week date from date_range
        week_date = self._parse_week_date(week_data["fecha"], week_index)
        
        # Create week
        week = Week(
            program_id=program_id,
            date_range=week_data["fecha"],
            reading=week_data.get("lectura"),
            songs=week_data["canciones"],
            week_number=week_index + 1,
            week_date=week_date
        )
        self.db.add(week)
        await self.db.flush()  # Get week ID
        
        # Create week content
        content = WeekContent(
            week_id=week.id,
            treasures=week_data.get("tesoros", {}),
            ministry_items=week_data.get("mejoresMaestros", []),
            christian_life_items=week_data.get("vidaCristiana", []),
            raw_content=week_data  # Store full data for future use
        )
        self.db.add(content)
        
        return week
    
    def _parse_week_date(self, date_range: str, week_index: int) -> date:
        """
        Parse week date from date range string.
        
        For now, we'll use a simple approach based on week index.
        In a real implementation, you'd parse the date_range string.
        """
        from datetime import timedelta
        
        # This is a simplified implementation
        # You should parse the actual date from the date_range string
        # For example: "5-11 DE ENERO" -> January 5
        
        # For now, just return a date based on week index
        # This should be improved to parse the actual date
        return date(2026, 1, 1) + timedelta(days=week_index * 7)
