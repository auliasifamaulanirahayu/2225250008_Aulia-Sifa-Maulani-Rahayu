# Desain UI/UX — MATH-MISSION

## 1. Prinsip

1. **Mobile-first**: dirancang untuk 360×640 px, lalu diperluas ke tablet/laptop (kolom tengah maks. 480 px,
   dashboard guru memakai lebar penuh).
2. **Satu layar, satu tugas**: satu aksi utama per layar, tombol utama selalu di bawah (zona jempol).
3. **Bahasa SMP**: kalimat pendek, sapaan "kamu", tanpa istilah yang belum dikenalkan (D1, D3).
4. **Menarik tapi tidak mengganggu**: warna cerah dan ilustrasi di beranda, peta, kartu cerita, dan layar hasil;
   layar soal tetap bersih (koherensi).
5. **Ramah kesalahan**: tidak ada warna merah besar atau suara keras saat salah; pesan "Hampir!" + petunjuk.

## 2. Design token (`styles/tokens.css`)

| Token | Terang | Gelap | Pemakaian |
|---|---|---|---|
| `--c-primary` | #3B5BDB (biru) | #748FFC | tombol utama, variabel x |
| `--c-accent` | #F59F00 (kuning-oranye) | #FFC94D | XP, bintang |
| `--c-success` | #2B8A3E | #69DB7C | benar, timbangan seimbang |
| `--c-warn` | #E8590C | #FF922B | hampir/salah (bukan merah) |
| `--c-team` | #9C36B5 | #DA77F2 | fitur tim |
| `--c-bg` | #F8F9FB | #141821 | latar |
| `--c-surface` | #FFFFFF | #1E2430 | kartu |
| `--c-text` | #1F2430 | #E9ECF2 | teks |

- Kode warna konsisten: **x selalu biru**, konstanta abu-abu tua, bilangan negatif oranye (sama di timbangan & simbol).
- Tipografi: "Nunito" (Google Fonts, fallback `system-ui, sans-serif`); teks dasar 18 px, soal 20 px, persamaan
  24 px dengan font monospace angka tabular.
- Target sentuh ≥ 48×48 px; jarak antar tombol ≥ 8 px.
- Kontras teks ≥ 4,5:1 (WCAG AA). Mode kontras tinggi dan ukuran huruf besar di Pengaturan.
- Mendukung tema gelap otomatis (`prefers-color-scheme`).

## 3. Wireframe layar utama

### Beranda — misi harian
```
┌────────────────────────────┐
│ Hai, Raka!    🔥5   Lv 4   │
│ ━━━━━━━━━━━━━━░░░ 140/200XP│
├────────────────────────────┤
│  MISI HARI INI             │
│ ┌────────────────────────┐ │
│ │ ✔ Pemanasan     +10 XP │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ ▶ Misi Utama    +30 XP │ │
│ │   Kantin Kehabisan Uang│ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ 👥 Tantangan Tim +20 XP│ │
│ │   Tim Elang 18/25      │ │
│ └────────────────────────┘ │
├────────────────────────────┤
│  🏠 Misi  🗺 Peta  👥 Tim  👤│
└────────────────────────────┘
```

### Layar soal — tahap 1 Pahami
```
┌────────────────────────────┐
│ ← Misi Utama   ●○○○  💡    │  ← indikator 4 tahap, tombol petunjuk
├────────────────────────────┤
│ [ilustrasi kecil toko]     │
│ Dina membeli 3 buku tulis  │
│ yang harganya sama.        │
│ Dina juga membeli 1 pulpen │
│ seharga Rp4.000.           │
│ ▸ Lanjut baca              │  ← kalimat muncul satu per satu
├────────────────────────────┤
│ Ketuk yang DIKETAHUI:      │
│ [Banyak buku: 3]  [Rp4.000]│
│ [Total: Rp25.000]          │
├────────────────────────────┤
│        [  Lanjut  ]        │
└────────────────────────────┘
```

### Tahap 2 Modelkan
```
┌────────────────────────────┐
│ ← Misi Utama   ●●○○  💡    │
│ Diketahui: 3 buku, Rp4.000,│  ← ringkasan tahap sebelumnya
│ total Rp25.000             │
├────────────────────────────┤
│ x adalah ...               │
│ (•) harga 1 buku tulis     │
│ ( ) banyak buku tulis      │
├────────────────────────────┤
│ Pilih persamaannya:        │
│ [ 3x + 4.000 = 25.000 ]    │
│ [ 3x = 25.000 + 4.000 ]    │
│ [ x + 4.000 = 25.000 ]     │
├────────────────────────────┤
│        [  Lanjut  ]        │
└────────────────────────────┘
```

