# Privasi & Etika — MATH-MISSION

Pengguna utama adalah anak usia 12–13 tahun. Prinsipnya: **kumpulkan sesedikit mungkin, lindungi sebaik mungkin**.
Rujukan: UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (data anak termasuk kategori yang memerlukan
persetujuan orang tua/wali).

## 1. Data yang dikumpulkan
| Data | Disimpan | Tujuan |
|---|---|---|
| Nama panggilan, avatar | Ya | Tampilan di aplikasi & tim |
| PIN 6 angka | Hanya hash (oleh Supabase Auth) | Login |
| Email sintetis siswa (`kode.nama-hash@siswa.math-mission.app`) | Ya | Kebutuhan teknis Supabase Auth; bukan email asli, tidak pernah menerima pesan |
| Progres, percobaan per tahap, waktu, petunjuk | Ya | Belajar, dashboard guru, penelitian |
| Kode penelitian (mis. S01) | Opsional | Menghubungkan data dengan instrumen penelitian |
| Email & password guru | Ya (password di-hash) | Login guru |

**Tidak dikumpulkan**: nama lengkap, email/nomor HP siswa, foto, lokasi, kontak, ID perangkat.
Tidak ada iklan, analytics pihak ketiga, atau berbagi data ke pihak lain.

## 2. Persetujuan
- Uji coba di sekolah dilakukan dengan izin sekolah dan guru.
- Untuk data penelitian: **persetujuan tertulis orang tua/wali** dan **assent** (persetujuan) siswa.
  Siswa boleh berhenti kapan saja tanpa konsekuensi nilai.
- Mode penelitian (`research_mode`) hanya diaktifkan untuk kelas yang telah memberi persetujuan.

## 3. Anonimisasi
- Ekspor CSV memakai `anon_id` (UUID) dan `research_code`, tanpa nickname.
- Tabel penghubung kode penelitian ↔ nama siswa disimpan **di luar aplikasi** oleh peneliti (mis. file terkunci),
  bukan di server.
- Laporan penelitian hanya memakai kode informan (S01, S02, …).
- Foto dokumentasi kegiatan tidak dimasukkan ke aplikasi atau repo publik.

## 4. Keamanan
- HTTPS di semua koneksi; sesi dan batas percobaan login dikelola Supabase Auth.
- Row Level Security di semua tabel: guru hanya melihat kelas miliknya; siswa hanya melihat datanya sendiri, timnya,
  dan leaderboard kelasnya.
- Data disimpan di Supabase (pilih region Singapore); kunci `service_role` hanya di laptop peneliti, tidak di repo
  atau frontend. File `.env` dan CSV data siswa dikecualikan dari git.

## 5. Retensi & penghapusan
- Guru dapat menghapus siswa atau kelas; siswa dapat menghapus akunnya sendiri dari halaman Profil. Seluruh data
  terkait ikut terhapus (akun Auth dan semua baris yang merujuk padanya).
- Saat keluar akun, data di HP dihapus setelah dikirim ke server.
- Data penelitian disimpan selama masa penelitian dan penyusunan laporan, lalu server dihapus;
  data anonim untuk arsip disimpan sesuai ketentuan kampus.

## 6. Keamanan interaksi
- Tidak ada chat bebas; interaksi tim hanya stiker siap pakai.
- Nama panggilan disaring dari kata tidak pantas (daftar kata terlarang) dan guru dapat mengubahnya.
- Leaderboard per tim, bukan individu, untuk mengurangi tekanan dan perbandingan sosial.

## 7. Pemberitahuan di aplikasi
Halaman "Tentang & Privasi" berbahasa sederhana: "Aplikasi ini hanya menyimpan nama panggilan dan hasil
latihanmu. Gurumu bisa melihat progresmu. Tidak ada iklan."
