"""
Week content parser.
"""
import re
from typing import Dict, List, Any, Optional
from src.modules.scraper.infrastructure.html_utils import (
    ElementCollector,
    find_section_range,
    parse_duration,
    extract_detail,
    base_title_from_h3,
    book_from_lectura,
    map_tipo,
    normalize_title_case,
    norm_text,
)


class WeekParser:
    """Parses a single week's HTML content."""
    
    def parse(self, html_content: str) -> Dict[str, Any]:
        """Parse week HTML content into structured data."""
        collector = ElementCollector()
        collector.feed(html_content)
        elements = collector.elements
        
        return {
            "fecha": self._extract_fecha(elements),
            "lectura": self._extract_lectura(elements),
            "canciones": self._extract_canciones(elements),
            "tesoros": self._extract_tesoros(elements),
            "mejoresMaestros": self._extract_mejores_maestros(elements),
            "vidaCristiana": self._extract_vida_cristiana(elements),
            "estudioBiblico": {"conductor": "", "lector": ""}
        }

    def is_valid_week_date(self, date_range: str) -> bool:
        """Check if a date range looks like a week range in Spanish."""
        if not date_range:
            return False
        norm = norm_text(date_range)
        months = [
            "enero",
            "febrero",
            "marzo",
            "abril",
            "mayo",
            "junio",
            "julio",
            "agosto",
            "septiembre",
            "setiembre",
            "octubre",
            "noviembre",
            "diciembre",
        ]
        month_pattern = "|".join(months)
        patterns = [
            rf"\b\d{{1,2}}\s+de\s+({month_pattern})\s+a\s+\d{{1,2}}\s+de\s+({month_pattern})\b",
            rf"\b\d{{1,2}}\s*[-–]\s*\d{{1,2}}\s+de\s+({month_pattern})\b",
            rf"\b\d{{1,2}}\s+de\s+({month_pattern})\s*[-–]\s*\d{{1,2}}\s+de\s+({month_pattern})\b",
            rf"\bdel\s+\d{{1,2}}\s+al\s+\d{{1,2}}\s+de\s+({month_pattern})\b",
            rf"\b\d{{1,2}}\s+de\s+({month_pattern})\s+de\s+\d{{4}}\s+a\s+\d{{1,2}}\s+de\s+({month_pattern})\s+de\s+\d{{4}}\b",
        ]
        return any(re.search(pattern, norm, re.IGNORECASE) for pattern in patterns)
    
    def _extract_fecha(self, elements: List[Dict]) -> str:
        """Extract date range from elements."""
        for el in elements:
            if el["tag"] == "h1" and el["text"]:
                return el["text"]
        return ""
    
    def _extract_lectura(self, elements: List[Dict]) -> Optional[str]:
        """Extract Bible reading."""
        for el in elements:
            if el["tag"] != "h2":
                continue
            text = el["text"]
            if not re.search(r"\d", text):
                continue
            upper = norm_text(text)
            if "tesoros de la biblia" in upper or "seamos mejores maestros" in upper:
                continue
            if "nuestra vida cristiana" in upper:
                continue
            return normalize_title_case(text)
        return None
    
    def _extract_canciones(self, elements: List[Dict]) -> Dict[str, Any]:
        """Extract song numbers."""
        canciones_nums = []
        for el in elements:
            if el["tag"] != "h3":
                continue
            if "cancion" not in norm_text(el["text"]):
                continue
            match = re.search(r"canci[oó]n\s*(\d+)", el["text"], re.IGNORECASE)
            if match:
                canciones_nums.append(int(match.group(1)))
        
        return {
            "apertura": {"numero": canciones_nums[0], "oracion": ""} if len(canciones_nums) > 0 else None,
            "medio": canciones_nums[1] if len(canciones_nums) > 1 else None,
            "cierre": {"numero": canciones_nums[2], "oracion": ""} if len(canciones_nums) > 2 else None,
        }
    
    def _extract_tesoros(self, elements: List[Dict]) -> Dict[str, Any]:
        """Extract Treasures from God's Word section."""
        tesoros = {"titulo1": None, "lecturaBiblica": None}
        tesoros_range = find_section_range(elements, "TESOROS DE LA BIBLIA")
        
        if not tesoros_range:
            return tesoros
        
        start, end = tesoros_range
        lectura = self._extract_lectura(elements)
        
        # Extract first talk title
        for idx in range(start + 1, end):
            el = elements[idx]
            if el["tag"] == "h3" and re.match(r"\s*1\.\s*", el["text"]):
                tesoros["titulo1"] = base_title_from_h3(el["text"])
                break
        
        # Extract Bible reading
        for idx in range(start + 1, end):
            el = elements[idx]
            if el["tag"] == "h3" and "lectura de la biblia" in norm_text(el["text"]):
                for next_idx in range(idx + 1, end):
                    if elements[next_idx]["tag"] == "p":
                        p_text = elements[next_idx]["text"]
                        match = re.search(r"\b([A-Za-zÀ-ſ]+\s*\d+:\d+[-\d]*)\b", p_text)
                        if match and lectura:
                            book = book_from_lectura(lectura)
                            chapter = match.group(1).split(None, 1)[-1]
                            tesoros["lecturaBiblica"] = f"{book} {chapter}"
                        break
                break
        
        return tesoros
    
    def _extract_mejores_maestros(self, elements: List[Dict]) -> List[Dict[str, Any]]:
        """Extract Apply Yourself to the Field Ministry section."""
        mejores_maestros = []
        mm_range = find_section_range(elements, "SEAMOS MEJORES MAESTROS")
        vc_range = find_section_range(elements, "NUESTRA VIDA CRISTIANA")
        
        if not mm_range or not vc_range:
            return mejores_maestros
        
        start, end = mm_range[0], vc_range[0]
        
        for idx in range(start + 1, end):
            el = elements[idx]
            if el["tag"] != "h3":
                continue
            if not re.match(r"\s*\d+\.\s*", el["text"]):
                continue
            
            base_title = base_title_from_h3(el["text"])
            detail = ""
            duration = None
            detail_payload = None
            
            for next_idx in range(idx + 1, end):
                if elements[next_idx]["tag"] == "p":
                    p_text = elements[next_idx]["text"]
                    duration = parse_duration(p_text)
                    detail = extract_detail(p_text)
                    detail_payload = {"raw_text": p_text}
                    break
            
            tipo = map_tipo(base_title)
            if tipo == "discurso" and detail:
                titulo = f"Discurso: {detail}"
            elif detail:
                titulo = f"{base_title}. {detail}"
            else:
                titulo = base_title
            
            mejores_maestros.append({
                "tipo": tipo,
                "titulo": titulo,
                "duracion": duration,
                "detail": detail_payload,
                "estudiante": "",
                "ayudante": ""
            })
        
        return mejores_maestros
    
    def _extract_vida_cristiana(self, elements: List[Dict]) -> List[Dict[str, Any]]:
        """Extract Living as Christians section."""
        vida_cristiana = []
        vc_range = find_section_range(elements, "NUESTRA VIDA CRISTIANA")
        
        if not vc_range:
            return vida_cristiana
        
        start, end = vc_range
        
        for idx in range(start + 1, end):
            el = elements[idx]
            if el["tag"] != "h3":
                continue
            if "cancion" in norm_text(el["text"]):
                continue
            if "palabras de conclusion" in norm_text(el["text"]):
                break
            if "estudio biblico de la congregacion" in norm_text(el["text"]):
                continue
            if not re.match(r"\s*\d+\.\s*", el["text"]):
                continue
            
            title = base_title_from_h3(el["text"])
            duration = None
            
            for next_idx in range(idx + 1, end):
                if elements[next_idx]["tag"] == "p":
                    duration = parse_duration(elements[next_idx]["text"])
                    break
            
            vida_cristiana.append({
                "titulo": title,
                "duracion": duration,
                "asignado": ""
            })
        
        return vida_cristiana
