# Model Data — MATH-MISSION (Supabase / PostgreSQL)

Soal **tidak** disimpan di database. Sumbernya file JSON di `content/worlds/` yang dibundel ke aplikasi, dan dirujuk lewat
`problem_id` (mis. `w6-p05`). Database menyimpan akun, kelas, tim, percobaan, dan cadangan progres.
Definisi lengkap: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

## ERD

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "1 akun = 1 profil"
    AUTH_USERS ||--o{ CLASSROOMS : "guru membuat"
    CLASSROOMS ||--o{ TEAMS : memiliki
    CLASSROOMS ||--o{ PROFILES : "siswa anggota"
    TEAMS ||--o{ PROFILES : "anggota tim"
    PROFILES ||--o{ ATTEMPTS : mengerjakan
    PROFILES ||--o{ DAILY_LOGS : menyelesaikan
    PROFILES ||--o{ STUDENT_BADGES : mendapat
    PROFILES ||--o| STUDENT_STATE : "cadangan progres"
    CLASSROOMS ||--o{ TEAM_CHALLENGES : menetapkan
    TEAMS ||--o{ TEAM_CHEERS : menerima

    PROFILES {
        uuid id PK "= auth.users.id"
        text role "student | teacher"
        text display_name "nama panggilan / nama guru"
        text avatar
        bigint classroom_id FK "siswa saja"
        bigint team_id FK "nullable"
        text research_code "nullable, mis. S01"
        uuid anon_id UK "dipakai di ekspor"
    }
    CLASSROOMS {
        bigint id PK
        uuid teacher_id FK
        text name
        text code UK "6 karakter, mis. K7B3QZ"
        bool research_mode
    }
    TEAMS {
        bigint id PK
        bigint classroom_id FK
        text name
        text color
    }
    ATTEMPTS {
        bigint id PK
        uuid client_id UK "idempoten"
        uuid student_id FK "diisi auth.uid()"
        text problem_id
        smallint world
        text stage "understand|model|solve|check|interpret|explain|warmup|complete|bonus"
        bool correct
        text misconception_code "M1-M8"
        smallint hints_used
        smallint attempt_no
        int duration_ms
        text answer_raw
        smallint xp "dibatasi trigger"
        smallint stars "untuk stage complete"
        timestamptz client_time
        timestamptz server_time
    }
    DAILY_LOGS {
        uuid student_id PK
        date day PK
        text mission_type PK "warmup|main|team"
        text_array problem_ids
        bool completed
    }
    STUDENT_BADGES {
        uuid student_id PK
        text badge_code PK
        timestamptz earned_at
    }
    STUDENT_STATE {
        uuid student_id PK
        jsonb stats
        jsonb progress
        timestamptz updated_at
    }
    TEAM_CHALLENGES {
        bigint classroom_id PK
        date week_start PK "Senin WIB"
        text metric "check_count|xp|problems"
        int target
    }
    TEAM_CHEERS {
        bigint id PK
        bigint team_id FK
        uuid student_id FK
        text sticker "Ayo!|Keren!|Semangat!|Mantap!"
    }
```

## Catatan desain
- `ATTEMPTS` dicatat **per tahap** sehingga guru dan peneliti tahu tahap mana yang paling sulit (pertanyaan penelitian
  tentang beban kognitif per tahap). Tahap `complete` menyimpan bintang soal; `bonus` menyimpan XP misi harian.
- Nama panggilan unik per kelas (indeks `lower(display_name)` untuk siswa).
- XP dan leaderboard dihitung dari `ATTEMPTS` di server (`class_leaderboard`), bukan angka bebas dari klien.
- Siswa hanya boleh mengubah kolom `display_name` dan `avatar` (hak akses per kolom).
- Menghapus siswa = menghapus baris `auth.users`; semua datanya ikut terhapus (cascade). Lihat
  [PRIVACY_ETHICS.md](PRIVACY_ETHICS.md).
- `research_mode` pada kelas mengizinkan ekspor data anonim (`export_attempts`).

## Row Level Security (ringkas)
| Tabel | Siswa | Guru |
|---|---|---|
| `profiles` | baca & ubah nama/avatar diri sendiri | baca siswa di kelasnya |
| `classrooms` | baca kelasnya | kelola kelasnya (buat lewat RPC) |
| `teams` | baca tim di kelasnya | kelola |
| `attempts` | tambah & baca miliknya | baca milik siswanya |
| `daily_logs`, `student_badges` | kelola miliknya | baca |
| `student_state` | kelola miliknya | — |
| `team_challenges` | baca kelasnya | kelola |
| `team_cheers` | kirim & baca untuk timnya | baca |

## Struktur lokal (IndexedDB)
Lihat [ARCHITECTURE.md §4.4](ARCHITECTURE.md#44-penyimpanan-lokal-indexeddb-math-mission). Objek di `outbox` memakai
kolom yang sama dengan `attempts` (tanpa `id`, `student_id`, `server_time`).
