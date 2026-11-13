// Sumber data Mode Guru. Dua implementasi dengan antarmuka yang sama:
//  - supabaseApi: data sungguhan (Supabase, RLS, fungsi RPC)
//  - demoApi: data CONTOH yang disimpan di browser, untuk presentasi/validasi tanpa server

import { supabase, rpc, friendlyError } from './supabase.js';
import * as db from '../store/db.js';
import { rng, randInt, pick } from '../engine/rng.js';
import { todayStr } from '../engine/xp.js';
import { state } from '../state.js';

// ---------------------------------------------------------------- Supabase
const must = ({ data, error }) => {
  if (error) throw new Error(friendlyError(error));
  return data;
};

const supabaseApi = {
  async listClasses() {
    const classes = must(await supabase.from('classrooms').select('id, name, code, research_mode, created_at').order('created_at'));
    const studs = must(await supabase.from('profiles').select('classroom_id').eq('role', 'student'));
    const counts = {};
    studs.forEach((r) => (counts[r.classroom_id] = (counts[r.classroom_id] || 0) + 1));
    return classes.map((c) => ({ ...c, students: counts[c.id] || 0 }));
  },
  createClass: (name, research) => rpc('create_classroom', { p_name: name, p_research: research }),
  async loadClass(id) {
    const [c, t, ch] = await Promise.all([
      supabase.from('classrooms').select('*').eq('id', id).single(),
      supabase.from('teams').select('*').eq('classroom_id', id).order('id'),
      supabase.from('team_challenges').select('*').eq('classroom_id', id).order('week_start', { ascending: false }).limit(1),
    ]);
    const cls = must(c);
    const [progress, board] = await Promise.all([
      rpc('class_progress', { p_classroom: id }),
      rpc('class_leaderboard', { p_classroom: id }),
    ]);
    return { cls, teams: must(t) || [], challenge: must(ch)?.[0] || null, progress, board };
  },
  async setResearch(id, on) {
    must(await supabase.from('classrooms').update({ research_mode: on }).eq('id', id));
  },
  assignTeam: (student, team) => rpc('assign_team', { p_student: student, p_team: team }),
  setResearchCode: (student, code) => rpc('set_research_code', { p_student: student, p_code: code }),
  autoTeams: (id, size) => rpc('auto_teams', { p_classroom: id, p_size: size }),
  async addTeam(id, name) {
    must(await supabase.from('teams').insert({ classroom_id: id, name }));
  },
  setChallenge: (id, metric, target) => rpc('set_challenge', { p_classroom: id, p_metric: metric, p_target: target }),
  exportRows: (id) => rpc('export_attempts', { p_classroom: id }),
  deleteStudent: (student) => rpc('delete_student', { p_student: student }),
  deleteClass: (id) => rpc('delete_classroom', { p_classroom: id }),
};

// ---------------------------------------------------------------- Demo (data contoh)
const NAMES = ['Raka', 'Sinta', 'Dina', 'Bima', 'Lina', 'Doni', 'Rani', 'Tia', 'Joko', 'Ayu', 'Fajar', 'Nisa'];
const AVATARS = ['🤖', '🦊', '🐼', '🐯', '🦉', '🐢', '🐬', '🦁', '🐱', '🐸'];
const TEAM_PRESET = [
  ['Tim Elang', '#3B5BDB'],
  ['Tim Komodo', '#2B8A3E'],
  ['Tim Rajawali', '#E67700'],
  ['Tim Harimau', '#9C36B5'],
  ['Tim Lumba-lumba', '#0C8599'],
  ['Tim Merak', '#C2255C'],
];
// Pola kesalahan contoh mengikuti temuan wawancara S01: Modelkan & Pahami paling sulit, salah tanda paling sering.
const WEAK = ['model', 'model', 'model', 'understand', 'understand', 'solve', 'solve', 'check'];
const MISC = ['M1', 'M1', 'M1', 'M1', 'M7', 'M7', 'M4', 'M8', 'M2', 'M6'];
const STAGES = ['understand', 'model', 'solve', 'check', 'explain'];
const ERR = { understand: 0.18, model: 0.34, solve: 0.27, check: 0.09, explain: 0.12 };

const KEY = 'teacherDemo';
let cache = null;

function weekStart() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Senin = 0
  d.setDate(d.getDate() - day);
  return todayStr(d);
}

function daysBack(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(todayStr(d));
  }
  return out;
}

