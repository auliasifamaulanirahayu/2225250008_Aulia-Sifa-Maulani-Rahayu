# Spesifikasi API — MATH-MISSION (Supabase)

Aplikasi tidak memakai server REST buatan sendiri. Frontend berbicara langsung dengan Supabase lewat `supabase-js`:
**Auth**, **tabel** (dilindungi RLS), dan **fungsi RPC** Postgres (`security definer`) untuk operasi yang perlu
pemeriksaan khusus. Semua definisi ada di [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

Pemanggil: `src/lib/auth.js`, `src/store/sync.js`, `src/screens/Team.jsx`, `src/screens/Teacher.jsx`.

## 1. Auth

| Aksi | Panggilan | Catatan |
|---|---|---|
| Daftar guru | `auth.signUp({ email, password, options.data: { role:'teacher', display_name } })` | trigger membuat `profiles` |
| Masuk guru | `auth.signInWithPassword({ email, password })` | |
| Daftar siswa | `rpc('check_class')` → `rpc('nickname_available')` → `auth.signUp({ email: sintetis, password: PIN, options.data: { role:'student', class_code, nickname, avatar } })` | trigger memvalidasi kode kelas |
| Masuk siswa | `auth.signInWithPassword({ email: sintetis, password: PIN })` | email sintetis dihitung dari kode kelas + nama panggilan |
| Keluar | `auth.signOut()` | data lokal dihapus setelah sinkron |

Email sintetis siswa: `<kode kelas>.<nama-slug>-<hash6>@<VITE_STUDENT_EMAIL_DOMAIN>` (lihat `studentEmail()`).

## 2. Tabel yang ditulis/dibaca langsung

| Tabel | Operasi dari aplikasi | Contoh |
|---|---|---|
| `profiles` | select profil sendiri + kelas | `.select('id, role, display_name, avatar, team_id, classroom_id, classrooms:classroom_id (id, name, code)')` |
| `attempts` | upsert batch ≤ 50 | `.upsert(items, { onConflict: 'client_id', ignoreDuplicates: true })` |
| `daily_logs` | upsert 7 hari terakhir | `onConflict: 'student_id,day,mission_type'` |
| `student_badges` | upsert | `onConflict: 'student_id,badge_code', ignoreDuplicates: true` |
| `student_state` | upsert / select | cadangan `stats` & `progress` |
| `team_cheers` | insert | `{ team_id, sticker: 'Ayo!' }` |
| `classrooms` | select (guru), update `research_mode` | |
| `teams` | select, insert (guru) | `{ classroom_id, name }` |
| `team_challenges` | select terakhir | |

Contoh baris `attempts` yang dikirim:
```json
{
  "client_id": "7d1e5c0a-2f3b-4a8e-9c61-0b1f2e3d4c5a",
  "problem_id": "w6-p05",
  "world": 6,
  "stage": "solve",
  "correct": false,
  "misconception_code": "M1",
  "hints_used": 1,
  "attempt_no": 1,
  "duration_ms": 41250,
  "answer_raw": "3x = 25000 + 4000",
  "xp": 0,
  "stars": null,
  "client_time": "2026-11-20T02:14:09Z"
}
```

## 3. Fungsi RPC

### Publik (sebelum login)
| Fungsi | Parameter | Hasil |
|---|---|---|
| `check_class` | `p_code` | `[{ name }]` atau kosong |
| `nickname_available` | `p_code, p_nick` | `true/false` |

### Siswa
| Fungsi | Hasil |
|---|---|
| `team_overview()` | `{ team:{id,name,color}, members:[{nickname,avatar,me}], challenge:{metric,target,progress,done}, cheers:[{nickname,sticker,created_at}] }` atau `{ team:null }` |
| `class_leaderboard(p_classroom?)` | `{ week_start, class_name, teams:[{team_id, team, color, members, avg_xp, challenge_done}] }` urut `avg_xp` |
| `delete_me()` | menghapus akun siswa sendiri beserta datanya |

### Guru
| Fungsi | Parameter | Fungsi |
|---|---|---|
| `create_classroom` | `p_name, p_research` | membuat kelas + kode 6 karakter unik (tanpa I/O/0/1) |
| `class_progress` | `p_classroom` | `{ students:[{id,nickname,avatar,team_id,research_code,world,problems_done,stars,week_xp,last_active,main_days,weak_stage,top_misconception}], stage_error_rate:{understand,model,solve,check}, misconceptions:{M1:n,…}, totals:{students,active_week,attempts} }` |
| `class_leaderboard` | `p_classroom` | seperti di atas |
| `auto_teams` | `p_classroom, p_size` | membagi siswa tanpa tim secara acak |
| `assign_team` | `p_student, p_team` | memindahkan siswa ke tim (null = tanpa tim) |
| `set_research_code` | `p_student, p_code` | kode informan (mis. S01) |
| `set_challenge` | `p_classroom, p_metric, p_target` | target tim minggu berjalan |
| `export_attempts` | `p_classroom` | baris CSV anonim; hanya bila `research_mode` |
| `delete_student` | `p_student` | hapus akun & data siswa |
| `delete_classroom` | `p_classroom` | hapus kelas, akun siswa, dan datanya |

Semua fungsi guru memeriksa `is_teacher_of(...)`; bila bukan pemilik kelas → error `FORBIDDEN`.

## 4. Kode error yang diterjemahkan aplikasi
| Kode/pesan | Teks untuk pengguna |
|---|---|
| `CLASS_NOT_FOUND` | Kode kelas tidak ditemukan. Cek lagi ke gurumu. |
| `Invalid login credentials` | Kode kelas, nama panggilan, atau PIN salah. / Email atau password salah. |
| `FORBIDDEN` | Kamu tidak punya akses ke data ini. |
| `RESEARCH_MODE_OFF` | Mode penelitian belum aktif untuk kelas ini. |
| jaringan | Tidak ada internet atau server belum bisa dihubungi. |

## 5. Ekspor CSV
Kolom: `anon_id, research_code, team, problem_id, world, stage, correct, misconception_code, hints_used, attempt_no,
duration_ms, stars, client_time`. **Tidak** memuat nama panggilan. Bisa diunduh dari dashboard guru atau lewat
`python content/tools/export_research.py --class-code K7B3QZ`.

## Edge Function `ai-tutor` (AI Math Tutor)

`POST {SUPABASE_URL}/functions/v1/ai-tutor` dengan header `Authorization: Bearer <JWT siswa>` (dipanggil lewat
`supabase.functions.invoke` di `src/lib/tutor.js`). Kode: [`supabase/functions/ai-tutor/index.ts`](../supabase/functions/ai-tutor/index.ts).

Permintaan:
```json
{
  "session_id": "uuid atau null",
  "message": "Aku bingung soal tanda",
  "history": [{ "role": "student|tutor", "content": "..." }],
  "problem": { "id": "w4-p03", "text": "cerita + pertanyaan (tanpa kunci)", "stage": "Pahami" },
  "attempted": true,
  "mode": "guide | full",
  "mission": 4
}
```
Balasan sukses: `{ "session_id": "...", "reply": "...", "mode": "guide" }`.
Balasan fallback (HTTP 200): `{ "fallback": true, "reason": "disabled|limit|quota|not_configured|error" }` →
aplikasi memakai tutor bawaan (`src/engine/tutorFallback.js`).
Error: `401 UNAUTHENTICATED`, `403 ONLY_STUDENT`, `400 EMPTY|BAD_JSON`.

Aturan server: hanya siswa; kelas harus `ai_tutor = true`; `mode: "full"` diturunkan ke `guide` bila `attempted`
false; maksimal 10 pesan riwayat; kuota harian per siswa (`AI_DAILY_LIMIT`, hari WIB).

Ke Google: **Interactions API** `POST https://generativelanguage.googleapis.com/v1beta/interactions`, header
`x-goog-api-key` dan `Api-Revision: 2026-05-20`, body `{ model, system_instruction, input:[{type:"user_input"|"model_output",
content:[{type:"text",text}]}], store:false, generation_config:{max_output_tokens} }`. Teks balasan diambil dari
`steps[type=model_output].content[type=text].text`. (Diverifikasi dari dokumentasi resmi aistudio.google.com/docs,
November 2026. Model gemini 3.6+ mengabaikan `temperature`, jadi tidak dikirim.)

Model bawaan `gemini-3.5-flash-lite` (free tier, belum ada jadwal penghentian). Ganti lewat secret `GEMINI_MODEL`.
