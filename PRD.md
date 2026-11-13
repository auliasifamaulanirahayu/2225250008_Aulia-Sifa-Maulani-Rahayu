# PRD — MATH-MISSION

| | |
|---|---|
| Produk | MATH-MISSION: game edukasi PLSV berbasis PBL dengan misi harian |
| Versi dokumen | 1.0 (perencanaan) |
| Tanggal | 13 November 2026 |
| Penyusun | Aulia Sifa Maulani Rahayu (2225250008) |
| Sasaran | Siswa SMP/MTs kelas VII, Kurikulum Merdeka Fase D |
| Platform | PWA (web + HP Android/iOS), dapat di-install tanpa toko aplikasi |
| Teknologi | React + Vite (frontend), Supabase (login & database), Python (generator/validator soal, ekspor penelitian) |

---

## 1. Latar belakang

PLSV adalah pintu masuk aljabar di kelas VII. Wawancara dengan informan S01 (lihat
[ringkasan wawancara](docs/research/wawancara-S01-ringkasan.md)) menunjukkan beban kognitif terbesar ada pada:

1. **Memahami soal cerita** dan menuliskan kembali informasinya (A1, A5, B5).
2. **Menerjemahkan cerita ke model matematika** sambil memikirkan langkah aljabar sekaligus (A2).
3. **Memindahkan ruas dan mengubah tanda +/−** (K3, A1).
4. **Bergantung pada contoh**; bingung bila soal berbeda dari contoh (K2, B1, C5).
5. **Tidak bisa memeriksa jawaban sendiri**; benar/salah hanya diketahui dari koreksi guru (C2).

Siswa paling terbantu oleh **penjelasan ulang dari teman/guru** dan **belajar bersama** (C1, C3), serta meminta
aplikasi yang **menarik, berwarna, berbahasa sederhana, mudah dipakai, bisa main bersama teman, dan punya banyak
contoh serta latihan** (D1), dengan **instruksi yang tidak panjang** (D3).

Sumber belajar di kelas didominasi LKS/teks dan ceramah (B2). Belum ada media yang memecah proses penyelesaian
PLSV menjadi tahap-tahap kecil dan memberi umpan balik langsung.

## 2. Pernyataan masalah

> Siswa kelas VII kesulitan menyelesaikan PLSV, terutama soal cerita, karena harus memahami konteks,
> memodelkan, dan melakukan operasi aljabar sekaligus tanpa umpan balik langsung. Akibatnya beban kognitif
> intrinsik terasa berat dan literasi matematika (merumuskan, menerapkan, menafsirkan) tidak berkembang.

## 3. Tujuan produk

| ID | Tujuan | Indikator keberhasilan (KPI) |
|---|---|---|
| G1 | Siswa memahami konsep kesetaraan dan operasi pada kedua ruas | Rata-rata skor post-test bagian prosedur naik ≥ 20% dari pre-test |
| G2 | Siswa mampu memodelkan soal cerita menjadi PLSV | ≥ 70% siswa benar pada tahap "Modelkan" di Dunia 6 |
| G3 | Literasi matematika meningkat | N-gain pre/post-test literasi ≥ 0,3 (kategori sedang) |
| G4 | Beban kognitif ekstrinsik rendah | Skor EL pada kuesioner cognitive load ≤ 3 dari 10 |
| G5 | Siswa terlibat rutin | ≥ 60% siswa menyelesaikan misi harian ≥ 4 hari/minggu selama uji coba |
| G6 | Aplikasi praktis | Skor kepraktisan siswa & guru ≥ 80% (kategori sangat praktis) |

## 4. Persona

**Raka, 12 tahun, siswa kelas VII.** Memakai HP Android kelas menengah milik orang tua, kuota terbatas.
Ingat bentuk persamaan "yang pakai huruf x", tapi sering salah tanda saat memindahkan ruas. Panik kalau soal
cerita panjang. Suka game yang berwarna dan bisa adu skor dengan teman.

**Bu Sari, guru matematika kelas VII.** Mengajar 4 kelas, waktu terbatas. Ingin tahu siswa mana yang kesulitan
dan di tahap mana, tanpa harus memeriksa satu per satu.

**Peneliti (pengembang).** Membutuhkan data anonim (waktu, jumlah petunjuk, kesalahan per tahap) untuk analisis
efektivitas dan beban kognitif.

## 5. Ruang lingkup

