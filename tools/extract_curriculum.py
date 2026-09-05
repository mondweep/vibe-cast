#!/usr/bin/env python3
"""Build the curriculum spine from the Princeton Companion's PDF outline.

Emits a *citation index* — part/article numbers, titles and the PDF page each
article starts on. No prose from the book is extracted or stored: the app's
explanations are written from scratch, and this index exists so every lesson
can point the learner at the original article.

Usage:  python3 tools/extract_curriculum.py PCM.pdf data/curriculum.json
"""
import json
import re
import sys

import pymupdf

# "III.21 Elliptic Curves" -> ("III.21", "Elliptic Curves")
ARTICLE = re.compile(r"^(?P<id>[IVX]+\.\d+)\s+(?P<title>.+)$")
# "Part IV Branches of Mathematics" -> ("IV", "Branches of Mathematics")
PART = re.compile(r"^Part\s+(?P<id>[IVX]+)\s+(?P<title>.+)$")
# Part VI titles carry lifespans: "VI.14 Isaac Newton (1642-1727)"
LIFESPAN = re.compile(r"\s*\((?P<dates>[^()]*\d{3,4}[^()]*)\)\s*$")


def clean(text):
    """Collapse whitespace and decode the numeric entities the outline carries."""
    text = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), text)
    return re.sub(r"\s+", " ", text).strip()


def extract(pdf_path):
    doc = pymupdf.open(pdf_path)
    parts, current = [], None

    for level, raw_title, page in doc.get_toc():
        title = clean(raw_title)

        part_match = PART.match(title)
        if part_match:
            current = {
                "id": part_match.group("id"),
                "title": part_match.group("title"),
                "pdfPage": page,
                "articles": [],
            }
            parts.append(current)
            continue

        article_match = ARTICLE.match(title)
        if not article_match or current is None:
            continue
        # Guard against an article being filed under the wrong part.
        if not article_match.group("id").startswith(current["id"] + "."):
            continue

        article_title = article_match.group("title")
        article = {"id": article_match.group("id"), "pdfPage": page}

        dates = LIFESPAN.search(article_title)
        if dates:
            article["lived"] = clean(dates.group("dates"))
            article_title = article_title[: dates.start()]

        article["title"] = clean(article_title)
        current["articles"].append(article)

    return {
        "source": {
            "title": doc.metadata.get("title") or "The Princeton Companion to Mathematics",
            "editor": "Timothy Gowers",
            "associateEditors": ["June Barrow-Green", "Imre Leader"],
            "publisher": "Princeton University Press",
            "year": 2008,
            "isbn": "978-0-691-11880-2",
            "note": (
                "Citation index only. Page numbers are 1-based positions in the PDF, "
                "not the book's printed page numbers. All lesson content in this app "
                "is written independently; this index exists to cite the source."
            ),
        },
        "parts": parts,
    }


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    _, pdf_path, out_path = sys.argv

    curriculum = extract(pdf_path)
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(curriculum, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    total = sum(len(part["articles"]) for part in curriculum["parts"])
    print(f"{len(curriculum['parts'])} parts, {total} articles -> {out_path}")
    for part in curriculum["parts"]:
        print(f"  Part {part['id']:<4} {len(part['articles']):>3} articles  {part['title']}")


if __name__ == "__main__":
    main()