function makeStudents(seed, n, teamIds, research) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const done = randInt(r, 8, 62);
    return {
      id: `demo-s-${seed}-${i}`,
      nickname: NAMES[i % NAMES.length] + (i >= NAMES.length ? ` ${Math.floor(i / NAMES.length) + 1}` : ''),
      avatar: AVATARS[i % AVATARS.length],
      team_id: teamIds.length ? teamIds[i % teamIds.length] : null,
      research_code: research ? `S${String(i + 1).padStart(2, '0')}` : null,
      world: Math.min(7, 1 + Math.floor(done / 11)),
      problems_done: done,
      stars: Math.round(done * (1.6 + r() * 1.1)),
      week_xp: randInt(r, 40, 260),
      main_days: daysBack(randInt(r, 0, 9)),
      weak_stage: pick(r, WEAK),
      top_misconception: pick(r, MISC),
      anon_id: `0000demo-${seed}-${i}`,
    };
  });
}

function seedState() {
  const teams = TEAM_PRESET.slice(0, 3).map(([name, color], i) => ({ id: i + 1, classroom_id: 1, name, color }));
  return {
    nextId: 100,
    classes: [
      { id: 1, name: 'VII B (contoh)', code: 'DEMO7B', research_mode: true, created_at: new Date().toISOString() },
      { id: 2, name: 'VII C (contoh)', code: 'DEMO7C', research_mode: false, created_at: new Date().toISOString() },
    ],
    teams: [...teams],
    students: [
      ...makeStudents('7b', 12, teams.map((t) => t.id), true).map((s) => ({ ...s, classroom_id: 1 })),
      ...makeStudents('7c', 8, [], false).map((s) => ({ ...s, classroom_id: 2 })),
    ],
    challenges: [{ classroom_id: 1, week_start: weekStart(), metric: 'check_count', target: 25 }],
  };
}

async function load() {
  if (cache) return cache;
  cache = (await db.get('kv', KEY)) || seedState();
  return cache;
}
const save = () => db.put('kv', cache, KEY);

function challengeProgress(students, metric) {
  if (metric === 'xp') return students.reduce((s, x) => s + x.week_xp, 0);
  if (metric === 'problems') return students.reduce((s, x) => s + Math.round(x.problems_done / 6), 0);
  return students.reduce((s, x) => s + Math.round(x.week_xp / 10), 0); // perkiraan jumlah tahap Periksa
}

function computeProgress(students) {
  const mis = {};
  const r = rng(`mis-${students.length}`);
  for (const s of students) {
    mis[s.top_misconception] = (mis[s.top_misconception] || 0) + randInt(r, 2, 6);
  }
  const attempts = students.reduce((n, s) => n + s.problems_done * 6, 0);
  return {
    students: [...students].sort((a, b) => a.nickname.localeCompare(b.nickname)),
    stage_error_rate: students.length ? { ...ERR } : {},
    misconceptions: students.length ? mis : {},
    totals: {
      students: students.length,
      active_week: students.filter((s) => s.main_days.length > 0).length,
      attempts,
    },
  };
}

function computeBoard(cls, teams, students, challenge) {
  return {
    week_start: weekStart(),
    class_name: cls.name,
    teams: teams
      .map((t) => {
        const members = students.filter((s) => s.team_id === t.id);
        const xp = members.reduce((s, m) => s + m.week_xp, 0);
        return {
          team_id: t.id,
          team: t.name,
          color: t.color,
          members: members.length,
          avg_xp: members.length ? Math.round((xp / members.length) * 10) / 10 : 0,
          challenge_done: !!challenge && members.length > 0 && challengeProgress(members, challenge.metric) >= challenge.target,
        };
      })
      .sort((a, b) => b.avg_xp - a.avg_xp),
  };
}

const randomCode = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'D' + Array.from({ length: 5 }, () => a[Math.floor(Math.random() * a.length)]).join('');
};