### MVP (rilis uji coba)
- PWA yang bisa di-install dan berjalan offline.
- **Mode Siswa** dan **Mode Guru** dalam satu aplikasi, dengan login dan penyimpanan data di Supabase.
- Dunia 1–6 dengan minimal 15 soal per dunia; Dunia 7 minimal 8 soal literasi.
- Alur soal 4 tahap, Timbangan Seimbang, worked/faded example, petunjuk bertingkat, cek substitusi.
- Misi harian (3 misi), XP, level, lencana, streak.
- Kelas, tim, Tantangan Tim, leaderboard kelas mingguan.
- Dashboard guru sederhana dan ekspor CSV untuk penelitian.

### Tidak termasuk MVP (versi berikutnya)
- Duel real-time antar siswa.
- Materi selain PLSV (mis. pertidaksamaan linear satu variabel).
- Editor soal untuk guru di dalam aplikasi (MVP: soal ditulis di file JSON).
- Chat bebas antar siswa (sengaja tidak ada demi keamanan anak).
- Notifikasi push (dipertimbangkan setelah uji coba).

## 6. User stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-01 | siswa | membuka aplikasi dari ikon di layar HP | tidak perlu mencari link setiap hari |
| US-02 | siswa | daftar dan masuk dengan kode kelas, nama panggilan, dan PIN 6 angka | tidak perlu email |
| US-02b | siswa | masuk di HP lain dan progresku kembali | tidak kehilangan XP dan bintang |
| US-02c | pengguna | memilih Mode Siswa atau Mode Guru di layar awal | langsung ke fitur yang sesuai |
| US-03 | siswa | melihat 3 misi hari ini | tahu apa yang harus dikerjakan |
| US-04 | siswa | mengerjakan soal cerita langkah demi langkah | tidak bingung memikirkan semuanya sekaligus |
| US-05 | siswa | melihat timbangan bergerak saat saya mengurangi kedua ruas | paham kenapa tanda berubah |
| US-06 | siswa | melihat contoh dulu sebelum mencoba | punya acuan |
| US-07 | siswa | meminta petunjuk sedikit demi sedikit | tetap berpikir sendiri |
| US-08 | siswa | mengecek jawaban dengan substitusi | tahu jawabanku masuk akal tanpa menunggu guru |
| US-09 | siswa | mengerjakan tantangan bersama tim | bisa belajar dengan teman |
| US-10 | siswa | melihat peringkat tim kelasku | termotivasi |
| US-11 | siswa | tetap main tanpa internet | kuota hemat |
| US-12 | guru | membuat kelas dan membagi tim | siswa bisa bergabung |
| US-13 | guru | melihat tahap mana yang paling banyak salah | tahu apa yang perlu dijelaskan ulang |
| US-14 | peneliti | mengekspor data percobaan anonim ke CSV | bisa menganalisis hasil |

## 7. Kebutuhan fungsional

