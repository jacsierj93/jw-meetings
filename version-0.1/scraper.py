import argparse
import json
import os
import re
import shutil
import tempfile
import time
import unicodedata
import zipfile
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urljoin
from urllib.request import Request, urlopen


def fetch_html(url, timeout=60, retries=3, backoff=1.5):
    headers = {"User-Agent": "Mozilla/5.0"}
    last_error = None
    for attempt in range(retries):
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=timeout) as resp:
                charset = resp.headers.get_content_charset() or "utf-8"
                data = resp.read()
            return data.decode(charset, errors="replace")
        except Exception as exc:  # pragma: no cover - network errors vary
            last_error = exc
            time.sleep(backoff * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def read_text_file(path):
    with open(path, "rb") as handle:
        data = handle.read()
    return data.decode("utf-8", errors="replace")


def normalize_space(text):
    return " ".join(text.replace("\xa0", " ").split())


def strip_accents(text):
    return "".join(
        ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn"
    )


def norm_text(text):
    return strip_accents(text).lower()


class IndexParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_synopsis = False
        self.synopsis_depth = 0
        self.captured_in_current = False
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "div":
            classes = attrs_dict.get("class", "")
            if "synopsis" in classes.split():
                self.in_synopsis = True
                self.synopsis_depth = 1
                self.captured_in_current = False
            elif self.in_synopsis:
                self.synopsis_depth += 1

        if self.in_synopsis and tag == "a" and not self.captured_in_current:
            href = attrs_dict.get("href")
            if href:
                self.urls.append(href)
                self.captured_in_current = True

    def handle_endtag(self, tag):
        if self.in_synopsis and tag == "div":
            self.synopsis_depth -= 1
            if self.synopsis_depth <= 0:
                self.in_synopsis = False


class ElementCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.elements = []
        self.stack = []
        self.capture_tags = {"h1", "h2", "h3", "p"}

    def handle_starttag(self, tag, attrs):
        if tag in self.capture_tags:
            self.stack.append({"tag": tag, "attrs": dict(attrs), "text": ""})

    def handle_data(self, data):
        if self.stack:
            self.stack[-1]["text"] += data

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1]["tag"] == tag:
            el = self.stack.pop()
            el["text"] = normalize_space(unescape(el["text"]))
            self.elements.append(el)


def parse_index(html_text, base_url):
    parser = IndexParser()
    parser.feed(html_text)
    seen = set()
    urls = []
    for href in parser.urls:
        abs_url = urljoin(base_url, href)
        if abs_url not in seen:
            urls.append(abs_url)
            seen.add(abs_url)
    return urls


class TocParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []
        self._in_a = False
        self._current_href = None
        self._current_text = ""

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._in_a = True
            self._current_href = dict(attrs).get("href")
            self._current_text = ""

    def handle_data(self, data):
        if self._in_a:
            self._current_text += data

    def handle_endtag(self, tag):
        if tag == "a" and self._in_a:
            href = self._current_href or ""
            if href.endswith(".xhtml") and re.search(r"\d{9}\.xhtml$", href):
                if not href.endswith("000.xhtml"):
                    self.hrefs.append(href)
            self._in_a = False


def parse_toc(toc_html):
    parser = TocParser()
    parser.feed(toc_html)
    return parser.hrefs


def extract_epub(epub_path):
    temp_dir = tempfile.mkdtemp(prefix="mwb_epub_")
    with zipfile.ZipFile(epub_path, "r") as zf:
        zf.extractall(temp_dir)
    return temp_dir


def find_section_range(elements, header_text):
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


def first_sentence(text):
    parts = text.split(".")
    return parts[0].strip()


def normalize_title_case(text):
    if not text:
        return text
    if text.upper() == text:
        return text.capitalize()
    return text


def parse_duration(text):
    match = re.search(r"\((\d+)\s*min", text, re.IGNORECASE)
    return int(match.group(1)) if match else None


def extract_detail(text):
    text = re.sub(r"\(\s*\d+\s*min.*?\)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\([^)]*\)", "", text)
    text = normalize_space(text).strip(" .")
    if not text:
        return ""
    title_match = re.search(r"t[i\u00ed]tulo\s*:\s*([^\.]+)", text, re.IGNORECASE)
    if title_match:
        return normalize_title_case(title_match.group(1).strip())
    text = first_sentence(text)
    return normalize_title_case(text)


def base_title_from_h3(text):
    cleaned = re.sub(r"^\s*\d+\.\s*", "", text)
    return normalize_space(cleaned)


def book_from_lectura(lectura):
    if not lectura:
        return ""
    match = re.search(r"\d", lectura)
    if match:
        return lectura[: match.start()].strip()
    return lectura.strip()


def map_tipo(base_title):
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


