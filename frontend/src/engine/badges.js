// Definisi lencana (docs/GAME_DESIGN.md §4).

export const BADGES = [
  { code: 'misi-pertama', icon: '🚀', name: 'Misi Pertama', desc: 'Menyelesaikan soal pertama.', test: (s) => (s.counters.problemsDone || 0) >= 1 },
  { code: 'penjaga-timbangan', icon: '⚖️', name: 'Penjaga Timbangan', desc: '10 soal timbangan tanpa membuat timbangan miring.', test: (s) => (s.counters.world2Clean || 0) >= 10 },
  { code: 'detektif-cerita', icon: '🔍', name: 'Detektif Cerita', desc: '10 tahap Pahami benar di percobaan pertama.', test: (s) => (s.counters.understandFirstTry || 0) >= 10 },
  { code: 'pemeriksa-teliti', icon: '✅', name: 'Pemeriksa Teliti', desc: '20 kali menyelesaikan tahap Periksa.', test: (s) => (s.counters.checkDone || 0) >= 20 },
  { code: 'guru-kecil', icon: '🧑‍🏫', name: 'Guru Kecil', desc: '15 kali mengisi Jelaskan ke temanmu.', test: (s) => (s.counters.explainDone || 0) >= 15 },
  { code: 'tanda-aman', icon: '➕', name: 'Tanda Aman', desc: '10 soal berturut-turut tanpa salah tanda.', test: (s) => (s.counters.signCleanStreak || 0) >= 10 },
  { code: 'pantang-menyerah', icon: '💪', name: 'Pantang Menyerah', desc: 'Menyelesaikan soal setelah 3 kali mencoba atau lebih.', test: (s) => (s.counters.persevere || 0) >= 1 },
  { code: 'seminggu-penuh', icon: '🔥', name: 'Seminggu Penuh', desc: 'Streak 7 hari.', test: (s) => (s.maxStreak || 0) >= 7 },
  { code: 'pemain-tim', icon: '👥', name: 'Pemain Tim', desc: 'Timmu mencapai target Tantangan Tim mingguan.', test: (s) => (s.counters.teamChallengeDone || 0) >= 1 },
  { code: 'pembelajar', icon: '📚', name: 'Pembelajar Tekun', desc: 'Menuntaskan 8 materi Learning Zone.', test: (s) => (s.counters.lessonsDone || 0) >= 8 },
  { code: 'penantang', icon: '🎯', name: 'Penantang Advanced', desc: 'Menjawab benar 10 soal Advanced di Challenge Zone.', test: (s) => (s.counters.challengeAdvanced || 0) >= 10 },
  // Reward misi tuntas (Mission Map): satu lencana planet per misi.
  ...['🪐', '📦', '🔭', '🛰️', '⚖️', '🔄', '🏆'].map((icon, i) => ({
    code: `mission-${i + 1}`,
    icon,
    name: `Mission 0${i + 1} Tuntas`,
    desc: `Menyelesaikan semua soal Mission 0${i + 1}.`,
    mission: i + 1,
    test: (s) => (s.counters[`mission${i + 1}Done`] || 0) >= 1,
  })),
];

/** Kembalikan lencana baru yang baru saja terpenuhi. */
export function newBadges(stats) {
  const have = new Set(stats.badges || []);
  return BADGES.filter((b) => !have.has(b.code) && b.test(stats));
}
