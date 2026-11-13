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
2. **SQL Editor → New query** → tempel seluruh isi `supabase/migrations/0001_init.sql` → **Run**. Pastikan tidak ada error.
3. **Authentication → Sign In / Providers → Email**:
   - aktifkan **Email** provider;
   - **matikan "Confirm email"** (wajib: akun siswa memakai email sintetis yang tidak bisa menerima email);
   - panjang password minimum biarkan **6** (PIN siswa 6 angka).
4. **Authentication → URL Configuration**: isi *Site URL* dengan URL Netlify (mis. `https://math-mission.netlify.app`).
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
