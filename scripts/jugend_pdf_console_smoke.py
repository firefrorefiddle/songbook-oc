#!/usr/bin/env python3
"""
Mirror songbook PDF build for Jugend (prisma/dev.db): songbook_tex + songs_sty.

Usage from repo root:
  python3 scripts/jugend_pdf_console_smoke.py
"""
from __future__ import annotations

import json
import shutil
import sqlite3
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LATEX = ROOT / "src/lib/server/latex"
SONGMAKER = ROOT / "bin" / "songmaker-cli"
DB = ROOT / "prisma" / "dev.db"
SONGBOOK_ID = "cmnh3qkga01i2u9wll0wfdwih"


def escape_structured_header_field_for_sng(value: str) -> str:
    out: list[str] = []
    for ch in value:
        if ch == "\\":
            out.append("\\textbackslash{}")
        elif ch == "{":
            out.append("\\{")
        elif ch == "}":
            out.append("\\}")
        elif ch == "#":
            out.append("\\#")
        elif ch == "$":
            out.append("\\$")
        elif ch == "%":
            out.append("\\%")
        elif ch == "^":
            out.append("\\^{}")
        elif ch == "_":
            out.append("\\_")
        elif ch == "&":
            out.append("\\&")
        elif ch == "~":
            out.append("\\~{}")
        else:
            out.append(ch)
    return "".join(out)


def normalize_pipeline_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return "".join(ch for ch in text if ch != "\0" and (ord(ch) >= 32 or ch in "\t\n"))


def escape_chord_pro_body_for_songmaker(text: str) -> str:
    """Escape $ and _ outside [...] so songmaker output is pdflatex-safe."""
    out: list[str] = []
    depth = 0
    for i, ch in enumerate(text):
        prev = text[i - 1] if i > 0 else ""
        prev_is_backslash = prev == "\\"
        if ch == "[" and not prev_is_backslash:
            depth += 1
            out.append(ch)
            continue
        if ch == "]" and not prev_is_backslash and depth > 0:
            depth -= 1
            out.append(ch)
            continue
        if depth == 0 and not prev_is_backslash:
            if ch == "$":
                out.append("\\$")
                continue
            if ch == "_":
                out.append("\\_")
                continue
        out.append(ch)
    return "".join(out)


def build_sng(title: str, content: str, author: str | None, metadata_json: str) -> str:
    try:
        meta: dict = json.loads(metadata_json or "{}")
    except json.JSONDecodeError:
        meta = {}
    body = normalize_pipeline_text(content)
    if body.lstrip().startswith("title:"):
        return body
    s = f"title: {escape_structured_header_field_for_sng(title)}\n"
    if author and author.strip():
        s += f"author: {escape_structured_header_field_for_sng(author.strip())}\n"
    for key, line_key in (
        ("lyricsBy", "lyricsBy"),
        ("musicBy", "musicBy"),
        ("translationBy", "translationBy"),
        ("copyright", "copyright"),
        ("reference", "reference"),
        ("extraIndex", "extra-index"),
        ("numbering", "numbering"),
    ):
        v = meta.get(key)
        if isinstance(v, str) and v.strip():
            s += f"{line_key}: {escape_structured_header_field_for_sng(v.strip())}\n"
    if not (isinstance(meta.get("reference"), str) and meta["reference"].strip()):
        s += "reference:\n"
    s += "***\n" + escape_chord_pro_body_for_songmaker(body)
    return s


def escape_latex_toc(text: str) -> str:
    r = ""
    for ch in text:
        if ch == "\\":
            r += "\\textbackslash{}"
        elif ch == "&":
            r += "\\&"
        elif ch == "%":
            r += "\\%"
        elif ch == "$":
            r += "\\$"
        elif ch == "#":
            r += "\\#"
        elif ch == "_":
            r += "\\_"
        elif ch == "{":
            r += "\\{"
        elif ch == "}":
            r += "\\}"
        elif ch == "~":
            r += "\\textasciitilde{}"
        elif ch == "^":
            r += "\\textasciicircum{}"
        else:
            r += ch
    return r


def build_toc(titles: list[str]) -> str:
    lines = [
        "\\clearpage",
        "\\songbooktocheading",
        "\\vspace{0.5em}",
    ]
    for i, t in enumerate(titles, start=1):
        anchor = f"song1-{i}"
        et = escape_latex_toc(t)
        lines.append(f"\\songtocline{{{anchor}}}{{{et}}}{{{i}}}")
    return "\n".join(lines)


