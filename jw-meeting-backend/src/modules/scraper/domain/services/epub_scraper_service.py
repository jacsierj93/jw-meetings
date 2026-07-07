"""
Domain service for EPUB scraping.
"""
from typing import List, Dict, Any
from src.modules.scraper.infrastructure.epub_extractor import EpubExtractor
from src.modules.scraper.infrastructure.html_utils import TocParser
from src.modules.scraper.infrastructure.week_parser import WeekParser


class EpubScraperService:
    """Domain service for scraping EPUB files."""
    
    def __init__(self):
        self.week_parser = WeekParser()
    
    def scrape_epub(self, epub_path: str, limit: int = None) -> Dict[str, Any]:
        """
        Scrape an EPUB file and return structured data.
        
        Args:
            epub_path: Path to the EPUB file
            limit: Optional limit on number of weeks to process
            
        Returns:
            Dictionary with program data
        """
        with EpubExtractor(epub_path) as extractor:
            # Parse table of contents
            toc_html = extractor.read_file(extractor.get_toc_path())
            toc_parser = TocParser()
            toc_parser.feed(toc_html)
            hrefs = toc_parser.hrefs
            
            if limit:
                hrefs = hrefs[:limit]
            
            # Parse each week
            weeks = []
            for href in hrefs:
                week_html = extractor.read_file(f"OEBPS/{href}")
                week_data = self.week_parser.parse(week_html)
                if not self.week_parser.is_valid_week_date(week_data.get("fecha", "")):
                    continue
                weeks.append(week_data)
            
            return {"semanas": weeks}
    
    def scrape_week(self, epub_path: str, week_index: int) -> Dict[str, Any]:
        """
        Scrape a single week from an EPUB file.
        
        Args:
            epub_path: Path to the EPUB file
            week_index: Index of the week to scrape (0-based)
            
        Returns:
            Dictionary with week data
        """
        with EpubExtractor(epub_path) as extractor:
            # Parse table of contents
            toc_html = extractor.read_file(extractor.get_toc_path())
            toc_parser = TocParser()
            toc_parser.feed(toc_html)
            hrefs = toc_parser.hrefs
            
            if week_index >= len(hrefs):
                raise ValueError(f"Week index {week_index} out of range (max: {len(hrefs) - 1})")
            
            # Parse the specific week
            week_html = extractor.read_file(f"OEBPS/{hrefs[week_index]}")
            return self.week_parser.parse(week_html)