const demoApi = {
  async listClasses() {
    const s = await load();
    return s.classes.map((c) => ({ ...c, students: s.students.filter((x) => x.classroom_id === c.id).length }));
  },
  async createClass(name, research) {
    const s = await load();
    const c = { id: s.nextId++, name, code: randomCode(), research_mode: !!research, created_at: new Date().toISOString() };
    s.classes.push(c);
    // kelas baru diberi 6 siswa contoh agar dashboard tidak kosong
    s.students.push(...makeStudents(`c${c.id}`, 6, [], research).map((x) => ({ ...x, classroom_id: c.id })));
    await save();
    return c;
  },
  async loadClass(id) {
    const s = await load();
    const cls = s.classes.find((c) => c.id === id);
    if (!cls) throw new Error('Kelas contoh tidak ditemukan.');
    const teams = s.teams.filter((t) => t.classroom_id === id);
    const students = s.students.filter((x) => x.classroom_id === id);
    const challenge = s.challenges.filter((c) => c.classroom_id === id).sort((a, b) => (a.week_start < b.week_start ? 1 : -1))[0] || null;
    return { cls, teams, challenge, progress: computeProgress(students), board: computeBoard(cls, teams, students, challenge) };
  },
  async setResearch(id, on) {
    const s = await load();
    s.classes.find((c) => c.id === id).research_mode = on;
    await save();
  },
  async assignTeam(student, team) {
    const s = await load();
    s.students.find((x) => x.id === student).team_id = team;
    await save();
  },
  async setResearchCode(student, code) {
    const s = await load();
    s.students.find((x) => x.id === student).research_code = code.trim() || null;
    await save();
  },
  async autoTeams(id, size) {
    const s = await load();
    const free = s.students.filter((x) => x.classroom_id === id && !x.team_id);
    if (!free.length) return;
    const existing = s.teams.filter((t) => t.classroom_id === id).length;
    const n = Math.max(1, Math.ceil(free.length / size));
    const newTeams = Array.from({ length: n }, (_, i) => {
      const [name, color] = TEAM_PRESET[(existing + i) % TEAM_PRESET.length];
      return { id: s.nextId++, classroom_id: id, name: existing + i >= TEAM_PRESET.length ? `${name} ${existing + i + 1}` : name, color };
    });
    s.teams.push(...newTeams);
    [...free].sort(() => Math.random() - 0.5).forEach((x, i) => (x.team_id = newTeams[i % n].id));
    await save();
  },
  async addTeam(id, name) {
    const s = await load();
    const [, color] = TEAM_PRESET[s.teams.filter((t) => t.classroom_id === id).length % TEAM_PRESET.length];
    s.teams.push({ id: s.nextId++, classroom_id: id, name, color });
    await save();
  },
  async setChallenge(id, metric, target) {
    const s = await load();
    const ws = weekStart();
    s.challenges = s.challenges.filter((c) => !(c.classroom_id === id && c.week_start === ws));
    s.challenges.push({ classroom_id: id, week_start: ws, metric, target });
    await save();
  },
  async exportRows(id) {
    const s = await load();
    if (!s.classes.find((c) => c.id === id)?.research_mode) throw new Error('Mode penelitian belum aktif untuk kelas ini.');
    const r = rng(`export-${id}`);
    const rows = [];
    for (const st of s.students.filter((x) => x.classroom_id === id)) {
      const team = s.teams.find((t) => t.id === st.team_id)?.name || '';
      for (let i = 0; i < 10; i++) {
        const stage = STAGES[i % STAGES.length];
        const correct = r() > ERR[stage];
        rows.push({
          anon_id: st.anon_id,
          research_code: st.research_code || '',
          team,
          problem_id: `w${1 + (i % 6)}-p${String(3 + i).padStart(2, '0')}`,
          world: 1 + (i % 6),
          stage,
          correct,
          misconception_code: correct ? '' : stage === 'solve' ? st.top_misconception : '',
          hints_used: randInt(r, 0, 2),
          attempt_no: correct ? 1 : 2,
          duration_ms: randInt(r, 8000, 90000),
          stars: '',
          client_time: new Date(Date.now() - randInt(r, 0, 6) * 86400000).toISOString(),
          catatan: 'DATA CONTOH',
        });
      }
    }
    return rows;
  },
  async deleteStudent(student) {
    const s = await load();
    s.students = s.students.filter((x) => x.id !== student);
    await save();
  },
  async deleteClass(id) {
    const s = await load();
    s.classes = s.classes.filter((c) => c.id !== id);
    s.students = s.students.filter((x) => x.classroom_id !== id);
    s.teams = s.teams.filter((t) => t.classroom_id !== id);
    await save();
  },
};

/** Pilih sumber data sesuai akun yang sedang masuk. */
export const teacherApi = () => (state.profile?.demo ? demoApi : supabaseApi);

export function resetDemoCache() {
  cache = null;
}
