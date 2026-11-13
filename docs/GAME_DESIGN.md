# Desain Game — MATH-MISSION

## 1. Konsep inti
Siswa adalah **Agen Muda** di markas **MATH-MISSION**. Setiap hari markas menerima laporan masalah dari warga
Kota Ruas (kota fiktif). Masalah hanya bisa dipecahkan dengan menemukan nilai **Kotak Misteri** (variabel).
Pemandu siswa adalah robot kecil bernama **Seimbang** yang membawa timbangan.

Lingkaran inti (core loop):

```mermaid
flowchart LR
    A[Buka aplikasi] --> B[Lihat 3 misi hari ini]
    B --> C[Kerjakan misi]
    C --> D[Dapat XP, bintang, lencana]
    D --> E[Sumbang poin ke tim]
    E --> F[Lihat peringkat tim & peta dunia]
    F --> B
```

## 2. Misi harian (FR-03)

Setiap hari pukul 00.00 waktu perangkat, 3 misi baru dibuat oleh `mission-picker.js` berdasarkan progres siswa.

| Misi | Isi | Durasi | XP |
|---|---|---|---|
| **Pemanasan** | 5 soal cepat operasi bilangan bulat / satu langkah PLSV | ± 2 menit | 10 |
| **Misi Utama** | 1 masalah PBL dari dunia aktif, alur 4 tahap | ± 7–10 menit | 30 (+10 bila tanpa petunjuk) |
| **Tantangan Tim** | 2 soal dari dunia yang sudah dibuka; poinnya masuk ke target tim minggu ini | ± 5 menit | 20 |

Aturan pemilihan:
- Misi Utama diambil dari dunia aktif, soal yang belum dikerjakan dengan level terendah.
- Jika siswa gagal di tahap yang sama 2 hari berturut-turut, Pemanasan berikutnya berisi soal yang melatih tahap itu
  (mis. soal cepat perubahan tanda).
- Siswa boleh mengerjakan misi tambahan dari Peta Dunia kapan saja (XP tetap didapat, tapi bonus harian hanya sekali).
- Bonus **Misi Lengkap**: +20 XP bila ketiga misi hari itu selesai.

## 3. Peta Dunia (FR-04)

| Dunia | Nama | Topik | Syarat buka |
|---|---|---|---|
| 1 | Desa Kotak Misteri | Variabel & kalimat terbuka | — |
| 2 | Pasar Timbangan | Kesetaraan, operasi pada kedua ruas | 70% soal Dunia 1 selesai |
| 3 | Jembatan Satu Langkah | ax + b = c | 70% soal Dunia 2 selesai |
| 4 | Menara Dua Ruas | Variabel di kedua ruas | 70% soal Dunia 3 selesai |
| 5 | Gua Kurung & Pecahan | Distributif dan pecahan | 70% soal Dunia 4 selesai |
| 6 | Kota Cerita | Pemodelan soal cerita | 70% soal Dunia 5 selesai |
| 7 | Markas Literasi | Masalah literasi kontekstual | 70% soal Dunia 6 selesai |

Syarat buka memakai **soal selesai**, bukan bintang, agar siswa yang sering memakai petunjuk tetap bisa maju.

Setiap dunia: 1 contoh lengkap, 2 contoh bertahap, 12 soal mandiri (Dunia 7: 8 soal literasi). Soal gabungan
"Misi Bos" direncanakan untuk versi berikutnya.

## 4. Poin dan progres (FR-13)

### XP per soal
| Aksi | XP |
|---|---|
| Menyelesaikan tahap Pahami | 2 |
| Menyelesaikan tahap Modelkan | 3 |
| Menyelesaikan tahap Selesaikan | 3 |
| Menyelesaikan tahap **Periksa** | 5 |
| Mengisi **Jelaskan ke temanmu** | 5 |

XP terbesar sengaja diberikan pada tahap Periksa dan Jelaskan agar siswa terdorong melakukan cek mandiri dan
penalaran, bukan hanya mengejar jawaban.

### Bintang per soal
- ★ selesai · ★★ selesai dengan ≤ 1 petunjuk · ★★★ tanpa petunjuk dan benar di percobaan pertama tiap tahap.

