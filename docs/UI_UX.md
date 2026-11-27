# Desain UI/UX — MATH-MISSION

## 1. Prinsip

1. **Mobile-first**: dirancang untuk 360×640 px, lalu diperluas ke tablet/laptop (kolom tengah maks. 480 px,
   dashboard guru memakai lebar penuh).
2. **Satu layar, satu tugas**: satu aksi utama per layar, tombol utama selalu di bawah (zona jempol).
3. **Bahasa SMP**: kalimat pendek, sapaan "kamu", tanpa istilah yang belum dikenalkan (D1, D3).
4. **Menarik tapi tidak mengganggu**: warna cerah dan ilustrasi di beranda, peta, kartu cerita, dan layar hasil;
   layar soal tetap bersih (koherensi).
5. **Ramah kesalahan**: tidak ada warna merah besar atau suara keras saat salah; pesan "Hampir!" + petunjuk.

## 2. Tema galaxy & design token

Gaya ditulis dengan **Tailwind CSS v4** (`styles/tailwind.css`, tanpa preflight) di atas CSS lama
(`styles/main.css`, layer `legacy`). Halaman baru memakai utility Tailwind; halaman lama dipindah bertahap.
Semua warna berasal dari custom properties di `main.css`, jadi Tailwind dan CSS lama selalu memakai tema yang sama.

Palet galaxy: Deep Navy `#080B2A`, Dark Blue `#111A52`, Royal Blue `#3156D9`, Purple `#7652D8`,
Neon Cyan `#52D9FF`, White `#F5F7FF` (utility Tailwind: `bg-galaxy-navy`, `text-galaxy-cyan`, dst.).

| Token | Galaxy (bawaan) | Terang | Pemakaian |
|---|---|---|---|
| `--c-btn` | #3156D9 | #3156D9 | latar tombol utama (teks putih) |
| `--c-primary` | #8EA6FF | #3156D9 | tautan & teks penekanan (Royal Blue dicerahkan agar kontras di latar gelap) |
| `--c-accent` | #52D9FF | #7652D8 | fokus, sorotan, XP |
| `--c-x` | #52D9FF | #3156D9 | variabel x |
| `--c-success` | #5EE6A0 | #2B8A3E | benar, timbangan seimbang |
| `--c-warn` | #FFB26B | #D9480F | hampir/salah (bukan merah) |
| `--c-team` | #B79BFF | #7652D8 | fitur tim |
| `--c-bg` | #080B2A | #F5F7FF | latar |
| `--c-surface` | #111A52 | #FFFFFF | kartu |
| `--c-text` | #F5F7FF | #111A52 | teks |

- Galaxy adalah tema bawaan; tema terang dipilih lewat `data-theme="light"` pada `<html>` (Pengaturan).
- Efek glow dan animasi secukupnya: bintang berkelip, planet melayang, dan fade-in hanya di landing page, beranda,
  dan peta. **Layar soal tanpa animasi dekoratif** (aturan pedagogis 9). Semua animasi mati bila pengguna memilih
  `prefers-reduced-motion`.
- Kode warna konsisten: **x selalu biru/cyan**, konstanta abu-abu tua, bilangan negatif oranye (sama di timbangan & simbol).
- Tipografi: "Nunito" (Google Fonts, fallback `system-ui, sans-serif`); teks dasar 18 px, soal 20 px, persamaan
  24 px dengan font monospace angka tabular.
- Target sentuh ≥ 48×48 px; jarak antar tombol ≥ 8 px.
- Kontras teks ≥ 4,5:1 (WCAG AA). Mode kontras tinggi dan ukuran huruf besar di Pengaturan.

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
**tingkat kesalahan per tahap**, tabel miskonsepsi terbanyak, tabel siswa (misi, streak, tahap terlemah),
tombol "Bagi tim otomatis", "Atur tantangan", "Ekspor CSV".

### Pengaturan (`#/settings`)

Kartu-kartu bertumpuk: **Profil** (nama panggilan, pilih avatar) → **Musik latar** (saklar, volume, "musik saat
mengerjakan soal") → **Efek suara** (saklar, volume; bunyi contoh saat slider dilepas) → **Tema & tampilan**
(Galaxy/Terang, ukuran huruf, kontras tinggi) → **Informasi aplikasi** → **Akun** (keluar).

Audio:
- Musik dibangkitkan WebAudio (`src/music.js`, tanpa file: hemat kuota, jalan offline). Bawaan **mati**; tidak pernah
  berbunyi sendiri. Bila sudah dinyalakan, musik baru mulai setelah sentuhan pertama (aturan autoplay browser).
- Musik otomatis **berhenti di layar soal dan Pemanasan** (prinsip koherensi: musik latar menambah beban
  ekstrinsik), kecuali siswa menyalakan "Musik saat mengerjakan soal".
- Volume musik dan efek suara diatur terpisah.

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
