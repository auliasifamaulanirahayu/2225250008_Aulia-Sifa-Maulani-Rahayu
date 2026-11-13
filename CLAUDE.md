# CLAUDE.md — Panduan Pengembangan MATH-MISSION

File ini dibaca Claude Code setiap sesi. Ikuti aturannya saat menulis kode, konten, atau dokumen.

## Tentang proyek
MATH-MISSION adalah **PWA game edukasi PLSV** untuk siswa SMP kelas VII, berbasis **Problem Based Learning** dengan
**misi harian**, untuk memahamkan PLSV dan menumbuhkan **literasi matematika**. Ada **Mode Siswa** dan **Mode Guru**.
Pengguna utama: siswa usia 12–13 tahun dengan **HP Android kelas menengah ke bawah** dan kuota terbatas.

Sumber kebenaran:
- Kebutuhan produk: [PRD.md](PRD.md) (ID `FR-xx`, `NFR-xx`)
- Desain pembelajaran: [docs/LEARNING_DESIGN.md](docs/LEARNING_DESIGN.md)
- Mekanik game: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)
- Konten & skema soal: [docs/CONTENT_BANK.md](docs/CONTENT_BANK.md)
- Arsitektur: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), data: [docs/DATA_MODEL.md](docs/DATA_MODEL.md),
  API Supabase: [docs/API_SPEC.md](docs/API_SPEC.md)
- Tampilan: [docs/UI_UX.md](docs/UI_UX.md)

Jika kode bertentangan dengan dokumen, tanyakan ke user dulu, lalu perbarui dokumen yang relevan.

## Tech stack
| Bagian | Teknologi |
|---|---|
| Frontend | **React 18 + Vite 6**, React Router (HashRouter), CSS biasa dengan custom properties |
| PWA | `vite-plugin-pwa` (Workbox) |
| Penyimpanan lokal | IndexedDB lewat `idb` |
| Login & database | **Supabase** (`@supabase/supabase-js`): Auth + PostgreSQL + Row Level Security + fungsi RPC |
| Tooling | **Python 3.11+**: SymPy (generator & validator soal), ekspor penelitian (pustaka standar) |
| Uji | Vitest (unit), puppeteer-core (uji asap e2e dengan Chrome/Edge terpasang) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

Tidak ada server backend sendiri. Jangan menambah framework UI lain, pustaka state global, atau pustaka CSS tanpa
persetujuan user: bundel harus tetap kecil (NFR-02, saat ini ± 170 KB gzip).

## Struktur folder (ringkas)
```
content/worlds/*.json        DIHASILKAN oleh content/tools/build_worlds.py — jangan diedit manual
content/tools/               build_worlds.py, validate_content.py, export_research.py
supabase/migrations/         skema SQL; perubahan skema = file migrasi BARU (0002_..., dst.)
frontend/src/engine/         logika murni (tanpa React, DOM, atau jaringan) — wajib diuji
frontend/src/components/     ui.jsx, Keypad.jsx, BalanceScale.jsx
frontend/src/screens/        Auth, Student, Team, Profile, Teacher, problem/{Problem,stages}.jsx
frontend/src/lib/            supabase.js, auth.js
frontend/src/store/          db.js (IndexedDB), sync.js (outbox → Supabase)
frontend/src/game.js         misi harian, XP, bintang, lencana, pencatatan percobaan
frontend/src/state.js        state + hook useAppState(); panggil notify() setelah mengubah state
```

## Perintah
```bash
# konten (dari root)
python content/tools/build_worlds.py       # setelah mengubah soal di build_worlds.py
python content/tools/validate_content.py   # wajib lulus

# frontend (dari frontend/)
npm run dev | npm test | npm run build | npm run preview | npm run e2e
```

## Konvensi kode
- JavaScript/JSX ES modules; komponen fungsi + hooks; nama kode **bahasa Inggris**, teks untuk pengguna
  **bahasa Indonesia**.
- `engine/` murni dan diuji (`frontend/tests/engine.test.js` juga menyelesaikan seluruh bank soal).
- Bilangan dalam persamaan memakai `Fraction` (rasional tepat), bukan floating point.
- Semua akses Supabase lewat `lib/supabase.js` (`rpc()`, `friendlyError()`); jangan menyebar kunci atau URL.
- Data siswa ditulis ke IndexedDB dulu, lalu dikirim oleh `store/sync.js`. Layar tidak boleh menunggu jaringan untuk
  bisa dimainkan.
- Perubahan aturan XP harus sama di `engine/xp.js` dan trigger `clamp_attempt` (SQL).
- Logika langkah baku harus sama di `engine/equation.js → nextStep` dan `build_worlds.py → gen_steps`.
- Python: type hints, fungsi kecil.
- Jangan menyimpan rahasia di repo. `.env` diabaikan git; contoh di `frontend/.env.example`. Kunci `service_role`
  Supabase tidak boleh ada di frontend.

## Aturan pedagogis (tidak boleh dilanggar)
1. **Satu tahap per layar**: Pahami → Modelkan → Selesaikan → Periksa (→ Tafsirkan) → Jelaskan (FR-05).
2. Operasi diajarkan sebagai **"lakukan hal yang sama pada kedua ruas"**. "Pindah ruas" hanya disebut sebagai jalan
   pintas, mulai Dunia 3.
3. Setiap dunia dimulai dengan **contoh lengkap**, lalu **contoh bertahap**, lalu soal mandiri (FR-07).
4. Tahap **Periksa (substitusi)** wajib sebelum soal selesai (FR-10).
5. Umpan balik salah menjelaskan **mengapa**, maksimal 2 kalimat, tidak menyalahkan ("Hampir! …").
6. Petunjuk bertingkat; petunjuk tidak pernah memberi jawaban akhir soal itu.
7. Misi Utama **tanpa batas waktu**.
8. Leaderboard menampilkan **tim**, bukan peringkat individu.
9. Tidak ada dekorasi/animasi yang tidak relevan di layar soal (prinsip koherensi).

## Aturan konten
- Bahasa Indonesia sederhana, kalimat cerita ≤ 15 kata, jumlah kalimat sesuai level, instruksi ≤ 2 kalimat (NFR-08).
- Konteks dekat dengan siswa (kantin, angkot, belanja, umur, olahraga, kegiatan sekolah); nama fiktif dan beragam.
- Uang dengan "Rp" dan titik ribuan; jawaban soal cerita harus wajar.
- Tulis soal baru di `content/tools/build_worlds.py`, jalankan generator, lalu **validator wajib lulus**.

## Privasi
- Siswa tidak pernah dimintai email, nomor HP, nama lengkap, atau foto. Login siswa memakai email sintetis.
- Tanpa analytics/iklan pihak ketiga. Ekspor penelitian memakai `anon_id`. Lihat [docs/PRIVACY_ETHICS.md](docs/PRIVACY_ETHICS.md).

## Definisi "selesai"
- Memenuhi FR terkait dan aturan pedagogis di atas.
- `npm test` dan `validate_content.py` lulus; `npm run build` tanpa error.
- Dicek di viewport 360×640 dan berfungsi offline (fitur siswa); `npm run e2e` lulus bila menyentuh alur utama.
- Dokumen terkait diperbarui bila perilaku berubah.