### Level agen
Level n membutuhkan `50 × n` XP tambahan. Gelar: Agen Pemula (1–4), Agen Penyelidik (5–9), Agen Ahli (10–14),
Agen Master Ruas (15+).

### Petunjuk (FR-08)
Petunjuk tidak mengurangi XP, hanya memengaruhi bintang, agar siswa tidak takut meminta bantuan.
Mengulang soal yang sudah selesai memberi setengah XP tahap (bonus misi tetap utuh). XP per tahap juga dibatasi
oleh trigger database sehingga tidak bisa dicurangi.

### Streak
- Bertambah 1 tiap hari minimal Misi Utama selesai.
- **Tameng Streak**: 1 tameng didapat tiap 7 hari streak; melindungi streak bila siswa absen 1 hari.
- Streak putus tidak menghapus XP atau lencana (tanpa hukuman berat).

### Lencana (contoh)
| Lencana | Syarat |
|---|---|
| Misi Pertama | Menyelesaikan soal pertama |
| Penjaga Timbangan | 10 soal Dunia 2 tanpa membuat timbangan miring |
| Detektif Cerita | 10 tahap Pahami benar di percobaan pertama |
| Pemeriksa Teliti | 20 kali menyelesaikan tahap Periksa |
| Guru Kecil | 15 kali mengisi Jelaskan ke temanmu |
| Tanda Aman | 10 soal berturut-turut tanpa kesalahan tanda (M1) |
| Pantang Menyerah | Menyelesaikan soal setelah ≥ 3 percobaan |
| Seminggu Penuh | Streak 7 hari |
| Pemain Tim | Tim mencapai target Tantangan Tim mingguan |

## 5. Tim dan leaderboard (FR-14, FR-15)

- Guru membagi kelas ke tim 3–5 siswa (atau otomatis acak seimbang). Nama tim dipilih dari daftar nama aman
  (mis. "Tim Elang", "Tim Komodo").
- **Tantangan Tim mingguan**: target kolektif, mis. "Tim menyelesaikan 25 tahap Periksa minggu ini". Bar progres
  tim terlihat semua anggota; anggota yang belum berkontribusi tidak ditandai secara negatif.
- **Leaderboard kelas mingguan**: peringkat tim berdasarkan **rata-rata** XP anggota (adil untuk tim berukuran
  berbeda). Reset setiap Senin 00.00 WIB.
- Tidak ada leaderboard individu antar kelas dan tidak ada chat.
- Pesan semangat terbatas: anggota dapat mengirim stiker siap pakai ("Ayo!", "Keren!", "Semangat!", "Mantap!") ke tim.

## 6. Mode Siswa, Mode Guru, dan mode demo
- Layar awal menampilkan pilihan **Mode Siswa** dan **Mode Guru** (FR-22).
- Mode Siswa membutuhkan akun (kode kelas + nama panggilan + PIN). Progres dicadangkan ke server dan kembali saat
  masuk di HP lain (FR-24).
- Mode Guru: membuat kelas, membagikan kode, membagi tim, menetapkan Tantangan Tim, memantau progres (FR-16).
- **Mode demo** hanya muncul bila aplikasi belum terhubung ke Supabase (mis. saat pengembangan, presentasi, atau
  validasi ahli media):
  - *Mode Siswa demo*: misi, dunia, XP, dan lencana berjalan lokal; fitur tim tidak tersedia.
  - *Mode Guru demo*: dashboard dengan kelas dan siswa **contoh** (diberi label jelas), bisa membuat kelas, membagi
    tim, mengatur tantangan, dan melihat contoh ekspor CSV. Data contoh mengikuti pola temuan wawancara S01
    (tahap Modelkan & Pahami paling sulit, salah tanda paling sering). Sumber data: `frontend/src/lib/teacherApi.js`.

## 7. Suara dan umpan balik
- Efek suara pendek untuk benar/salah/naik level; dapat dimatikan (FR-20).
- Getar ringan (Vibration API) saat jawaban benar bila didukung perangkat.
- Animasi perayaan hanya di layar hasil, tidak di layar soal.

## 8. Orisinalitas
Semua karakter, kota, nama, ilustrasi, dan musik dibuat orisinal atau memakai aset berlisensi bebas (mis. CC0)
dengan atribusi dicatat di `frontend/public/CREDITS.md`.
