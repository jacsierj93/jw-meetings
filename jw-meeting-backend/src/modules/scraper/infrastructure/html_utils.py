"""
HTML parsing utilities for EPUB content.
"""
import re
import unicodedata
from html import unescape
from html.parser import HTMLParser
from typing import List, Dict, Any


def normalize_space(text: str) -> str:
    """Normalize whitespace in text."""
    return " ".join(text.replace("\xa0", " ").split())


def strip_accents(text: str) -> str:
    """Remove accents from text."""
    return "".join(
        ch for ch in unicodedata.normalize("NFD", text) 
        if unicodedata.category(ch) != "Mn"
    )


def norm_text(text: str) -> str:
    """Normalize text by removing accents and converting to lowercase."""
    return strip_accents(text).lower()


def normalize_title_case(text: str) -> str:
    """Normalize title case."""
    if not text:
        return text
    if text.upper() == text:
        return text.capitalize()
    return text


def first_sentence(text: str) -> str:
    """Extract first sentence from text."""
    parts = text.split(".")
    return parts[0].strip()


class ElementCollector(HTMLParser):
    """Collects specific HTML elements from content."""
    
    def __init__(self):
        super().__init__()
        self.elements: List[Dict[str, Any]] = []
        self.stack: List[Dict[str, Any]] = []
        self.capture_tags = {"h1", "h2", "h3", "p"}
    
    def handle_starttag(self, tag: str, attrs: List[tuple]):
        if tag in self.capture_tags:
            self.stack.append({"tag": tag, "attrs": dict(attrs), "text": ""})
    
    def handle_data(self, data: str):
        if self.stack:
            self.stack[-1]["text"] += data
    
    def handle_endtag(self, tag: str):
        if self.stack and self.stack[-1]["tag"] == tag:
            el = self.stack.pop()
            el["text"] = normalize_space(unescape(el["text"]))
            self.elements.append(el)


class TocParser(HTMLParser):
    """Parses table of contents from EPUB."""
    
    def __init__(self):
        super().__init__()
        self.hrefs: List[str] = []
        self._in_a = False
        self._current_href = None
        self._current_text = ""
    
    def handle_starttag(self, tag: str, attrs: List[tuple]):
        if tag == "a":
            self._in_a = True
            self._current_href = dict(attrs).get("href")
            self._current_text = ""
    
    def handle_data(self, data: str):
        if self._in_a:
            self._current_text += data
    
    def handle_endtag(self, tag: str):
        if tag == "a" and self._in_a:
            href = self._current_href or ""
            if href.endswith(".xhtml") and re.search(r"\d{9}\.xhtml$", href):
                if not href.endswith("000.xhtml"):
                    self.hrefs.append(href)
            self._in_a = False


def find_section_range(elements: List[Dict], header_text: str) -> tuple:
    """Find the range of elements for a section."""
    header_norm = norm_text(header_text)
    start = None
    for idx, el in enumerate(elements):
        if el["tag"] == "h2" and header_norm in norm_text(el["text"]):
            start = idx
            break
    if start is None:
        return None
    for idx in range(start + 1, len(elements)):
        if elements[idx]["tag"] == "h2":
            return (start, idx)
    return (start, len(elements))


def parse_duration(text: str) -> int:
    """Extract duration in minutes from text."""
    match = re.search(r"\((\d+)\s*min", text, re.IGNORECASE)
    return int(match.group(1)) if match else None


def extract_detail(text: str) -> str:
    """Extract detail from assignment text."""
    text = re.sub(r"\(\s*\d+\s*min.*?\)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\([^)]*\)", "", text)
    text = normalize_space(text).strip(" .")
    if not text:
        return ""
    title_match = re.search(r"t[ií]tulo\s*:\s*([^\.]+)", text, re.IGNORECASE)
    if title_match:
        return normalize_title_case(title_match.group(1).strip())
    text = first_sentence(text)
    return normalize_title_case(text)


def base_title_from_h3(text: str) -> str:
    """Extract base title from h3 element."""
    cleaned = re.sub(r"^\s*\d+\.\s*", "", text)
    return normalize_space(cleaned)


def book_from_lectura(lectura: str) -> str:
    """Extract book name from reading text."""
    if not lectura:
        return ""
    match = re.search(r"\d", lectura)
    if match:
        return lectura[: match.start()].strip()
    return lectura.strip()


def map_tipo(base_title: str) -> str:
    """Map assignment title to type."""
    lowered = norm_text(base_title)
    if "revisita" in lowered:
        return "revisita"
    if "empiece" in lowered:
        return "empiece"
    if "discipulo" in lowered:
        return "discipulos"
    if "explique" in lowered:
        return "explique"
    if "discurso" in lowered:
        return "discurso"
    return lowered.split()[0] if lowered else "otro"
