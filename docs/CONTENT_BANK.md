# Bank Konten & Spesifikasi Soal — MATH-MISSION

## 1. Peta konten

| Misi | Nama | Fokus | Bentuk soal | Jumlah |
|---|---|---|---|---|
| 01 | Mengenal PLSV | Bentuk PLSV, ruas, timbangan seimbang | x ± a = b (mode timbangan) | 12 |
| 02 | Memahami Variabel | Variabel, koefisien, konstanta, suku; kalimat → simbol | kalimat → persamaan, ax = b | 13 |
| 03 | Mengenali Informasi dalam Soal | Diketahui, ditanya, informasi tak terpakai | cerita 1 langkah | 10 |
| 04 | Soal Cerita menjadi Persamaan | Memisalkan x dan menyusun persamaan | cerita 2 langkah; tahap Selesaikan **diberikan** | 8 |
| 05 | Menyelesaikan Persamaan | Operasi pada kedua ruas | ax + b = c, x di kedua ruas | 17 |
| 06 | Memahami Perubahan Tanda | Bilangan negatif; **jalan pintas pindah ruas** | negatif, x di kedua ruas | 15 |
| 07 | Tantangan PLSV | Kurung, pecahan, masalah literasi | 2(x + 3) = 18, x/4 + 2 = 5, cerita + tabel | 26 |
| Pemanasan | Bilangan bulat, 1 langkah PLSV | −3 + 8, 4 − (−2), x + 2 = 5 (kartu cepat) | dibangkitkan | 60 |

File `content/worlds/world-N.json` = Mission N. ID soal `wN-pXX` (N = nomor misi).

Kenaikan kesulitan di dalam misi: level 1 (bilangan kecil, positif) → level 2 (bilangan negatif/lebih besar) →
level 3 (bentuk tidak biasa, mis. konstanta di kiri: 16 = 3x − 5). Panjang cerita: level 1 ≤ 2 kalimat,
level 2 ≤ 3 kalimat, level 3 ≤ 4 kalimat (A4). Soal literasi (Mission 07) boleh ≤ 5 kalimat plus tabel kecil.

"Pindah ruas" hanya boleh disebut mulai Mission 06 (diuji otomatis di `engine.test.js`). Validator juga
memastikan setiap misi dimulai dengan contoh lengkap lalu contoh bertahap, serta punya `title`, `goal`, `intro`.

## 2. Tipe soal

| Tipe | Keterangan |
|---|---|
| `worked` | Contoh lengkap; siswa menekan "Lanjut" per langkah dan menjawab 1 pertanyaan "kenapa" |
| `faded` | Sebagian langkah kosong yang harus diisi |
| `solve` | Persamaan simbolik, siswa menyelesaikan langkah demi langkah |
| `balance` | Persamaan di timbangan, siswa memilih operasi |
| `translate` | Kalimat → persamaan (pilihan ganda atau susun kartu) |
| `story` | Soal cerita, alur 4 tahap penuh |
| `literacy` | Soal cerita + data (tabel/gambar) + pertanyaan menafsirkan/mengevaluasi |
| `warmup` | Soal cepat prasyarat |

## 3. Skema JSON soal

File `content/worlds/world-N.json` berisi `{ "world": N, "title": "...", "problems": [ ... ] }`.

