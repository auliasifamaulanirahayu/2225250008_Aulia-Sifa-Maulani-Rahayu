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
        "sub": (f"Kedua ruas dikurangi {v}.", f"Hanya satu ruas yang dikurangi {v}."),
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
                "feedback": "Hampir! Lihat tandanya. Lakukan operasi yang sama di kedua ruas, lalu hitung lagi.",
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
    3: "Contoh: 3 roti sama harga, bayar Rp9.000 → 3x = 9.000 → x = 3.000.",
    4: "Contoh: 3 buku sama harga + pulpen Rp4.000 = Rp25.000 → 3x + 4.000 = 25.000.",
    5: "Contoh: 2x + 3 = 11 → kurangi 3: 2x = 8 → bagi 2: x = 4.",
    6: "Contoh: x + 8 = 3 → kurangi 8 di kedua ruas → x = −5.",
    7: "Contoh: 3(x + 1) = 12 → jabarkan: 3x + 3 = 12 → kurangi 3: 3x = 9 → x = 3.",
}


def ui_flags(eq: str, mission: int, is_story: bool) -> dict[str, bool]:
    """Alat bantu di layar Selesaikan (dulu ditentukan nomor dunia)."""
    left, right = eq.split("=")
    both = "x" in left and "x" in right
    complex_ = "(" in eq or "/" in eq
    return {
        "balance": not is_story and not complex_ and not both,  # gambar timbangan di contoh lengkap
        "op_only": mission <= 2,                                # hanya pilih operasi (belum menulis langkah)
        "term_keypad": both or complex_,                        # keypad bisa mengetik suku x (mis. 2x)
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
        "ui": ui_flags(eq, world, False),
    }
    if given:
        p["given_steps"] = given
    if source:
        p["source"] = source
    return p


def translate(pid: str, world: int, level: int, order: int, sentence: str, eq: str, wrong: list[str]) -> dict:
    p = symbolic(pid, world, level, order, "translate", eq)
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
    world = d["world"]
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
        "ui": ui_flags(eq, world, True),
    }
    if d.get("given_stages"):
        p["given_stages"] = d["given_stages"]
    for key in ("table", "interpret", "source"):
        if d.get(key):
            p[key] = d[key]
    return p


# ---------------------------------------------------------------- definisi misi (Mission Map)
# Field "world" pada soal = nomor misi (1–7). Nama field tidak diubah agar skema database & ekspor penelitian tetap.
WORLD_META = {
    1: {"title": "Mengenal PLSV", "topic": "Bentuk PLSV dan timbangan seimbang", "emoji": "🪐", "color": "#52D9FF",
        "goal": ["Mengenali bentuk PLSV.", "Menyelesaikan x + a = b dengan menjaga kedua ruas seimbang."],
        "intro": [
            {"term": "PLSV", "text": "Persamaan Linear Satu Variabel: ada tanda =, satu variabel, dan pangkat variabelnya satu."},
            {"term": "Contoh", "text": "x + 3 = 10 adalah PLSV. x² = 9 bukan PLSV, karena pangkat x dua."},
            {"term": "Ruas", "text": "Bagian kiri dan kanan tanda = disebut ruas."},
            {"term": "Seimbang", "text": "Apa pun yang kamu lakukan pada ruas kiri, lakukan juga pada ruas kanan."},
        ]},
    2: {"title": "Memahami Variabel", "topic": "Variabel, koefisien, dan konstanta", "emoji": "📦", "color": "#B79BFF",
        "goal": ["Memahami variabel sebagai wakil bilangan yang belum diketahui.",
                 "Menulis kalimat sehari-hari menjadi persamaan.", "Menyelesaikan ax = b."],
        "intro": [
            {"term": "Variabel", "text": "Huruf seperti x mewakili bilangan yang belum diketahui. Bayangkan x sebagai kotak misteri."},
            {"term": "Koefisien", "text": "Angka di depan x. Pada 3x, koefisiennya 3. Artinya 3 dikali x."},
            {"term": "Konstanta", "text": "Bilangan tanpa variabel, misalnya 5 pada x + 5."},
            {"term": "Suku", "text": "Bagian yang dipisah tanda + atau −. Pada 3x + 5 ada suku 3x dan 5."},
        ]},
    3: {"title": "Mengenali Informasi dalam Soal", "topic": "Diketahui dan ditanya", "emoji": "🔭", "color": "#8EA6FF",
        "goal": ["Menemukan informasi yang diketahui dalam soal cerita.", "Menentukan apa yang ditanyakan.",
                 "Memilah informasi yang tidak dipakai."],
        "intro": [
            {"term": "Diketahui", "text": "Informasi berupa angka yang tertulis di cerita."},
            {"term": "Ditanya", "text": "Hal yang dicari. Biasanya ada di kalimat yang dimulai dengan \"Berapa\"."},
            {"term": "Teliti", "text": "Tidak semua informasi selalu dipakai. Pilih yang berhubungan dengan pertanyaan."},
        ]},
    4: {"title": "Soal Cerita menjadi Persamaan", "topic": "Memodelkan soal cerita", "emoji": "🛰️", "color": "#3156D9",
        "goal": ["Memisalkan hal yang ditanyakan dengan x.", "Menyusun persamaan dari hubungan dalam cerita."],
        "intro": [
            {"term": "Memisalkan", "text": "Pilih x sebagai hal yang ditanyakan, misalnya harga 1 buku."},
            {"term": "Kata kunci", "text": "\"Lebih\" sering berarti +. \"Setiap\" atau \"per\" sering berarti dikali."},
            {"term": "Cek model", "text": "Bacakan persamaanmu dengan kata-kata. Apakah cocok dengan cerita?"},
        ]},
    5: {"title": "Menyelesaikan Persamaan", "topic": "Operasi pada kedua ruas", "emoji": "⚖️", "color": "#5EE6A0",
        "goal": ["Menyelesaikan ax + b = c dengan operasi pada kedua ruas.",
                 "Menyelesaikan persamaan dengan x di kedua ruas.", "Memeriksa jawaban dengan substitusi."],
        "intro": [
            {"term": "Urutan", "text": "Hilangkan konstanta di ruas x dulu. Setelah itu, bagi dengan koefisien."},
            {"term": "Suku sejenis", "text": "5x dan 2x sejenis. 5x dan 2 tidak sejenis."},
            {"term": "x di kedua ruas", "text": "Kumpulkan suku x di satu ruas dan angka di ruas lainnya."},
        ]},
    6: {"title": "Memahami Perubahan Tanda", "topic": "Bilangan negatif dan jalan pintas pindah ruas", "emoji": "🔄",
        "color": "#FFB26B",
        "goal": ["Menyelesaikan persamaan yang memuat bilangan negatif.",
                 "Memahami jalan pintas pindah ruas sebagai hasil operasi kedua ruas."],
        "intro": [
            {"term": "Balon", "text": "Bilangan negatif digambar sebagai balon yang menarik timbangan ke atas."},
            {"term": "Jalan pintas", "text": "+5 pindah ruas menjadi −5. Itu sama dengan mengurangi 5 di kedua ruas."},
            {"term": "Hati-hati", "text": "−2x = 6 dibagi −2, jadi x = −3. Tanda ikut dibagi."},
        ]},
    7: {"title": "Tantangan PLSV", "topic": "Kurung, pecahan, dan masalah literasi", "emoji": "🏆", "color": "#C9B8FF",
        "goal": ["Menyelesaikan PLSV dengan tanda kurung dan pecahan.",
                 "Memecahkan masalah sehari-hari dan menafsirkan jawabannya."],
        "intro": [
            {"term": "Jabarkan", "text": "2(x + 3) artinya 2 dikali x dan 2 dikali 3, jadi 2x + 6."},
            {"term": "Pecahan", "text": "x/4 artinya x dibagi 4. Kalikan kedua ruas dengan 4 untuk menghilangkannya."},
            {"term": "Tafsirkan", "text": "Setelah dapat jawaban, pikirkan artinya di dunia nyata."},
        ]},
}


