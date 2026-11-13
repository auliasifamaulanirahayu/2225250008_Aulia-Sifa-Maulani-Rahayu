"""Membangun content/worlds/world-N.json dari definisi soal ringkas di file ini.

Langkah penyelesaian, kunci, petunjuk, pilihan "Jelaskan ke temanmu", dan pola miskonsepsi
dihitung otomatis dengan SymPy sehingga penulis soal cukup menulis cerita dan persamaannya.

Jalankan dari folder proyek:
    python content/tools/build_worlds.py
    python content/tools/validate_content.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import sympy as sp

X = sp.Symbol("x")
OUT_DIR = Path(__file__).resolve().parents[1] / "worlds"

Lin = tuple[sp.Rational, sp.Rational, sp.Rational, sp.Rational]


# ---------------------------------------------------------------- utilitas aljabar
def sym(s: str) -> sp.Expr:
    return sp.sympify(s, locals={"x": X})


def lin(expr: sp.Expr) -> tuple[sp.Rational, sp.Rational]:
    e = sp.expand(expr)
    return sp.Rational(e.coeff(X, 1)), sp.Rational(e.subs(X, 0))


def eq_lin(eq: str) -> Lin:
    ls, rs = eq.split("=")
    aL, bL = lin(sym(ls))
    aR, bR = lin(sym(rs))
    return aL, bL, aR, bR


def solve(eq: str) -> sp.Rational:
    aL, bL, aR, bR = eq_lin(eq)
    return sp.Rational(bR - bL, aL - aR)


def fmt_num(q: Any) -> str:
    q = sp.Rational(q)
    return str(q.p) if q.q == 1 else f"{q.p}/{q.q}"


def fmt_lin(a: Any, b: Any) -> str:
    a, b = sp.Rational(a), sp.Rational(b)
    parts: list[str] = []
    if a != 0:
        if a == 1:
            t = "x"
        elif a == -1:
            t = "-x"
        elif a.q == 1:
            t = f"{a.p}*x"
        else:
            t = ("x" if abs(a.p) == 1 else f"{abs(a.p)}*x") + f"/{a.q}"
            if a < 0:
                t = "-" + t
        parts.append(t)
    if b != 0 or not parts:
        if parts:
            parts.append(("- " if b < 0 else "+ ") + fmt_num(abs(b)))
        else:
            parts.append(fmt_num(b))
    return " ".join(parts)


def fmt_state(s: Lin) -> str:
    return f"{fmt_lin(s[0], s[1])} = {fmt_lin(s[2], s[3])}"


def gen_steps(eq: str) -> tuple[list[dict[str, str]], list[Lin]]:
    """Langkah baku: hilangkan penyebut/kurung, kumpulkan x, pindahkan konstanta, bagi koefisien.

    Aturan yang sama dipakai frontend (engine/equation.js -> nextStep) untuk petunjuk dinamis.
    """
    aL, bL, aR, bR = eq_lin(eq)
    steps: list[dict[str, str]] = []
    states: list[Lin] = []

    def push(op: str, value: str, before: Lin) -> None:
        states.append(before)
        steps.append({"op": op, "value": value, "result": f"{fmt_lin(aL, bL)} = {fmt_lin(aR, bR)}"})

    den = sp.ilcm(*(v.q for v in (aL, bL, aR, bR)))
    before = (aL, bL, aR, bR)
    if den > 1:
        aL, bL, aR, bR = (v * den for v in (aL, bL, aR, bR))
        push("mul", str(den), before)
    elif "(" in eq:
        push("expand", "", before)

    if aL != 0 and aR != 0:
        before = (aL, bL, aR, bR)
        if aR > aL:  # kumpulkan x di ruas kanan agar koefisiennya positif
            k = aL
            aL, aR = sp.Rational(0), aR - k
        else:
            k = aR
            aL, aR = aL - k, sp.Rational(0)
        push("sub" if k > 0 else "add", fmt_lin(abs(k), 0), before)

    left_var = aL != 0
    b = bL if left_var else bR
    if b != 0:
        before = (aL, bL, aR, bR)
        bL, bR = bL - b, bR - b
        push("sub" if b > 0 else "add", fmt_num(abs(b)), before)

    a = aL if left_var else aR
    if a != 1:
        before = (aL, bL, aR, bR)
        aL, bL, aR, bR = (v / a for v in (aL, bL, aR, bR))
        push("div", fmt_num(a), before)
    return steps, states


# ---------------------------------------------------------------- teks tampilan
def group_thousands(n: str) -> str:
    return re.sub(r"\d{4,}", lambda m: f"{int(m.group()):,}".replace(",", "."), n)


def disp(v: str) -> str:
    v = v.replace("*x", "x").replace("-", "−")
    return group_thousands(v)


def explain_text(step: dict[str, str]) -> tuple[str, str]:
    v = disp(step["value"])
    return {
        "add": (f"Kedua ruas ditambah {v}.", f"Hanya satu ruas yang ditambah {v}."),
        "sub": (f"Kedua ruas dikurangi {v}.", f"{v} pindah ke ruas lain tanpa berubah tanda."),
        "mul": (f"Kedua ruas dikali {v}.", f"Hanya satu ruas yang dikali {v}."),
        "div": (f"Kedua ruas dibagi {v}.", f"Kedua ruas dikurangi {v}."),
        "expand": (
            "Angka di depan kurung dikalikan ke setiap suku di dalam kurung.",
            "Angka di depan kurung hanya dikalikan ke suku pertama.",
        ),
    }[step["op"]]


def explain_opts(steps: list[dict[str, str]], extra: list[tuple[str, bool]] | None = None) -> list[dict]:
    opts: list[dict] = []
    for st in steps[:2]:
        opts.append({"text": explain_text(st)[0], "correct": True})
    opts.append({"text": explain_text(steps[0])[1], "correct": False})
    if len(steps) > 1 and steps[-1]["op"] != steps[0]["op"]:
        opts.append({"text": explain_text(steps[-1])[1], "correct": False})
    if len(opts) < 3:
        opts.append({"text": "Nilai x cukup ditebak tanpa langkah.", "correct": False})
    for text, ok in extra or []:
        opts.append({"text": text, "correct": ok})
    return opts


def auto_misconceptions(steps: list[dict[str, str]], states: list[Lin], ans: sp.Rational) -> list[dict]:
    out: list[dict] = []
    for st, s in zip(steps, states):
        if st["op"] in ("add", "sub") and "x" not in st["value"]:
            aL, bL, aR, bR = s
            if aL != 0:
                wrong = (aL, sp.Rational(0), aR, bR + bL)
            else:
                wrong = (aL, bL + bR, aR, sp.Rational(0))
            out.append({
                "code": "M1",
                "wrong_step": fmt_state(wrong),
                "feedback": "Saat suku pindah ruas, tandanya berubah. Ingat: lakukan operasi yang sama di kedua ruas.",
            })
            break
    if steps and steps[-1]["op"] == "div":
        aL, bL, aR, bR = states[-1]
        a, c = (aL, bR) if aL != 0 else (aR, bL)
        wrong = c - a
        if wrong != ans:
            out.append({
                "code": "M4",
                "wrong_answer": fmt_num(wrong),
                "feedback": f"{disp(fmt_num(a))}x artinya {disp(fmt_num(a))} dikali x. Lawan dari kali adalah bagi.",
            })
    return out


def substitution(eq: str, ans: sp.Rational) -> str:
    return eq.replace("x", f"({fmt_num(ans)})")


def fmt_answer(ans: sp.Rational, unit: str) -> str:
    n = group_thousands(fmt_num(ans))
    return f"Rp{n}" if unit == "rp" else f"{n} {unit}"


# ---------------------------------------------------------------- petunjuk contoh
EXAMPLE_HINT = {
    1: "Contoh: x + 2 = 9 → kurangi 2 di kedua ruas → x = 7.",
    2: "Contoh: 3x = 15 → bagi kedua ruas dengan 3 → x = 5.",
    3: "Contoh: 2x + 3 = 11 → kurangi 3: 2x = 8 → bagi 2: x = 4.",
    4: "Contoh: 4x + 1 = x + 10 → kurangi x: 3x + 1 = 10 → kurangi 1: 3x = 9 → x = 3.",
    5: "Contoh: 3(x + 1) = 12 → jabarkan: 3x + 3 = 12 → kurangi 3: 3x = 9 → x = 3.",
    6: "Contoh: 2 tas sama harga + Rp5.000 = Rp25.000 → 2x + 5.000 = 25.000 → x = 10.000.",
    7: "Contoh: 2 tas sama harga + Rp5.000 = Rp25.000 → 2x + 5.000 = 25.000 → x = 10.000.",
}


# ---------------------------------------------------------------- pembuat soal
def symbolic(pid: str, world: int, level: int, order: int, ptype: str, eq: str,
             given: int = 0, source: str | None = None) -> dict:
    steps, states = gen_steps(eq)
    ans = solve(eq)
    first = explain_text(steps[0])[0].replace("Kedua ruas", "kedua ruas")
    p: dict[str, Any] = {
        "id": pid, "world": world, "level": level, "type": ptype, "order": order,
        "equation": eq,
        "solve": {"answer": fmt_num(ans), "steps": steps},
        "check": {"substitution": substitution(eq, ans)},
        "explain_options": explain_opts(steps),
        "hints": [
            "Tujuan kita: membuat x sendirian di satu ruas.",
            f"Langkah pertama: {first[0].lower() + first[1:]}",
            EXAMPLE_HINT[world],
        ],
        "misconceptions": auto_misconceptions(steps, states, ans),
    }
    if given:
        p["given_steps"] = given
    if source:
        p["source"] = source
    return p


def translate(pid: str, level: int, order: int, sentence: str, eq: str, wrong: list[str]) -> dict:
    p = symbolic(pid, 1, level, order, "translate", eq)
    p["story"] = [sentence]
    p["question"] = "Pilih bentuk matematikanya, lalu cari nilai x."
    p["model"] = {"equation": eq, "equation_options": [eq, *wrong]}
    p["context"] = {"pisa": "personal", "setting": "kalimat matematika"}
    p["literacy"] = ["formulate", "employ"]
    p["hints"] = [
        "Ganti kata \"sebuah bilangan\" dengan x.",
        "\"ditambah\" artinya +, \"dikurangi\" artinya −, \"dua kali\" artinya 2x.",
        "Contoh: \"Sebuah bilangan dikurangi 2 hasilnya 7\" ditulis x − 2 = 7.",
    ]
    return p


def story(d: dict) -> dict:
    eq = d["eq"]
    steps, states = gen_steps(eq)
    ans = solve(eq)
    world = d.get("world", 6)
    answer_text = fmt_answer(ans, d["unit"])
    p: dict[str, Any] = {
        "id": d["id"], "world": world, "level": d["level"], "type": d.get("type", "story"),
        "order": d["order"], "emoji": d["emoji"],
        "context": {"pisa": d["pisa"], "setting": d["setting"]},
        "literacy": d.get("literacy", ["formulate", "employ", "interpret"]),
        "story": d["lines"],
        "question": d["q"],
        "understand": {
            "known_options": [{"text": t, "correct": True} for t in d["known"]]
            + [{"text": t, "correct": False} for t in d["known_wrong"]],
            "asked_options": [{"text": d["asked"], "correct": True}]
            + [{"text": t, "correct": False} for t in d["asked_wrong"]],
        },
        "model": {
            "variable": {"symbol": "x", "meaning": d["var"]},
            "variable_options": [d["var"], *d["var_wrong"]],
            "equation": eq,
            "equation_options": [eq, *d["eq_wrong"]],
        },
        "equation": eq,
        "solve": {"answer": fmt_num(ans), "steps": steps},
        "check": {
            "substitution": substitution(eq, ans),
            "sense_question": d["sense"],
            "answer_template": d["template"],
            "answer_sentence": d["template"].replace("{jawaban}", answer_text),
            "unit": d["unit"],
        },
        "explain_options": explain_opts(steps, [
            (f"x adalah {d['var']}.", True),
            (f"x adalah {d['var_wrong'][0]}.", False),
        ]),
        "hints": [
            "Apa yang ditanyakan? Itulah yang kita misalkan x.",
            d["relation"],
            EXAMPLE_HINT[world],
        ],
        "misconceptions": auto_misconceptions(steps, states, ans) + [
            {"code": "M8", "wrong_answer_format": "no_unit",
             "feedback": "Tafsirkan jawabannya ke cerita, lengkap dengan satuannya."},
        ],
    }
    if d.get("given_stages"):
        p["given_stages"] = d["given_stages"]
    for key in ("table", "interpret", "source"):
        if d.get(key):
            p[key] = d[key]
    return p


# ---------------------------------------------------------------- definisi dunia
WORLD_META = {
    1: {"title": "Desa Kotak Misteri", "topic": "Variabel & kalimat terbuka", "emoji": "📦", "color": "#3B5BDB",
        "intro": [
            {"term": "Variabel", "text": "Huruf seperti x mewakili bilangan yang belum diketahui. Bayangkan x sebagai kotak misteri."},
            {"term": "Persamaan", "text": "Kalimat matematika dengan tanda =. Nilai ruas kiri sama dengan ruas kanan."},
        ]},
    2: {"title": "Pasar Timbangan", "topic": "Kesetaraan pada kedua ruas", "emoji": "⚖️", "color": "#2B8A3E",
        "intro": [
            {"term": "Ruas", "text": "Bagian kiri dan kanan tanda = disebut ruas."},
            {"term": "Seimbang", "text": "Apa pun yang kamu lakukan pada ruas kiri, lakukan juga pada ruas kanan."},
            {"term": "Balon", "text": "Bilangan negatif digambar sebagai balon yang menarik timbangan ke atas."},
        ]},
    3: {"title": "Jembatan Satu Langkah", "topic": "Bentuk ax + b = c", "emoji": "🌉", "color": "#E67700",
        "intro": [
            {"term": "Koefisien", "text": "Angka di depan x. Pada 3x, koefisiennya 3."},
            {"term": "Konstanta", "text": "Bilangan tanpa x, misalnya 5 pada 3x − 5."},
            {"term": "Jalan pintas", "text": "+5 pindah ruas menjadi −5. Itu sama dengan mengurangi 5 di kedua ruas."},
        ]},
    4: {"title": "Menara Dua Ruas", "topic": "Variabel di kedua ruas", "emoji": "🗼", "color": "#9C36B5",
        "intro": [
            {"term": "Suku sejenis", "text": "5x dan 2x sejenis. 5x dan 2 tidak sejenis."},
            {"term": "Strategi", "text": "Kumpulkan suku x di satu ruas dan angka di ruas lainnya."},
        ]},
    5: {"title": "Gua Kurung & Pecahan", "topic": "Tanda kurung dan pecahan", "emoji": "🔦", "color": "#D9480F",
        "intro": [
            {"term": "Jabarkan", "text": "2(x + 3) artinya 2 dikali x dan 2 dikali 3, jadi 2x + 6."},
            {"term": "Pecahan", "text": "x/4 artinya x dibagi 4. Kalikan kedua ruas dengan 4 untuk menghilangkannya."},
        ]},
    6: {"title": "Kota Cerita", "topic": "Memodelkan soal cerita", "emoji": "🏙️", "color": "#0C8599",
        "intro": [
            {"term": "4 langkah", "text": "Pahami → Modelkan → Selesaikan → Periksa."},
            {"term": "Memisalkan", "text": "Pilih x sebagai hal yang ditanyakan, misalnya harga 1 buku."},
        ]},
    7: {"title": "Markas Literasi", "topic": "Masalah literasi sehari-hari", "emoji": "🛰️", "color": "#C2255C",
        "intro": [
            {"term": "Baca data", "text": "Baca tabel dengan teliti. Tidak semua informasi selalu dipakai."},
            {"term": "Tafsirkan", "text": "Setelah dapat jawaban, pikirkan artinya di dunia nyata."},
        ]},
}


def world_1() -> list[dict]:
    w = 1
    ps = [
        symbolic("w1-p00", w, 1, 0, "worked", "x + 3 = 10"),
        symbolic("w1-p01", w, 1, 1, "faded", "x + 4 = 9", given=1),
        symbolic("w1-p02", w, 1, 2, "faded", "x - 2 = 6", given=1),
    ]
    tr = [
        ("Sebuah bilangan ditambah 5 hasilnya 12.", "x + 5 = 12", ["x - 5 = 12", "5*x = 12"]),
        ("Sebuah bilangan dikurangi 4 hasilnya 9.", "x - 4 = 9", ["x + 4 = 9", "4 - x = 9"]),
        ("Dua kali sebuah bilangan sama dengan 14.", "2*x = 14", ["x + 2 = 14", "x/2 = 14"]),
        ("Sebuah bilangan ditambah 8 sama dengan 20.", "x + 8 = 20", ["8*x = 20", "x - 8 = 20"]),
        ("Tiga kali sebuah bilangan hasilnya 18.", "3*x = 18", ["x + 3 = 18", "x - 3 = 18"]),
        ("Sebuah bilangan dikurangi 6 hasilnya 1.", "x - 6 = 1", ["6 - x = 1", "x + 6 = 1"]),
    ]
    for i, (s, eq, wrong) in enumerate(tr):
        ps.append(translate(f"w1-p{3 + i:02d}", 1 if i < 3 else 2, 3 + i, s, eq, wrong))
    sv = ["x + 7 = 15", "x + 9 = 11", "x - 3 = 5", "x - 1 = 10", "x + 12 = 20", "x - 5 = 2"]
    for i, eq in enumerate(sv):
        src = "Lembar kerja S01 nomor 1" if eq == "x + 7 = 15" else None
        ps.append(symbolic(f"w1-p{9 + i:02d}", w, 1 if i < 3 else 2, 9 + i, "balance", eq, source=src))
    return ps


def world_2() -> list[dict]:
    w = 2
    ps = [
        symbolic("w2-p00", w, 1, 0, "worked", "2*x = 10"),
        symbolic("w2-p01", w, 1, 1, "faded", "3*x = 12", given=1),
        symbolic("w2-p02", w, 2, 2, "faded", "x + 4 = 1", given=1),
    ]
    eqs = ["x + 5 = 12", "4*x = 20", "x - 6 = 3", "5*x = 35", "x + 8 = 3", "2*x = -8",
           "x - 4 = -1", "6*x = 42", "x + 11 = 15", "3*x = 27", "x - 7 = -10", "7*x = 49"]
    levels = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3]
    for i, eq in enumerate(eqs):
        ps.append(symbolic(f"w2-p{3 + i:02d}", w, levels[i], 3 + i, "balance", eq))
    return ps


def world_3() -> list[dict]:
    w = 3
    ps = [
        symbolic("w3-p00", w, 1, 0, "worked", "4*x + 6 = 30"),
        symbolic("w3-p01", w, 1, 1, "faded", "2*x + 3 = 11", given=1),
        symbolic("w3-p02", w, 1, 2, "faded", "5*x - 4 = 21", given=1),
    ]
    eqs = ["3*x - 5 = 16", "2*x + 7 = 15", "4*x - 3 = 13", "6*x + 2 = 26", "3*x + 8 = 2",
           "5*x - 9 = 6", "7*x + 1 = 22", "2*x - 11 = -3", "16 = 3*x - 5", "20 = 4*x + 8",
           "9*x - 7 = 29", "-2*x + 5 = 11"]
    levels = [1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3]
    for i, eq in enumerate(eqs):
        src = "Lembar kerja S01 nomor 2" if eq == "3*x - 5 = 16" else None
        ps.append(symbolic(f"w3-p{3 + i:02d}", w, levels[i], 3 + i, "solve", eq, source=src))
    return ps


def world_4() -> list[dict]:
    w = 4
    ps = [
        symbolic("w4-p00", w, 1, 0, "worked", "3*x + 4 = x + 10"),
        symbolic("w4-p01", w, 1, 1, "faded", "4*x + 1 = 2*x + 9", given=1),
        symbolic("w4-p02", w, 1, 2, "faded", "6*x - 3 = 2*x + 13", given=2),
    ]
    eqs = ["5*x + 2 = 2*x + 14", "7*x - 5 = 3*x + 11", "2*x + 9 = 5*x", "8*x - 6 = 5*x + 9",
           "x + 12 = 4*x", "3*x - 7 = x + 5", "9*x + 4 = 6*x + 19", "4*x - 10 = 2*x - 2",
           "10 - x = x + 2", "5*x + 3 = 3*x - 7", "6*x = 2*x + 20", "2*x - 3 = 7*x + 12"]
    levels = [1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3]
    for i, eq in enumerate(eqs):
        src = "Lembar kerja S01 nomor 3" if eq == "5*x + 2 = 2*x + 14" else None
        ps.append(symbolic(f"w4-p{3 + i:02d}", w, levels[i], 3 + i, "solve", eq, source=src))
    return ps


def world_5() -> list[dict]:
    w = 5
    ps = [
        symbolic("w5-p00", w, 1, 0, "worked", "2*(x + 3) = 18"),
        symbolic("w5-p01", w, 1, 1, "faded", "3*(x - 2) = 12", given=1),
        symbolic("w5-p02", w, 1, 2, "faded", "x/4 + 2 = 5", given=1),
    ]
    eqs = ["4*(x + 1) = 20", "2*(x - 5) = 6", "x/3 = 5", "x/2 + 4 = 9", "5*(x + 2) = 3*x + 16",
           "x/5 - 1 = 3", "(x + 4)/3 = 5", "3*(2*x - 1) = 15", "2*x/3 = 8", "(x - 2)/4 = 3",
           "6*(x + 1) = 4*(x + 3)", "x/2 + x/3 = 10"]
    levels = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3]
    for i, eq in enumerate(eqs):
        ps.append(symbolic(f"w5-p{3 + i:02d}", w, levels[i], 3 + i, "solve", eq))
    return ps


WORLD6_STORIES: list[dict] = [
    dict(id="w6-p00", type="worked", level=1, order=0, emoji="✏️", pisa="personal", setting="toko alat tulis",
         lines=["Raka membeli 4 pensil yang harganya sama.", "Raka membayar Rp12.000 seluruhnya."],
         q="Berapa harga 1 pensil?",
         known=["Banyak pensil: 4", "Total bayar: Rp12.000"], known_wrong=["Harga 1 pensil: Rp12.000"],
         asked="Harga 1 pensil", asked_wrong=["Banyak pensil yang dibeli"],
         var="harga 1 pensil (rupiah)", var_wrong=["banyak pensil", "total bayar"],
         eq="4*x = 12000", eq_wrong=["x + 4 = 12000", "x = 12000*4"],
         relation="Harga 4 pensil = total bayar, jadi 4 × x = 12.000.",
         unit="rp", template="Jadi, harga 1 pensil adalah {jawaban}.",
         sense="Apakah Rp3.000 masuk akal untuk harga 1 pensil?"),
    dict(id="w6-p01", type="faded", given_stages=["understand", "model"], level=1, order=1, emoji="🎂",
         pisa="personal", setting="umur",
         lines=["Lima tahun lagi, umur Sinta menjadi 18 tahun."],
         q="Berapa umur Sinta sekarang?",
         known=["Tambahan waktu: 5 tahun", "Umur Sinta nanti: 18 tahun"], known_wrong=["Umur Sinta sekarang: 18 tahun"],
         asked="Umur Sinta sekarang", asked_wrong=["Umur Sinta 5 tahun lagi"],
         var="umur Sinta sekarang (tahun)", var_wrong=["umur Sinta 5 tahun lagi", "selisih umur"],
         eq="x + 5 = 18", eq_wrong=["x - 5 = 18", "5*x = 18"],
         relation="Umur sekarang + 5 tahun = umur nanti.",
         unit="tahun", template="Jadi, umur Sinta sekarang {jawaban}.",
         sense="Apakah 13 tahun masuk akal untuk umur Sinta?"),
    dict(id="w6-p02", type="faded", given_stages=["understand", "model"], level=1, order=2, emoji="🍪",
         pisa="occupational", setting="toko kue",
         lines=["Bu Ani punya 5 kotak kue yang isinya sama banyak.", "Seluruhnya ada 40 kue."],
         q="Berapa kue dalam 1 kotak?",
         known=["Banyak kotak: 5", "Jumlah semua kue: 40"], known_wrong=["Isi 1 kotak: 40 kue"],
         asked="Banyak kue dalam 1 kotak", asked_wrong=["Banyak kotak kue"],
         var="banyak kue dalam 1 kotak", var_wrong=["banyak kotak", "jumlah semua kue"],
         eq="5*x = 40", eq_wrong=["x + 5 = 40", "x - 5 = 40"],
         relation="5 kotak × isi 1 kotak = jumlah semua kue.",
         unit="kue", template="Jadi, dalam 1 kotak ada {jawaban}.",
         sense="Apakah 8 kue dalam 1 kotak masuk akal?"),
    dict(id="w6-p03", level=1, order=3, emoji="🍞", pisa="personal", setting="kantin",
         lines=["Harga roti di kantin Rp3.000 lebih mahal dari sebungkus kerupuk.", "Harga roti itu Rp5.000."],
         q="Berapa harga sebungkus kerupuk?",
         known=["Selisih harga: Rp3.000", "Harga roti: Rp5.000"], known_wrong=["Harga kerupuk: Rp3.000"],
         asked="Harga sebungkus kerupuk", asked_wrong=["Harga roti"],
         var="harga sebungkus kerupuk (rupiah)", var_wrong=["harga roti", "selisih harga"],
         eq="x + 3000 = 5000", eq_wrong=["x - 3000 = 5000", "3000*x = 5000"],
         relation="Harga kerupuk + Rp3.000 = harga roti.",
         unit="rp", template="Jadi, harga sebungkus kerupuk adalah {jawaban}.",
         sense="Apakah Rp2.000 masuk akal untuk harga sebungkus kerupuk?"),
    dict(id="w6-p04", level=1, order=4, emoji="🏃", pisa="personal", setting="olahraga",
         lines=["Doni berlari mengelilingi lapangan sebanyak 6 kali.", "Jarak yang ia tempuh 1.200 meter."],
         q="Berapa meter keliling lapangan itu?",
         known=["Banyak putaran: 6", "Jarak total: 1.200 meter"], known_wrong=["Keliling lapangan: 1.200 meter"],
         asked="Keliling lapangan", asked_wrong=["Banyak putaran Doni"],
         var="keliling lapangan (meter)", var_wrong=["banyak putaran", "jarak total"],
         eq="6*x = 1200", eq_wrong=["x + 6 = 1200", "x - 6 = 1200"],
         relation="6 putaran × keliling lapangan = jarak total.",
         unit="meter", template="Jadi, keliling lapangan itu {jawaban}.",
         sense="Apakah 200 meter masuk akal untuk keliling lapangan sekolah?"),
    dict(id="w6-p05", level=2, order=5, emoji="📚", pisa="personal", setting="toko buku",
         lines=["Dina membeli 3 buku tulis yang harganya sama.", "Dina juga membeli 1 pulpen seharga Rp4.000.",
                "Dina membayar Rp25.000 seluruhnya."],
         q="Berapa harga 1 buku tulis?",
         known=["Banyak buku tulis: 3", "Harga pulpen: Rp4.000", "Total bayar: Rp25.000"],
         known_wrong=["Harga 1 buku tulis: Rp4.000"],
         asked="Harga 1 buku tulis", asked_wrong=["Total belanja Dina"],
         var="harga 1 buku tulis (rupiah)", var_wrong=["banyak buku tulis", "harga pulpen"],
         eq="3*x + 4000 = 25000", eq_wrong=["3*x = 25000 + 4000", "x + 4000 = 25000"],
         relation="Harga 3 buku + harga pulpen = total bayar.",
         unit="rp", template="Jadi, harga 1 buku tulis adalah {jawaban}.",
         sense="Apakah Rp7.000 masuk akal untuk harga 1 buku tulis?",
         source="Diadaptasi dari lembar kerja S01 nomor 4"),
    dict(id="w6-p06", level=2, order=6, emoji="👧", pisa="personal", setting="umur",
         lines=["Umur kakak 4 tahun lebih tua dari 2 kali umur adiknya.", "Umur kakak sekarang 14 tahun."],
         q="Berapa umur adik?",
         known=["Umur kakak: 14 tahun", "Kakak lebih tua 4 tahun dari 2 kali umur adik"],
         known_wrong=["Umur adik: 4 tahun"],
         asked="Umur adik", asked_wrong=["Umur kakak"],
         var="umur adik (tahun)", var_wrong=["adik", "umur kakak"],
         eq="2*x + 4 = 14", eq_wrong=["2*x - 4 = 14", "x + 4 = 14"],
         relation="2 kali umur adik + 4 tahun = umur kakak.",
         unit="tahun", template="Jadi, umur adik {jawaban}.",
         sense="Apakah 5 tahun masuk akal untuk umur adik?",
         source="Diadaptasi dari lembar kerja S01 nomor 5"),
    dict(id="w6-p07", level=2, order=7, emoji="🅿️", pisa="occupational", setting="parkir",
         lines=["Tarif parkir motor Rp2.000 untuk jam pertama.", "Setiap jam tambahan dikenai Rp1.000.",
                "Pak Budi membayar Rp6.000."],
         q="Berapa jam tambahan Pak Budi parkir?",
         known=["Tarif jam pertama: Rp2.000", "Tarif tiap jam tambahan: Rp1.000", "Total bayar: Rp6.000"],
         known_wrong=["Tarif jam tambahan: Rp2.000"],
         asked="Banyak jam tambahan", asked_wrong=["Tarif jam pertama"],
         var="banyak jam tambahan", var_wrong=["tarif jam pertama", "total bayar"],
         eq="2000 + 1000*x = 6000", eq_wrong=["2000*x + 1000 = 6000", "1000*x = 6000 + 2000"],
         relation="Tarif jam pertama + Rp1.000 × banyak jam tambahan = total bayar.",
         unit="jam", template="Jadi, Pak Budi parkir {jawaban} tambahan setelah jam pertama.",
         sense="Apakah 4 jam tambahan masuk akal?"),
    dict(id="w6-p08", level=2, order=8, emoji="🐷", pisa="personal", setting="tabungan",
         lines=["Lina sudah punya tabungan Rp20.000.", "Setiap minggu ia menabung Rp5.000.",
                "Sekarang tabungannya Rp45.000."],
         q="Sudah berapa minggu Lina menabung?",
         known=["Tabungan awal: Rp20.000", "Tabungan tiap minggu: Rp5.000", "Tabungan sekarang: Rp45.000"],
         known_wrong=["Tabungan tiap minggu: Rp20.000"],
         asked="Lama Lina menabung (minggu)", asked_wrong=["Tabungan Lina sekarang"],
         var="banyak minggu Lina menabung", var_wrong=["tabungan awal", "tabungan sekarang"],
         eq="20000 + 5000*x = 45000", eq_wrong=["5000 + 20000*x = 45000", "5000*x = 45000 + 20000"],
         relation="Tabungan awal + Rp5.000 × banyak minggu = tabungan sekarang.",
         unit="minggu", template="Jadi, Lina sudah menabung selama {jawaban}.",
         sense="Apakah 5 minggu masuk akal?"),
    dict(id="w6-p09", level=2, order=9, emoji="🍊", pisa="occupational", setting="pedagang buah",
         lines=["Pak Joko membagi 50 jeruk ke dalam 6 keranjang sama banyak.", "Setelah dibagi, sisa jeruk ada 2 buah."],
         q="Berapa jeruk di setiap keranjang?",
         known=["Jumlah jeruk: 50", "Banyak keranjang: 6", "Sisa jeruk: 2"], known_wrong=["Isi 1 keranjang: 6 jeruk"],
         asked="Banyak jeruk di setiap keranjang", asked_wrong=["Banyak keranjang"],
         var="banyak jeruk di setiap keranjang", var_wrong=["banyak keranjang", "sisa jeruk"],
         eq="6*x + 2 = 50", eq_wrong=["6*x - 2 = 50", "x + 6 + 2 = 50"],
         relation="6 keranjang × isi 1 keranjang + sisa = jumlah jeruk.",
         unit="jeruk", template="Jadi, setiap keranjang berisi {jawaban}.",
         sense="Apakah 8 jeruk per keranjang masuk akal?"),
    dict(id="w6-p10", level=3, order=10, emoji="🌳", pisa="societal", setting="taman RT",
         lines=["Pak RT membuat pagar di sekeliling taman persegi panjang.", "Panjang pagar seluruhnya 60 meter.",
                "Panjang taman 18 meter."],
         q="Berapa meter lebar taman?",
         known=["Keliling taman: 60 meter", "Panjang taman: 18 meter"], known_wrong=["Lebar taman: 18 meter"],
         asked="Lebar taman", asked_wrong=["Keliling taman"],
         var="lebar taman (meter)", var_wrong=["panjang taman", "keliling taman"],
         eq="2*(18 + x) = 60", eq_wrong=["18 + x = 60", "2*18 + x = 60"],
         relation="Keliling persegi panjang = 2 × (panjang + lebar).",
         unit="meter", template="Jadi, lebar taman {jawaban}.",
         sense="Apakah lebar 12 meter masuk akal? Lebar biasanya lebih pendek dari panjang."),
    dict(id="w6-p11", level=3, order=11, emoji="🎟️", pisa="societal", setting="museum",
         lines=["Rombongan 4 guru dan 30 siswa masuk museum.", "Harga tiket guru Rp10.000 per orang.",
                "Harga tiket setiap siswa sama.", "Seluruh tiket rombongan Rp190.000."],
         q="Berapa harga tiket 1 siswa?",
         known=["Banyak guru: 4", "Banyak siswa: 30", "Tiket guru: Rp10.000", "Total tiket: Rp190.000"],
         known_wrong=["Tiket siswa: Rp10.000"],
         asked="Harga tiket 1 siswa", asked_wrong=["Harga tiket 1 guru"],
         var="harga tiket 1 siswa (rupiah)", var_wrong=["banyak siswa", "harga tiket guru"],
         eq="4*10000 + 30*x = 190000", eq_wrong=["4*x + 30*10000 = 190000", "30*x = 190000 + 40000"],
         relation="Tiket 4 guru + tiket 30 siswa = total tiket.",
         unit="rp", template="Jadi, harga tiket 1 siswa adalah {jawaban}.",
         sense="Apakah Rp5.000 masuk akal? Bandingkan dengan tiket guru."),
    dict(id="w6-p12", level=3, order=12, emoji="👨", pisa="personal", setting="umur",
         lines=["Umur ayah sekarang 3 kali umur Bima.", "Selisih umur ayah dan Bima 26 tahun."],
         q="Berapa umur Bima sekarang?",
         known=["Umur ayah = 3 kali umur Bima", "Selisih umur: 26 tahun"], known_wrong=["Umur ayah: 26 tahun"],
         asked="Umur Bima sekarang", asked_wrong=["Umur ayah sekarang"],
         var="umur Bima (tahun)", var_wrong=["Bima", "umur ayah"],
         eq="3*x - x = 26", eq_wrong=["3*x + x = 26", "3*x = 26"],
         relation="Umur ayah − umur Bima = selisih, jadi 3x − x = 26.",
         unit="tahun", template="Jadi, umur Bima sekarang {jawaban}.",
         sense="Umur ayah menjadi 39 tahun. Apakah masuk akal?"),
    dict(id="w6-p13", level=3, order=13, emoji="📶", pisa="personal", setting="paket internet",
         lines=["Paket internet Kak Rina Rp30.000 per bulan untuk 10 GB.", "Setiap tambahan 1 GB dikenai Rp4.000.",
                "Tagihan bulan ini Rp54.000."],
         q="Berapa GB tambahan yang dipakai Kak Rina?",
         known=["Harga paket: Rp30.000", "Harga tiap 1 GB tambahan: Rp4.000", "Tagihan: Rp54.000"],
         known_wrong=["Kuota tambahan: 10 GB"],
         asked="Banyak GB tambahan", asked_wrong=["Kuota paket"],
         var="banyak GB tambahan", var_wrong=["kuota paket (10 GB)", "tagihan bulan ini"],
         eq="30000 + 4000*x = 54000", eq_wrong=["30000 + 4000*x + 10 = 54000", "4000*x = 54000 + 30000"],
         relation="Harga paket + Rp4.000 × GB tambahan = tagihan. Info 10 GB tidak dipakai.",
         unit="GB", template="Jadi, Kak Rina memakai {jawaban} tambahan.",
         sense="Total kuotanya menjadi 16 GB. Apakah masuk akal?"),
    dict(id="w6-p14", level=3, order=14, emoji="🌶️", pisa="occupational", setting="kebun",
         lines=["Pak Tani menanam 3 baris pohon cabai dan 9 pohon tomat.", "Setiap baris cabai jumlah pohonnya sama.",
                "Seluruhnya ada 45 pohon di kebun."],
         q="Berapa pohon cabai di setiap baris?",
         known=["Banyak baris cabai: 3", "Pohon tomat: 9", "Jumlah semua pohon: 45"],
         known_wrong=["Pohon cabai per baris: 9"],
         asked="Banyak pohon cabai di setiap baris", asked_wrong=["Banyak pohon tomat"],
         var="banyak pohon cabai per baris", var_wrong=["banyak baris cabai", "banyak pohon tomat"],
         eq="3*x + 9 = 45", eq_wrong=["9*x + 3 = 45", "3*x = 45 + 9"],
         relation="3 baris × pohon per baris + pohon tomat = semua pohon.",
         unit="pohon", template="Jadi, setiap baris ada {jawaban} cabai.",
         sense="Apakah 12 pohon cabai per baris masuk akal?"),
]

LIT = ["formulate", "employ", "interpret", "evaluate"]
WORLD7_STORIES: list[dict] = [
    dict(id="w7-p01", world=7, type="literacy", level=2, order=1, emoji="🚌", pisa="personal", setting="angkot",
         literacy=LIT,
         lines=["Tarif angkot Rp5.000 saat naik.", "Lalu ada tambahan Rp2.000 setiap 1 km.",
                "Rani membayar Rp17.000 dari rumah ke sekolah."],
         q="Berapa km jarak rumah Rani ke sekolah?",
         known=["Tarif naik: Rp5.000", "Tarif tiap km: Rp2.000", "Total bayar: Rp17.000"], known_wrong=["Jarak: 17 km"],
         asked="Jarak rumah ke sekolah (km)", asked_wrong=["Total ongkos Rani"],
         var="jarak rumah ke sekolah (km)", var_wrong=["tarif naik", "total bayar"],
         eq="5000 + 2000*x = 17000", eq_wrong=["5000*x + 2000 = 17000", "2000*x = 17000 + 5000"],
         relation="Tarif naik + Rp2.000 × jarak = total bayar.",
         unit="km", template="Jadi, jarak rumah Rani ke sekolah {jawaban}.",
         sense="Apakah 6 km masuk akal untuk jarak ke sekolah?",
         interpret={"question": "Ojek tarif datar Rp15.000 untuk jarak yang sama. Mana yang lebih hemat?",
                    "options": ["Ojek, hemat Rp2.000", "Angkot, hemat Rp2.000", "Sama saja"], "answer": 0}),
    dict(id="w7-p02", world=7, type="literacy", level=2, order=2, emoji="💰", pisa="societal", setting="kas kelas",
         literacy=LIT,
         lines=["Setiap siswa kelas 7B membayar iuran kas yang sama.", "Di kelas itu ada 32 siswa.",
                "Wali kelas ikut menyumbang Rp40.000.", "Kas yang terkumpul Rp200.000."],
         q="Berapa iuran tiap siswa?",
         known=["Banyak siswa: 32", "Sumbangan wali kelas: Rp40.000", "Kas terkumpul: Rp200.000"],
         known_wrong=["Iuran tiap siswa: Rp40.000"],
         asked="Iuran tiap siswa", asked_wrong=["Banyak siswa"],
         var="iuran tiap siswa (rupiah)", var_wrong=["banyak siswa", "sumbangan wali kelas"],
         eq="32*x + 40000 = 200000", eq_wrong=["32*x = 200000 + 40000", "x + 40000 = 200000"],
         relation="32 × iuran + sumbangan wali kelas = kas terkumpul.",
         unit="rp", template="Jadi, iuran tiap siswa {jawaban}.",
         sense="Apakah Rp5.000 masuk akal untuk iuran kas?",
         table={"title": "Pilihan hadiah perpisahan", "headers": ["Hadiah", "Harga"],
                "rows": [["Buku agenda", "Rp75.000"], ["Tanaman hias", "Rp120.000"], ["Jam dinding", "Rp210.000"]]},
         interpret={"question": "Kelas ingin membeli 1 hadiah dengan kas itu. Hadiah mana yang TIDAK bisa dibeli?",
                    "options": ["Buku agenda", "Tanaman hias", "Jam dinding"], "answer": 2}),
    dict(id="w7-p03", world=7, type="literacy", level=2, order=3, emoji="🏔️", pisa="scientific", setting="pendakian",
         literacy=LIT,
         lines=["Suhu di kaki gunung 24 °C.", "Setiap naik 1 km, suhu turun 6 °C.", "Suhu di pos pendakian 6 °C."],
         q="Berapa km tinggi pos dari kaki gunung?",
         known=["Suhu kaki gunung: 24 °C", "Suhu turun 6 °C tiap km", "Suhu di pos: 6 °C"],
         known_wrong=["Tinggi pos: 6 km"],
         asked="Tinggi pos dari kaki gunung (km)", asked_wrong=["Suhu di pos"],
         var="tinggi pos dari kaki gunung (km)", var_wrong=["suhu di pos", "suhu di kaki gunung"],
         eq="24 - 6*x = 6", eq_wrong=["24 + 6*x = 6", "6*x - 24 = 6"],
         relation="Suhu awal − 6 × ketinggian = suhu di pos.",
         unit="km", template="Jadi, pos pendakian berada {jawaban} di atas kaki gunung.",
         sense="Apakah 3 km masuk akal untuk ketinggian pos?",
         interpret={"question": "Pendaki disarankan memakai jaket jika suhu di bawah 10 °C. Perlukah jaket di pos?",
                    "options": ["Perlu, karena 6 °C di bawah 10 °C", "Tidak perlu", "Hanya di kaki gunung"],
                    "answer": 0}),
    dict(id="w7-p04", world=7, type="literacy", level=2, order=4, emoji="👟", pisa="personal", setting="menabung",
         literacy=LIT,
         lines=["Harga sepatu olahraga Rp180.000.", "Tia sudah punya uang Rp60.000.", "Ia menabung Rp15.000 setiap minggu."],
         q="Berapa minggu lagi uang Tia cukup untuk membeli sepatu?",
         known=["Harga sepatu: Rp180.000", "Uang Tia sekarang: Rp60.000", "Tabungan per minggu: Rp15.000"],
         known_wrong=["Lama menabung: 15 minggu"],
         asked="Banyak minggu menabung", asked_wrong=["Harga sepatu"],
         var="banyak minggu menabung", var_wrong=["uang Tia sekarang", "harga sepatu"],
         eq="60000 + 15000*x = 180000", eq_wrong=["15000 + 60000*x = 180000", "15000*x = 180000 + 60000"],
         relation="Uang sekarang + Rp15.000 × banyak minggu = harga sepatu.",
         unit="minggu", template="Jadi, Tia perlu menabung {jawaban} lagi.",
         sense="Apakah 8 minggu (sekitar 2 bulan) masuk akal?",
         interpret={"question": "Tia mulai menabung awal Desember. Kira-kira bulan apa uangnya cukup?",
                    "options": ["Desember", "Januari", "Maret"], "answer": 1}),
    dict(id="w7-p05", world=7, type="literacy", level=3, order=5, emoji="🎭", pisa="societal", setting="pentas seni",
         literacy=LIT,
         lines=["Aula sekolah punya 12 baris kursi yang sama banyak.", "Ada 20 kursi tambahan di bagian depan.",
                "Seluruhnya ada 260 kursi."],
         q="Berapa kursi di setiap baris?",
         known=["Banyak baris: 12", "Kursi tambahan: 20", "Jumlah kursi: 260"], known_wrong=["Kursi per baris: 12"],
         asked="Banyak kursi di setiap baris", asked_wrong=["Banyak baris kursi"],
         var="banyak kursi per baris", var_wrong=["banyak baris", "kursi tambahan"],
         eq="12*x + 20 = 260", eq_wrong=["20*x + 12 = 260", "12*x = 260 + 20"],
         relation="12 baris × kursi per baris + kursi tambahan = jumlah kursi.",
         unit="kursi", template="Jadi, setiap baris ada {jawaban}.",
         sense="Apakah 20 kursi per baris masuk akal?",
         interpret={"question": "Pentas seni akan ditonton 250 orang. Apakah kursinya cukup?",
                    "options": ["Cukup, sisa 10 kursi", "Kurang 10 kursi", "Pas, tidak ada sisa"], "answer": 0}),
    dict(id="w7-p06", world=7, type="literacy", level=3, order=6, emoji="🛒", pisa="personal", setting="warung",
         literacy=LIT,
         lines=["Ibu membeli 2 kg gula dan beberapa kg tepung di warung.", "Ibu membayar Rp68.000.",
                "Lihat daftar harga di tabel."],
         q="Berapa kg tepung yang dibeli Ibu?",
         known=["Gula: 2 kg × Rp16.000", "Harga tepung: Rp12.000 per kg", "Total bayar: Rp68.000"],
         known_wrong=["Harga telur: Rp28.000 per kg"],
         asked="Banyak kg tepung", asked_wrong=["Banyak kg gula"],
         var="banyak kg tepung", var_wrong=["harga tepung per kg", "banyak kg gula"],
         eq="2*16000 + 12000*x = 68000", eq_wrong=["16000 + 12000*x = 68000", "2*16000 + 28000*x = 68000"],
         relation="Harga 2 kg gula + Rp12.000 × kg tepung = total bayar.",
         unit="kg", template="Jadi, Ibu membeli {jawaban} tepung.",
         sense="Apakah 3 kg tepung masuk akal?",
         table={"title": "Daftar harga Warung Bu Siti", "headers": ["Barang", "Harga per kg"],
                "rows": [["Gula", "Rp16.000"], ["Telur", "Rp28.000"], ["Tepung", "Rp12.000"]]},
         interpret={"question": "Ibu membayar dengan uang Rp100.000. Berapa kembaliannya?",
                    "options": ["Rp32.000", "Rp68.000", "Rp22.000"], "answer": 0}),
    dict(id="w7-p07", world=7, type="literacy", level=3, order=7, emoji="💧", pisa="scientific", setting="tandon air",
         literacy=LIT,
         lines=["Tandon air sekolah berisi 200 liter di pagi hari.", "Setiap jam, air terpakai 25 liter.",
                "Sekarang air di tandon tinggal 50 liter."],
         q="Sudah berapa jam air dipakai?",
         known=["Isi awal: 200 liter", "Pemakaian: 25 liter per jam", "Sisa air: 50 liter"],
         known_wrong=["Lama pemakaian: 25 jam"],
         asked="Lama air dipakai (jam)", asked_wrong=["Sisa air"],
         var="lama air dipakai (jam)", var_wrong=["sisa air", "isi awal tandon"],
         eq="200 - 25*x = 50", eq_wrong=["200 + 25*x = 50", "25*x - 200 = 50"],
         relation="Isi awal − 25 × lama pemakaian = sisa air.",
         unit="jam", template="Jadi, air sudah dipakai selama {jawaban}.",
         sense="Apakah 6 jam masuk akal untuk pemakaian sejak pagi?",
         interpret={"question": "Jika pemakaian tetap, berapa jam lagi tandon akan kosong?",
                    "options": ["2 jam", "6 jam", "8 jam"], "answer": 0}),
    dict(id="w7-p08", world=7, type="literacy", level=3, order=8, emoji="⚽", pisa="societal", setting="turnamen",
         literacy=LIT,
         lines=["Dalam turnamen, tim yang menang mendapat 3 poin.", "Tim yang seri mendapat 1 poin.",
                "Tim Garuda seri 4 kali dan tidak pernah kalah.", "Poin Tim Garuda sekarang 25."],
         q="Berapa kali Tim Garuda menang?",
         known=["Poin menang: 3", "Poin seri: 1", "Banyak seri: 4", "Total poin: 25"], known_wrong=["Banyak menang: 4"],
         asked="Banyak kemenangan Tim Garuda", asked_wrong=["Total poin Tim Garuda"],
         var="banyak kemenangan", var_wrong=["total poin", "banyak seri"],
         eq="3*x + 4 = 25", eq_wrong=["3*x + 4*3 = 25", "x + 4 = 25"],
         relation="3 × banyak menang + 1 × banyak seri = total poin.",
         unit="kali", template="Jadi, Tim Garuda menang {jawaban}.",
         sense="Apakah 7 kali menang masuk akal?",
         interpret={"question": "Berapa pertandingan yang sudah dimainkan Tim Garuda?",
                    "options": ["7", "11", "25"], "answer": 1}),
]


def main() -> None:
    builders = {
        1: world_1, 2: world_2, 3: world_3, 4: world_4, 5: world_5,
        6: lambda: [story(d) for d in WORLD6_STORIES],
        7: lambda: [story(d) for d in WORLD7_STORIES],
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    for n, build in builders.items():
        problems = build()
        total += len(problems)
        data = {"world": n, **WORLD_META[n], "problems": problems}
        path = OUT_DIR / f"world-{n}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{path.name}: {len(problems)} soal")
    print(f"Total: {total} soal")


if __name__ == "__main__":
    main()
