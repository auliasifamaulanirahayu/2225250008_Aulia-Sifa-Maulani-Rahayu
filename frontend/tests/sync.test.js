// Sinkronisasi outbox: satu baris yang ditolak server tidak boleh menahan baris lain & cadangan progres.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const outbox = new Map();
const sent = [];
const stateUpserts = [];
let rejectStage = 'challenge'; // simulasi: migrasi 0003 belum dijalankan

vi.mock('../src/store/db.js', () => ({
  getAll: async (store) => (store === 'outbox' ? [...outbox.values()] : []),
  del: async (store, key) => outbox.delete(key),
  put: async (store, v) => outbox.set(v.client_id, v),
  count: async () => outbox.size,
  get: async () => undefined,
  clearAll: async () => {},
}));

vi.mock('../src/lib/supabase.js', () => {
  const table = (name) => ({
    upsert: async (rows) => {
      if (name === 'attempts') {
        if (rows.some((r) => r.stage === rejectStage)) {
          return { error: { code: '23514', message: 'new row violates check constraint "attempts_stage_check"' } };
        }
        sent.push(...rows.map((r) => r.client_id));
      }
      if (name === 'student_state') stateUpserts.push(rows);
      return { error: null };
    },
  });
  return {
    supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
      from: table,
      rpc: async () => ({ data: null }),
    },
  };
});

const { flush, isPermanentError } = await import('../src/store/sync.js');
const { state } = await import('../src/state.js');

const row = (id, stage) => ({ client_id: id, stage, problem_id: 'x', correct: true });

describe('sinkronisasi outbox', () => {
  beforeEach(() => {
    outbox.clear();
    sent.length = 0;
    stateUpserts.length = 0;
    rejectStage = 'challenge';
    state.profile = { id: 'u1', role: 'student', demo: false };
    state.stats = { xp: 0, badges: [], counters: {} };
    state.progress = {};
  });

  it('error permanen vs sementara', () => {
    expect(isPermanentError({ code: '23514' })).toBe(true);
    expect(isPermanentError({ code: '42501' })).toBe(true);
    expect(isPermanentError({ message: 'Failed to fetch' })).toBe(false);
    expect(isPermanentError({ code: 'PGRST301' })).toBe(false);
  });

  it('baris yang ditolak disimpan; baris lain & cadangan progres tetap terkirim', async () => {
    outbox.set('a', row('a', 'solve'));
    outbox.set('b', row('b', 'challenge'));
    outbox.set('c', row('c', 'check'));
    expect(await flush()).toBe(true);
    expect(sent.sort()).toEqual(['a', 'c']);
    expect([...outbox.keys()]).toEqual(['b']); // tidak hilang
    expect(stateUpserts).toHaveLength(1);
  });

  it('setelah migrasi dijalankan, baris yang tertahan ikut terkirim', async () => {
    outbox.set('b', row('b', 'challenge'));
    await flush();
    expect(outbox.size).toBe(1);
    rejectStage = null;
    await flush();
    expect(outbox.size).toBe(0);
    expect(sent).toContain('b');
  });
});
