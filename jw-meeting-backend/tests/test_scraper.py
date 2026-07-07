"""
Tests for the scraper service.
"""
import pytest
import os
from src.modules.scraper.domain.services.epub_scraper_service import EpubScraperService
from src.modules.scraper.infrastructure.week_parser import WeekParser


def test_epub_scraper_service():
    """Test EPUB scraper service with sample file."""
    # Path to sample EPUB
    epub_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "mwb_S_202601.epub")
    
    if not os.path.exists(epub_path):
        pytest.skip(f"Sample EPUB not found at {epub_path}")
    
    scraper = EpubScraperService()
    result = scraper.scrape_epub(epub_path, limit=2)  # Only scrape first 2 weeks for testing
    
    assert "semanas" in result
    assert len(result["semanas"]) == 2
    
    # Check first week structure
    first_week = result["semanas"][0]
    assert "fecha" in first_week
    assert "lectura" in first_week
    assert "canciones" in first_week
    assert "tesoros" in first_week
    assert "mejoresMaestros" in first_week
    assert "vidaCristiana" in first_week
    
    # Check songs structure
    assert "apertura" in first_week["canciones"]
    assert "medio" in first_week["canciones"]
    assert "cierre" in first_week["canciones"]
    
    # Check treasures structure
    assert "titulo1" in first_week["tesoros"]
    assert "lecturaBiblica" in first_week["tesoros"]
    
    # Check ministry items
    assert isinstance(first_week["mejoresMaestros"], list)
    assert len(first_week["mejoresMaestros"]) > 0
    
    # Check Christian life items
    assert isinstance(first_week["vidaCristiana"], list)


def test_scrape_single_week():
    """Test scraping a single week."""
    epub_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "mwb_S_202601.epub")
    
    if not os.path.exists(epub_path):
        pytest.skip(f"Sample EPUB not found at {epub_path}")
    
    scraper = EpubScraperService()
    week_data = scraper.scrape_week(epub_path, 0)
    
    assert "fecha" in week_data
    assert "lectura" in week_data
    assert "canciones" in week_data


@pytest.mark.parametrize(
    "date_range",
    [
        "27 DE JULIO A 2 DE AGOSTO",
        "31 DE AGOSTO A 6 DE SEPTIEMBRE",
        "27 DE JULIO - 2 DE AGOSTO",
        "27 DE JULIO – 2 DE AGOSTO",
    ],
)
def test_week_date_validator_accepts_cross_month_ranges(date_range):
    parser = WeekParser()

    assert parser.is_valid_week_date(date_range)
