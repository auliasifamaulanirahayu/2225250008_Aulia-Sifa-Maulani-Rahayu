-- =====================================================================
-- MATH-MISSION — migrasi 0003: Learning Zone & Challenge Zone
-- Jalankan SETELAH 0001 (dan 0002 bila memakai AI Tutor).
--
-- Menambah tahap percobaan:
--   'lesson'    : jawaban latihan pemahaman (XP 0) dan penyelesaian satu materi (XP maks 10, sekali)
--   'challenge' : jawaban soal Challenge Zone (XP maks 3: benar di percobaan pertama 3, setelah mencoba ulang 1)
-- Aturan XP harus sama dengan frontend/src/engine/xp.js → ZONE_XP (CLAUDE.md).
-- =====================================================================

alter table public.attempts drop constraint if exists attempts_stage_check;
alter table public.attempts add constraint attempts_stage_check check (stage in
  ('understand','model','solve','check','interpret','explain','warmup','complete','bonus','lesson','challenge'));

create or replace function public.clamp_attempt() returns trigger
language plpgsql as $$
declare maxxp int;
begin
  new.student_id := coalesce(auth.uid(), new.student_id);
  maxxp := case new.stage
    when 'understand' then 2 when 'model' then 3 when 'solve' then 3
    when 'check' then 5 when 'interpret' then 5 when 'explain' then 5
    when 'bonus' then 60
    when 'lesson' then 10 when 'challenge' then 3
    else 0 end;
  if not new.correct or new.xp < 0 or new.xp > maxxp then new.xp := 0; end if;
  if new.client_time > now() + interval '1 day' or new.client_time < now() - interval '30 days' then
    new.client_time := now();
  end if;
  new.answer_raw := left(coalesce(new.answer_raw, ''), 200);
  new.server_time := now();
  return new;
end $$;