def pid(m: int, order: int) -> str:
    return f"w{m}-p{order:02d}"


def sym_list(m: int, start: int, items: list[tuple], ptype: str = "solve") -> list[dict]:
    """items: (persamaan, level) atau (persamaan, level, sumber)."""
    out = []
    for i, it in enumerate(items):
        eq, level, *src = it
        out.append(symbolic(pid(m, start + i), m, level, start + i, ptype, eq, source=src[0] if src else None))
    return out


def stories(m: int, start: int, items: list[tuple[dict, dict]]) -> list[dict]:
    """items: (dict cerita, perubahan). id, world, dan order diatur ulang sesuai misi."""
    out = []
    for i, (d, over) in enumerate(items):
        nd = {**d, **over, "id": pid(m, start + i), "world": m, "order": start + i}
        if "given_stages" not in over:
            nd.pop("given_stages", None)
        out.append(story(nd))
    return out


def mission_1() -> list[dict]:
    m = 1
    ps = [
        symbolic(pid(m, 0), m, 1, 0, "worked", "x + 3 = 10"),
        symbolic(pid(m, 1), m, 1, 1, "faded", "x + 4 = 9", given=1),
        symbolic(pid(m, 2), m, 1, 2, "faded", "x - 2 = 6", given=1),
    ]
    ps += sym_list(m, 3, [("x + 7 = 15", 1, "Lembar kerja S01 nomor 1"), ("x + 9 = 11", 1), ("x - 3 = 5", 1),
                          ("x + 5 = 12", 1), ("x - 1 = 10", 2), ("x + 12 = 20", 2), ("x - 6 = 3", 2),
                          ("x - 5 = 2", 2), ("x + 11 = 15", 2)], "balance")
    return ps


