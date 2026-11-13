"""Validasi bank soal MATH-MISSION (CONTENT_BANK.md §4).

Jalankan:  python content/tools/validate_content.py
Keluar dengan kode 1 bila ada kesalahan, sehingga bisa dipakai di CI.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import sympy as sp

X = sp.Symbol("x")
WORLDS_DIR = Path(__file__).resolve().parents[1] / "worlds"

TYPES = {"worked", "faded", "solve", "balance", "translate", "story", "literacy"}
STORY_TYPES = {"story", "literacy"}
OPS = {"add", "sub", "mul", "div", "expand"}
MAX_SENTENCES = {1: 2, 2: 3, 3: 4}
MAX_WORDS = 15


def sides(eq: str) -> tuple[sp.Expr, sp.Expr]:
    parts = eq.split("=")
    if len(parts) != 2:
        raise ValueError(f"persamaan harus punya tepat satu '=': {eq!r}")
    return sp.sympify(parts[0], locals={"x": X}), sp.sympify(parts[1], locals={"x": X})


def solutions(eq: str) -> list:
    left, right = sides(eq)
    return sp.solve(sp.Eq(left, right), X)


def same_equation(l1: sp.Expr, r1: sp.Expr, l2: sp.Expr, r2: sp.Expr) -> bool:
    return sp.expand((l1 - r1) - (l2 - r2)) == 0


def check_problem(p: dict, errors: list[str]) -> None:
    pid = p.get("id", "?")

    def err(msg: str) -> None:
        errors.append(f"{pid}: {msg}")

    for key in ("id", "world", "level", "type", "order", "solve", "check", "hints", "explain_options"):
        if key not in p:
            err(f"field wajib '{key}' tidak ada")
    if p.get("type") not in TYPES:
        err(f"type tidak dikenal: {p.get('type')}")
    if p.get("level") not in (1, 2, 3):
        err("level harus 1, 2, atau 3")
    if not pid.startswith(f"w{p.get('world')}-"):
        err("id tidak sesuai nomor dunia")

    eq = p.get("model", {}).get("equation") or p.get("equation")
    if not eq:
        err("persamaan tidak ditemukan")
        return

    # 3. tepat satu penyelesaian yang sama dengan kunci
    try:
        sol = solutions(eq)
    except Exception as e:  # noqa: BLE001
        err(f"persamaan tidak bisa diproses: {e}")
        return
    answer = sp.Rational(p["solve"]["answer"])
    if len(sol) != 1 or sp.Rational(sol[0]) != answer:
        err(f"kunci {answer} tidak cocok dengan penyelesaian {sol}")

    # 4. setiap langkah sesuai operasinya
    prev_l, prev_r = sides(eq)
    steps = p["solve"].get("steps", [])
    if not steps:
        err("langkah penyelesaian kosong")
    for i, st in enumerate(steps):
        op = st.get("op")
        if op not in OPS:
            err(f"langkah {i + 1}: op tidak dikenal {op}")
            continue
        res_l, res_r = sides(st["result"])
        if op == "expand":
            ok = same_equation(prev_l, prev_r, res_l, res_r)
        else:
            v = sp.sympify(st["value"], locals={"x": X})
            f = {"add": lambda e: e + v, "sub": lambda e: e - v,
                 "mul": lambda e: e * v, "div": lambda e: e / v}[op]
            if op in ("mul", "div") and v == 0:
                err(f"langkah {i + 1}: kali/bagi dengan nol")
                continue
            ok = same_equation(f(prev_l), f(prev_r), res_l, res_r)
        if not ok:
            err(f"langkah {i + 1} ({op} {st.get('value')}) tidak menghasilkan {st['result']}")
        prev_l, prev_r = res_l, res_r
    if steps:
        last = sides(steps[-1]["result"])
        if not ((last[0] == X and last[1] == answer) or (last[1] == X and last[0] == answer)):
            err(f"langkah terakhir harus berbentuk x = {answer}")

    # 5. substitusi bernilai benar
    try:
        sl, sr = sides(p["check"]["substitution"])
        if sp.simplify(sl - sr) != 0:
            err("substitusi tidak bernilai benar")
    except Exception as e:  # noqa: BLE001
        err(f"substitusi tidak valid: {e}")

    # 6. langkah salah (miskonsepsi) memang tidak setara
    for m in p.get("misconceptions", []):
        if "wrong_step" in m:
            ws = solutions(m["wrong_step"])
            if len(ws) == 1 and sp.Rational(ws[0]) == answer:
                err(f"miskonsepsi {m['code']}: wrong_step ternyata setara dengan jawaban benar")
        if "wrong_answer" in m and sp.Rational(m["wrong_answer"]) == answer:
            err(f"miskonsepsi {m['code']}: wrong_answer sama dengan kunci")

    # 7. panjang cerita
    story = p.get("story", [])
    if p.get("type") in STORY_TYPES or (p.get("type") in ("worked", "faded") and story):
        limit = 5 if p.get("world") == 7 else MAX_SENTENCES[p["level"]]
        if len(story) > limit:
            err(f"cerita {len(story)} kalimat, maksimal {limit} untuk level {p['level']}")
    for s in story:
        if len(s.split()) > MAX_WORDS:
            err(f"kalimat lebih dari {MAX_WORDS} kata: {s!r}")

    # 8. tepat satu pilihan persamaan yang setara
    options = p.get("model", {}).get("equation_options")
    if options is not None:
        equiv = 0
        for o in options:
            s = solutions(o)
            if len(s) == 1 and sp.Rational(s[0]) == answer:
                equiv += 1
        if equiv != 1:
            err(f"{equiv} pilihan persamaan setara dengan kunci (harus tepat 1)")
        if options[0] != eq:
            err("pilihan persamaan pertama harus persamaan yang benar")

    # 9. jawaban wajar untuk soal cerita
    if story and p.get("type") != "translate":
        if answer <= 0:
            err("jawaban soal cerita harus positif")
        if p.get("check", {}).get("unit") == "rp" and answer % 500 != 0:
            err("harga harus kelipatan Rp500")
        for key in ("understand", "model"):
            if key not in p:
                err(f"field '{key}' wajib untuk soal cerita")
        for key in ("sense_question", "answer_template", "answer_sentence", "unit"):
            if key not in p.get("check", {}):
                err(f"check.{key} wajib untuk soal cerita")
        und = p.get("understand", {})
        if not any(o["correct"] for o in und.get("known_options", [])):
            err("tidak ada pilihan 'diketahui' yang benar")
        if sum(o["correct"] for o in und.get("asked_options", [])) != 1:
            err("pilihan 'ditanya' yang benar harus tepat 1")

    if p.get("type") == "literacy":
        it = p.get("interpret")
        if not it or not (0 <= it.get("answer", -1) < len(it.get("options", []))):
            err("soal literasi wajib punya interpret dengan jawaban valid")

    if len(p.get("hints", [])) != 3:
        err("petunjuk harus tepat 3 tingkat")
    if not any(o.get("correct") for o in p.get("explain_options", [])):
        err("explain_options harus punya minimal 1 pilihan benar")
    if not any(not o.get("correct") for o in p.get("explain_options", [])):
        err("explain_options harus punya minimal 1 pilihan salah")


def main() -> int:
    files = sorted(WORLDS_DIR.glob("world-*.json"))
    if not files:
        print("Tidak ada file world-*.json. Jalankan build_worlds.py dulu.")
        return 1
    errors: list[str] = []
    seen: set[str] = set()
    total = 0
    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        orders: set[int] = set()
        for p in data["problems"]:
            total += 1
            if p["id"] in seen:
                errors.append(f"{p['id']}: id ganda")
            seen.add(p["id"])
            if p["world"] != data["world"]:
                errors.append(f"{p['id']}: world tidak sama dengan file {f.name}")
            if p["order"] in orders:
                errors.append(f"{p['id']}: order ganda di {f.name}")
            orders.add(p["order"])
            check_problem(p, errors)
    if errors:
        print(f"GAGAL: {len(errors)} kesalahan pada {total} soal")
        for e in errors:
            print("  -", e)
        return 1
    print(f"OK: {total} soal di {len(files)} dunia lolos validasi.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
