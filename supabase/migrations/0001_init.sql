-- =====================================================================
-- MATH-MISSION — skema database Supabase (Postgres)
-- Jalankan sekali di Supabase Dashboard → SQL Editor → New query → Run.
-- Lihat docs/DEPLOYMENT.md untuk pengaturan Auth yang wajib.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tabel
create table if not exists public.classrooms (
  id            bigint generated always as identity primary key,
  teacher_id    uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  code          text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  research_mode boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.teams (
  id           bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  color        text not null default '#3B5BDB'
);

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('student', 'teacher')),
  display_name  text not null check (char_length(display_name) between 2 and 40),
  avatar        text not null default '🤖',
  classroom_id  bigint references public.classrooms(id) on delete set null,
  team_id       bigint references public.teams(id) on delete set null,
  research_code text,
  anon_id       uuid not null default gen_random_uuid() unique,
  created_at    timestamptz not null default now()
);
create unique index if not exists profiles_class_nickname
  on public.profiles (classroom_id, lower(display_name)) where role = 'student';

create table if not exists public.attempts (
  id                 bigint generated always as identity primary key,
  client_id          uuid not null unique,
  student_id         uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  problem_id         text not null,
  world              smallint not null default 0,
  stage              text not null check (stage in
                       ('understand','model','solve','check','interpret','explain','warmup','complete','bonus')),
  correct            boolean not null,
  misconception_code text,
  hints_used         smallint not null default 0,
  attempt_no         smallint not null default 1,
  duration_ms        integer not null default 0,
  answer_raw         text not null default '',
  xp                 smallint not null default 0,
  stars              smallint,
  client_time        timestamptz not null default now(),
  server_time        timestamptz not null default now()
);
create index if not exists attempts_student_time on public.attempts (student_id, client_time);

create table if not exists public.daily_logs (
  student_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  day          date not null,
  mission_type text not null check (mission_type in ('warmup', 'main', 'team')),
  problem_ids  text[] not null default '{}',
  completed    boolean not null default false,
  primary key (student_id, day, mission_type)
);

create table if not exists public.student_badges (
  student_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  badge_code text not null,
  earned_at  timestamptz not null default now(),
  primary key (student_id, badge_code)
);

