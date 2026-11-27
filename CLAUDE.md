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
| Frontend | **React 18 + Vite 6**, React Router (HashRouter), **Tailwind CSS** (migrasi bertahap dari CSS biasa; tema galaxy) |
| PWA | `vite-plugin-pwa` (Workbox) |
| Penyimpanan lokal | IndexedDB lewat `idb` |
| Login & database | **Supabase** (`@supabase/supabase-js`): Auth + PostgreSQL + Row Level Security + fungsi RPC |
| AI Tutor | **Google Gemini** (free tier) lewat **Supabase Edge Function**; API key hanya di server. Wajib ada fallback tanpa AI |
| Tooling | **Python 3.11+**: SymPy (generator & validator soal), ekspor penelitian (pustaka standar) |
| Uji | Vitest (unit), puppeteer-core (uji asap e2e dengan Chrome/Edge terpasang) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

Tidak ada server backend sendiri selain Supabase Edge Functions. Jangan menambah framework UI lain, pustaka state global,
atau pustaka CSS lain (selain Tailwind) tanpa persetujuan user: bundel harus tetap kecil (NFR-02 < 500 KB; saat ini ± 205 KB gzip).

### Keputusan ketentuan baru (2026-11-27)
- **Login**: siswa memakai nama panggilan + kode kelas + password (Supabase Auth asli, email sintetis); lupa password
  siswa direset guru. Guru memakai email + password + lupa password via email. Tidak boleh ada login palsu.
- **Tailwind**: halaman baru langsung Tailwind; halaman lama dipindah sambil didesain ulang ke tema galaxy.
  Warna: Deep Navy `#080B2A`, Dark Blue `#111A52`, Royal Blue `#3156D9`, Purple `#7652D8`, Neon Cyan `#52D9FF`,
  White `#F5F7FF`. Glow dan animasi secukupnya; layar soal tetap bersih (aturan pedagogis 9).
- **Database**: pertahankan tabel yang ada; tambahkan migrasi baru hanya untuk yang belum ada (mis. `ai_chat_sessions`,
  `ai_chat_messages`). Pemetaan nama tabel di ketentuan → tabel yang ada didokumentasikan di `docs/DATA_MODEL.md`.
- **AI Tutor**: Gemini via Edge Function, pesan dikirim tanpa identitas siswa, pembahasan lengkap hanya sesuai aturan 6
  dan ada fallback ke petunjuk bawaan bila kuota habis atau offline.
- **Musik/suara**: musik latar bertema luar angkasa, tidak otomatis berbunyi, bisa dinyalakan/dimatikan, volume
  diatur; efek suara diatur terpisah.
- **Mission Map**: 7 misi sesuai ketentuan — 01 Mengenal PLSV, 02 Memahami Variabel, 03 Mengenali Informasi dalam Soal,
  04 Soal Cerita → Persamaan, 05 Menyelesaikan Persamaan, 06 Memahami Perubahan Tanda, 07 Tantangan PLSV. Soal lama
  dipindah ke misi yang cocok lewat `build_worlds.py`; unlock berurutan.
- **Zona**: Learning Zone (8 materi kecil, satu bagian per layar; materi n terbuka setelah materi n−1 tuntas, jadi
  "Perubahan Tanda" baru terbuka setelah "Operasi pada Kedua Ruas"), Challenge Zone (Easy/Medium/Advanced, 10 soal
  per level; soal cerita tetap ada Periksa), AI Tutor.
- **Chat AI Tutor** disimpan di database; dapat dibaca siswa pemiliknya dan guru kelasnya (siswa diberi tahu di layar).
- **Deployment**: Vercel atau Netlify, harus bisa dibuka di browser desktop dan HP.

## Struktur folder (ringkas)
```
content/worlds/*.json        DIHASILKAN oleh content/tools/build_worlds.py — jangan diedit manual
content/zones/*.json         Learning Zone (8 materi) & Challenge Zone (30 soal); juga DIHASILKAN build_worlds.py
content/tools/               build_worlds.py, validate_content.py, export_research.py
supabase/migrations/         skema SQL; perubahan skema = file migrasi BARU (0003_..., dst.)
supabase/functions/ai-tutor/  Edge Function AI Tutor (Gemini; satu-satunya tempat GEMINI_API_KEY)
frontend/src/engine/         logika murni (tanpa React, DOM, atau jaringan) — wajib diuji
frontend/src/components/     ui.jsx, Keypad.jsx, BalanceScale.jsx, GalaxyArt.jsx (planet), TutorChat.jsx
frontend/src/screens/        Auth, Student, Team, Profile, Settings, Teacher, problem/{Problem,stages}.jsx
frontend/src/lib/            supabase.js, auth.js, tutor.js (panggil Edge Function)
frontend/src/music.js        musik latar WebAudio; sound.js = efek suara
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
- Perubahan aturan XP harus sama di `engine/xp.js` (`STAGE_XP`, `MISSION_XP`, `ZONE_XP`) dan trigger `clamp_attempt`
  (SQL; versi terbaru di `0003_zones.sql`).
- Logika langkah baku harus sama di `engine/equation.js → nextStep` dan `build_worlds.py → gen_steps`.
- Python: type hints, fungsi kecil.
- Jangan menyimpan rahasia di repo. `.env` diabaikan git; contoh di `frontend/.env.example`. Kunci `service_role`
  Supabase tidak boleh ada di frontend.

## Aturan pedagogis (tidak boleh dilanggar)
1. **Satu tahap per layar**: Pahami → Modelkan → Selesaikan → Periksa (→ Tafsirkan) → Jelaskan (FR-05). Alur 5 tahap
   ini wajib untuk **Misi Utama**. Challenge Zone boleh format cepat (pilihan ganda, isian, menentukan langkah), satu soal
   per layar.
2. Operasi diajarkan sebagai **"lakukan hal yang sama pada kedua ruas"**. "Pindah ruas"/perubahan tanda hanya diajarkan
   sebagai jalan pintas hasil operasi kedua ruas, mulai **Mission 06 (Perubahan Tanda)**.
3. Setiap dunia dimulai dengan **contoh lengkap**, lalu **contoh bertahap**, lalu soal mandiri (FR-07).
4. Tahap **Periksa (substitusi)** wajib sebelum soal selesai (FR-10), termasuk soal cerita di Challenge Zone.
5. Umpan balik salah menjelaskan **mengapa**, maksimal 2 kalimat, tidak menyalahkan ("Hampir! …").
6. Petunjuk bertingkat; petunjuk bawaan tidak pernah memberi jawaban akhir soal itu. **AI Tutor** boleh memberi
   pembahasan lengkap hanya jika siswa **sudah mencoba menjawab DAN meminta pembahasan**; soal Misi Utama yang dibahas AI
   tetap selesai tetapi tanpa bintang/XP penuh.
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