| ID | Fitur | Deskripsi | Prioritas |
|---|---|---|---|
| FR-01 | Onboarding & profil | 3 layar pengenalan singkat, pilih avatar dan nama panggilan | Wajib |
| FR-02 | Login siswa | Daftar/masuk dengan kode kelas 6 karakter + nama panggilan + PIN 6 angka (Supabase Auth, tanpa email asli). Mode demo tanpa akun hanya tersedia bila server belum diatur | Wajib |
| FR-03 | Misi harian | Setiap hari 3 misi: Pemanasan, Misi Utama (PBL), Tantangan Tim; dipilih otomatis sesuai progres | Wajib |
| FR-04 | Peta Dunia | 7 dunia berurutan; dunia berikutnya terbuka setelah ≥ 70% soal dunia sebelumnya selesai | Wajib |
| FR-05 | Alur soal 4 tahap | Pahami → Modelkan → Selesaikan → Periksa; satu tahap per layar | Wajib |
| FR-06 | Timbangan Seimbang | Model visual persamaan; operasi dilakukan pada kedua ruas dengan animasi | Wajib |
| FR-07 | Contoh bertahap | Worked example → faded example (langkah dikosongkan bertahap) → soal mandiri | Wajib |
| FR-08 | Petunjuk bertingkat | 3 tingkat: arah umum → langkah berikutnya → contoh serupa | Wajib |
| FR-09 | Umpan balik miskonsepsi | Jawaban salah dikenali polanya (mis. salah tanda) dan dijelaskan singkat | Wajib |
| FR-10 | Cek substitusi | Siswa memasukkan jawaban ke persamaan awal dan ke cerita sebelum soal selesai | Wajib |
| FR-11 | Jelaskan ke temanmu | Setelah soal, siswa memilih/menyusun kalimat penjelasan langkah (self-explanation) | Wajib |
| FR-12 | Pemanasan prasyarat | Latihan cepat operasi bilangan bulat, terutama bilangan negatif | Wajib |
| FR-13 | XP, level, lencana, streak | Lihat [GAME_DESIGN.md](docs/GAME_DESIGN.md) | Wajib |
| FR-14 | Tim & Tantangan Tim | Guru membagi tim 3–5 siswa; tantangan mingguan berupa target kolektif | Wajib |
| FR-15 | Leaderboard kelas | Peringkat tim mingguan (bukan individu) dengan nama panggilan | Wajib |
| FR-16 | Dashboard guru | Membuat kelas, mengatur tim, melihat progres per siswa dan per tahap | Wajib |
| FR-17 | Offline & sinkronisasi | Semua soal tersimpan lokal; percobaan diantrikan lalu dikirim saat online | Wajib |
| FR-18 | Install PWA | Tombol "Pasang Aplikasi" dan panduan install Android/iPhone | Wajib |
| FR-19 | Ekspor data penelitian | CSV anonim per percobaan, hanya untuk akun guru/peneliti | Wajib |
| FR-20 | Pengaturan | Suara on/off, ukuran huruf, mode kontras tinggi, keluar akun | Sebaiknya |
| FR-21 | Bacakan soal | Tombol membacakan kalimat soal (Web Speech API, bila tersedia) | Sebaiknya |
| FR-22 | Pilih mode | Layar awal menampilkan pilihan **Mode Siswa** dan **Mode Guru**; rute dijaga sesuai peran | Wajib |
| FR-23 | Login guru | Daftar/masuk guru dengan email + password (Supabase Auth) | Wajib |
| FR-24 | Cadangan progres | XP, bintang, dan progres per soal dicadangkan ke Supabase dan dipulihkan saat masuk di HP lain | Wajib |
| FR-25 | Hapus akun | Siswa dapat menghapus akun & seluruh datanya; guru dapat menghapus siswa atau kelas | Wajib |

## 8. Kebutuhan non-fungsional

| ID | Kebutuhan |
|---|---|
| NFR-01 | **Mobile-first**: nyaman di layar 360×640 px, satu tangan, target sentuh ≥ 48 px |
| NFR-02 | **Ringan**: muat pertama < 3 detik pada 3G cepat; ukuran bundel awal < 500 KB (gzip, di luar ilustrasi) |
| NFR-03 | **Offline**: semua dunia dan soal yang sudah diunduh dapat dimainkan tanpa internet |
| NFR-04 | **Kompatibilitas**: Chrome Android 8+, Safari iOS 16.4+, Chrome/Edge/Firefox desktop versi terbaru |
| NFR-05 | **Lighthouse**: Performance ≥ 85, Accessibility ≥ 90, PWA installable lolos |
| NFR-06 | **Privasi anak**: tanpa email/nomor HP siswa, tanpa iklan dan pelacak pihak ketiga |
| NFR-07 | **Keamanan**: HTTPS; password/PIN di-hash oleh Supabase Auth; Row Level Security di semua tabel; XP divalidasi trigger di server; kunci `service_role` tidak pernah ada di frontend |
| NFR-08 | **Bahasa**: Bahasa Indonesia sederhana untuk usia 12–13 tahun; instruksi ≤ 2 kalimat |
| NFR-09 | **Biaya**: dapat dihosting dengan layanan gratis |
| NFR-10 | **Ketepatan konten**: setiap soal lolos validasi otomatis SymPy dan validasi ahli materi |

## 9. Matriks keterlacakan (temuan wawancara → fitur)

