"""Ekspor data percobaan anonim dari Supabase ke CSV + ringkasan per tahap (untuk analisis penelitian).

Butuh dua variabel lingkungan (JANGAN di-commit, JANGAN dipakai di frontend):
    SUPABASE_URL               mis. https://xxxx.supabase.co
    SUPABASE_SERVICE_ROLE_KEY  Project Settings → API → service_role

Contoh (PowerShell):
    $env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
    python content/tools/export_research.py --list
    python content/tools/export_research.py --class-code K7B3QZ --out data-k7b3qz.csv

Hanya kelas dengan "Mode penelitian" aktif yang bisa diekspor. Data tidak memuat nama panggilan.
Hanya memakai pustaka standar Python.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import statistics
import sys
import urllib.parse
import urllib.request
from collections import Counter, defaultdict

PAGE = 1000
COLUMNS = ["anon_id", "research_code", "team", "problem_id", "world", "stage", "correct",
           "misconception_code", "hints_used", "attempt_no", "duration_ms", "stars", "client_time"]


def env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        sys.exit(f"Variabel lingkungan {name} belum diisi. Lihat petunjuk di bagian atas file ini.")
    return v.rstrip("/")


def get(path: str, params: dict[str, str], range_from: int | None = None) -> list[dict]:
    url = f"{env('SUPABASE_URL')}/rest/v1/{path}?{urllib.parse.urlencode(params, safe='(),.!*:')}"
    key = env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"}
    if range_from is not None:
        headers["Range-Unit"] = "items"
        headers["Range"] = f"{range_from}-{range_from + PAGE - 1}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as res:  # noqa: S310 (URL dari konfigurasi peneliti)
        return json.loads(res.read().decode("utf-8"))


def list_classes() -> None:
    rows = get("classrooms", {"select": "id,name,code,research_mode", "order": "id"})
    for r in rows:
        flag = "penelitian AKTIF" if r["research_mode"] else "penelitian nonaktif"
        print(f"{r['code']}  {r['name']:<20} ({flag})")


def fetch_attempts(class_id: int) -> list[dict]:
    select = ("problem_id,world,stage,correct,misconception_code,hints_used,attempt_no,duration_ms,stars,client_time,"
              "profiles!inner(anon_id,research_code,classroom_id,teams(name))")
    out: list[dict] = []
    start = 0
    while True:
        page = get("attempts", {"select": select, "profiles.classroom_id": f"eq.{class_id}",
                                "order": "client_time"}, range_from=start)
        for a in page:
            prof = a.pop("profiles")
            out.append({
                "anon_id": prof["anon_id"],
                "research_code": prof.get("research_code") or "",
                "team": (prof.get("teams") or {}).get("name", ""),
                **a,
            })
        if len(page) < PAGE:
            return out
        start += PAGE


def summary(rows: list[dict]) -> None:
    stages = defaultdict(list)
    for r in rows:
        stages[r["stage"]].append(r)
    print("\nRingkasan per tahap (tingkat kesalahan, median waktu):")
    for st in ("understand", "model", "solve", "check", "interpret", "explain", "warmup"):
        xs = stages.get(st)
        if not xs:
            continue
        err = sum(not x["correct"] for x in xs) / len(xs)
        med = statistics.median(x["duration_ms"] for x in xs) / 1000
        print(f"  {st:<11} n={len(xs):<5} salah={err:6.1%}  median={med:6.1f} dtk")
    mis = Counter(r["misconception_code"] for r in rows if r["misconception_code"])
    if mis:
        print("Miskonsepsi:", ", ".join(f"{k}={v}" for k, v in mis.most_common()))
    print("Siswa unik:", len({r["anon_id"] for r in rows}))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--list", action="store_true", help="tampilkan daftar kelas")
    ap.add_argument("--class-code", help="kode kelas 6 karakter")
    ap.add_argument("--out", default="attempts.csv", help="nama file CSV keluaran")
    args = ap.parse_args()
    if args.list:
        return list_classes()
    if not args.class_code:
        ap.error("isi --class-code atau --list")
    cls = get("classrooms", {"select": "id,name,research_mode", "code": f"eq.{args.class_code.upper()}"})
    if not cls:
        sys.exit("Kode kelas tidak ditemukan.")
    if not cls[0]["research_mode"]:
        sys.exit("Mode penelitian belum aktif untuk kelas ini. Aktifkan dari dashboard guru setelah ada persetujuan.")
    rows = fetch_attempts(cls[0]["id"])
    with open(args.out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} baris ditulis ke {args.out} (kelas {cls[0]['name']}).")
    summary(rows)


if __name__ == "__main__":
    main()