def run_one(style: str, rows: list[tuple[str, str, str | None, str]]) -> None:
    assert style in ("songs_sty", "songbook_tex")
    tmp = tempfile.mkdtemp(prefix="jugend-pdf-")
    tdir = Path(tmp)
    try:
        layout = (LATEX / "layout.tex").read_text(encoding="utf-8")
        layout = layout.replace("@@FONTSIZE@@", "16").replace("@@PAPERSIZE@@", "a4paper")
        (tdir / "layout.tex").write_text(layout, encoding="utf-8")

        if style == "songs_sty":
            for name in ("songs.sty", "font-body.tex", "songbook-hyper-toc.tex"):
                shutil.copyfile(LATEX / name, tdir / name)
            shutil.copyfile(LATEX / "chorded.tex", tdir / "main.tex")
        else:
            for name in (
                "songbook-layout.sty",
                "songbook-style.tex",
                "font-body-songbook.tex",
                "songbook-toc-native.tex",
            ):
                shutil.copyfile(LATEX / name, tdir / name)
            shutil.copyfile(LATEX / "chorded-songbook.tex", tdir / "main.tex")

        latex_parts: list[str] = []
        titles: list[str] = []
        for title, content, author, metadata in rows:
            titles.append(title)
            sng = build_sng(title, content, author, metadata)
            sng_path = tdir / f"_{len(latex_parts)}.sng"
            sng_path.write_text(sng, encoding="utf-8")
            cmd = [str(SONGMAKER), str(sng_path)]
            if style == "songs_sty":
                cmd.insert(1, "--songssty")
            subprocess.run(cmd, cwd=tdir, check=True, capture_output=True, text=True)
            tex_path = sng_path.with_suffix(".tex")
            latex_parts.append(tex_path.read_text(encoding="utf-8"))
        (tdir / "generated-songs.tex").write_text(
            "\n\n".join(latex_parts),
            encoding="utf-8",
        )
        (tdir / "table-of-contents.tex").write_text(
            build_toc(titles),
            encoding="utf-8",
        )

        main = tdir / "main.tex"
        for pass_n in range(2):
            r = subprocess.run(
                [
                    "pdflatex",
                    "-interaction=batchmode",
                    "-halt-on-error",
                    f"-output-directory={tdir}",
                    str(main),
                ],
                cwd=tdir,
                check=False,
                capture_output=True,
                text=True,
            )
            if r.returncode != 0:
                log = tdir / "main.log"
                tail = log.read_text(encoding="utf-8", errors="replace")[-6000:]
                raise RuntimeError(
                    f"pdflatex pass {pass_n + 1} failed rc={r.returncode} ({style})\n"
                    f"STDERR:\n{r.stderr}\n\nLOG tail:\n{tail}",
                )
        pdf = tdir / "main.pdf"
        if not pdf.is_file():
            raise SystemExit(f"No PDF for {style}")
        out = ROOT / "tmp" / f"jugend-smoke-{style}.pdf"
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(pdf, out)
        print(f"OK {style} -> {out} ({pdf.stat().st_size} bytes)")
    finally:
        shutil.rmtree(tdir, ignore_errors=True)


def main() -> None:
    conn = sqlite3.connect(DB)
    cur = conn.execute(
        """
        SELECT sv.title, sv.content, sv.author, sv.metadata
        FROM SongbookSong ss
        JOIN SongbookVersion v ON ss.songbookVersionId = v.id
        JOIN SongVersion sv ON ss.songVersionId = sv.id
        WHERE v.songbookId = ?
          AND v.id = (
            SELECT id FROM SongbookVersion
            WHERE songbookId = ? ORDER BY createdAt DESC LIMIT 1
          )
        ORDER BY ss."order" ASC
        """,
        (SONGBOOK_ID, SONGBOOK_ID),
    )
    rows = list(cur)
    conn.close()
    if not rows:
        raise SystemExit("No songs for Jugend in prisma/dev.db")
    print(f"Building {len(rows)} songs from Jugend …")
    run_one("songbook_tex", rows)
    run_one("songs_sty", rows)


if __name__ == "__main__":
    main()
