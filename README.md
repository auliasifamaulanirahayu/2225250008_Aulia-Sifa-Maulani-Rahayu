# MATH-MISSION

**Game edukasi berbasis Problem Based Learning (PBL) dengan misi harian** untuk siswa SMP kelas VII yang mempelajari
**Persamaan Linear Satu Variabel (PLSV)**, untuk memahamkan konsep PLSV dan menumbuhkan **literasi matematika**.

- Berjalan di **browser HP dan laptop**, dioptimalkan untuk HP Android.
- **Bisa di-install tanpa Play Store/App Store** (Progressive Web App).
- **Offline-first**: setelah dibuka sekali, 98 soal bisa dikerjakan tanpa internet; progres dikirim saat online.
- **Mode Siswa** (misi harian, Mission Map 7 misi, timbangan interaktif, XP, lencana, tim) dan **Mode Guru** (kelas, kode kelas,
  tim, tantangan, progres per tahap, miskonsepsi, ekspor CSV penelitian).
- **Login & penyimpanan data di server dengan Supabase**. Siswa masuk dengan kode kelas + nama panggilan + PIN, tanpa email.
- Teknologi: **React + Vite** (frontend), **Supabase** (Auth + PostgreSQL), **Python** (generator & validator soal
  dengan SymPy, ekspor data penelitian).

Pengembang: Aulia Sifa Maulani Rahayu (2225250008), Pendidikan Matematika, Universitas Sultan Ageng Tirtayasa.
Dosen pengampu: Dr. Aan Hendrayana, S.Si., M.Pd.

## Mulai cepat

```bash
# bank soal (Python 3.11+)
pip install -r content/requirements.txt
python content/tools/validate_content.py

# aplikasi (Node.js 20+)
cd frontend
npm install
npm run dev            # buka http://localhost:5173
```
Tanpa pengaturan Supabase, aplikasi berjalan dalam **mode demo**: Mode Siswa dan Mode Guru (dengan kelas contoh)
bisa langsung dicoba tanpa login. Untuk login sungguhan, data siswa nyata, dan tim, ikuti
[docs/DEPLOYMENT.md §3](docs/DEPLOYMENT.md#3-menyiapkan-supabase-sekali-saja) lalu isi `frontend/.env`.

| Perintah (di `frontend/`) | Fungsi |
|---|---|
| `npm run dev` | server pengembangan (bisa dibuka dari HP di Wi-Fi yang sama) |
| `npm test` | 130 uji unit (mesin persamaan, seluruh 98 soal, miskonsepsi, XP, misi harian) |
| `npm run build` / `npm run preview` | build produksi + service worker |
| `npm run e2e` | uji asap di viewport HP memakai Chrome/Edge terpasang |
| `npm run content` | bangun ulang & validasi bank soal (Python) |
| `npm run icons` | buat ulang ikon PWA (Python) |

## Struktur repo

```
content/      bank soal (JSON) + alat Python: build_worlds, validate_content, export_research
supabase/     skema database, RLS, trigger, fungsi RPC (0001_init.sql)
frontend/     aplikasi React + Vite (PWA)
docs/         dokumen perencanaan
PRD.md        kebutuhan produk
CLAUDE.md     panduan pengembangan untuk Claude Code
```

## Dasar perancangan

Desain berangkat dari wawancara cognitive load dengan informan **S01**. Hasilnya: siswa kesulitan **memahami soal
cerita**, **mengubahnya ke bentuk matematika**, dan **memindahkan ruas/mengubah tanda**. Siswa juga bergantung pada
**contoh soal** dan hanya tahu jawabannya benar setelah **dikoreksi guru**. Rincian:
[docs/research/wawancara-S01-ringkasan.md](docs/research/wawancara-S01-ringkasan.md).

## Dokumen

| Dokumen | Isi |
|---|---|
| [PRD.md](PRD.md) | Tujuan, persona, fitur (FR), non-fungsional (NFR), matriks keterlacakan |
| [CLAUDE.md](CLAUDE.md) | Panduan teknis & aturan pengembangan |
| [docs/LEARNING_DESIGN.md](docs/LEARNING_DESIGN.md) | CP & TP, sintaks PBL, literasi matematika, strategi Cognitive Load Theory |
| [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) | Misi harian, Mission Map, XP, lencana, streak, tim, leaderboard |
| [docs/CONTENT_BANK.md](docs/CONTENT_BANK.md) | Peta konten, skema JSON soal, generator & validator |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arsitektur React + Supabase, offline & sinkronisasi |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Tabel Supabase, ERD, RLS |
| [docs/API_SPEC.md](docs/API_SPEC.md) | Auth, tabel, dan fungsi RPC yang dipakai aplikasi |
| [docs/UI_UX.md](docs/UI_UX.md) | Prinsip tampilan, design token, wireframe |
| [docs/ROADMAP.md](docs/ROADMAP.md) | ADDIE, sprint, status pengerjaan |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Uji teknis & pedagogis, instrumen penelitian |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Supabase, GitHub, Netlify, panduan install siswa |
| [docs/PRIVACY_ETHICS.md](docs/PRIVACY_ETHICS.md) | Privasi data anak & etika penelitian |

## Status

**Draft aplikasi (v0.1.0)** — Sprint 0–5 di [ROADMAP](docs/ROADMAP.md) sudah diimplementasikan. Uji unit dan uji asap
mode demo lulus. Login, tim, dan Mode Guru membutuhkan proyek Supabase yang sudah diatur dan **belum diuji terhadap
Supabase sungguhan**. Langkah berikutnya: menyiapkan Supabase, uji di HP nyata, validasi ahli, dan uji coba terbatas.