### Tahap 3 Selesaikan (dengan timbangan)
```
┌────────────────────────────┐
│ ← Misi Utama   ●●●○  💡  ⚖ │
├────────────────────────────┤
│        3x + 4.000 = 25.000 │
│     ┌──────┐   ┌──────┐    │
│     │x x x │   │25.000│    │
│     │4.000 │   │      │    │
│     └──┬───┘   └──┬───┘    │
│        └────▲─────┘        │
├────────────────────────────┤
│ Lakukan pada KEDUA ruas:   │
│ [+]  [−]  [×]  [÷]  [ 4000]│
├────────────────────────────┤
│ Langkahmu:                 │
│ 3x = 21.000         ✔      │
│ x = ▢                      │
├────────────────────────────┤
│ 7 8 9  x  ⌫                │  ← keypad khusus
│ 4 5 6  +  −                │
│ 1 2 3  =  ⁄                │
│ 0  .   [   Cek   ]         │
└────────────────────────────┘
```

### Tahap 4 Periksa
```
┌────────────────────────────┐
│ ← Misi Utama   ●●●●        │
├────────────────────────────┤
│ Masukkan x = 7.000:        │
│ 3 × 7.000 + 4.000 = ▢      │
│ Sama dengan 25.000?  ✔     │
├────────────────────────────┤
│ Apakah Rp7.000 masuk akal  │
│ untuk harga buku tulis?    │
│ [ Ya ]   [ Tidak ]         │
├────────────────────────────┤
│ Jawaban: Jadi, harga 1 buku│
│ tulis adalah Rp[ 7.000 ].  │
├────────────────────────────┤
│        [ Selesai ]         │
└────────────────────────────┘
```
Setelah Selesai: kartu **Jelaskan ke temanmu** (pilih alasan yang benar), lalu layar hasil (bintang, XP, lencana).

### Panel petunjuk
Bottom sheet setengah layar: "Petunjuk 1 dari 3", tombol "Petunjuk berikutnya", tombol "Tutup".

### Tim & leaderboard
```
┌────────────────────────────┐
│ Tim Elang  👥 4            │
│ Tantangan: 25 kali Periksa │
│ ━━━━━━━━━━━━━░░░░  18/25   │
│ [Ayo!] [Keren!] [Semangat!]│
├────────────────────────────┤
│ Peringkat minggu ini (VII B)│
│ 1. Tim Elang     186 XP    │
│ 2. Tim Komodo    171 XP    │
│ 3. Tim Rajawali  150 XP    │
└────────────────────────────┘
```

### Dashboard guru (layar lebar)
Kolom kiri: daftar kelas & kode kelas. Kanan: kartu ringkasan (siswa aktif, rata-rata bintang), grafik batang
**tingkat kesalahan per tahap**, tabel miskonsepsi terbanyak, tabel siswa (dunia, streak, tahap terlemah),
tombol "Bagi tim otomatis", "Atur tantangan", "Ekspor CSV".

## 4. Onboarding
3 kartu: (1) "Kamu Agen Muda MATH-MISSION", (2) "Setiap hari ada 3 misi", (3) "Seimbang si robot akan
membantumu". Lalu pilih **Mode Siswa** atau **Mode Guru**. Mode Siswa: Daftar (kode kelas, nama panggilan, avatar,
PIN 6 angka) atau Masuk. Mode Guru: Masuk/Daftar dengan email. Di beranda siswa ada ajakan
"Pasang aplikasi di HP-mu" (FR-18).

## 5. Aksesibilitas
- Semua tombol punya label teks (bukan hanya ikon) atau `aria-label`.
- Fokus terlihat untuk keyboard; urutan tab logis.
- Animasi dihormati `prefers-reduced-motion`.
- Tombol "🔊 Bacakan" pada kalimat soal (FR-21).
- Informasi tidak hanya lewat warna (✔ / ! di samping warna).

## 6. Panduan teks UI
| Hindari | Pakai |
|---|---|
| "Jawaban salah!" | "Hampir! Coba cek tandanya." |
| "Tentukan himpunan penyelesaian dari persamaan berikut" | "Cari nilai x." |
| "Silakan melakukan sinkronisasi data" | "Progres tersimpan. Akan dikirim saat ada internet." |
| "Error 500" | "Server sedang istirahat. Kamu tetap bisa main." |