| Kode | Temuan S01 | Kode CLT | Fitur yang menjawab |
|---|---|---|---|
| S1 | Belajar PLSV semester 1 kelas VII | K | Sasaran kelas VII, konten sesuai Fase D |
| S2 | Ingat bentuk persamaan dengan huruf x, y, z | IL | Dunia 1 memperkuat makna variabel (FR-04) |
| S3 | Ingat soal harga buku dan pulpen | IL | Konteks belanja dipakai di Dunia 6–7 (CONTENT_BANK) |
| K1 | Bingung huruf dan angka bersamaan | IL, GL | "Kotak misteri" → x di Dunia 1; bertanya → petunjuk bertingkat (FR-08) |
| K2 | Mengikuti langkah contoh | EL, GL | Worked → faded example (FR-07) |
| K3 | Ragu pindah ruas, lupa perubahan tanda | IL | Timbangan Seimbang (FR-06), umpan balik salah tanda (FR-09) |
| A1 | Soal cerita & pindah ruas paling sulit | IL | Alur 4 tahap (FR-05), Timbangan (FR-06) |
| A2 | Harus memahami cerita, memodelkan, dan memindahkan sekaligus | IL | Segmentasi satu tahap per layar (FR-05) |
| A3 | Prasyarat operasi hitung dasar | K | Pemanasan prasyarat (FR-12) |
| A4 | Makin sulit saat cerita makin panjang | IL | Panjang cerita naik bertahap; kalimat tampil per potong (FR-05, CONTENT_BANK) |
| A5 | Salah karena belum bisa membaca & memodelkan soal, bingung simbol | IL | Tahap Pahami & Modelkan dengan pilihan terpandu (FR-05), glosarium simbol |
| B1 | Bingung saat soal beda dari contoh | IL, GL | Variasi konteks bertahap; faded example (FR-07) |
| B2 | Belajar dari LKS/teks dan guru | EL | Representasi visual & interaktif sebagai pelengkap (FR-06) |
| B3 | Tidak terganggu tampilan | EL | Pertahankan prinsip koherensi di layar soal (UI_UX) |
| B4 | Kecepatan guru pas | EL | Siswa mengatur tempo sendiri; tidak ada batas waktu di Misi Utama |
| B5 | Sulit menuliskan kembali informasi soal | IL | Tahap Pahami: tandai "Diketahui" & "Ditanya" (FR-05) |
| C1 | Paham saat dijelaskan ulang teman/guru | GL | Petunjuk bertingkat (FR-08), Jelaskan ke temanmu (FR-11) |
| C2 | Tahu benar hanya dari koreksi guru | GL | Cek substitusi (FR-10), umpan balik langsung (FR-09) |
| C3 | Terbantu belajar bersama teman | GL | Tim & Tantangan Tim (FR-14) |
| C4 | Pernah menjelaskan ke teman pada soal mudah | GL | Jelaskan ke temanmu, mulai dari soal mudah (FR-11) |
| C5 | Terbantu contoh soal dulu | GL | Worked example di awal tiap dunia (FR-07) |
| D1 | Menarik, ilustrasi berwarna, bahasa SMP, mudah, main bersama, banyak latihan | DS | UI_UX, FR-13–15, bank soal ≥ 98 soal |
| D2 | Memahami soal dan langkah hitung perlu dijelaskan pelan | DS | Alur 4 tahap (FR-05) + contoh bertahap (FR-07) |
| D3 | Jangan ada soal/instruksi terlalu panjang | DS | NFR-08, aturan penulisan soal |

Catatan: data dari satu informan belum bisa digeneralisasi. Matriks ini diperbarui bila ada informan tambahan.

## 10. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| HP siswa lama/memori kecil | Aplikasi lambat | Vanilla JS tanpa framework berat, ilustrasi SVG, uji di HP kelas bawah |
| Kuota/internet terbatas | Siswa tidak bisa main | Offline-first, unduh sekali |
| Proyek Supabase gratis dijeda saat lama tidak dipakai | Login/sinkron gagal | Offline-first; aktifkan ulang proyek sebelum uji coba; sinkron di latar belakang |
| PIN 6 angka mudah ditebak | Akun siswa diakses teman | Batas percobaan login Supabase; guru bisa menghapus & siswa daftar ulang; data yang tersimpan tidak sensitif |
| Siapa pun bisa mendaftar sebagai guru | Akun guru palsu | Guru hanya melihat kelas buatannya sendiri (RLS); bila perlu tambahkan kode undangan guru di versi berikutnya |
| iPhone membatasi PWA | Install/penyimpanan berbeda | Panduan "Tambahkan ke Layar Utama", uji di Safari |
| Gamifikasi menggeser fokus belajar | Siswa mengejar poin, bukan paham | XP terbesar dari tahap Periksa & Jelaskan; leaderboard per tim, bukan individu |
| Soal salah kunci | Miskonsepsi baru | Validasi SymPy otomatis + validasi ahli |
| Data anak bocor | Masalah etika/hukum | Data minimal, tanpa identitas asli, lihat PRIVACY_ETHICS |

## 11. Kriteria rilis uji coba

- Semua FR berprioritas "Wajib" berfungsi dan lolos [TEST_PLAN.md](docs/TEST_PLAN.md).
- Lolos validasi ahli materi dan ahli media (kategori minimal "layak").
- Dapat di-install dan dimainkan offline di minimal 3 HP Android berbeda dan 1 iPhone.
- Lighthouse memenuhi NFR-05.