def parse_week(html_text):
    collector = ElementCollector()
    collector.feed(html_text)
    elements = collector.elements

    fecha = ""
    for el in elements:
        if el["tag"] == "h1" and el["text"]:
            fecha = el["text"]
            break

    lectura = None
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
        lectura = normalize_title_case(text)
        break

    canciones_nums = []
    for el in elements:
        if el["tag"] != "h3":
            continue
        if "cancion" not in norm_text(el["text"]):
            continue
        match = re.search(r"canci[o\u00f3]n\s*(\d+)", el["text"], re.IGNORECASE)
        if match:
            canciones_nums.append(int(match.group(1)))

    canciones = {
        "apertura": canciones_nums[0] if len(canciones_nums) > 0 else None,
        "medio": canciones_nums[1] if len(canciones_nums) > 1 else None,
        "cierre": canciones_nums[2] if len(canciones_nums) > 2 else None,
    }

    tesoros = {"titulo1": None, "lecturaBiblica": None}
    tesoros_range = find_section_range(elements, "TESOROS DE LA BIBLIA")
    if tesoros_range:
        start, end = tesoros_range
        for idx in range(start + 1, end):
            el = elements[idx]
            if el["tag"] == "h3" and re.match(r"\s*1\.\s*", el["text"]):
                tesoros["titulo1"] = base_title_from_h3(el["text"])
                break
        for idx in range(start + 1, end):
            el = elements[idx]
            if el["tag"] == "h3" and "lectura de la biblia" in norm_text(el["text"]):
                for next_idx in range(idx + 1, end):
                    if elements[next_idx]["tag"] == "p":
                        p_text = elements[next_idx]["text"]
                        match = re.search(r"\b([A-Za-z\u00c0-\u017f]+\s*\d+:\d+[-\d]*)\b", p_text)
                        if match and lectura:
                            book = book_from_lectura(lectura)
                            chapter = match.group(1).split(None, 1)[-1]
                            tesoros["lecturaBiblica"] = f"{book} {chapter}"
                        break
                break

    mejores_maestros = []
    mm_range = find_section_range(elements, "SEAMOS MEJORES MAESTROS")
    vc_range = find_section_range(elements, "NUESTRA VIDA CRISTIANA")
    if mm_range and vc_range:
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
            for next_idx in range(idx + 1, end):
                if elements[next_idx]["tag"] == "p":
                    p_text = elements[next_idx]["text"]
                    duration = parse_duration(p_text)
                    detail = extract_detail(p_text)
                    break
            tipo = map_tipo(base_title)
            if tipo == "discurso" and detail:
                titulo = f"Discurso: {detail}"
            elif detail:
                titulo = f"{base_title}. {detail}"
            else:
                titulo = base_title
            mejores_maestros.append(
                {"tipo": tipo, "titulo": titulo, "duracion": duration}
            )

    vida_cristiana = []
    if vc_range:
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
            vida_cristiana.append({"titulo": title, "duracion": duration})

    asignaciones = {
        "oracionInicial": "",
        "tesoros1": "",
        "lecturaEstudiante": "",
        "maestros": [{"estudiante": "", "ayudante": ""} for _ in mejores_maestros],
        "vidaCristiana": ["" for _ in vida_cristiana],
        "conductorEstudio": "",
        "lectorEstudio": "",
        "oracionFinal": "",
    }

    return {
        "fecha": fecha,
        "lectura": lectura,
        "canciones": canciones,
        "asignaciones": asignaciones,
        "tesoros": tesoros,
        "mejoresMaestros": mejores_maestros,
        "vidaCristiana": vida_cristiana,
    }


def main():
    parser = argparse.ArgumentParser(description="Scrape JW weekly program into JSON.")
    parser.add_argument(
        "source",
        help="Index URL with week links, or a local .epub file path.",
    )
    parser.add_argument("-o", "--output", default="programa-data.json")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    weeks = []
    if os.path.exists(args.source) and args.source.lower().endswith(".epub"):
        temp_dir = extract_epub(args.source)
        try:
            toc_path = os.path.join(temp_dir, "OEBPS", "toc.xhtml")
            toc_html = read_text_file(toc_path)
            hrefs = parse_toc(toc_html)
            if args.limit:
                hrefs = hrefs[: args.limit]
            for href in hrefs:
                week_path = os.path.join(temp_dir, "OEBPS", href)
                week_html = read_text_file(week_path)
                weeks.append(parse_week(week_html))
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
    else:
        index_html = fetch_html(args.source)
        week_urls = parse_index(index_html, args.source)
        if args.limit:
            week_urls = week_urls[: args.limit]
        for url in week_urls:
            week_html = fetch_html(url)
            weeks.append(parse_week(week_html))

    payload = {"semanas": weeks}
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
