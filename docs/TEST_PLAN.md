# Rencana Pengujian — MATH-MISSION

## 1. Ruang lingkup
1. **Uji teknis**: aplikasi berjalan benar, cepat, offline, dan aman.
2. **Uji produk/penelitian**: kevalidan (ahli), kepraktisan (siswa & guru), efektivitas (literasi matematika),
   dan beban kognitif.

## 2. Uji teknis

### 2.1 Uji unit
| Bagian | Alat | Kasus wajib |
|---|---|---|
| `engine/equation.js` | Vitest | parse `3x-5=16`, `16=3x-5`, `2(x+3)=18`, `x/4+2=5`, `-x=4`; operasi kedua ruas; pecahan tanpa galat |
| `engine/checker.js` | Vitest | langkah setara tapi beda dari kunci dianggap benar; langkah tidak setara salah |
| `engine/misconceptions.js` | Vitest | setiap M1–M8 dikenali pada contoh di LEARNING_DESIGN §6 |
| `engine/mission-picker.js` | Vitest | 3 misi per hari, tidak berubah saat dibuka ulang di hari sama, berganti di hari baru |
| `engine/xp.js` | Vitest | XP, bintang, level, streak, tameng |
| Bank soal di mesin JS | Vitest | ke-98 soal diselesaikan ulang; langkah konten = hasil `applyOp`; tepat 1 pilihan persamaan benar |
| Keypad, email sintetis, isian angka | Vitest | `tests/app.test.js` |
| `store/sync.js` | manual / Supabase uji | outbox tetap saat gagal kirim; tidak dobel saat kirim ulang (`client_id`) |
| Kebijakan RLS Supabase | manual (2 akun siswa + 2 akun guru) | siswa tidak bisa membaca data siswa lain; guru tidak bisa membuka kelas guru lain; XP > batas dicatat 0 |
| Konten | `validate_content.py` | seluruh soal lolos (CONTENT_BANK §4) |

Status 13 November 2026: **130 uji Vitest lulus**, validator: **98 soal OK**.

### 2.2 Uji end-to-end (`npm run e2e`, puppeteer-core, viewport 390×844)
Sudah otomatis (mode demo) dan **lulus**:
1. Layar awal Mode Siswa/Guru → mode demo → beranda misi harian.
2. Contoh lengkap → Jelaskan → layar hasil.
3. Salah tanda di 3x − 5 = 16 → umpan balik M1 + timbangan miring; lalu selesai sampai Periksa & Jelaskan.
4. Soal cerita (Dina, lembar kerja S01) lengkap 5 tahap, termasuk umpan balik salah pilih arti x.
5. Timbangan mode operasi; Pemanasan 5 soal.
6. Service worker aktif; aplikasi dibuka ulang **offline** dan progres tetap ada.

Masih manual (butuh Supabase): daftar guru → buat kelas → daftar 2 siswa → bagi tim → kerjakan Misi Utama → leaderboard
dan Tantangan Tim bertambah → ekspor CSV → hapus siswa.

### 2.3 Uji perangkat nyata
| Perangkat | OS/Browser | Yang diuji |
|---|---|---|
| Android RAM 2–3 GB | Chrome | install, offline, performa timbangan, keypad |
| Android menengah | Chrome | idem |
| Android lain (mis. Samsung Internet) | Samsung Internet | install & tampilan |
| iPhone | Safari iOS 16.4+ | Tambahkan ke Layar Utama, penyimpanan offline |
| Laptop | Chrome/Edge | dashboard guru |

### 2.4 Kinerja, aksesibilitas, keamanan
- Lighthouse (mode mobile): Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90, PWA installable.
- Muat pertama < 3 detik pada throttling "Fast 3G".
- Uji keamanan dasar: siswa tidak bisa membaca data kelas lain; rate limit login; PIN tersimpan dalam hash;
  CSV tidak memuat nickname.

### 2.5 Uji kotak hitam (black box)
Tabel skenario per FR (FR-01 s.d. FR-21) dengan kolom: skenario, langkah, hasil yang diharapkan, hasil, status.
Tabel ini juga dapat dilampirkan pada laporan penelitian.

## 3. Uji produk (penelitian)

### 3.1 Validasi ahli
| Validator | Aspek | Instrumen |
|---|---|---|
| Ahli materi (dosen/guru matematika) | kesesuaian CP/TP, kebenaran konsep, kesesuaian soal dengan literasi matematika, bahasa | Angket skala Likert 1–4/1–5 |
| Ahli media | tampilan, navigasi, interaktivitas, kemudahan, kinerja di HP | Angket skala Likert |
| Ahli pembelajaran (opsional) | kesesuaian sintaks PBL dan prinsip cognitive load | Angket skala Likert |

Kriteria: persentase skor ≥ 61% layak, ≥ 81% sangat layak (sesuaikan dengan acuan yang dipakai pembimbing).

### 3.2 Uji kepraktisan
- **Siswa**: angket kemudahan penggunaan, kemenarikan, kejelasan bahasa (mengacu dimensi usability, mis. adaptasi SUS
  dengan bahasa sederhana).
- **Guru**: angket keterpakaian dashboard dan kesesuaian dengan pembelajaran di kelas.

### 3.3 Beban kognitif
- Instrumen: adaptasi kuesioner **Leppink dkk. (2013)** — 10 butir, skala 0–10: 3 butir IL, 3 butir EL, 4 butir GL,
  diterjemahkan dan disederhanakan untuk siswa SMP (uji keterbacaan dulu).
- Diberikan setelah sesi Dunia 3 dan Dunia 6.
- Didukung data log aplikasi: waktu per tahap, petunjuk dipakai, tahap dengan kesalahan terbanyak.
- Wawancara lanjutan singkat dengan beberapa siswa memakai panduan yang sama dengan wawancara S01
  (kode S, K, A, B, C, D) untuk membandingkan sebelum/sesudah.

### 3.4 Efektivitas literasi matematika
- **Pre-test dan post-test** 5–8 soal uraian PLSV kontekstual dengan indikator literasi (merumuskan, menerapkan,
  menafsirkan & mengevaluasi). Soal tes **tidak** sama dengan soal di aplikasi.
- Instrumen divalidasi ahli dan diuji reliabilitasnya.
- Analisis: uji normalitas, uji t berpasangan (atau Wilcoxon), dan **N-gain**.
- Desain: one group pretest-posttest; bila memungkinkan kelas pembanding.

### 3.5 Uji coba
1. **Uji coba perorangan/terbatas**: 3–10 siswa, observasi langsung, catat kebingungan → revisi.
2. **Uji coba lapangan**: 1 kelas VII selama ± 2 minggu misi harian → angket, pre/post-test, log.

## 4. Pelaporan bug
Template issue: perangkat & browser, langkah, hasil yang diharapkan, hasil aktual, tangkapan layar.
Prioritas: P1 (data hilang/aplikasi tak bisa dibuka), P2 (fitur utama salah), P3 (tampilan).