-- cadangan progres agar bisa pindah HP (stats + progres per soal)
create table if not exists public.student_state (
  student_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  stats      jsonb not null default '{}',
  progress   jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.team_challenges (
  classroom_id bigint not null references public.classrooms(id) on delete cascade,
  week_start   date not null,
  metric       text not null check (metric in ('check_count', 'xp', 'problems')),
  target       integer not null check (target between 1 and 100000),
  primary key (classroom_id, week_start)
);

create table if not exists public.team_cheers (
  id         bigint generated always as identity primary key,
  team_id    bigint not null references public.teams(id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  sticker    text not null check (sticker in ('Ayo!', 'Keren!', 'Semangat!', 'Mantap!')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- fungsi bantu (security definer agar RLS tidak rekursif)
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function public.my_classroom() returns bigint
language sql stable security definer set search_path = public as
$$ select classroom_id from profiles where id = auth.uid() $$;

create or replace function public.my_team() returns bigint
language sql stable security definer set search_path = public as
$$ select team_id from profiles where id = auth.uid() $$;

create or replace function public.is_teacher_of(c bigint) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from classrooms where id = c and teacher_id = auth.uid()) $$;

create or replace function public.is_teacher_of_student(s uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from profiles p join classrooms c on c.id = p.classroom_id
     where p.id = s and c.teacher_id = auth.uid()) $$;

-- Senin 00.00 WIB minggu berjalan
create or replace function public.week_start_wib() returns timestamptz
language sql stable as
$$ select (date_trunc('week', now() at time zone 'Asia/Jakarta')) at time zone 'Asia/Jakarta' $$;

-- ---------------------------------------------------------------- pendaftaran akun (trigger auth.users)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r    text  := meta ->> 'role';
  cls  bigint;
  nick text  := trim(coalesce(meta ->> 'nickname', ''));
begin
  if r = 'teacher' then
    insert into profiles (id, role, display_name)
    values (new.id, 'teacher', coalesce(nullif(trim(meta ->> 'display_name'), ''), 'Guru'));
  elsif r = 'student' then
    select id into cls from classrooms where code = upper(meta ->> 'class_code');
    if cls is null then raise exception 'CLASS_NOT_FOUND'; end if;
    insert into profiles (id, role, display_name, avatar, classroom_id)
    values (new.id, 'student', nick, coalesce(meta ->> 'avatar', '🤖'), cls);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- validasi percobaan (XP tidak bisa dicurangi)
create or replace function public.clamp_attempt() returns trigger
language plpgsql as $$
declare maxxp int;
begin
  new.student_id := coalesce(auth.uid(), new.student_id);
  maxxp := case new.stage
    when 'understand' then 2 when 'model' then 3 when 'solve' then 3
    when 'check' then 5 when 'interpret' then 5 when 'explain' then 5
    when 'bonus' then 60 else 0 end;
  if not new.correct or new.xp < 0 or new.xp > maxxp then new.xp := 0; end if;
  if new.client_time > now() + interval '1 day' or new.client_time < now() - interval '30 days' then
    new.client_time := now();
  end if;
  new.answer_raw := left(coalesce(new.answer_raw, ''), 200);
  new.server_time := now();
  return new;
end $$;

drop trigger if exists attempts_clamp on public.attempts;
create trigger attempts_clamp before insert on public.attempts
  for each row execute function public.clamp_attempt();

-- ---------------------------------------------------------------- Row Level Security
alter table public.classrooms      enable row level security;
alter table public.teams           enable row level security;
alter table public.profiles        enable row level security;
alter table public.attempts        enable row level security;
alter table public.daily_logs      enable row level security;
alter table public.student_badges  enable row level security;
alter table public.student_state   enable row level security;
alter table public.team_challenges enable row level security;
alter table public.team_cheers     enable row level security;

-- kelas: guru mengelola kelasnya; siswa melihat kelasnya sendiri
create policy classrooms_select on public.classrooms for select
  using (teacher_id = auth.uid() or id = public.my_classroom());
create policy classrooms_update on public.classrooms for update
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- tim
create policy teams_select on public.teams for select
  using (public.is_teacher_of(classroom_id) or classroom_id = public.my_classroom());
create policy teams_write on public.teams for all
  using (public.is_teacher_of(classroom_id)) with check (public.is_teacher_of(classroom_id));

-- profil: diri sendiri + guru melihat siswanya. Siswa hanya boleh mengubah nama & avatar.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_teacher_of(classroom_id));
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (display_name, avatar) on public.profiles to authenticated;

-- percobaan
create policy attempts_insert on public.attempts for insert
  with check (student_id = auth.uid() and public.my_role() = 'student');
create policy attempts_select on public.attempts for select
  using (student_id = auth.uid() or public.is_teacher_of_student(student_id));

-- log misi harian & lencana & cadangan progres
create policy daily_own on public.daily_logs for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy daily_teacher on public.daily_logs for select
  using (public.is_teacher_of_student(student_id));
create policy badges_own on public.student_badges for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy badges_teacher on public.student_badges for select
  using (public.is_teacher_of_student(student_id));
create policy state_own on public.student_state for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- tantangan tim
create policy challenges_select on public.team_challenges for select
  using (public.is_teacher_of(classroom_id) or classroom_id = public.my_classroom());
create policy challenges_write on public.team_challenges for all
  using (public.is_teacher_of(classroom_id)) with check (public.is_teacher_of(classroom_id));

-- stiker semangat (tanpa chat bebas)
create policy cheers_insert on public.team_cheers for insert
  with check (student_id = auth.uid() and team_id = public.my_team());
create policy cheers_select on public.team_cheers for select
  using (team_id = public.my_team()
         or exists (select 1 from teams t where t.id = team_id and public.is_teacher_of(t.classroom_id)));

-- ---------------------------------------------------------------- RPC publik (sebelum login)
create or replace function public.check_class(p_code text)
returns table (name text) language sql stable security definer set search_path = public as
$$ select name from classrooms where code = upper(p_code) $$;

create or replace function public.nickname_available(p_code text, p_nick text)
returns boolean language sql stable security definer set search_path = public as
$$ select not exists (
     select 1 from profiles p join classrooms c on c.id = p.classroom_id
     where c.code = upper(p_code) and lower(p.display_name) = lower(trim(p_nick))) $$;

grant execute on function public.check_class(text) to anon, authenticated;
grant execute on function public.nickname_available(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- RPC guru
create or replace function public.create_classroom(p_name text, p_research boolean default false)
returns public.classrooms language plpgsql security definer set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- tanpa I, O, 0, 1 agar tidak tertukar
  new_code text;
  row      classrooms;
begin
  if public.my_role() is distinct from 'teacher' then raise exception 'NOT_TEACHER'; end if;
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from classrooms where code = new_code);
  end loop;
  insert into classrooms (teacher_id, name, code, research_mode)
  values (auth.uid(), trim(p_name), new_code, coalesce(p_research, false))
  returning * into row;
  return row;
end $$;

create or replace function public.assign_team(p_student uuid, p_team bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_teacher_of_student(p_student) then raise exception 'FORBIDDEN'; end if;
  if p_team is not null and not exists (
    select 1 from teams t join profiles p on p.classroom_id = t.classroom_id
    where t.id = p_team and p.id = p_student) then raise exception 'TEAM_NOT_IN_CLASS'; end if;
  update profiles set team_id = p_team where id = p_student;
end $$;

create or replace function public.set_research_code(p_student uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_teacher_of_student(p_student) then raise exception 'FORBIDDEN'; end if;
  update profiles set research_code = nullif(trim(p_code), '') where id = p_student;
end $$;

-- bagi siswa yang belum punya tim secara acak ke tim berukuran ~p_size
create or replace function public.auto_teams(p_classroom bigint, p_size int default 4)
returns void language plpgsql security definer set search_path = public as $$
declare
  names  text[] := array['Tim Elang','Tim Komodo','Tim Rajawali','Tim Harimau','Tim Lumba-lumba',
                         'Tim Merak','Tim Badak','Tim Penyu','Tim Cendrawasih','Tim Gajah'];
  colors text[] := array['#3B5BDB','#2B8A3E','#E67700','#9C36B5','#0C8599','#C2255C','#5C940D','#D9480F','#1971C2','#862E9C'];
  n_students int; n_teams int; existing int; i int; s record; team_ids bigint[];
begin
  if not public.is_teacher_of(p_classroom) then raise exception 'FORBIDDEN'; end if;
  p_size := greatest(2, least(coalesce(p_size, 4), 6));
  select count(*) into n_students from profiles
    where classroom_id = p_classroom and role = 'student' and team_id is null;
  if n_students = 0 then return; end if;
  select count(*) into existing from teams where classroom_id = p_classroom;
  n_teams := greatest(1, ceil(n_students::numeric / p_size)::int);
  for i in 1..n_teams loop
    insert into teams (classroom_id, name, color)
    values (p_classroom,
            coalesce(names[((existing + i - 1) % array_length(names, 1)) + 1], 'Tim ' || (existing + i)) ||
              case when existing + i > array_length(names, 1) then ' ' || (existing + i) else '' end,
            colors[((existing + i - 1) % array_length(colors, 1)) + 1]);
  end loop;
  select array_agg(id order by id) into team_ids from teams where classroom_id = p_classroom
    and id not in (select distinct team_id from profiles where team_id is not null);
  i := 0;
  for s in select id from profiles where classroom_id = p_classroom and role = 'student' and team_id is null
           order by random() loop
    update profiles set team_id = team_ids[(i % array_length(team_ids, 1)) + 1] where id = s.id;
    i := i + 1;
  end loop;
end $$;

create or replace function public.set_challenge(p_classroom bigint, p_metric text, p_target int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_teacher_of(p_classroom) then raise exception 'FORBIDDEN'; end if;
  insert into team_challenges (classroom_id, week_start, metric, target)
  values (p_classroom, (public.week_start_wib() at time zone 'Asia/Jakarta')::date, p_metric, p_target)
  on conflict (classroom_id, week_start) do update set metric = excluded.metric, target = excluded.target;
end $$;

-- hapus siswa beserta seluruh datanya (akun auth ikut terhapus)
create or replace function public.delete_student(p_student uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_teacher_of_student(p_student) then raise exception 'FORBIDDEN'; end if;
  delete from auth.users where id = p_student;
end $$;

create or replace function public.delete_classroom(p_classroom bigint)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_teacher_of(p_classroom) then raise exception 'FORBIDDEN'; end if;
  delete from auth.users where id in (select id from profiles where classroom_id = p_classroom and role = 'student');
  delete from classrooms where id = p_classroom;
end $$;

-- siswa menghapus akunnya sendiri
create or replace function public.delete_me()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if public.my_role() is distinct from 'student' then raise exception 'ONLY_STUDENT'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------------------------------------------------------------- RPC tim & peringkat
create or replace function public.challenge_progress(p_team bigint, p_metric text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(case p_metric
    when 'check_count' then count(*) filter (where a.stage = 'check' and a.correct)
    when 'problems'    then count(*) filter (where a.stage = 'complete')
    else sum(a.xp) end, 0)::int
  from attempts a join profiles p on p.id = a.student_id
  where p.team_id = p_team and a.client_time >= public.week_start_wib()
$$;

create or replace function public.class_leaderboard(p_classroom bigint default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare c bigint := coalesce(p_classroom, public.my_classroom()); ch team_challenges; result json;
begin
  if c is null or not (c = public.my_classroom() or public.is_teacher_of(c)) then raise exception 'FORBIDDEN'; end if;
  select * into ch from team_challenges
    where classroom_id = c and week_start = (public.week_start_wib() at time zone 'Asia/Jakarta')::date;
  with t as (
    select tm.id, tm.name, tm.color,
           (select count(*) from profiles p where p.team_id = tm.id) as members,
           (select coalesce(sum(a.xp), 0) from attempts a join profiles p on p.id = a.student_id
             where p.team_id = tm.id and a.client_time >= public.week_start_wib()) as xp
    from teams tm where tm.classroom_id = c
  )
  select json_build_object(
    'week_start', (public.week_start_wib() at time zone 'Asia/Jakarta')::date,
    'class_name', (select name from classrooms where id = c),
    'teams', coalesce(json_agg(json_build_object(
        'team_id', id, 'team', name, 'color', color, 'members', members,
        'avg_xp', case when members > 0 then round(xp::numeric / members, 1) else 0 end,
        'challenge_done', ch.metric is not null and public.challenge_progress(id, ch.metric) >= ch.target)
      order by case when members > 0 then xp::numeric / members else 0 end desc), '[]'::json))
  into result from t;
  return result;
end $$;

create or replace function public.team_overview()
returns json language plpgsql stable security definer set search_path = public as $$
declare me profiles; tm teams; ch team_challenges; prog int;
begin
  select * into me from profiles where id = auth.uid();
  if me.team_id is null then return json_build_object('team', null); end if;
  select * into tm from teams where id = me.team_id;
  select * into ch from team_challenges
    where classroom_id = me.classroom_id and week_start = (public.week_start_wib() at time zone 'Asia/Jakarta')::date;
  if ch.metric is not null then prog := public.challenge_progress(tm.id, ch.metric); end if;
  return json_build_object(
    'team', json_build_object('id', tm.id, 'name', tm.name, 'color', tm.color),
    'members', (select coalesce(json_agg(json_build_object('nickname', display_name, 'avatar', avatar, 'me', id = me.id)
                 order by display_name), '[]'::json) from profiles where team_id = tm.id),
    'challenge', case when ch.metric is null then null else json_build_object(
                 'metric', ch.metric, 'target', ch.target, 'progress', prog, 'done', prog >= ch.target) end,
    'cheers', (select coalesce(json_agg(x order by x.created_at desc), '[]'::json) from (
                 select p.display_name as nickname, c.sticker, c.created_at
                 from team_cheers c join profiles p on p.id = c.student_id
                 where c.team_id = tm.id order by c.created_at desc limit 10) x));
end $$;

-- ---------------------------------------------------------------- RPC dashboard guru
create or replace function public.class_progress(p_classroom bigint)
returns json language plpgsql stable security definer set search_path = public as $$
declare result json;
begin
  if not public.is_teacher_of(p_classroom) then raise exception 'FORBIDDEN'; end if;
  with st as (
    select id, display_name, avatar, team_id, research_code from profiles
    where classroom_id = p_classroom and role = 'student'
  ), a as (
    select a.* from attempts a where a.student_id in (select id from st)
  ), best as (
    select student_id, problem_id, max(stars) as stars, max(world) as world
    from a where stage = 'complete' group by student_id, problem_id
  ), stage_err as (
    select student_id, stage,
           count(*) filter (where not correct)::numeric / nullif(count(*), 0) as err, count(*) as n
    from a where stage in ('understand', 'model', 'solve', 'check') group by student_id, stage
  ), mis as (
    select student_id, misconception_code, count(*) as n,
           row_number() over (partition by student_id order by count(*) desc) as rk
    from a where misconception_code is not null group by student_id, misconception_code
  )
  select json_build_object(
    'students', (select coalesce(json_agg(json_build_object(
        'id', st.id, 'nickname', st.display_name, 'avatar', st.avatar, 'team_id', st.team_id,
        'research_code', st.research_code,
        'world', (select coalesce(max(world), 0) from best b where b.student_id = st.id),
        'problems_done', (select count(*) from best b where b.student_id = st.id),
        'stars', (select coalesce(sum(stars), 0) from best b where b.student_id = st.id),
        'week_xp', (select coalesce(sum(xp), 0) from a where a.student_id = st.id and a.client_time >= public.week_start_wib()),
        'last_active', (select max(client_time) from a where a.student_id = st.id),
        'main_days', (select coalesce(json_agg(day order by day desc), '[]'::json) from daily_logs d
                      where d.student_id = st.id and d.mission_type = 'main' and d.completed
                        and d.day >= current_date - 30),
        'weak_stage', (select stage from stage_err e where e.student_id = st.id and e.n >= 3
                       order by e.err desc nulls last limit 1),
        'top_misconception', (select misconception_code from mis m where m.student_id = st.id and m.rk = 1)
      ) order by st.display_name), '[]'::json) from st),
    'stage_error_rate', (select coalesce(json_object_agg(stage, round(err, 3)), '{}'::json) from (
        select stage, count(*) filter (where not correct)::numeric / nullif(count(*), 0) as err
        from a where stage in ('understand', 'model', 'solve', 'check') group by stage) s),
    'misconceptions', (select coalesce(json_object_agg(misconception_code, n), '{}'::json) from (
        select misconception_code, count(*) as n from a where misconception_code is not null
        group by misconception_code) m),
    'totals', json_build_object(
        'students', (select count(*) from st),
        'active_week', (select count(distinct student_id) from a where client_time >= public.week_start_wib()),
        'attempts', (select count(*) from a))
  ) into result;
  return result;
end $$;

-- ekspor data penelitian anonim (hanya kelas dengan research_mode = true)
create or replace function public.export_attempts(p_classroom bigint)
returns table (anon_id uuid, research_code text, team text, problem_id text, world smallint, stage text,
               correct boolean, misconception_code text, hints_used smallint, attempt_no smallint,
               duration_ms integer, stars smallint, client_time timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_teacher_of(p_classroom) then raise exception 'FORBIDDEN'; end if;
  if not (select research_mode from classrooms where id = p_classroom) then raise exception 'RESEARCH_MODE_OFF'; end if;
  return query
    select p.anon_id, p.research_code, t.name, a.problem_id, a.world, a.stage, a.correct, a.misconception_code,
           a.hints_used, a.attempt_no, a.duration_ms, a.stars, a.client_time
    from attempts a join profiles p on p.id = a.student_id left join teams t on t.id = p.team_id
    where p.classroom_id = p_classroom order by a.client_time;
end $$;

-- fungsi internal tidak boleh dipanggil anonim
revoke execute on function public.create_classroom(text, boolean), public.assign_team(uuid, bigint),
  public.set_research_code(uuid, text), public.auto_teams(bigint, int), public.set_challenge(bigint, text, int),
  public.delete_student(uuid), public.delete_classroom(bigint), public.delete_me(),
  public.class_leaderboard(bigint), public.team_overview(), public.class_progress(bigint),
  public.export_attempts(bigint), public.challenge_progress(bigint, text)
  from anon, public;
grant execute on function public.create_classroom(text, boolean), public.assign_team(uuid, bigint),
  public.set_research_code(uuid, text), public.auto_teams(bigint, int), public.set_challenge(bigint, text, int),
  public.delete_student(uuid), public.delete_classroom(bigint), public.delete_me(),
  public.class_leaderboard(bigint), public.team_overview(), public.class_progress(bigint),
  public.export_attempts(bigint)
  to authenticated;
