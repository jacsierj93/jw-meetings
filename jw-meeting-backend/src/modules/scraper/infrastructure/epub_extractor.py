"""
EPUB extraction utilities.
"""
import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import List


class EpubExtractor:
    """Handles EPUB file extraction."""
    
    def __init__(self, epub_path: str):
        self.epub_path = epub_path
        self.temp_dir = None
    
    def extract(self) -> str:
        """Extract EPUB to temporary directory."""
        self.temp_dir = tempfile.mkdtemp(prefix="mwb_epub_")
        with zipfile.ZipFile(self.epub_path, "r") as zf:
            zf.extractall(self.temp_dir)
        return self.temp_dir
    
    def cleanup(self):
        """Clean up temporary directory."""
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def read_file(self, relative_path: str) -> str:
        """Read a file from the extracted EPUB."""
        if not self.temp_dir:
            raise RuntimeError("EPUB not extracted yet. Call extract() first.")
        
        file_path = os.path.join(self.temp_dir, relative_path)
        with open(file_path, "rb") as handle:
            data = handle.read()
        return data.decode("utf-8", errors="replace")
    
    def get_toc_path(self) -> str:
        """Get path to table of contents."""
        return os.path.join("OEBPS", "toc.xhtml")
    
    def get_week_paths(self, hrefs: List[str]) -> List[str]:
        """Get full paths for week files."""
        return [os.path.join("OEBPS", href) for href in hrefs]
    
    def __enter__(self):
        """Context manager entry."""
        self.extract()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.cleanup()
