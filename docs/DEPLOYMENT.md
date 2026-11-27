# Deployment & Instalasi — MATH-MISSION

## 1. Ringkasan
| Bagian | Layanan gratis | Catatan |
|---|---|---|
| Frontend PWA (React) | **Netlify** (utama) atau Vercel / GitHub Pages | HTTPS otomatis — **wajib** agar PWA bisa di-install |
| Login + database | **Supabase** (Free plan) | Auth + PostgreSQL + RLS; tidak perlu server sendiri |
| Kode | **GitHub** | CI otomatis memvalidasi soal, menjalankan uji, dan build |

Catatan: proyek Supabase gratis bisa dijeda bila tidak dipakai beberapa hari. Aplikasi tetap bisa dimainkan offline;
aktifkan kembali proyek dari dashboard Supabase sebelum uji coba. Batas layanan gratis dapat berubah — periksa halaman
harga masing-masing.

## 2. Menjalankan di laptop
```bash
# 1. bank soal (Python 3.11+)
pip install -r content/requirements.txt
python content/tools/build_worlds.py      # hanya bila mengubah soal
python content/tools/validate_content.py

# 2. aplikasi (Node.js 20+)
cd frontend
npm install
copy .env.example .env                    # Linux/Mac: cp .env.example .env  → isi kunci Supabase
npm run dev                               # http://localhost:5173 (juga bisa dibuka dari HP di Wi-Fi yang sama)
npm test                                  # uji unit
npm run build && npm run preview          # uji versi produksi + service worker (http://localhost:4173)
npm run e2e                               # uji asap di viewport HP (preview harus berjalan)
```
Tanpa file `.env`, aplikasi berjalan dalam **mode demo siswa** (tanpa login, tanpa tim, tanpa Mode Guru).

## 3. Menyiapkan Supabase (sekali saja)
1. Buat akun di supabase.com → **New project** (pilih region Singapore agar cepat dari Indonesia). Simpan password database.
2. **SQL Editor → New query** → jalankan **berurutan**, satu tab per file: `0001_init.sql`, `0002_ai_tutor.sql`,
   `0003_zones.sql`, `0004_grants.sql`. Setiap file harus menghasilkan *Success. No rows returned*.
   `0004` wajib untuk proyek Supabase baru: tanpa GRANT, login berhasil tetapi muncul *permission denied for table
   profiles*.
3. **Authentication → Sign In / Providers → Email**:
   - aktifkan **Email** provider;
   - **matikan "Confirm email"** (wajib: akun siswa memakai email sintetis yang tidak bisa menerima email);
   - panjang password minimum biarkan **6** (PIN siswa 6 angka).
4. **Authentication → URL Configuration**: isi *Site URL* dengan URL Netlify (mis. `https://math-mission.netlify.app`),
   lalu tambahkan URL yang sama ke **Redirect URLs** (tanpa `#`). Ini dipakai tautan **lupa password guru**: email
   reset membuka aplikasi, lalu aplikasi menampilkan halaman *Buat password baru* (`#/reset-password`).
   Siswa tidak memakai email, jadi lupa PIN siswa diatasi oleh guru.