```json
{
  "id": "w6-p01",
  "world": 6,
  "level": 1,
  "type": "story",
  "order": 4,
  "context": { "pisa": "personal", "setting": "toko buku" },
  "literacy": ["formulate", "employ", "interpret"],
  "story": [
    "Dina membeli 3 buku tulis yang harganya sama.",
    "Dina juga membeli 1 pulpen seharga Rp4.000.",
    "Dina membayar Rp25.000 seluruhnya."
  ],
  "question": "Berapa harga 1 buku tulis?",
  "understand": {
    "known_options": [
      { "text": "Banyak buku tulis: 3", "correct": true },
      { "text": "Harga pulpen: Rp4.000", "correct": true },
      { "text": "Total bayar: Rp25.000", "correct": true },
      { "text": "Harga 1 buku tulis: Rp4.000", "correct": false }
    ],
    "asked_options": [
      { "text": "Harga 1 buku tulis", "correct": true },
      { "text": "Total belanja Dina", "correct": false }
    ]
  },
  "model": {
    "variable": { "symbol": "x", "meaning": "harga 1 buku tulis (rupiah)" },
    "variable_options": ["harga 1 buku tulis", "banyak buku tulis", "harga pulpen"],
    "equation": "3*x + 4000 = 25000",
    "equation_options": ["3*x + 4000 = 25000", "3*x = 25000 + 4000", "x + 4000 = 25000"]
  },
  "solve": {
    "answer": "7000",
    "steps": [
      { "op": "sub", "value": "4000", "result": "3*x = 21000" },
      { "op": "div", "value": "3", "result": "x = 7000" }
    ]
  },
  "check": {
    "substitution": "3*7000 + 4000 = 25000",
    "sense_question": "Apakah Rp7.000 masuk akal untuk harga satu buku tulis?",
    "answer_sentence": "Jadi, harga 1 buku tulis adalah Rp7.000."
  },
  "explain_options": [
    { "text": "Kedua ruas dikurangi 4.000 agar 3x sendirian.", "correct": true },
    { "text": "4.000 dipindah ke kanan tetap +4.000.", "correct": false },
    { "text": "Kedua ruas dibagi 3 agar mendapat harga 1 buku.", "correct": true }
  ],
  "hints": [
    "Apa yang belum diketahui? Itulah yang kita misalkan x.",
    "Total = harga 3 buku + harga pulpen. Tulis dengan x.",
    "Lihat contoh: 2x + 3.000 = 13.000. Kurangi 3.000 di kedua ruas dulu."
  ],
  "misconceptions": [
    { "code": "M1", "wrong_step": "3*x = 25000 + 4000", "feedback": "Kita mengurangi 4.000 di kedua ruas, jadi ruas kanan 25.000 − 4.000." },
    { "code": "M4", "wrong_answer": "18000", "feedback": "3x artinya 3 dikali x. Lawan dari kali adalah bagi." },
    { "code": "M8", "wrong_answer_format": "no_unit", "feedback": "Tulis jawabannya dengan satuan rupiah." }
  ],
  "emoji": "📚",
  "source": "Diadaptasi dari lembar kerja S01 nomor 4"
}
```

Contoh di atas disederhanakan. File yang dihasilkan `build_worlds.py` juga memuat:
- `equation` di tingkat atas (untuk semua tipe soal; soal cerita juga punya `model.equation` yang sama);
- `check.answer_template` (mis. `"Jadi, harga 1 buku tulis adalah {jawaban}."`) dan `check.unit` (`"rp"`, `"tahun"`, …)
  untuk tahap menulis jawaban;
- `given_steps` (contoh bertahap simbolik: banyak langkah yang sudah diisi) atau `given_stages`
  (contoh bertahap cerita: tahap yang sudah diisi, mis. `["understand", "model"]`);
- `table` (`{title, headers, rows}`) dan `interpret` (`{question, options, answer}`) untuk soal literasi Mission 07.
- `ui` (`{balance, op_only, term_keypad}`): alat bantu di tahap Selesaikan, dihitung generator dari bentuk persamaan.

Aturan field:
- `equation`, `result`, `substitution` ditulis dalam sintaks SymPy (`*` untuk kali, `/` untuk bagi).
- `op` ∈ `add`, `sub`, `mul`, `div`, `expand` (jabarkan kurung).
- `story` adalah array kalimat; tiap kalimat ≤ 15 kata, ditampilkan satu per satu.
- `hints` tepat 3 tingkat; tingkat 3 berisi contoh serupa, **bukan** jawaban soal ini. Di tahap Selesaikan, petunjuk
  tingkat 2 dihitung dinamis dari persamaan yang sedang dikerjakan siswa.
- Field `understand`, `model`, `check`, `explain_options` wajib untuk tipe `story` dan `literacy`.
- Ilustrasi saat ini memakai emoji (`emoji`) agar ringan dan offline; ilustrasi SVG khusus menyusul.

