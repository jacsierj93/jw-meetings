import json
import re
import zipfile
import xml.etree.ElementTree as ET


NS = {
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}


def read_ods_table(path):
    with zipfile.ZipFile(path, "r") as zf:
        content = zf.read("content.xml")
    root = ET.fromstring(content)
    sheet = root.find(".//table:table", NS)
    if sheet is None:
        raise RuntimeError("No table found in ODS.")

    rows = []
    for row in sheet.findall("table:table-row", NS):
        cells = []
        for cell in row.findall("table:table-cell", NS):
            repeat = int(
                cell.get(
                    "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated",
                    "1",
                )
            )
            text_el = cell.find("text:p", NS)
            text = "" if text_el is None else "".join(text_el.itertext())
            for _ in range(repeat):
                cells.append(text)
        rows.append(cells)
    return rows


def trim_row(row):
    last = 0
    for idx, value in enumerate(row):
        if value.strip():
            last = idx + 1
    return row[:last]


def build_matrix(rows):
    if not rows:
        return {"weeks": [], "students": [], "matrix": []}

    header = trim_row(rows[0])
    if not header:
        raise RuntimeError("Header row is empty.")

    weeks = header[1:]
    students = []
    matrix = []
    skip_names = {"lectura", "empiece", "revisita", "discipulos", "discurso"}
    allowed_codes = {"l", "e", "r", "d", "p", "A"}

    for row in rows[1:]:
        row = row[: len(header)]
        if not row:
            continue
        name = row[0].strip()
        if not name:
            continue
        if name.lower() in skip_names:
            continue

        values = []
        for cell in row[1:]:
            cell = cell.strip()
            if not cell:
                values.append("")
                continue
            parts = re.split(r"[;,\\s]+", cell)
            normalized = []
            for part in parts:
                if not part:
                    continue
                if part.lower() == "a":
                    code = "A"
                else:
                    code = part.lower()
                if code in allowed_codes:
                    normalized.append(code)
            values.append(" ".join(normalized))
        students.append(name)
        matrix.append(values)

    return {"weeks": weeks, "students": students, "matrix": matrix}


def main():
    rows = read_ods_table("control_matriz.ods")
    data = build_matrix(rows)
    with open("control_matriz.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
