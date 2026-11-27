const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

// Uji asap end-to-end di viewport HP. Jalankan: npm run build; npm run preview (terminal lain); npm run e2e
// Memakai Chrome/Edge yang sudah terpasang (atur CHROME_PATH bila perlu).
const ROOT = path.resolve(__dirname, '../..');
const world = (n) => JSON.parse(fs.readFileSync(`${ROOT}/content/worlds/world-${n}.json`, 'utf8'));
const P = (id) => world(Number(id[1])).problems.find((p) => p.id === id);
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function findBrowser() {
  const list = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const found = list.find((p) => p && fs.existsSync(p));
  if (!found) throw new Error('Chrome/Edge tidak ditemukan. Atur CHROME_PATH.');
  return found;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
  const base = process.env.E2E_URL || 'http://localhost:4173/';
  const log = (...a) => console.log('•', ...a);
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
  const waitText = (t, timeout = 6000) =>
    page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, t).catch(async () => {
      await shot('FAIL-' + t.slice(0, 20).replace(/\W/g, '_'));
      throw new Error('Teks tidak muncul: ' + t);
    });
  const click = async (text, exact = false) => {
    const fn = (t, ex) => {
      const els = [...document.querySelectorAll('button, a, summary')].filter(
        (e) => !e.disabled && (ex ? e.textContent.trim() === t || e.textContent.trim() === '✓ ' + t : e.textContent.includes(t)),
      );
      return els;
    };
    await page.waitForFunction((t, ex) => {
      const els = [...document.querySelectorAll('button, a, summary')].filter(
        (e) => !e.disabled && (ex ? e.textContent.trim() === t : e.textContent.includes(t)),
      );
      return els.length > 0;
    }, { timeout: 6000 }, text, exact).catch(async () => {
      await shot('FAIL-click-' + text.slice(0, 20).replace(/\W/g, '_'));
      throw new Error('Tombol tidak ada: ' + text);
    });
    await page.evaluate((t, ex) => {
      const els = [...document.querySelectorAll('button, a, summary')].filter(
        (e) => !e.disabled && (ex ? e.textContent.trim() === t : e.textContent.includes(t)),
      );
      els[els.length - 1].click();
    }, text, exact);
    void fn;
    await sleep(200);
  };
  const typeLine = async (s) => {
    for (let i = 0; i < 30; i++) await page.keyboard.press('Backspace');
    await page.keyboard.type(s);
    await page.keyboard.press('Enter');
    await sleep(250);
  };
  const explain = async (id) => {
    for (const o of P(id).explain_options.filter((o) => o.correct)) await click(o.text, true);
    await click('Cek', true);
  };

  // 1. awal
  await page.goto(base, { waitUntil: 'networkidle0' });
  await waitText('Mulai Misi');
  await waitText('Mode Guru');
  await shot('01-welcome');
  log('Landing page: Mulai Misi, Login, dan Mode Guru tampil');

  // 2. demo siswa
  await click('Mulai Misi');
  await page.type('#nick', 'Raka');
  await click('Mulai demo');
  await waitText('Misi hari ini');
  await shot('02-home');
  log('Beranda misi harian tampil');

  // 3. contoh lengkap w1-p00
  await page.goto(base + '#/play/w1-p00');
  await waitText('Langkah penyelesaian');
  await click('Langkah berikutnya');
  await waitText('Seimbang!');
  await shot('03-worked');
  await click('Paham, lanjut');
  await waitText('Jelaskan ke temanmu');
  await explain('w1-p00');
  await waitText('Soal selesai!');
  await shot('04-result');
  log('Contoh lengkap → Jelaskan → Hasil: OK');

  // 4. w5-p03 (3x − 5 = 16, lembar kerja S01 no. 2) dengan kesalahan tanda (M1)
  await page.goto(base + '#/play/w5-p03');
  await waitText('Buat x sendirian');
  await typeLine('3x=16-5');
  await waitText('Lihat tandanya');
  await shot('05-misconception-M1');
  log('Miskonsepsi M1 terdeteksi pada "3x = 16 − 5"');
  await typeLine('3x=21');
  await waitText('Benar! Kedua ruas tetap seimbang');
  await typeLine('x=7');
  await waitText('Hebat!');
  await click('Lanjut ke Periksa');
  await waitText('Ruas kiri');
  await typeLine('16');
  await waitText('Jawabanmu benar');
  await shot('06-check');
  await click('Lanjut ▸', true);
  await explain('w5-p03');
  await waitText('Soal selesai!');
  log('Soal simbolik w5-p03 selesai (tulis langkah + substitusi)');

  // 5. soal cerita w3-p05 (Mission 03: ada informasi yang tidak dipakai)
  const s = P('w3-p05');
  await page.goto(base + '#/play/w3-p05');
  await waitText(s.story[0]);
  await click('Lanjut baca');
  await click('Lanjut baca');
  await waitText('Ketuk yang DIKETAHUI');
  await click('Cek', true);
  await waitText('Masih ada');
  for (const o of s.understand.known_options.filter((o) => o.correct)) await click(o.text, true);
  await click(s.understand.asked_options.find((o) => o.correct).text, true);
  await shot('07-understand');
  await click('Cek', true);
  await waitText('Misalkan x adalah');
  await click(s.model.variable_options[1], true);
  await click('5x = 20.000', true);
  await click('Cek', true);
  await waitText('x sebaiknya hal yang DITANYA');
  await click(s.model.variable.meaning, true);
  await shot('08-model');
  await click('Cek', true);
  await waitText('Buat x sendirian');
  await typeLine('x=4000');
  await waitText('Hebat!');
  await click('Lanjut ke Periksa');
  await typeLine('20000');
  await waitText('Masuk akal?');
  await click('Ya', true);
  await waitText('Tulis jawabanmu');
  await typeLine('4000');
  await waitText('Jelaskan ke temanmu');
  await explain('w3-p05');
  await waitText('Soal selesai!');
  await shot('09-story-result');
  log('Soal cerita w3-p05: Pahami → Modelkan → Selesaikan → Periksa → Jelaskan: OK');

  // 5b. Mission 04: tahap Selesaikan sudah diisi (fokus memodelkan)
  await page.goto(base + '#/play/w4-p03');
  await waitText(P('w4-p03').story[0]);
  await shot('09b-mission4');
  log('Mission 04 (Selesaikan diberikan) terbuka');

  // 6. timbangan (mode operasi) w1-p06: x + 5 = 12
  await page.goto(base + '#/play/w1-p06');
  await waitText('Pilih operasi');
  await click('− Kurangi');
  await typeLine('5');
  await waitText('Hebat!');
  await shot('10-balance');
  log('Timbangan: kurangi 5 di kedua ruas → x = 7');

  // 7. pemanasan
  await page.goto(base + '#/warmup');
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('.warmup-card .eq-big');
    const prompt = await page.$eval('.warmup-card .eq-big', (e) => e.textContent);
    const js = prompt.replace(/−/g, '-').replace(/×/g, '*').replace(/:/g, '/');
    let ans;
    let m;
    if ((m = js.match(/^x \+ (\d+) = (-?\d+)$/))) ans = Number(m[2]) - Number(m[1]);
    else if ((m = js.match(/^(\d+)x = (-?\d+)$/))) ans = Number(m[2]) / Number(m[1]);
    else ans = eval(js); // eslint-disable-line no-eval
    if (i === 0) await shot('11-warmup');
    await typeLine(String(ans));
  }
  await waitText('Pemanasan selesai!');
  log('Pemanasan 5 soal selesai');

  // 8. layar lain
  for (const [r, n] of [['#/home', '12-home-after'], ['#/map', '13-map'], ['#/world/1', '14-world'], ['#/profile', '15-profile'], ['#/team', '16-team']]) {
    await page.goto(base + r);
    await sleep(700);
    await shot(n);
  }
  log('Peta, dunia, profil, tim tampil');

  // 9. offline
  await page.goto(base + '#/home', { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active);
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitText('Misi hari ini', 8000);
  const xp = await page.evaluate(() => document.querySelector('[data-xp]')?.textContent);
  if (!/^[1-9]\d* XP$/.test(xp || '')) throw new Error('XP tidak tampil saat offline: ' + xp);
  await shot('17-offline');
  log(`Service worker aktif: ${sw}; dibuka OFFLINE: OK, progres tetap ada (${xp})`);
  await page.setOfflineMode(false);

  // 10. Mode Guru demo
  // 8b. Learning Zone: materi 1 sampai tuntas
  await page.goto(base + '#/learn', { waitUntil: 'networkidle0' });
  await waitText('Learning Zone');
  await waitText('Tuntaskan materi 1 dulu');
  await click('Pengertian PLSV');
  await waitText('Apa itu PLSV?');
  await click('Lanjut ▸', true);
  for (let k = 0; k < 3; k++) await click('Langkah berikutnya ▾', true);
  await waitText('adalah PLSV');
  await click('Lanjut ▸', true);
  await waitText('Ringkasan');
  await click('Mulai latihan ▸', true);
  await click('5 + 2 = 7', true);
  await waitText('Tidak ada variabelnya');
  await click('4x + 1 = 9', true);
  await click('Lanjut ▸', true);
  await click('Pangkat x adalah dua', true);
  await click('Lanjut ▸', true);
  await waitText('Materi tuntas!');
  await waitText('+10 XP');
  await shot('16b-lesson-done');
  log('Learning Zone: materi 1 (penjelasan → contoh bertahap → ringkasan → latihan) tuntas, +10 XP');

  // 8c. Challenge Zone: Easy Mission penuh (pilihan ganda, isian, langkah, cerita + Periksa)
  await page.goto(base + '#/challenge', { waitUntil: 'networkidle0' });
  await click('Easy Mission');
  await click('x² − 1 = 8', true);
  await click('Lanjut ▸', true);
  await typeLine('8');
  await waitText('Hampir!');
  await typeLine('9');
  await click('Lanjut ▸', true);
  await typeLine('11');
  await click('Lanjut ▸', true);
  await typeLine('7');
  await click('Lanjut ▸', true);
  await click('Bagi kedua ruas dengan 5', true);
  await click('Lanjut ▸', true);
  await click('x = 19', true);
  await waitText('Ruas kanan juga harus');
  await click('x = 5', true);
  await click('Lanjut ▸', true);
  await click('x = 9', true);
  await click('Lanjut ▸', true);
  await click('x − 3 = 10', true);
  await click('Lanjut ▸', true);
  await typeLine('5');
  await waitText('Periksa dengan substitusi');
  await typeLine('15000');
  await waitText('Seimbang!');
  await shot('16c-challenge-story');
  await click('Lanjut ▸', true);
  await typeLine('8');
  await typeLine('12');
  await click('Lanjut ▸', true);
  await waitText('Benar 10 dari 10');
  await shot('16d-challenge-done');
  log('Challenge Zone: Easy 10/10 — umpan balik salah + coba lagi, langkah, cerita + Periksa: OK');

  // 9a. AI Math Tutor (mode demo -> tutor bawaan, tanpa jaringan)
  await page.goto(base + '#/tutor', { waitUntil: 'networkidle0' });
  await waitText('Kak Orbit');
  await waitText('Mode demo');
  await click('Apa itu PLSV?');
  await waitText('PLSV adalah');
  await page.type('#tutor-input', 'jawabannya berapa?');
  await click('Kirim', true);
  await waitText('Bagian mana');
  await shot('17a-tutor');
  await page.goto(base + '#/play/w4-p03');
  await waitText(P('w4-p03').story[0]);
  await page.click('[aria-label="Tanya AI Tutor"]');
  await waitText('Bagian mana dari soal ini');
  await click('Langkah berikutnya apa?');
  await waitText('Petunjuk pertama');
  if (await page.evaluate(() => document.body.innerText.includes('Minta pembahasan lengkap'))) throw new Error('Pembahasan lengkap muncul sebelum siswa mencoba');
  await shot('17a2-tutor-problem');
  log('AI Tutor (tutor bawaan): umum & dari soal, petunjuk bertingkat, tanpa pembahasan sebelum mencoba: OK');

  // 9b. Pengaturan: tema, musik, logout
  await page.goto(base + '#/settings', { waitUntil: 'networkidle0' });
  await waitText('Musik luar angkasa');
  await click('☀️ Terang');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light', { timeout: 3000 });
  await shot('17b-settings-light');
  await click('🌌 Galaxy');
  await page.waitForFunction(() => !document.documentElement.dataset.theme, { timeout: 3000 });
  await page.click('#music');
  await page
    .waitForFunction(() => document.querySelector('#music')?.getAttribute('aria-checked') === 'true', { timeout: 3000 })
    .catch(() => {
      throw new Error('Musik tidak menyala');
    });
  await page.click('#music');
  await shot('17c-settings');
  log('Pengaturan: tema terang/galaxy, musik nyala/mati: OK');
  await click('Keluar dari akun');
  await waitText('Mode Guru');
  await click('Mode Guru');
  await click('Masuk Mode Guru demo');
  await waitText('Kelas saya');
  await page.type('#cname', 'VII D');
  await click('+ Buat kelas');
  await waitText('VII D');
  await shot('18-teacher-home');
  await click('VII B (contoh)');
  await waitText('Tingkat kesalahan per tahap');
  await waitText('Miskonsepsi terbanyak');
  await page.click('#ai-tutor');
  await waitText('AI Tutor dinyalakan');
  await click('Tampilkan percakapan terbaru');
  await waitText('pertanyaan');
  await page.evaluate(() => document.querySelector('details')?.setAttribute('open', ''));
  await waitText('Aku bingung cara mengerjakan soal cerita ini.');
  log('Mode Guru: saklar AI Tutor & membaca percakapan siswa: OK');
  await page.select('#metric', 'xp');
  await page.evaluate(() => {
    const t = document.querySelector('#target');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(t, '500');
    t.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click('Simpan', true);
  await waitText('Saat ini: 500 XP tim');
  await shot('19-teacher-class');
  await click('Ekspor CSV');
  await waitText('Isi file CSV');
  await shot('20-teacher-csv');
  log('Mode Guru demo: buat kelas, dashboard, tantangan tim, ekspor CSV: OK');

  console.log('\nError konsol/halaman:', errors.length ? errors : 'tidak ada');
  await browser.close();
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});

