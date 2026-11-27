-- =====================================================================
-- MATH-MISSION — migrasi 0002: AI Math Tutor
-- Jalankan SETELAH 0001_init.sql (Supabase Dashboard → SQL Editor → Run).
--
-- • classrooms.ai_tutor   : guru menyalakan AI Tutor per kelas (bawaan MATI, nyalakan setelah ada izin sekolah/orang tua).
-- • ai_chat_sessions      : satu sesi = satu kali membuka tutor (umum atau dari sebuah soal).
-- • ai_chat_messages      : isi percakapan. Dibaca oleh siswa pemiliknya dan guru kelasnya.
--                           Hanya Edge Function `ai-tutor` (service role) yang boleh menulis, agar balasan "tutor"
--                           tidak bisa dipalsukan dari aplikasi.
-- Data ikut terhapus bila akun siswa dihapus (on delete cascade).
-- =====================================================================

alter table public.classrooms add column if not exists ai_tutor boolean not null default false;

create table if not exists public.ai_chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  problem_id  text,                                   -- null = tutor umum dari Dashboard
  created_at  timestamptz not null default now(),
  last_at     timestamptz not null default now()
);
create index if not exists ai_chat_sessions_student on public.ai_chat_sessions (student_id, last_at desc);

create table if not exists public.ai_chat_messages (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.ai_chat_sessions(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,  -- salinan untuk RLS & kuota harian
  role        text not null check (role in ('student', 'tutor')),
  content     text not null check (char_length(content) between 1 and 2000),
  source      text not null default 'ai' check (source in ('student', 'ai')),
  mode        text not null default 'guide' check (mode in ('guide', 'full')),  -- full = pembahasan lengkap diminta
  created_at  timestamptz not null default now()
);
create index if not exists ai_chat_messages_session on public.ai_chat_messages (session_id, id);
create index if not exists ai_chat_messages_student_day on public.ai_chat_messages (student_id, created_at);

alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;

-- Baca: siswa pemilik + guru kelasnya. Tidak ada policy insert/update/delete untuk pengguna:
-- penulisan hanya lewat Edge Function dengan service role (melewati RLS).
create policy ai_sessions_select on public.ai_chat_sessions for select
  using (student_id = auth.uid() or public.is_teacher_of_student(student_id));
create policy ai_messages_select on public.ai_chat_messages for select
  using (student_id = auth.uid() or public.is_teacher_of_student(student_id));

revoke insert, update, delete on public.ai_chat_sessions from authenticated, anon;
revoke insert, update, delete on public.ai_chat_messages from authenticated, anon;
grant select on public.ai_chat_sessions to authenticated;
grant select on public.ai_chat_messages to authenticated;