## 3a. Cara menambah atau mengubah soal

1. Buka `content/tools/build_worlds.py`.
   - Soal simbolik: tambahkan persamaan di daftar `eqs` fungsi `world_N()`.
   - Soal cerita: tambahkan `dict(...)` di `WORLD6_STORIES` / `WORLD7_STORIES` (cerita, pilihan diketahui/ditanya,
     arti x, persamaan benar + pengecoh, hubungan, satuan, kalimat jawaban).
2. Jalankan `python content/tools/build_worlds.py` — langkah penyelesaian, kunci, petunjuk, pilihan "Jelaskan ke
   temanmu", dan pola miskonsepsi M1/M4 dihitung otomatis dengan SymPy.
3. Jalankan `python content/tools/validate_content.py` — wajib `OK`.
4. Jalankan `npm test` di `frontend/` — mesin JS menyelesaikan ulang setiap soal dan memastikan hasilnya sama.

## 4. Validasi otomatis (`content/tools/validate_content.py`)

Skrip Python memeriksa setiap soal:
1. Field wajib ada dan bertipe benar.
2. `id` unik, `world`/`level`/`order` konsisten.
3. `sympy.solve(equation)` menghasilkan tepat satu penyelesaian dan sama dengan `answer`.
4. Setiap `steps[i].result` setara dengan persamaan sebelumnya setelah operasi `op` diterapkan.
5. `substitution` bernilai benar.
6. Setiap `wrong_step` memang **tidak** setara dengan langkah yang benar (agar deteksi miskonsepsi bermakna).
7. Panjang kalimat `story` ≤ 15 kata, jumlah kalimat sesuai batas level.
8. Tepat satu `equation_options` yang setara dengan `equation`.
9. Untuk soal cerita: jawaban positif dan wajar (mis. harga kelipatan Rp500, umur 0–100).

Skrip keluar dengan kode ≠ 0 bila ada kesalahan, sehingga bisa dipakai di CI.

## 5. Contoh soal (kunci sudah diperiksa)

Status saat ini: **101 soal** di 7 misi lolos validasi. ID di tabel contoh di bawah memakai penomoran lama (sebelum
Mission Map); persamaannya tetap ada di misi yang sesuai. Soal Pemanasan dibangkitkan
otomatis setiap hari oleh `frontend/src/engine/warmup.js` (5 soal, lebih banyak soal tanda bila siswa sering salah tanda).
Nomor ID pada tabel di bawah adalah rancangan awal; ID final ada di file JSON.

| ID | Tipe | Soal | Kunci |
|---|---|---|---|
| w1-p01 | translate | "Sebuah bilangan ditambah 3 hasilnya 10." Pilih bentuk matematikanya. | x + 3 = 10 (x = 7) |
| w1-p05 | solve | Kotak misteri + 8 = 13 | 5 |
| w2-p01 | balance | Timbangan: x + 5 di kiri, 12 di kanan | x = 7 (kurangi 5 kedua ruas) |
| w2-p06 | balance | 4x = 20 | x = 5 (bagi 4 kedua ruas) |
| w3-p00 | worked | 4x + 6 = 30 | 4x = 24 → x = 6 |
| w3-p03 | solve | 3x − 5 = 16 *(dari lembar kerja S01)* | 3x = 21 → x = 7 |
| w3-p09 | solve | 16 = 3x − 5 (konstanta di kiri) | x = 7 |
| w4-p02 | solve | 5x + 2 = 2x + 14 *(dari lembar kerja S01)* | 3x = 12 → x = 4 |
| w5-p01 | solve | 2(x + 3) = 18 | 2x + 6 = 18 → x = 6 |
| w5-p07 | solve | x/4 + 2 = 5 | x/4 = 3 → x = 12 |
| w6-p01 | story | Dina, 3 buku tulis, pulpen Rp4.000, bayar Rp25.000 *(dari lembar kerja S01)* | Rp7.000 |
| w6-p04 | story | Umur kakak 4 tahun lebih tua dari 2 kali umur adiknya. Umur kakak 14 tahun. Berapa umur adik? *(dari lembar kerja S01)* | 2x + 4 = 14 → 5 tahun |
| w7-p01 | literacy | Tarif angkot: Rp5.000 untuk naik, lalu Rp2.000 tiap km. Rani membayar Rp17.000. Berapa km perjalanannya? Apakah lebih hemat naik ojek tarif datar Rp15.000? | 2000x + 5000 = 17000 → 6 km; ojek lebih hemat Rp2.000 |
| w7-p03 | literacy | Kas kelas: 32 siswa membayar iuran sama, wali kelas menyumbang Rp40.000, terkumpul Rp200.000. Berapa iuran tiap siswa? Tabel harga 3 pilihan hadiah untuk wali kelas disertakan. | 32x + 40000 = 200000 → Rp5.000 |

