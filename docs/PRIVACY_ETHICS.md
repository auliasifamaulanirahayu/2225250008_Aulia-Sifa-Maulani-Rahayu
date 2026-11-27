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
| Percakapan AI Tutor | Ya (bila guru menyalakan AI Tutor) | Membantu belajar; guru melihat kesulitan siswa |

**Tidak dikumpulkan**: nama lengkap, email/nomor HP siswa, foto, lokasi, kontak, ID perangkat.
Tidak ada iklan atau analytics pihak ketiga. Satu-satunya data yang keluar ke pihak lain adalah **pesan AI Tutor**
(lihat §7), dan hanya bila guru menyalakannya untuk kelas itu.

## 2. Persetujuan
- Uji coba di sekolah dilakukan dengan izin sekolah dan guru.
- Untuk data penelitian: **persetujuan tertulis orang tua/wali** dan **assent** (persetujuan) siswa.
  Siswa boleh berhenti kapan saja tanpa konsekuensi nilai.
- Mode penelitian (`research_mode`) hanya diaktifkan untuk kelas yang telah memberi persetujuan.
- AI Tutor (`ai_tutor`) bawaannya **mati**; guru menyalakannya hanya setelah sekolah/orang tua setuju bahwa pesan
  siswa (tanpa nama) dikirim ke layanan AI Google.

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
- Data disimpan di Supabase region Asia-Pasifik (proyek saat ini: Sydney, ap-southeast-2); kunci `service_role` hanya di laptop peneliti dan di
  lingkungan server Edge Function (otomatis dari Supabase), tidak di repo atau frontend. `GEMINI_API_KEY` disimpan
  sebagai *secret* Edge Function, tidak pernah dikirim ke HP siswa. File `.env` dan CSV data siswa dikecualikan dari git.

## 5. Retensi & penghapusan
- Guru dapat menghapus siswa atau kelas; siswa dapat menghapus akunnya sendiri dari halaman Profil. Seluruh data
  terkait ikut terhapus (akun Auth dan semua baris yang merujuk padanya).
- Saat keluar akun, data di HP dihapus setelah dikirim ke server.
- Data penelitian disimpan selama masa penelitian dan penyusunan laporan, lalu server dihapus;
  data anonim untuk arsip disimpan sesuai ketentuan kampus.

## 6. Keamanan interaksi
- Tidak ada chat antarsiswa; interaksi tim hanya stiker siap pakai. Satu-satunya kolom teks bebas adalah AI Tutor
  (siswa ↔ tutor), yang dapat dibaca guru kelasnya.
- Nama panggilan disaring dari kata tidak pantas (daftar kata terlarang) dan guru dapat mengubahnya.
- Leaderboard per tim, bukan individu, untuk mengurangi tekanan dan perbandingan sosial.

## 7. AI Math Tutor (Gemini)
- **Alur data**: HP siswa → Edge Function `ai-tutor` (Supabase) → Google Gemini API. Yang dikirim ke Google hanya
  teks soal dan percakapan; **tanpa nama, nickname, ID, atau kelas**. Email dan deret angka ≥ 9 digit (nomor HP)
  disamarkan menjadi `[email]`/`[nomor]` sebelum dikirim. Permintaan memakai `store: false`.
- **Free tier**: menurut halaman harga resmi Google, konten free tier **dipakai Google untuk meningkatkan produknya**
  ("Used to improve our products": Yes); paid tier tidak. Untuk penelitian dengan anak, pertimbangkan paid tier atau
  pastikan izin orang tua mencantumkan hal ini.
- **Pemberitahuan di layar tutor**: "Jangan tulis nama lengkap, alamat, atau nomor HP. Pesanmu dikirim ke layanan AI
  Google dan bisa dibaca gurumu."
- **Keamanan isi**: instruksi tutor membatasi topik pada matematika, menolak menanyakan data pribadi, dan menyarankan
  berbicara dengan guru/orang tua bila siswa menyebut tidak aman atau dirundung. Guru dapat membaca percakapan.
- **Tanpa AI**: bila AI mati, offline, kuota habis, atau mode demo, tutor bawaan bekerja sepenuhnya di HP dan tidak
  mengirim apa pun.
- **Batas**: maksimal `AI_DAILY_LIMIT` (bawaan 30) pesan per siswa per hari.

## 8. Pemberitahuan di aplikasi
Halaman "Tentang & Privasi" berbahasa sederhana: "Aplikasi ini hanya menyimpan nama panggilan dan hasil
latihanmu. Gurumu bisa melihat progresmu. Tidak ada iklan."
