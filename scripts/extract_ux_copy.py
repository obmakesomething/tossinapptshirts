#!/usr/bin/env python3
"""
Extract user-facing UX copy strings from src pages/components/data and
generate docs:
  - docs/UX_TEXT_INVENTORY.md
  - docs/FAQ_TEXT_FULL.md
"""

from __future__ import annotations

import ast
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
SRC_DIRS = [
    ROOT / "src" / "pages",
    ROOT / "src" / "components",
    ROOT / "src" / "data",
]
OUT_INVENTORY = ROOT / "docs" / "UX_TEXT_INVENTORY.md"
OUT_FAQ = ROOT / "docs" / "FAQ_TEXT_FULL.md"
FAQ_FILE = ROOT / "src" / "data" / "faq.ts"


EXCLUDE_SUFFIXES = (
    ".test.ts",
    ".test.tsx",
    ".spec.ts",
    ".spec.tsx",
)


KEEP_SYMBOLS = {
    "✓",
    "✕",
    "×",
    "+",
    "＋",
    "−",
    "←",
    "▲",
    "▼",
    "…",
}

KEEP_ENGLISH_SINGLE = {
    "Front",
    "Back",
    "Regular",
    "Bold",
}


SKIP_EXACT = {
    "Source:",
}


SKIP_REGEX = [
    re.compile(r"^rgba?\(", re.I),
    re.compile(r"^hsla?\(", re.I),
    re.compile(r"^#[0-9a-f]{3,8}$", re.I),
    re.compile(r"^\[.*\]"),
]


@dataclass
class Literal:
    line: int
    quote: str
    value: str


def iter_code_files() -> Iterable[Path]:
    for base in SRC_DIRS:
        if not base.exists():
            continue
        for path in sorted(base.rglob("*")):
            if path.is_dir():
                continue
            if path.suffix not in (".ts", ".tsx", ".json"):
                continue
            if path.name.endswith(EXCLUDE_SUFFIXES):
                continue
            yield path


def decode_literal(quote: str, raw: str) -> str:
    if quote in ("'", '"'):
        try:
            return ast.literal_eval(quote + raw + quote)
        except Exception:
            return raw
    # Template literal: keep raw content.
    return raw


def iter_string_literals(text: str) -> Iterable[Literal]:
    i = 0
    line = 1
    n = len(text)
    while i < n:
        ch = text[i]
        if ch in ("'", '"', "`"):
            quote = ch
            start_line = line
            i += 1
            buf: list[str] = []
            while i < n:
                c = text[i]
                if c == "\n":
                    line += 1
                if c == "\\":
                    if i + 1 < n:
                        buf.append(text[i : i + 2])
                        i += 2
                        continue
                if c == quote:
                    i += 1
                    break
                buf.append(c)
                i += 1
            yield Literal(start_line, quote, decode_literal(quote, "".join(buf)))
            continue
        if ch == "\n":
            line += 1
        i += 1


def iter_text_component_nodes(text: str) -> Iterable[Literal]:
    # Capture text inside <Text>...</Text> blocks only.
    for m in re.finditer(r"<Text\b[^>]*>([\s\S]*?)</Text>", text, re.S):
        raw = m.group(1)
        # Remove embedded JSX tags inside nested <Text>.
        raw = re.sub(r"</?[^>]+>", " ", raw)
        # Remove simple JS expressions, e.g. {'\n'} or {value}
        raw = re.sub(r"\{[^{}]*\}", " ", raw)
        value = normalize_text(raw)
        if not value:
            continue
        line = text.count("\n", 0, m.start(1)) + 1
        yield Literal(line=line, quote="jsx-text", value=value)


def looks_like_copy(value: str) -> bool:
    s = value.strip()
    if not s:
        return False

    if s in SKIP_EXACT:
        return False

    for pat in SKIP_REGEX:
        if pat.search(s):
            return False

    if s in KEEP_SYMBOLS:
        return True

    if s in KEEP_ENGLISH_SINGLE:
        return True

    if s.startswith("http://") or s.startswith("https://"):
        return False

    if s.startswith("./") or s.startswith("../"):
        return False

    if re.search(r"\.(png|jpg|jpeg|webp|gif|svg|json|ts|tsx)$", s, re.I):
        return False

    if "encodeURIComponent(" in s:
        return False

    if "${" in s and not re.search(r"[가-힣]", s):
        return False

    if len(s) == 1 and re.fullmatch(r"[A-Za-z0-9]", s):
        return False

    if s.startswith("//"):
        return False

    if re.fullmatch(r"[A-Za-z0-9_./:-]+", s):
        if "_" in s:
            return False
        if len(s) >= 3 and s.lower() == s and ":" not in s:
            return False

    if re.search(r"[가-힣]", s):
        return True

    if re.search(r"\s", s):
        return True

    if any(p in s for p in ("?", "!", "…", "·", ":", "✓", "💰", "🔐", "🛒", "✦")):
        return True

    return False


def normalize_text(value: str) -> str:
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value).strip()
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value


