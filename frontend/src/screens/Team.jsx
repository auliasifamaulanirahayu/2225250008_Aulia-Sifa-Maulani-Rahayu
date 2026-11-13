// Tim & leaderboard kelas (FR-14, FR-15). Data dari Supabase, dengan cadangan offline.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState, saveTeamCache } from '../state.js';
import { supabase, rpc, friendlyError } from '../lib/supabase.js';
import { refreshProfile } from '../lib/auth.js';
import { Screen, ProgressBar, EmptyState, Feedback, toast, Loading } from '../components/ui.jsx';

export const METRIC_LABEL = {
  check_count: 'kali menyelesaikan tahap Periksa',
  xp: 'XP tim',
  problems: 'soal selesai',
};
const STICKERS = ['Ayo!', 'Keren!', 'Semangat!', 'Mantap!'];

export function Team() {
  const s = useAppState();
  const [data, setData] = useState(s.teamCache?.full || null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      await refreshProfile();
      const [team, board] = await Promise.all([rpc('team_overview'), rpc('class_leaderboard', {})]);
      const full = { team, board };
      setData(full);
      setErr(null);
      s.teamCache = { ...(s.teamCache || {}), full, team, syncedAt: new Date().toISOString() };
      saveTeamCache();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!s.profile.demo && supabase) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (s.profile.demo || !supabase) {
    return (
      <Screen nav>
        <EmptyState title="Fitur tim butuh akun kelas" text="Di mode demo, kamu belum tergabung dengan kelas. Daftar dengan kode kelas dari gurumu untuk main bersama tim." />
      </Screen>
    );
  }

  const cheer = async (sticker) => {
    const { error } = await supabase.from('team_cheers').insert({ team_id: data.team.team.id, sticker });
    if (error) return toast(friendlyError(error));
    toast(`Kamu mengirim "${sticker}" ke tim!`);
    load();
  };

  const team = data?.team;
  const board = data?.board;
  return (
    <Screen className="team" nav>
      <h1>👥 Timku</h1>
      {err && <Feedback kind="info">{data ? 'Offline: menampilkan data terakhir.' : err}</Feedback>}
      {!data && loading && <Loading />}
      {team && !team.team && <div className="card">Kamu belum masuk tim. Gurumu akan membagi tim di kelas {s.profile.classroom?.name}.</div>}
      {team?.team && (
        <section className="card team-card" style={{ '--team': team.team.color }}>
          <h2>{team.team.name}</h2>
          <ul className="members">
            {team.members.map((m) => (
              <li key={m.nickname} className={m.me ? 'me' : ''}>
                <span aria-hidden="true">{m.avatar}</span> {m.nickname}
                {m.me ? ' (kamu)' : ''}
              </li>
            ))}
          </ul>
          {team.challenge ? (
            <div className="challenge">
              <p>
                <strong>Tantangan minggu ini:</strong> {team.challenge.target} {METRIC_LABEL[team.challenge.metric]}
              </p>
              <ProgressBar value={team.challenge.progress} max={team.challenge.target} color={team.team.color} label="Progres tantangan tim" />
              <small>
                {team.challenge.progress}/{team.challenge.target} {team.challenge.done ? '🎉 Tercapai!' : ''}
              </small>
            </div>
          ) : (
            <p className="muted">Guru belum menetapkan tantangan minggu ini.</p>
          )}
          <p className="label">Kirim semangat:</p>
          <div className="sticker-row">
            {STICKERS.map((st) => (
              <button key={st} type="button" className="chip-btn" onClick={() => cheer(st)}>
                {st}
              </button>
            ))}
          </div>
          {team.cheers?.length > 0 && (
            <ul className="cheers">
              {team.cheers.map((c, i) => (
                <li key={i}>
                  <strong>{c.nickname}</strong>: {c.sticker}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {board && (
        <section className="card">
          <h2>🏆 Peringkat minggu ini ({board.class_name})</h2>
          <p className="muted small">Berdasarkan rata-rata XP anggota tim. Reset setiap Senin.</p>
          <ol className="leaderboard">
            {board.teams.map((t, i) => (
              <li key={t.team_id} className={team?.team?.id === t.team_id ? 'mine' : ''}>
                <span className="rank">{i + 1}</span>
                <span className="team-dot" style={{ background: t.color }} aria-hidden="true" />
                <span className="lb-name">
                  {t.team} {t.challenge_done ? '🎯' : ''}
                </span>
                <strong>{t.avg_xp} XP</strong>
              </li>
            ))}
            {!board.teams.length && <li className="muted">Belum ada tim di kelas ini.</li>}
          </ol>
        </section>
      )}
      <button type="button" className="btn btn-ghost btn-block" onClick={load} disabled={loading}>
        {loading ? 'Memuat…' : '↻ Perbarui'}
      </button>
      <p className="center">
        <Link to="/home">Kembali ke misi</Link>
      </p>
    </Screen>
  );
}
