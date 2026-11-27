-- =====================================================================
-- MATH-MISSION — migrasi 0004: izin dasar tabel (GRANT)
-- Jalankan SETELAH 0001–0003.
--
-- Mengapa: proyek Supabase baru (pengaturan "Data access" 2026) tidak lagi otomatis memberi hak akses tabel di
-- skema public ke peran `authenticated` / `service_role`. Tanpa GRANT, semua query ditolak
-- ("permission denied for table profiles") walaupun policy RLS sudah benar.
-- GRANT di sini hanya membuka "pintu"; RLS di 0001/0002 tetap menentukan BARIS mana yang boleh dibaca/diubah.
-- Peran `anon` (belum login) sengaja TIDAK diberi akses tabel; ia hanya memakai RPC check_class/nickname_available.
-- =====================================================================

-- Pengguna yang sudah login (siswa & guru) — dibatasi RLS
grant usage on schema public to authenticated, service_role;
grant select, update on public.classrooms to authenticated;
grant select, insert, update, delete on public.teams to authenticated;
grant select on public.profiles to authenticated;
grant select, insert on public.attempts to authenticated;
grant select, insert, update, delete on public.daily_logs to authenticated;
grant select, insert, update, delete on public.student_badges to authenticated;
grant select, insert, update, delete on public.student_state to authenticated;
grant select, insert, update, delete on public.team_challenges to authenticated;
grant select, insert on public.team_cheers to authenticated;
grant select on public.ai_chat_sessions, public.ai_chat_messages to authenticated;

-- Siswa hanya boleh mengubah nama panggilan & avatar (sama seperti 0001)
revoke update on public.profiles from authenticated;
grant update (display_name, avatar) on public.profiles to authenticated;

-- Kolom identity (id otomatis) memakai sequence
grant usage, select on all sequences in schema public to authenticated;

-- Fungsi bantu yang dipakai di policy RLS harus bisa dieksekusi
grant execute on function public.my_role(), public.my_classroom(), public.my_team(),
  public.is_teacher_of(bigint), public.is_teacher_of_student(uuid), public.week_start_wib()
  to authenticated, service_role;

-- Edge Function `ai-tutor` & skrip ekspor penelitian memakai service_role (melewati RLS, tetapi tetap butuh GRANT)
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