5. **Project Settings → API**: salin **Project URL** dan kunci **anon public** ke `frontend/.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   Kunci **service_role** JANGAN dimasukkan ke frontend atau repo; hanya untuk `export_research.py` di laptop peneliti.
6. Uji: buka aplikasi → Mode Guru → Daftar → buat kelas → catat kode kelas → di browser/HP lain: Mode Siswa → Daftar
   dengan kode itu.

## 4. Upload ke GitHub
```bash
git init
git add .
git commit -m "MATH-MISSION: draft aplikasi"
git branch -M main
git remote add origin https://github.com/<akun>/math-mission.git
git push -u origin main
```
`.gitignore` sudah mengecualikan `node_modules`, `dist`, `.env`, file CSV data siswa, dan PDF (laporan wawancara berisi
foto siswa). Periksa `git status` sebelum commit pertama.

## 5. Deploy frontend ke Netlify
1. Netlify → **Add new site → Import an existing project** → pilih repo GitHub.
2. Pengaturan build sudah ada di `netlify.toml` (base `frontend`, perintah `npm ci && npm run build`, publish `dist`).
3. **Site configuration → Environment variables**: tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Setiap `git push` ke `main` akan membangun ulang otomatis.
5. Buka URL produksi di Chrome → DevTools → Lighthouse → pastikan PWA *installable*.

Alternatif **GitHub Pages**: jalankan `npm run build` lalu unggah folder `frontend/dist` (aplikasi memakai `base: './'`
dan HashRouter sehingga berjalan di sub-folder).

## 6. Checklist sebelum uji coba
- [ ] `validate_content.py` lulus, `npm test` lulus, CI GitHub hijau.
- [ ] Migrasi SQL sudah dijalankan; "Confirm email" mati.
- [ ] Uji daftar guru, buat kelas, daftar siswa, bagi tim, atur tantangan, ekspor CSV.
- [ ] Uji install & offline di HP Android nyata dan iPhone.
- [ ] Kode kelas dicetak untuk siswa (bersama QR code ke URL aplikasi).
- [ ] Backup: Supabase → Database → Backups (atau ekspor CSV) sebelum dan sesudah uji coba.

## 7. Panduan install untuk siswa (dibagikan sebagai poster/QR code)

### Android (Chrome)
1. Buka link MATH-MISSION (scan QR code) di **Chrome**.
2. Ketuk **"Pasang sekarang"** di halaman Pasang aplikasi, atau menu **⋮ → Instal aplikasi / Tambahkan ke layar utama**.
3. Ketuk **Instal**. Ikon MATH-MISSION muncul di layar HP.
4. Buka, pilih **Mode Siswa → Daftar**, isi kode kelas, nama panggilan, dan PIN 6 angka.
5. Setelah dibuka sekali saat online, aplikasi bisa dipakai tanpa internet.

### iPhone (Safari)
1. Buka link di **Safari**.
2. Ketuk **Bagikan** (kotak dengan panah ke atas) → **Tambahkan ke Layar Utama** → **Tambah**.
3. Buka dari ikon di layar utama.

### Laptop
Buka link di Chrome/Edge → klik ikon pasang di bilah alamat, atau langsung pakai di browser.

## 8. Opsional: file APK tanpa Play Store
1. Buka **PWABuilder** (pwabuilder.com), masukkan URL produksi.
2. Pilih paket **Android** → unduh APK (Trusted Web Activity).
3. Letakkan `assetlinks.json` yang diberikan di `frontend/public/.well-known/` lalu deploy ulang.
4. Bagikan APK; siswa perlu mengizinkan **"Instal aplikasi tidak dikenal"**.

PWA tetap cara utama karena pembaruan otomatis dan tidak perlu izin tambahan.

## 9. Ekspor data penelitian (Python)
```powershell
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."     # rahasia
python content/tools/export_research.py --list
python content/tools/export_research.py --class-code K7B3QZ --out data-7b.csv
```
Hasil: CSV anonim + ringkasan tingkat kesalahan dan median waktu per tahap.

## AI Math Tutor (opsional, Groq)

1. Jalankan migrasi `0002_ai_tutor.sql` (dan `0004_grants.sql`) di SQL Editor.
2. Buat API key di **console.groq.com** → *API Keys* → *Create API Key* (akun pengembang harus 18+; siswa tidak
   memakai Groq langsung). Cek kuota gratis di *Settings → Limits*.
3. **Pasang function lewat dashboard** (tanpa CLI): Supabase → Edge Functions → *Deploy a new function* → *Via Editor*
   → nama `ai-tutor` → tempel isi `supabase/functions/ai-tutor/index.ts` → *Deploy function*.
   Di *Settings* function: **matikan "Verify JWT with legacy secret"** (proyek baru menandatangani token dengan kunci
   baru; function memeriksa siswa sendiri lewat `auth.getUser`).
4. Supabase → Edge Functions → **Secrets**: `GROQ_API_KEY=<kunci>`; opsional `GROQ_MODEL=openai/gpt-oss-20b`,
   `AI_DAILY_LIMIT=30` (turunkan, mis. 10, bila kuota gratis cepat habis). Kunci **tidak** ditaruh di `frontend/.env`.
   Alternatif CLI: `supabase secrets set GROQ_API_KEY=<kunci>` lalu `supabase functions deploy ai-tutor`.
5. Mode Guru → kelas → nyalakan **🤖 AI Tutor (Groq)** setelah ada izin sekolah/orang tua.
6. Tanpa langkah 2–5, atau saat kuota habis (HTTP 429), tutor tetap berjalan sebagai **tutor bawaan** (tanpa AI).

Catatan privasi: lihat [PRIVACY_ETHICS.md §7](PRIVACY_ETHICS.md).

## Learning Zone & Challenge Zone

Jalankan **`supabase/migrations/0003_zones.sql`** di SQL Editor (setelah 0001/0002). Tanpa migrasi ini, server
menolak jawaban Learning Zone dan Challenge Zone (tahap `lesson`/`challenge` belum dikenal), jadi XP-nya belum masuk
leaderboard. Fitur tetap jalan di HP. Jawaban yang ditolak tetap disimpan di HP dan terkirim otomatis setelah migrasi
dijalankan. Data lain (soal misi, cadangan progres) tetap terkirim seperti biasa (`store/sync.js → isPermanentError`).
