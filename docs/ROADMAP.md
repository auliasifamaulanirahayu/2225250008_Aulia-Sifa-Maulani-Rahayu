# Roadmap Pengembangan — MATH-MISSION

## 1. Model pengembangan: ADDIE

| Tahap | Kegiatan | Keluaran | Status |
|---|---|---|---|
| **Analysis** | Analisis kurikulum, analisis siswa (wawancara cognitive load S01), analisis kebutuhan | Ringkasan wawancara, PRD | ✅ sebagian (tambah informan bila memungkinkan) |
| **Design** | Desain pembelajaran, game, konten, UI, arsitektur, instrumen | Dokumen di folder `docs/` | ✅ dokumen ini |
| **Development** | Pembuatan aplikasi per sprint, validasi ahli, revisi | PWA versi uji coba | ⏳ |
| **Implementation** | Uji coba terbatas, lalu uji coba lapangan di kelas VII | Data penggunaan, pre/post-test | ⏳ |
| **Evaluation** | Analisis kevalidan, kepraktisan, efektivitas, beban kognitif | Laporan & revisi akhir | ⏳ |

> Jika dosen pembimbing meminta model lain (mis. 4D atau Plomp), tahap sprint di bawah tetap berlaku dan cukup
> dipetakan ulang.

## 2. Rencana sprint (masing-masing ± 1–2 minggu)

> **Status (13 November 2026):** Sprint 0–5 sudah diimplementasikan sebagai draft v0.1.0 (React + Vite + Supabase +
> Python). 130 uji unit dan uji asap e2e mode demo lulus. Belum dilakukan: uji terhadap proyek Supabase sungguhan,
> uji di HP nyata, Lighthouse, deploy, validasi ahli, dan uji coba siswa (Sprint 6).

### Sprint 0 — Fondasi & PWA shell ✅
- Repo dengan `frontend/` (React + Vite), `supabase/`, `content/`, CI GitHub Actions.
- Manifest, ikon, service worker, halaman `#/install`.
- Router, design token, layout navigasi bawah.
- **Selesai bila**: aplikasi kosong dapat di-install di HP Android dan terbuka offline.

### Sprint 1 — Mesin persamaan & Timbangan Seimbang ✅
- `engine/equation.js` (Fraction, parser, apply, kesetaraan) + uji Vitest.
- `engine/misconceptions.js` untuk M1–M6.
- Komponen `BalanceScale.jsx` (SVG, miring/seimbang).
- `validate_content.py` versi awal.
- **Selesai bila**: 3x − 5 = 16 bisa diselesaikan di timbangan dan salah tanda terdeteksi.

### Sprint 2 — Alur soal 4 tahap & konten Dunia 1–3 ✅
- Layar `problem/Problem.jsx` + `stages.jsx`: Pahami, Modelkan, Selesaikan, Periksa, Tafsirkan, Jelaskan; petunjuk; keypad.
- Contoh lengkap & contoh bertahap.
- Jelaskan ke temanmu.
- Konten Dunia 1–3 (45 soal); Pemanasan dibangkitkan otomatis, lolos validator.
- **Selesai bila**: siswa bisa menamatkan Dunia 1–3 offline.

### Sprint 3 — Misi harian & gamifikasi ✅
- `mission-picker.js`, beranda misi harian, Peta Dunia, syarat buka dunia.
- XP, bintang, level, streak + tameng, lencana, layar hasil, efek suara.
- Profil & pengaturan (FR-20).
- **Selesai bila**: siklus harian berjalan beberapa hari (uji dengan mengubah tanggal perangkat).

### Sprint 4 — Supabase: login, kelas, tim, leaderboard & sinkronisasi ✅ (kode) / ⏳ (uji di Supabase)
- Migrasi SQL: tabel, RLS, trigger pendaftaran & validasi XP, fungsi RPC.
- Login siswa (kode kelas + nama + PIN) & guru (email), Mode Siswa/Guru, outbox → Supabase, cadangan progres.
- Layar Tim & leaderboard.
- **Selesai bila**: 2 HP di kelas yang sama melihat leaderboard tim yang benar setelah online.

### Sprint 5 — Konten Dunia 4–7 & dashboard guru ✅
- Konten Dunia 4–7 (53 soal).
- Dashboard guru: progres, kesalahan per tahap, miskonsepsi, ekspor CSV.
- Fitur Bacakan soal (FR-21).
- **Selesai bila**: bank soal ≥ 98 soal lolos validator; guru bisa mengekspor CSV.

### Sprint 6 — Validasi, uji, deploy ⏳
- Siapkan Supabase, deploy ke Netlify, upload ke GitHub (DEPLOYMENT.md).
- Uji teknis lengkap (TEST_PLAN §2), Lighthouse.
- Validasi ahli materi & media; revisi.
- Uji coba terbatas (5–10 siswa); revisi.
- **Selesai bila**: kriteria rilis PRD §11 terpenuhi.

### Setelah MVP
Uji coba lapangan, analisis data, lalu pertimbangkan: duel real-time, editor soal guru, materi PtLSV,
notifikasi pengingat misi, APK TWA.

## 3. Daftar periksa deliverable
- [x] Repo dengan README, CLAUDE.md, docs/ (siap di-upload ke GitHub)
- [x] PWA bisa di-install & offline (teruji di Chrome headless; belum di HP nyata)
- [x] 7 dunia, 98 soal + pemanasan otomatis
- [x] Skema Supabase + Mode Guru (belum diuji terhadap Supabase sungguhan)
- [ ] Instrumen validasi, kepraktisan, cognitive load, pre/post-test
- [ ] Laporan uji coba