def extract_copy_inventory() -> dict[str, list[tuple[int, str]]]:
    grouped: dict[str, list[tuple[int, str]]] = defaultdict(list)
    for path in iter_code_files():
        rel = str(path.relative_to(ROOT))
        text = path.read_text(encoding="utf-8")
        text_lines = text.splitlines()
        seen: set[str] = set()
        literals = list(iter_string_literals(text))
        if path.suffix == ".tsx":
            literals.extend(iter_text_component_nodes(text))

        for literal in literals:
            normalized = normalize_text(literal.value)
            if not looks_like_copy(normalized):
                continue
            line_ctx = (
                text_lines[literal.line - 1] if 1 <= literal.line <= len(text_lines) else ""
            )
            if re.search(r"console\.(log|warn|error|debug)\s*\(", line_ctx):
                continue
            key = f"{literal.line}:{normalized}"
            if key in seen:
                continue
            seen.add(key)
            grouped[rel].append((literal.line, normalized))
    return dict(sorted(grouped.items()))


def strip_wrapping_quotes(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ("'", '"', "`"):
        return decode_literal(s[0], s[1:-1])
    return s


def parse_faq() -> tuple[list[tuple[str, str, str]], list[dict[str, str]]]:
    text = FAQ_FILE.read_text(encoding="utf-8")

    category_pattern = re.compile(
        r"\{\s*id:\s*'(?P<id>[^']+)'\s*,\s*title:\s*'(?P<title>[^']+)'\s*,\s*icon:\s*'(?P<icon>[^']+)'\s*\}",
        re.S,
    )
    categories = [
        (m.group("id"), m.group("title"), m.group("icon"))
        for m in category_pattern.finditer(text)
    ]

    array_match = re.search(
        r"export const faqItems\s*:\s*FAQItem\[\]\s*=\s*\[(?P<body>[\s\S]*?)\]\s*;",
        text,
    )
    if not array_match:
        return categories, []

    body = array_match.group("body")

    def split_object_blocks(array_body: str) -> list[str]:
        blocks: list[str] = []
        i = 0
        n = len(array_body)
        depth = 0
        start = -1
        quote = ""
        escape = False

        while i < n:
            ch = array_body[i]
            if quote:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == quote:
                    quote = ""
                i += 1
                continue

            if ch in ("'", '"', "`"):
                quote = ch
                i += 1
                continue

            if ch == "{":
                if depth == 0:
                    start = i
                depth += 1
            elif ch == "}":
                if depth > 0:
                    depth -= 1
                    if depth == 0 and start >= 0:
                        blocks.append(array_body[start : i + 1])
                        start = -1
            i += 1
        return blocks

    def read_field(block: str, field: str) -> str:
        lit_pat = r"(`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|\"(?:\\.|[^\"])*\")"
        m = re.search(rf"\b{field}\s*:\s*{lit_pat}", block, re.S)
        if not m:
            return ""
        return normalize_text(strip_wrapping_quotes(m.group(1)))

    items: list[dict[str, str]] = []
    for block in split_object_blocks(body):
        item_id = read_field(block, "id")
        category = read_field(block, "category")
        question = read_field(block, "question")
        answer = read_field(block, "answer")
        if not item_id or not category or not question or not answer:
            continue
        items.append(
            {
                "id": item_id,
                "category": category,
                "question": question,
                "answer": answer,
            }
        )
    return categories, items


def write_inventory_md(grouped: dict[str, list[tuple[int, str]]]) -> None:
    total_files = len(grouped)
    total_lines = sum(len(v) for v in grouped.values())
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    lines: list[str] = []
    lines.append("# UX Writing Text Inventory")
    lines.append("")
    lines.append(f"- Generated at (UTC): `{generated_at}`")
    lines.append("- Scope: `src/pages`, `src/components`, `src/data`")
    lines.append("- Rule: user-facing copy candidates (labels, placeholders, FAQ, legal text, status/error copy)")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Files: `{total_files}`")
    lines.append(f"- Extracted text entries: `{total_lines}`")
    lines.append("")
    lines.append("## By File")
    lines.append("")

    for rel, entries in grouped.items():
        lines.append(f"### `{rel}` ({len(entries)})")
        lines.append("")
        for line_no, text in entries:
            compact = text.replace("\n", "\\n")
            lines.append(f"- `L{line_no}` {compact}")
        lines.append("")

    OUT_INVENTORY.write_text("\n".join(lines), encoding="utf-8")


def write_faq_md(categories: list[tuple[str, str, str]], items: list[dict[str, str]]) -> None:
    by_category: dict[str, list[dict[str, str]]] = defaultdict(list)
    for item in items:
        by_category[item["category"]].append(item)

    lines: list[str] = []
    lines.append("# FAQ Text (Full Extract)")
    lines.append("")
    lines.append(f"- Source: `{FAQ_FILE.relative_to(ROOT)}`")
    lines.append(f"- Total categories: `{len(categories)}`")
    lines.append(f"- Total items: `{len(items)}`")
    lines.append("")

    for cat_id, cat_title, icon in categories:
        cat_items = by_category.get(cat_id, [])
        lines.append(f"## {icon} {cat_title} (`{cat_id}` / {len(cat_items)}개)")
        lines.append("")
        for idx, item in enumerate(cat_items, start=1):
            lines.append(f"### {idx}. {item['question']}")
            lines.append("")
            lines.append(item["answer"])
            lines.append("")
            lines.append(f"- item id: `{item['id']}`")
            lines.append("")

    OUT_FAQ.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    grouped = extract_copy_inventory()
    write_inventory_md(grouped)
    categories, items = parse_faq()
    write_faq_md(categories, items)
    print(f"Wrote: {OUT_INVENTORY.relative_to(ROOT)}")
    print(f"Wrote: {OUT_FAQ.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