def mission_2() -> list[dict]:
    m = 2
    ps = [
        symbolic(pid(m, 0), m, 1, 0, "worked", "2*x = 10"),
        symbolic(pid(m, 1), m, 1, 1, "faded", "3*x = 12", given=1),
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
        ps.append(translate(pid(m, 2 + i), m, 1 if i < 3 else 2, 2 + i, s, eq, wrong))
    ps += sym_list(m, 8, [("4*x = 20", 1), ("5*x = 35", 1), ("6*x = 42", 2), ("3*x = 27", 2), ("7*x = 49", 2)],
                   "balance")
    return ps


def mission_3() -> list[dict]:
    m = 3
    given_ms = {"type": "faded", "given_stages": ["model", "solve"]}
    return stories(m, 0, [
        (M3_WORKED, {}),
        (S["w6-p01"], given_ms),
        (S["w6-p02"], given_ms),
        (S["w6-p03"], {}),
        (S["w6-p04"], {}),
        *[(d, {}) for d in M3_NEW],
    ])


def mission_4() -> list[dict]:
    m = 4
    faded = {"type": "faded", "given_stages": ["understand", "solve"]}
    practice = {"type": "story", "given_stages": ["solve"]}
    return stories(m, 0, [
        (S["w6-p05"], {"type": "worked"}),
        (S["w6-p06"], faded),
        (S["w6-p09"], faded),
        (S["w6-p00"], {**practice, "level": 1}),
        (S["w6-p07"], practice),
        (S["w6-p08"], practice),
        (S["w6-p14"], {**practice, "level": 2}),
        (S["w6-p13"], practice),
    ])


def mission_5() -> list[dict]:
    m = 5
    ps = [
        symbolic(pid(m, 0), m, 1, 0, "worked", "4*x + 6 = 30"),
        symbolic(pid(m, 1), m, 1, 1, "faded", "2*x + 3 = 11", given=1),
        symbolic(pid(m, 2), m, 1, 2, "faded", "5*x - 4 = 21", given=1),
    ]
    ps += sym_list(m, 3, [("3*x - 5 = 16", 1, "Lembar kerja S01 nomor 2"), ("2*x + 7 = 15", 1), ("4*x - 3 = 13", 1),
                          ("6*x + 2 = 26", 2), ("5*x - 9 = 6", 2), ("7*x + 1 = 22", 2), ("16 = 3*x - 5", 2),
                          ("20 = 4*x + 8", 3), ("9*x - 7 = 29", 3)])
    ps.append(symbolic(pid(m, 12), m, 2, 12, "faded", "4*x + 1 = 2*x + 9", given=1))
    ps += sym_list(m, 13, [("5*x + 2 = 2*x + 14", 2, "Lembar kerja S01 nomor 3"), ("7*x - 5 = 3*x + 11", 2),
                           ("2*x + 9 = 5*x", 3), ("8*x - 6 = 5*x + 9", 3)])
    return ps


def mission_6() -> list[dict]:
    m = 6
    ps = [
        symbolic(pid(m, 0), m, 1, 0, "worked", "x + 8 = 3"),
        symbolic(pid(m, 1), m, 1, 1, "faded", "x - 4 = -1", given=1),
        symbolic(pid(m, 2), m, 1, 2, "faded", "3*x + 8 = 2", given=1),
    ]
    ps += sym_list(m, 3, [("2*x = -8", 1), ("x - 7 = -10", 1), ("2*x - 11 = -3", 1), ("-2*x + 5 = 11", 2),
                          ("x + 12 = 4*x", 2), ("3*x - 7 = x + 5", 2), ("9*x + 4 = 6*x + 19", 2),
                          ("4*x - 10 = 2*x - 2", 2), ("10 - x = x + 2", 3), ("5*x + 3 = 3*x - 7", 3),
                          ("6*x = 2*x + 20", 3), ("2*x - 3 = 7*x + 12", 3)])
    return ps


def mission_7() -> list[dict]:
    m = 7
    ps = [
        symbolic(pid(m, 0), m, 1, 0, "worked", "2*(x + 3) = 18"),
        symbolic(pid(m, 1), m, 1, 1, "faded", "3*(x - 2) = 12", given=1),
        symbolic(pid(m, 2), m, 1, 2, "faded", "x/4 + 2 = 5", given=1),
    ]
    ps += sym_list(m, 3, [("4*(x + 1) = 20", 1), ("2*(x - 5) = 6", 1), ("x/3 = 5", 1), ("x/2 + 4 = 9", 1),
                          ("5*(x + 2) = 3*x + 16", 2), ("x/5 - 1 = 3", 2), ("(x + 4)/3 = 5", 2),
                          ("3*(2*x - 1) = 15", 2), ("2*x/3 = 8", 2), ("(x - 2)/4 = 3", 3),
                          ("6*(x + 1) = 4*(x + 3)", 3), ("x/2 + x/3 = 10", 3)])
    ps += stories(m, 15, [(S["w6-p10"], {}), (S["w6-p11"], {}), (S["w6-p12"], {})])
    ps += stories(m, 18, [(d, {}) for d in LITERACY])
    return ps


# ---------------------------------------------------------------- cerita baru Mission 03 (mengenali informasi)
M3_WORKED = dict(type="worked", level=1, emoji="🥐", pisa="personal", setting="kantin",
                 lines=["Kiki membeli 3 roti di kantin dengan harga sama.", "Kiki membayar Rp9.000 seluruhnya."],
                 q="Berapa harga 1 roti?",
                 known=["Banyak roti: 3", "Total bayar: Rp9.000"], known_wrong=["Harga 1 roti: Rp9.000"],
                 asked="Harga 1 roti", asked_wrong=["Banyak roti yang dibeli"],
                 var="harga 1 roti (rupiah)", var_wrong=["banyak roti", "total bayar"],
                 eq="3*x = 9000", eq_wrong=["x + 3 = 9000", "x = 9000*3"],
                 relation="3 roti × harga 1 roti = total bayar.",
                 unit="rp", template="Jadi, harga 1 roti adalah {jawaban}.",
                 sense="Apakah Rp3.000 masuk akal untuk harga 1 roti?")

M3_NEW: list[dict] = [
    dict(level=2, emoji="🚐", pisa="personal", setting="angkot",
         lines=["Ongkos angkot Nanda ke sekolah sama setiap hari.", "Dalam 5 hari, Nanda membayar Rp20.000.",
                "Jarak rumahnya ke sekolah 3 km."],
         q="Berapa ongkos angkot Nanda setiap hari?",
         known=["Banyak hari: 5", "Total ongkos: Rp20.000", "Jarak ke sekolah: 3 km"],
         known_wrong=["Ongkos per hari: Rp20.000"],
         asked="Ongkos angkot per hari", asked_wrong=["Jarak rumah ke sekolah"],
         var="ongkos angkot per hari (rupiah)", var_wrong=["banyak hari", "jarak rumah ke sekolah"],
         eq="5*x = 20000", eq_wrong=["x + 5 = 20000", "3*x = 20000"],
         relation="5 hari × ongkos per hari = total ongkos. Info jarak tidak dipakai.",
         unit="rp", template="Jadi, ongkos angkot Nanda setiap hari {jawaban}.",
         sense="Apakah Rp4.000 sehari masuk akal untuk ongkos angkot?"),
    dict(level=2, emoji="🧒", pisa="personal", setting="umur",
         lines=["Tinggi badan Yoga 150 cm.", "Yoga 7 tahun lebih tua dari adiknya.", "Umur Yoga sekarang 13 tahun."],
         q="Berapa umur adik Yoga?",
         known=["Selisih umur: 7 tahun", "Umur Yoga: 13 tahun", "Tinggi Yoga: 150 cm"],
         known_wrong=["Umur adik: 7 tahun"],
         asked="Umur adik Yoga", asked_wrong=["Tinggi badan Yoga"],
         var="umur adik Yoga (tahun)", var_wrong=["adik Yoga", "umur Yoga"],
         eq="x + 7 = 13", eq_wrong=["x - 7 = 13", "x + 150 = 13"],
         relation="Umur adik + 7 tahun = umur Yoga. Info tinggi badan tidak dipakai.",
         unit="tahun", template="Jadi, umur adik Yoga {jawaban}.",
         sense="Apakah 6 tahun masuk akal untuk umur adik?"),
    dict(level=2, emoji="🌱", pisa="societal", setting="kegiatan sekolah",
         lines=["Kelas 7A menanam 24 pohon di halaman sekolah.", "Setiap kelompok menanam pohon sama banyak.",
                "Ada 6 kelompok di kelas itu."],
         q="Berapa pohon yang ditanam setiap kelompok?",
         known=["Jumlah pohon: 24", "Banyak kelompok: 6"], known_wrong=["Pohon per kelompok: 6"],
         asked="Banyak pohon per kelompok", asked_wrong=["Banyak kelompok"],
         var="banyak pohon per kelompok", var_wrong=["banyak kelompok", "jumlah pohon"],
         eq="6*x = 24", eq_wrong=["x + 6 = 24", "x = 24*6"],
         relation="6 kelompok × pohon per kelompok = jumlah pohon.",
         unit="pohon", template="Jadi, setiap kelompok menanam {jawaban}.",
         sense="Apakah 4 pohon per kelompok masuk akal?"),
    dict(level=2, emoji="🛍️", pisa="personal", setting="belanja",
         lines=["Bu Wati membeli sekarung beras dan 1 kg gula.", "Harga 1 kg gula Rp16.000.",
                "Bu Wati membayar Rp76.000 seluruhnya."],
         q="Berapa harga sekarung beras?",
         known=["Harga 1 kg gula: Rp16.000", "Total bayar: Rp76.000"], known_wrong=["Harga beras: Rp16.000"],
         asked="Harga sekarung beras", asked_wrong=["Harga 1 kg gula"],
         var="harga sekarung beras (rupiah)", var_wrong=["harga gula", "total bayar"],
         eq="x + 16000 = 76000", eq_wrong=["x - 16000 = 76000", "16000*x = 76000"],
         relation="Harga beras + harga gula = total bayar.",
         unit="rp", template="Jadi, harga sekarung beras {jawaban}.",
         sense="Apakah Rp60.000 masuk akal untuk harga sekarung beras?"),
    dict(level=3, emoji="🏀", pisa="personal", setting="olahraga",
         lines=["Tim basket sekolah bermain 4 pertandingan.",
                "Di setiap pertandingan, Fajar mencetak poin sama banyak.",
                "Pertandingan selalu dimulai pukul 15.00.", "Total poin Fajar 48."],
         q="Berapa poin Fajar di setiap pertandingan?",
         known=["Banyak pertandingan: 4", "Total poin Fajar: 48", "Jam mulai: 15.00"],
         known_wrong=["Poin per pertandingan: 4"],
         asked="Poin Fajar per pertandingan", asked_wrong=["Jam mulai pertandingan"],
         var="poin Fajar per pertandingan", var_wrong=["banyak pertandingan", "total poin"],
         eq="4*x = 48", eq_wrong=["x + 4 = 48", "15*x = 48"],
         relation="4 pertandingan × poin per pertandingan = total poin. Jam mulai tidak dipakai.",
         unit="poin", template="Jadi, Fajar mencetak {jawaban} di setiap pertandingan.",
         sense="Apakah 12 poin per pertandingan masuk akal?"),
]


# ---------------------------------------------------------------- bank cerita (dipakai ulang oleh misi)
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


# =====================================================================================================
# LEARNING ZONE & CHALLENGE ZONE  →  content/zones/learning.json, content/zones/challenge.json
# Skema pertanyaan (dipakai keduanya):
#   mc    : {prompt, eq?, options:[{text? | eq?, correct, why?}]}         why = alasan untuk pilihan salah
#   short : {prompt, eq?, answer}                                         verify=solution → answer = penyelesaian eq
#   step  : {prompt, eq, steps:[{options:[{eq, correct, why?}]}], answer} pilih langkah berikutnya sampai x = …
#   story : {story, question, eq, answer, unit, hint, template, check}     soal cerita + tahap Periksa (aturan 4)
# =====================================================================================================
ZONES_DIR = Path(__file__).resolve().parents[1] / "zones"
OP_WORD = {"add": "ditambah", "sub": "dikurangi", "mul": "dikali", "div": "dibagi"}
OPPOSITE = {"add": "sub", "sub": "add", "mul": "div", "div": "mul"}


def apply_op(s: tuple, op: str, v: Any) -> tuple:
    a, b = s
    va, vb = lin(sym(v)) if isinstance(v, str) else (sp.Rational(0), sp.Rational(v))
    if op == "add":
        return a + va, b + vb
    if op == "sub":
        return a - va, b - vb
    if op == "mul":
        return a * vb, b * vb
    return a / vb, b / vb


def step_question(qid: str, level: str, eq: str, prompt: str = "Pilih langkah berikutnya sampai x sendirian.") -> dict:
    """Soal 'menentukan langkah': setiap langkah baku + 2 pengecoh (salah tanda di ruas kanan, hanya satu ruas)."""
    steps, states = gen_steps(eq)
    out = []
    for st, before in zip(steps, states):
        if st["op"] == "expand":
            raise ValueError(f"{qid}: soal langkah tidak boleh memuat kurung")
        aL, bL, aR, bR = before
        left = apply_op((aL, bL), st["op"], st["value"])
        wrong_sign = apply_op((aR, bR), OPPOSITE[st["op"]], st["value"])
        v = disp(st["value"])
        word = OP_WORD[st["op"]]
        opts = [{"eq": st["result"], "correct": True}]
        cand = [
            (f"{fmt_lin(*left)} = {fmt_lin(*wrong_sign)}",
             f"Hampir! Ruas kanan juga harus {word} {v}, bukan {OP_WORD[OPPOSITE[st['op']]]} {v}."),
            (f"{fmt_lin(*left)} = {fmt_lin(aR, bR)}",
             f"Hampir! Ruas kanan juga harus {word} {v} agar timbangan tetap seimbang."),
        ]
        for e, why in cand:
            if e != st["result"] and all(e != o["eq"] for o in opts):
                opts.append({"eq": e, "correct": False, "why": why})
        out.append({"from": fmt_state(before), "options": opts})
    return {"id": qid, "type": "step", "level": level, "prompt": prompt, "eq": eq, "steps": out,
            "answer": fmt_num(solve(eq)), "hint": "Lihat bilangan yang menempel pada x. Pakai lawan operasinya di kedua ruas."}


def short_solve(qid: str, level: str, eq: str, hint: str, prompt: str = "Berapa nilai x?") -> dict:
    return {"id": qid, "type": "short", "level": level, "prompt": prompt, "eq": eq, "verify": "solution",
            "answer": fmt_num(solve(eq)), "hint": hint}


def short_fact(qid: str, level: str, prompt: str, answer: str, hint: str, eq: str | None = None) -> dict:
    q = {"id": qid, "type": "short", "level": level, "prompt": prompt, "answer": answer, "hint": hint}
    if eq:
        q["eq"] = eq
    return q


def mc(qid: str, level: str, prompt: str, options: list[tuple], eq: str | None = None, explain: str = "") -> dict:
    """options: (teks | {'eq': …}, benar?, alasan-bila-salah)."""
    opts = []
    for o, ok, *why in options:
        item = {"eq": o["eq"]} if isinstance(o, dict) else {"text": o}
        item["correct"] = ok
        if not ok:
            item["why"] = why[0]
        opts.append(item)
    q = {"id": qid, "type": "mc", "level": level, "prompt": prompt, "options": opts}
    if eq:
        q["eq"] = eq
    if explain:
        q["explain"] = explain
    return q


def story_q(qid: str, level: str, lines: list[str], question: str, eq: str, unit: str, hint: str, template: str) -> dict:
    ans = solve(eq)
    left, right = eq.split("=")
    return {"id": qid, "type": "story", "level": level, "story": lines, "question": question, "eq": eq,
            "answer": fmt_num(ans), "unit": unit, "hint": hint, "template": template,
            "answer_sentence": template.replace("{jawaban}", fmt_answer(ans, unit)),
            "check": {"left_value": fmt_num(sym(left).subs(X, ans)), "right_value": fmt_num(sym(right).subs(X, ans))}}


def worked_lines(eq: str) -> list[dict]:
    """Contoh dikerjakan bertahap dari langkah baku (sama dengan Misi)."""
    steps, _ = gen_steps(eq)
    lines = [{"text": "Mulai dari persamaan ini.", "eq": eq}]
    for st in steps:
        lines.append({"text": explain_text(st)[0], "eq": st["result"]})
    ans = solve(eq)
    left = eq.split("=")[0]
    lines.append({"text": f"Periksa: ganti x dengan {disp(fmt_num(ans))}. Ruas kiri = {disp(fmt_num(sym(left).subs(X, ans)))}, sama dengan ruas kanan. Benar!"})
    return lines


# ---------------------------------------------------------------- Learning Zone: 8 materi
def lessons() -> list[dict]:
    return [
        {"id": "L1", "title": "Pengertian PLSV", "emoji": "🪐", "mission": 1, "pages": [
            {"kind": "explain", "title": "Apa itu PLSV?", "text": [
                "PLSV adalah Persamaan Linear Satu Variabel.",
                "Persamaan adalah kalimat matematika dengan tanda sama dengan (=).",
                "Linear artinya pangkat variabelnya satu.",
                "Satu variabel artinya hanya ada satu huruf, misalnya x."],
             "visual": {"type": "table", "headers": ["Kalimat", "PLSV?", "Alasan"], "rows": [
                 ["x + 3 = 10", "Ya", "satu variabel, pangkat satu"],
                 ["x² = 9", "Bukan", "pangkat x dua"],
                 ["x + y = 5", "Bukan", "ada dua variabel"],
                 ["3 + 4 = 7", "Bukan", "tidak ada variabel"]]}},
            {"kind": "example", "title": "Contoh: mengenali PLSV", "lines": [
                {"text": "Perhatikan persamaan ini.", "eq": "2*x - 1 = 7"},
                {"text": "Ada tanda =. Jadi ini persamaan."},
                {"text": "Hanya ada satu variabel, yaitu x."},
                {"text": "Pangkat x adalah satu. Jadi 2x − 1 = 7 adalah PLSV."}]},
            {"kind": "summary", "points": ["PLSV punya tanda =.", "PLSV punya tepat satu variabel.",
                                           "Pangkat variabelnya satu."]},
            {"kind": "quiz", "questions": [
                mc("L1-q1", "easy", "Manakah yang termasuk PLSV?", [
                    ({"eq": "4*x + 1 = 9"}, True),
                    ("x² + 1 = 5", False, "Pangkat x pada x² adalah dua, jadi bukan linear."),
                    ("x + y = 8", False, "Ada dua variabel, yaitu x dan y."),
                    ("5 + 2 = 7", False, "Tidak ada variabelnya, jadi bukan PLSV.")]),
                mc("L1-q2", "easy", "Mengapa x² = 16 bukan PLSV?", [
                    ("Pangkat x adalah dua", True),
                    ("Tidak ada tanda =", False, "Ada tanda = pada x² = 16. Coba lihat pangkat x."),
                    ("Ada dua variabel", False, "Hanya ada satu variabel, yaitu x. Coba lihat pangkatnya.")]),
            ]},
        ]},
        {"id": "L2", "title": "Unsur-unsur PLSV", "emoji": "🧩", "mission": 2, "pages": [
            {"kind": "explain", "title": "Bagian-bagian PLSV", "text": [
                "Setiap PLSV punya beberapa bagian.",
                "Ada variabel, koefisien, konstanta, dan tanda sama dengan.",
                "Warna di bawah menunjukkan setiap bagian."],
             "visual": {"type": "parts", "tokens": [["3", "coef"], ["x", "var"], ["+", "op"], ["5", "const"],
                                                    ["=", "eq"], ["20", "const"]]}},
            {"kind": "explain", "title": "Ruas kiri dan ruas kanan", "text": [
                "Bagian sebelum tanda = disebut ruas kiri.",
                "Bagian sesudah tanda = disebut ruas kanan.",
                "Pada 3x + 5 = 20, ruas kirinya 3x + 5 dan ruas kanannya 20."],
             "visual": {"type": "balance", "eq": "3*x + 5 = 20"}},
            {"kind": "example", "title": "Contoh: menyebut unsur", "lines": [
                {"text": "Perhatikan persamaan ini.", "eq": "4*x - 7 = 9"},
                {"text": "Variabelnya adalah x."},
                {"text": "Koefisien x adalah 4."},
                {"text": "Konstanta di ruas kiri adalah −7."},
                {"text": "Ruas kanannya adalah 9."}]},
            {"kind": "summary", "points": ["Variabel: huruf yang mewakili bilangan.", "Koefisien: angka di depan variabel.",
                                           "Konstanta: bilangan tanpa variabel.", "Tanda = memisahkan ruas kiri dan ruas kanan."]},
            {"kind": "quiz", "questions": [
                short_fact("L2-q1", "easy", "Berapa koefisien x pada persamaan ini?", "6",
                           "Koefisien adalah angka yang menempel di depan x.", eq="6*x - 2 = 10"),
                mc("L2-q2", "easy", "Pada 5x + 8 = 23, manakah ruas kanannya?", [
                    ("23", True),
                    ("5x + 8", False, "5x + 8 ada di sebelah kiri tanda =, jadi itu ruas kiri."),
                    ("8", False, "8 adalah konstanta di ruas kiri, bukan ruas kanan.")]),
            ]},
        ]},
        {"id": "L3", "title": "Variabel, Koefisien, Konstanta, dan Suku", "emoji": "🔤", "mission": 2, "pages": [
            {"kind": "explain", "title": "Variabel", "text": [
                "Variabel adalah huruf yang mewakili bilangan yang belum diketahui.",
                "Bayangkan x sebagai kotak misteri berisi sebuah bilangan.",
                "Huruf lain seperti a, n, atau y juga bisa menjadi variabel."]},
            {"kind": "explain", "title": "Koefisien, konstanta, dan suku", "text": [
                "Koefisien adalah angka di depan variabel.",
                "Konstanta adalah bilangan tanpa variabel.",
                "Suku adalah bagian yang dipisah tanda + atau −.",
                "3x artinya 3 dikali x."],
             "visual": {"type": "parts", "tokens": [["2", "coef"], ["x", "var"], ["−", "op"], ["7", "const"],
                                                    ["=", "eq"], ["11", "const"]]}},
            {"kind": "example", "title": "Contoh: mencari suku", "lines": [
                {"text": "Perhatikan persamaan ini.", "eq": "7 + 3*x = 19"},
                {"text": "Suku-sukunya adalah 7, 3x, dan 19."},
                {"text": "Koefisien x adalah 3."},
                {"text": "Konstantanya adalah 7 dan 19."}]},
            {"kind": "summary", "points": ["Variabel = kotak misteri.", "Koefisien menempel di depan variabel.",
                                           "Konstanta tidak punya variabel.", "Tanda − di depan suku ikut dihitung."]},
            {"kind": "quiz", "questions": [
                mc("L3-q1", "medium", "Pada 9 − 2x = 1, berapa koefisien x?", [
                    ("−2", True),
                    ("2", False, "Tanda − di depan 2x ikut dihitung. Jadi koefisiennya negatif."),
                    ("9", False, "9 tidak menempel pada x, jadi 9 adalah konstanta.")]),
                short_fact("L3-q2", "easy", "Ada berapa suku di ruas kiri 4x + 3?", "2",
                           "Hitung bagian yang dipisah tanda + atau −."),
            ]},
        ]},
        {"id": "L4", "title": "Kesetaraan Persamaan", "emoji": "⚖️", "mission": 1, "pages": [
            {"kind": "explain", "title": "Persamaan seperti timbangan", "text": [
                "Persamaan seperti timbangan yang seimbang.",
                "Nilai ruas kiri sama dengan nilai ruas kanan.",
                "Jika x = 4, maka x + 3 = 7 bernilai benar."],
             "visual": {"type": "balance", "eq": "x + 3 = 7"}},
            {"kind": "explain", "title": "Persamaan yang setara", "text": [
                "Dua persamaan setara jika penyelesaiannya sama.",
                "x + 3 = 7 dan x = 4 adalah persamaan setara.",
                "Keduanya benar untuk x = 4."]},
            {"kind": "example", "title": "Contoh: membuat persamaan setara", "lines": [
                {"text": "Mulai dari persamaan ini.", "eq": "x + 3 = 7"},
                {"text": "Kurangi 3 di kedua ruas.", "eq": "x = 4"},
                {"text": "x + 3 = 7 dan x = 4 setara, karena penyelesaiannya sama."}]},
            {"kind": "summary", "points": ["Persamaan = timbangan seimbang.",
                                           "Persamaan setara punya penyelesaian yang sama.",
                                           "Operasi yang sama di kedua ruas menghasilkan persamaan setara."]},
            {"kind": "quiz", "questions": [
                mc("L4-q1", "easy", "Persamaan mana yang setara dengan x + 5 = 12?", [
                    ({"eq": "x = 7"}, True),
                    ({"eq": "x = 17"}, False, "Jika x = 17, maka 17 + 5 = 22, bukan 12."),
                    ({"eq": "x + 5 = 17"}, False, "Ruas kanan berubah tanpa operasi di ruas kiri, jadi tidak setara.")],
                   eq="x + 5 = 12"),
                short_fact("L4-q2", "easy", "Jika x = 3, berapa nilai ruas kiri 4x + 2?", "14",
                           "Ganti x dengan 3. Kerjakan perkalian dulu, baru penjumlahan."),
            ]},
        ]},
        {"id": "L5", "title": "Langkah Menyelesaikan PLSV", "emoji": "🪜", "mission": 5, "pages": [
            {"kind": "explain", "title": "Tujuannya: x sendirian", "text": [
                "Menyelesaikan PLSV artinya mencari nilai x.",
                "Tujuannya membuat x sendirian di satu ruas.",
                "Setiap langkah dilakukan pada kedua ruas."]},
            {"kind": "explain", "title": "Urutan langkah", "text": [
                "1. Hilangkan konstanta di ruas yang ada x.",
                "2. Bagi kedua ruas dengan koefisien x.",
                "3. Periksa dengan substitusi."]},
            {"kind": "example", "title": "Contoh dikerjakan bertahap", "lines": worked_lines("3*x - 5 = 16")},
            {"kind": "summary", "points": ["Tujuan: x sendirian di satu ruas.", "Hilangkan konstanta dulu, lalu bagi koefisien.",
                                           "Selalu periksa dengan substitusi."]},
            {"kind": "quiz", "questions": [
                step_question("L5-q1", "easy", "2*x + 3 = 11"),
                short_solve("L5-q2", "easy", "5*x - 4 = 21", "Tambahkan 4 di kedua ruas dulu."),
            ]},
        ]},
        {"id": "L6", "title": "Operasi pada Kedua Ruas", "emoji": "🔁", "mission": 5, "pages": [
            {"kind": "explain", "title": "Lakukan hal yang sama", "text": [
                "Agar timbangan tetap seimbang, lakukan operasi yang sama pada kedua ruas.",
                "Kamu boleh menambah, mengurangi, mengali, atau membagi.",
                "Membagi dengan nol tidak boleh."],
             "visual": {"type": "balance", "eq": "2*x + 3 = 9"}},
            {"kind": "explain", "title": "Memilih operasi", "text": [
                "Pilih lawan dari operasi yang menempel pada x.",
                "Lawan dari tambah adalah kurang.",
                "Lawan dari kali adalah bagi."]},
            {"kind": "example", "title": "Contoh dikerjakan bertahap", "lines": worked_lines("2*x + 3 = 9")},
            {"kind": "summary", "points": ["Operasi selalu pada KEDUA ruas.", "Pakai lawan operasinya.",
                                           "Jangan membagi dengan nol."]},
            {"kind": "quiz", "questions": [
                mc("L6-q1", "easy", "Pada x + 9 = 15, operasi apa yang dilakukan pada kedua ruas?", [
                    ("Kurangi 9", True),
                    ("Tambah 9", False, "Menambah 9 membuat x makin jauh dari sendirian. Lawan dari +9 adalah −9."),
                    ("Kurangi 9 di ruas kiri saja", False, "Ruas kanan juga harus dikurangi 9 agar tetap seimbang.")],
                   eq="x + 9 = 15"),
                step_question("L6-q2", "easy", "3*x + 2 = 20"),
            ]},
        ]},
        {"id": "L7", "title": "Perubahan Tanda", "emoji": "🔄", "mission": 6, "requires": "L6", "pages": [
            {"kind": "explain", "title": "Dari mana perubahan tanda?", "text": [
                "Perhatikan x + 5 = 9.",
                "Kurangi 5 di kedua ruas, hasilnya x = 9 − 5.",
                "Kelihatannya +5 pindah ke kanan menjadi −5.",
                "Itu jalan pintas dari operasi kedua ruas, disebut pindah ruas."],
             "visual": {"type": "balance", "eq": "x + 5 = 9"}},
            {"kind": "explain", "title": "Aturan jalan pintas", "text": [
                "Suku + yang pindah ruas menjadi −.",
                "Suku − yang pindah ruas menjadi +.",
                "Koefisien kali yang pindah ruas menjadi bagi.",
                "Ingat, ini hanya jalan pintas dari operasi kedua ruas."]},
            {"kind": "explain", "title": "Hasil negatif", "text": [
                "Nilai x bisa negatif.",
                "x + 8 = 3 menghasilkan x = 3 − 8 = −5.",
                "−2x = 6 dibagi −2 di kedua ruas, jadi x = −3."],
             "visual": {"type": "balance", "eq": "x + 8 = 3"}},
            {"kind": "example", "title": "Contoh dikerjakan bertahap", "lines": worked_lines("-2*x + 5 = 11")},
            {"kind": "summary", "points": ["Perubahan tanda berasal dari operasi kedua ruas.", "+ menjadi −, − menjadi +.",
                                           "Bagi dengan bilangan negatif: tanda ikut berubah."]},
            {"kind": "quiz", "questions": [
                mc("L7-q1", "medium", "Dengan jalan pintas, x − 6 = 10 menjadi …", [
                    ("x = 10 + 6", True),
                    ("x = 10 − 6", False, "−6 pindah ruas menjadi +6, karena kita menambah 6 di kedua ruas."),
                    ("x = −10 + 6", False, "Ruas kanan tetap 10. Hanya −6 yang berubah tanda menjadi +6.")],
                   eq="x - 6 = 10"),
                short_solve("L7-q2", "medium", "-3*x + 4 = 19", "Kurangi 4 di kedua ruas, lalu bagi dengan −3."),
                step_question("L7-q3", "medium", "x + 9 = 2"),
            ]},
        ]},
        {"id": "L8", "title": "PLSV dalam Soal Cerita", "emoji": "🛰️", "mission": 4, "pages": [
            {"kind": "explain", "title": "4 langkah soal cerita", "text": [
                "1. Pahami: apa yang diketahui dan ditanya?",
                "2. Modelkan: misalkan yang ditanya dengan x.",
                "3. Selesaikan persamaannya.",
                "4. Periksa: apakah jawabannya masuk akal?"]},
            {"kind": "example", "title": "Contoh: harga buku", "lines": [
                {"text": "Rani membeli 4 buku yang harganya sama. Ia membayar Rp24.000."},
                {"text": "Diketahui: 4 buku dan total Rp24.000. Ditanya: harga 1 buku."},
                {"text": "Misalkan harga 1 buku = x. Modelnya:", "eq": "4*x = 24000"},
                {"text": "Bagi kedua ruas dengan 4.", "eq": "x = 6000"},
                {"text": "Periksa: 4 × Rp6.000 = Rp24.000. Masuk akal untuk harga buku!"}]},
            {"kind": "summary", "points": ["Pahami → Modelkan → Selesaikan → Periksa.",
                                           "x adalah hal yang ditanya, lengkap dengan satuannya.",
                                           "Jawaban harus masuk akal dengan cerita."]},
            {"kind": "quiz", "questions": [
                mc("L8-q1", "medium",
                   "Doni punya 3 kotak pensil yang isinya sama. Ada juga 2 pensil lepas. Semuanya 20 pensil. Persamaan yang tepat adalah …",
                   [({"eq": "3*x + 2 = 20"}, True),
                    ({"eq": "3*x = 20 + 2"}, False, "2 pensil lepas sudah termasuk dalam 20. Jadi 2 ditambahkan di ruas kiri."),
                    ({"eq": "x + 3 + 2 = 20"}, False, "3 kotak berarti 3 dikali isi 1 kotak, jadi 3x.")]),
                story_q("L8-q2", "easy", ["Harga 1 tiket bus Rp5.000.", "Bu Sari membayar Rp35.000 untuk tiket keluarganya."],
                        "Berapa tiket yang dibeli Bu Sari?", "5000*x = 35000", "tiket",
                        "Harga 1 tiket × banyak tiket = total bayar.", "Jadi, Bu Sari membeli {jawaban}."),
            ]},
        ]},
    ]


# ---------------------------------------------------------------- Challenge Zone: Easy / Medium / Advanced
def challenge() -> list[dict]:
    e, m, a = "easy", "medium", "advanced"
    return [
        # ------------------------------------------------ Easy
        mc("ch-e01", e, "Manakah yang BUKAN PLSV?", [
            ("x² − 1 = 8", True),
            ({"eq": "x - 1 = 8"}, False, "Ini PLSV: satu variabel dan pangkatnya satu."),
            ({"eq": "2*x = 8"}, False, "Ini PLSV: satu variabel dan pangkatnya satu.")]),
        short_solve("ch-e02", e, "x + 6 = 15", "Kurangi 6 di kedua ruas."),
        short_solve("ch-e03", e, "x - 4 = 7", "Tambahkan 4 di kedua ruas."),
        short_solve("ch-e04", e, "3*x = 21", "3x artinya 3 dikali x. Bagi kedua ruas dengan 3."),
        mc("ch-e05", e, "Langkah yang tepat untuk menyelesaikan persamaan ini adalah …", [
            ("Bagi kedua ruas dengan 5", True),
            ("Kurangi 5 di kedua ruas", False, "5x artinya 5 dikali x. Lawan dari kali adalah bagi."),
            ("Kali kedua ruas dengan 5", False, "Mengali dengan 5 membuat x makin besar. Lawan dari kali adalah bagi.")],
           eq="5*x = 30"),
        step_question("ch-e06", e, "x + 7 = 12"),
        step_question("ch-e07", e, "2*x = 18"),
        mc("ch-e08", e, "\"Sebuah bilangan dikurangi 3 hasilnya 10.\" Persamaannya adalah …", [
            ({"eq": "x - 3 = 10"}, True),
            ({"eq": "3 - x = 10"}, False, "Yang dikurangi adalah bilangannya, jadi x ditulis dulu: x − 3."),
            ({"eq": "x + 3 = 10"}, False, "\"Dikurangi\" artinya tanda −, bukan +.")]),
        story_q("ch-e09", e, ["Harga 1 pulpen Rp3.000.", "Lia membayar Rp15.000 untuk beberapa pulpen."],
                "Berapa pulpen yang dibeli Lia?", "3000*x = 15000", "pulpen",
                "Harga 1 pulpen × banyak pulpen = total bayar.", "Jadi, Lia membeli {jawaban}."),
        story_q("ch-e10", e, ["Kiko 4 tahun lebih tua dari adiknya.", "Umur Kiko sekarang 12 tahun."],
                "Berapa umur adik Kiko?", "x + 4 = 12", "tahun",
                "Umur adik + 4 tahun = umur Kiko.", "Jadi, umur adik Kiko {jawaban}."),
        # ------------------------------------------------ Medium
        short_solve("ch-m01", m, "2*x + 5 = 17", "Kurangi 5 di kedua ruas, lalu bagi dengan 2."),
        short_solve("ch-m02", m, "4*x - 3 = 25", "Tambahkan 3 di kedua ruas, lalu bagi dengan 4."),
        short_solve("ch-m03", m, "5*x - 8 = 2*x + 7", "Kumpulkan suku x di satu ruas dulu: kurangi 2x di kedua ruas."),
        step_question("ch-m04", m, "3*x - 4 = 11"),
        step_question("ch-m05", m, "6*x + 1 = 2*x + 13"),
        mc("ch-m06", m, "Raka mengubah 3x + 4 = 19 menjadi 3x = 19 + 4. Apa kesalahannya?", [
            ("Ruas kanan seharusnya dikurangi 4", True),
            ("Seharusnya dibagi 3 lebih dulu", False, "Membagi dulu juga boleh jika semua suku dibagi. Kesalahan Raka ada pada tanda 4."),
            ("Tidak ada yang salah", False, "Kedua ruas harus sama-sama dikurangi 4. Periksa tanda di ruas kanan.")]),
        mc("ch-m07", m, "Apakah x = 4 penyelesaian dari 3x − 2 = 10?", [
            ("Ya, karena 3 × 4 − 2 = 10", True),
            ("Tidak, karena 3 + 4 − 2 = 5", False, "3x artinya 3 dikali x, bukan 3 ditambah x."),
            ("Tidak, karena 10 − 2 = 8", False, "Untuk memeriksa, ganti x dengan 4 di ruas kiri. Lalu bandingkan dengan 10.")]),
        story_q("ch-m08", m, ["Bimo membeli 2 buku tulis yang harganya sama.", "Ia juga membeli penghapus Rp2.000.",
                             "Bimo membayar Rp14.000 seluruhnya."],
                "Berapa harga 1 buku tulis?", "2*x + 2000 = 14000", "rp",
                "Harga 2 buku + harga penghapus = total bayar.", "Jadi, harga 1 buku tulis {jawaban}."),
        story_q("ch-m09", m, ["Tabungan Ani awalnya Rp30.000.", "Setiap minggu ia menabung Rp10.000.",
                             "Sekarang tabungannya Rp90.000."],
                "Sudah berapa minggu Ani menabung?", "30000 + 10000*x = 90000", "minggu",
                "Tabungan awal + Rp10.000 × banyak minggu = tabungan sekarang.", "Jadi, Ani sudah menabung {jawaban}."),
        mc("ch-m10", m, "\"Dua kali sebuah bilangan ditambah 5 hasilnya 21.\" Persamaannya adalah …", [
            ({"eq": "2*x + 5 = 21"}, True),
            ({"eq": "2*(x + 5) = 21"}, False, "Yang dikali dua hanya bilangannya, baru setelah itu ditambah 5."),
            ({"eq": "x + 2 + 5 = 21"}, False, "\"Dua kali\" artinya dikali 2, jadi ditulis 2x.")]),
        # ------------------------------------------------ Advanced
        short_solve("ch-a01", a, "3*(x + 2) = 24", "Jabarkan dulu: 3 dikali x dan 3 dikali 2."),
        short_solve("ch-a02", a, "x/4 + 3 = 7", "Kurangi 3 di kedua ruas, lalu kali kedua ruas dengan 4."),
        short_solve("ch-a03", a, "2*(x - 1) = x + 9", "Jabarkan kurungnya, lalu kumpulkan suku x di satu ruas."),
        short_solve("ch-a04", a, "-3*x + 7 = 22", "Kurangi 7 di kedua ruas. Hati-hati saat membagi dengan bilangan negatif."),
        step_question("ch-a05", a, "7*x - 6 = 3*x + 10"),
        step_question("ch-a06", a, "-2*x + 9 = 3"),
        mc("ch-a07", a, "Tia mengubah 4(x + 3) = 20 menjadi 4x + 3 = 20. Apa kesalahannya?", [
            ("4 harus dikalikan ke x dan ke 3", True),
            ("4 seharusnya dikurangkan", False, "Angka di depan kurung artinya dikali, bukan dikurangi."),
            ("Tidak ada kesalahan", False, "Coba jabarkan lagi. Angka 4 dikalikan ke setiap suku di dalam kurung.")]),
        story_q("ch-a08", a, ["Keliling sebuah taman persegi panjang 50 meter.", "Panjang taman itu 15 meter."],
                "Berapa meter lebar taman?", "2*(15 + x) = 50", "meter",
                "Keliling persegi panjang = 2 × (panjang + lebar).", "Jadi, lebar taman {jawaban}."),
        story_q("ch-a09", a, ["Tarif ojek Rp6.000 untuk 2 km pertama.", "Setiap 1 km berikutnya dikenai Rp2.500.",
                             "Ongkos Sinta seluruhnya Rp21.000."],
                "Berapa km yang ditempuh Sinta setelah 2 km pertama?", "6000 + 2500*x = 21000", "km",
                "Tarif 2 km pertama + Rp2.500 × km berikutnya = total ongkos.", "Jadi, Sinta menempuh {jawaban} lagi."),
        story_q("ch-a10", a, ["Sebuah kolam berisi 120 liter air.", "Setiap menit, 8 liter air dibuang.",
                             "Sekarang air di kolam tinggal 40 liter."],
                "Sudah berapa menit air dibuang?", "120 - 8*x = 40", "menit",
                "Isi awal − 8 × banyak menit = sisa air.", "Jadi, air sudah dibuang selama {jawaban}."),
    ]


def build_zones() -> None:
    ZONES_DIR.mkdir(parents=True, exist_ok=True)
    ls = lessons()
    ch = challenge()
    (ZONES_DIR / "learning.json").write_text(json.dumps({"lessons": ls}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ZONES_DIR / "challenge.json").write_text(json.dumps({"questions": ch}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"zones: {len(ls)} materi Learning Zone, {len(ch)} soal Challenge Zone")


S: dict[str, dict] = {d["id"]: d for d in WORLD6_STORIES}
LITERACY: list[dict] = WORLD7_STORIES


def main() -> None:
    builders = {
        1: mission_1, 2: mission_2, 3: mission_3, 4: mission_4, 5: mission_5, 6: mission_6, 7: mission_7,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    for n, build in builders.items():
        problems = build()
        total += len(problems)
        data = {"world": n, **WORLD_META[n], "problems": problems}
        path = OUT_DIR / f"world-{n}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{path.name}: Mission {n:02d} {WORLD_META[n]['title']} — {len(problems)} soal")
    print(f"Total: {total} soal")
    build_zones()


if __name__ == "__main__":
    main()