Miskonsepsi yang diuji pada contoh: w3-p03 (M1: 3x = 16 − 5 → x = 11/3; M4: x = 18), w5-p01 (M6: 2x + 3 = 18),
w6-p01 (M1, M4, M8), w6-p04 (M7: memaknai x sebagai "adik", bukan "umur adik").

## 6. Pedoman menulis soal

- Kalimat aktif, pendek, satu informasi per kalimat.
- Angka dan satuan konsisten; uang memakai "Rp" dan titik ribuan.
- Hindari informasi pengecoh pada level 1–2; informasi tak terpakai sengaja dilatih di Mission 03 dan boleh ada di Mission 04 & 07
  (melatih memilah informasi).
- Variasi konteks dalam satu misi minimal 4 konteks berbeda (B1).
- Setiap soal cerita harus punya pertanyaan kewajaran di tahap Periksa.
- Soal yang diadaptasi dari buku atau lembar kerja ditulis sumbernya di field `source`.
- Setiap soal baru ditinjau minimal oleh 1 rekan atau dosen sebelum masuk rilis.

## Learning Zone & Challenge Zone (`content/zones/`)

Ditulis di `content/tools/build_worlds.py` (bagian *LEARNING ZONE & CHALLENGE ZONE*), dihasilkan ke
`content/zones/learning.json` dan `challenge.json`, lalu divalidasi `validate_content.py`.

**Materi** (`lessons[]`): `{id, title, emoji, mission, requires?, pages[]}`. Jenis halaman:
`explain {title, text[], visual?}` (visual: `balance {eq}`, `parts {tokens:[[teks, var|coef|const|op|eq]]}`,
`table {headers, rows}`), `example {title, lines:[{text, eq?}]}` (dibuka satu per satu), `summary {points[]}`,
`quiz {questions[]}`. Contoh dikerjakan dibangkitkan dari `gen_steps` (`worked_lines`), jadi sama dengan langkah baku.

**Soal** (dipakai latihan materi & Challenge Zone), `level`: `easy | medium | advanced`:

| type | Isi | Kunci dihitung |
|---|---|---|
| `mc` | `prompt, eq?, options[{text|eq, correct, why}]` | bila `eq` & semua opsi persamaan: hanya opsi benar yang setara |
| `short` | `prompt, eq?, answer, hint` | `verify: "solution"` → `answer` = penyelesaian `eq` (SymPy) |
| `step` | `eq, steps[{from, options[{eq, correct, why}]}], answer` | dari `gen_steps`; pengecoh otomatis: salah tanda di ruas kanan & hanya satu ruas |
| `story` | `story[], question, eq, answer, unit, hint, template, check{left_value,right_value}` | SymPy; tahap **Periksa** wajib |

Aturan validator tambahan: setiap pilihan salah punya `why` ≤ 2 kalimat; `hint` tidak memuat `x = <jawaban>`;
cerita: kalimat ≤ 15 kata, jumlah kalimat easy ≤ 2 / medium ≤ 3 / advanced ≤ 4, jawaban positif, harga kelipatan
Rp500; pengecoh soal langkah tidak boleh setara dengan soal; 8 materi; minimal 8 soal per level.
`engine.test.js` juga mencocokkan setiap kunci dengan mesin aljabar aplikasi.
