// Tutor bawaan (tanpa AI): dipakai saat offline, mode demo, AI belum dinyalakan guru, kuota habis, atau error.
// Murni (tanpa React/DOM/jaringan) agar bisa diuji. Mengikuti aturan yang sama dengan AI Tutor:
// satu petunjuk dalam satu waktu, kalimat pendek, tidak memberi jawaban akhir kecuali pembahasan lengkap diminta
// setelah siswa mencoba (CLAUDE.md aturan 6).

import { pretty } from './equation.js';

const OP_WORD = { add: 'ditambah', sub: 'dikurangi', mul: 'dikali', div: 'dibagi' };
const thousands = (s) => s.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
/** Persamaan ("3*x = 21") → tampilan; nilai/suku ("4000", "2*x", "-5") → tampilan. */
const fmt = (s) => thousands(String(s).includes('=') ? pretty(String(s)) : String(s).replace(/\*/g, '').replace(/-/g, '−'));

const TOPICS = [
  {
    test: /tanda|negatif|minus|pindah ruas|pindah/i,
    text: (mission) =>
      mission >= 6
        ? 'Tanda berubah karena kita melakukan operasi yang sama di kedua ruas. Contoh: x + 5 = 9, kurangi 5 di kedua ruas, jadi x = 9 − 5. Coba: pada x + 8 = 3, berapa yang dikurangkan di kedua ruas?'
        : 'Ingat timbangan: apa pun yang dilakukan di ruas kiri, lakukan juga di ruas kanan. Pada x + 5 = 9, kita kurangi 5 di kedua ruas. Menurutmu, hasil ruas kanannya berapa?',
  },
  {
    test: /cerita|soal cerita|paham soal|memahami soal|maksud soal/i,
    text: () =>
      'Tidak apa-apa. Kita pahami dulu ceritanya. Coba baca satu kalimat, lalu sebutkan angka apa saja yang DIKETAHUI.',
  },
  {
    test: /persamaan(nya)?|model|membuat x|misal/i,
    text: () =>
      'Pertama, tentukan apa yang DITANYA, lalu misalkan itu x. Setelah itu, cari hubungan antar-angka di cerita. Apa yang ditanya pada soalmu?',
  },
  {
    test: /variabel|apa itu x|huruf/i,
    text: () => 'Variabel seperti x mewakili bilangan yang belum diketahui, seperti kotak misteri. Pada x + 3 = 10, bilangan apa yang cocok di kotak itu?',
  },
  {
    test: /koefisien|konstanta|suku/i,
    text: () => 'Pada 3x + 5: angka 3 di depan x disebut koefisien, dan 5 disebut konstanta. Pada 4x − 7, mana koefisien dan konstantanya?',
  },
  {
    test: /periksa|cek|substitusi|benar (tidak|gak|nggak)/i,
    text: () => 'Untuk memeriksa, ganti x dengan jawabanmu di persamaan awal. Jika ruas kiri dan kanan sama, jawabanmu benar. Coba hitung ruas kirinya dulu.',
  },
  {
    test: /plsv|persamaan linear/i,
    text: () => 'PLSV adalah persamaan dengan satu variabel berpangkat satu, misalnya x + 3 = 10. Apakah 2x − 1 = 7 termasuk PLSV menurutmu?',
  },
  {
    test: /langkah|selanjutnya|berikutnya|mulai dari mana/i,
    text: () => 'Tujuan kita: membuat x sendirian di satu ruas. Lihat bilangan yang menempel pada x. Operasi apa yang bisa menghilangkannya dari kedua ruas?',
  },
];

const GENERIC =
  'Bagian mana yang membuatmu bingung: memahami soal, membuat persamaan, menghitung, atau memeriksa jawaban?';

/** Pembahasan lengkap dari langkah baku di bank soal (hanya setelah siswa mencoba & meminta). */
export function fullSolution(p) {
  const lines = [`Persamaan: ${fmt(p.model?.equation || p.equation)}`];
  p.solve.steps.forEach((st, i) => {
    const how = st.op === 'expand' ? 'jabarkan tanda kurung' : `kedua ruas ${OP_WORD[st.op]} ${fmt(st.value)}`;
    lines.push(`Langkah ${i + 1}: ${how} → ${fmt(st.result)}`);
  });
  lines.push(p.check?.answer_sentence || `Jadi, x = ${fmt(p.solve.answer)}.`);
  lines.push('Sekarang periksa: ganti x dengan jawaban itu di persamaan awal. Apakah kedua ruas sama?');
  return lines.join('\n');
}

/**
 * Balasan tutor bawaan.
 * @param {{message:string, problem?:object, hints?:string[], turn?:number, mode?:'guide'|'full', attempted?:boolean, mission?:number}} a
 * @returns {{text:string, turn:number}} turn = indeks petunjuk berikutnya (petunjuk bertingkat)
 */
export function fallbackReply({ message = '', problem = null, hints = [], turn = 0, mode = 'guide', attempted = false, mission = 1 }) {
  if (problem && mode === 'full' && attempted) return { text: fullSolution(problem), turn };
  if (problem && /jawab(an)?(nya)?\s*(apa|berapa)|kasih jawaban|langsung jawab/i.test(message) && !attempted) {
    return { text: 'Coba kerjakan dulu, ya. Kalau sudah mencoba dan masih bingung, kamu boleh minta pembahasan lengkap. Mau petunjuk kecil dulu?', turn };
  }
  const askHint = /langkah|selanjutnya|berikutnya|petunjuk|bantu|mulai|bingung$|^bingung/i.test(message.trim());
  const topic = !(problem && hints.length && askHint) && TOPICS.find((t) => t.test.test(message));
  if (topic) return { text: topic.text(mission), turn };
  if (problem && hints.length) {
    const i = Math.min(turn, hints.length - 1);
    const lead = i === 0 ? 'Petunjuk pertama: ' : i === hints.length - 1 ? 'Petunjuk terakhir: ' : 'Petunjuk berikutnya: ';
    return { text: `${lead}${hints[i]}`, turn: turn + 1 };
  }
  return { text: GENERIC, turn };
}

/**
 * True bila balasan menyebut jawaban akhir "x = …" (dipakai untuk menjaga mode bimbingan).
 * Menangani titik ribuan (7.000) dan tanda minus Unicode (−5).
 */
export function leaksAnswer(reply, answer) {
  if (!reply || answer == null) return false;
  const norm = (s) =>
    String(s)
      .replace(/−/g, '-')
      .replace(/(\d)\.(?=\d{3}(?!\d))/g, '$1')
      .replace(/\s+/g, '');
  const a = norm(answer).replace(/[()]/g, '');
  const r = norm(reply);
  const esc = a.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return new RegExp(`x=\\(?${esc}\\)?(?![\\d/])`, 'i').test(r);
}

/** Pesan untuk siswa saat AI tidak dipakai. */
export const FALLBACK_REASON = {
  demo: 'Mode demo: kamu dibantu tutor bawaan (tanpa AI).',
  disabled: 'AI Tutor belum dinyalakan gurumu. Kamu dibantu tutor bawaan dulu.',
  offline: 'Sedang tanpa internet. Tutor bawaan membantumu dulu.',
  limit: 'Kesempatan bertanya ke AI hari ini sudah habis. Lanjut dengan tutor bawaan, ya.',
  quota: 'AI sedang sibuk. Tutor bawaan membantumu dulu.',
  not_configured: 'AI belum disiapkan di server. Tutor bawaan membantumu dulu.',
  error: 'AI sedang tidak tersedia. Tutor bawaan membantumu dulu.',
};
