# Ringkasan Wawancara Cognitive Load — Informan S01

| | |
|---|---|
| Pewawancara | Aulia Sifa Maulani Rahayu (2225250008) |
| Informan | S01 — belajar PLSV di kelas VII semester 1, tahun 2025 |
| Waktu & tempat | Sabtu, 7 November 2026; rumah siswa; ± 20 menit |
| Persetujuan | Lisan, orang tua dan siswa |
| Bahan pemicu | Lembar kerja 5 soal PLSV yang pernah dikerjakan; buku *Matematika SMP/MTs Kelas VII* (Dicky Susanto, dkk., 2022) |
| Tujuan | Merekonstruksi bagian yang sulit secara konsep, penyajian yang membingungkan, dan aktivitas yang membantu paham sebagai dasar perancangan aplikasi |

Kode: **IL** intrinsic · **EL** extraneous · **GL** germane · **K** konteks/prasyarat · **DS** desain aplikasi.
Dokumen lengkap (dengan foto dokumentasi) disimpan terpisah di file PDF laporan wawancara; foto tidak
disalin ke repo.

## Temuan per kode

| Kode | Kutipan inti (dirapikan) | CLT | Implikasi desain |
|---|---|---|---|
| S1 | Belajar PLSV semester 1 kelas 7 | K | Sasaran kelas VII |
| S2 | Ingat bentuk persamaan dengan huruf x, y, z | IL | Bentuk simbolik sudah dikenal; makna variabel perlu diperkuat |
| S3 | Ingat soal membeli buku dan pulpen | IL | Konteks belanja familier |
| K1 | Awalnya bingung huruf dan angka bersamaan; paham karena bertanya ke guru & teman | IL, GL | Kotak misteri; petunjuk bertingkat |
| K2 | Guru menjelaskan lewat LKS, contoh, latihan; saya mengikuti langkah contoh | EL, GL | Worked → faded example |
| K3 | Ragu memindahkan ruas & menghitung; lupa perubahan tanda | IL | Timbangan Seimbang; deteksi M1 |
| A1 | Paling sulit: soal cerita, perhitungan, pindah ruas dan tanda | IL | Alur 4 tahap |
| A2 | Harus memahami cerita, mengubah ke matematika, menentukan yang dipindah | IL | Segmentasi satu tahap per layar |
| A3 | Perlu menguasai penjumlahan, perkalian, pembagian | K | Pemanasan prasyarat |
| A4 | Makin sulit ketika cerita makin panjang | IL | Panjang cerita bertahap |
| A5 | Salah karena belum bisa membaca soal & mengubah ke matematika; bingung simbol | IL | Tahap Pahami & Modelkan terpandu; glosarium simbol |
| B1 | Bingung bila soal berbeda dari contoh | IL, GL | Variasi konteks bertahap |
| B2 | Belajar dari LKS/teks & penjelasan guru | EL | Tambah representasi visual interaktif |
| B3 | Tidak ada tampilan yang mengganggu | EL | Pertahankan koherensi |
| B4 | Kecepatan guru biasa saja | EL | Tempo diatur siswa sendiri |
| B5 | Sulit memahami isi cerita, menjelaskan kembali, dan menulis informasinya | IL | Diketahui/Ditanya terpandu |
| C1 | Paham ketika dijelaskan kembali oleh teman dan guru | GL | Petunjuk, Jelaskan ke temanmu |
| C2 | Tahu benar/salah setelah dikoreksi guru | GL | Cek substitusi & umpan balik langsung |
| C3 | Terbantu belajar & mengerjakan bersama teman | GL | Tim & Tantangan Tim |
| C4 | Pernah menjelaskan ke teman, hanya soal mudah | GL | Self-explanation mulai dari soal mudah |
| C5 | Terbantu bila diberi contoh soal dulu | GL | Worked example di awal dunia |
| D1 | Tampilan menarik, ilustrasi berwarna, bahasa SMP, mudah, main bersama teman, banyak contoh & latihan | DS | UI_UX, gamifikasi, bank soal besar |
| D2 | Perlu pelan-pelan: cara memahami soal, lalu langkah perhitungan | DS | Tahap Pahami & Selesaikan paling banyak bantuan |
| D3 | Jangan ada soal/instruksi terlalu panjang | DS | Instruksi ≤ 2 kalimat |

## Artefak lembar kerja (Lampiran A, 21-10-2025, nilai 10)
1. x + 7 = 15 → x = 8
2. 3x − 5 = 16 → 3x = 21 → x = 7
3. 5x + 2 = 2x + 14 → 3x = 12 → x = 4
4. Dina membeli 3 buku tulis dan 1 pulpen Rp4.000, membayar Rp25.000 → 3x + 4.000 = 25.000 → x = Rp7.000
5. Umur kakak 4 tahun lebih tua dari 2 kali umur adik; umur kakak 14 tahun → 2x + 4 = 14 → x = 5 tahun

Catatan: semua jawaban di lembar kerja benar, tetapi pada wawancara siswa menyatakan masih ragu dengan
perpindahan ruas dan tanda. Artinya prosedur dapat diikuti dengan meniru contoh, namun pemahaman konsep
kesetaraan belum mantap. Soal 2–5 diadaptasi menjadi soal di Dunia 3, 4, dan 6 (lihat CONTENT_BANK §5).

## Keterbatasan
- Satu informan; temuan bersifat eksploratif. Disarankan menambah 2–4 informan dengan kemampuan berbeda
  (tinggi/sedang/rendah) sebelum desain dikunci.
- Wawancara retrospektif (± 1 tahun setelah belajar) sehingga bergantung pada ingatan siswa.
