// Pemanggil AI Math Tutor (Supabase Edge Function `ai-tutor`). API key Gemini hanya ada di server.
// Selalu mengembalikan objek; bila AI tidak bisa dipakai → {fallback:true, reason} dan layar memakai tutor bawaan.

import { supabase } from './supabase.js';
import { state } from '../state.js';

/** Apakah AI (bukan tutor bawaan) bisa dicoba untuk siswa ini sekarang. */
export function aiStatus() {
  if (!supabase || state.profile?.demo) return 'demo';
  if (!state.profile?.classroom?.ai_tutor) return 'disabled';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  return 'ready';
}

/**
 * @param {{sessionId?:string, message:string, history:Array<{role:'student'|'tutor', content:string}>,
 *          problem?:{id:string, text:string, stage:string}, attempted:boolean, mode:'guide'|'full', mission?:number}} a
 */
export async function askTutor(a) {
  const status = aiStatus();
  if (status !== 'ready') return { fallback: true, reason: status };
  try {
    const { data, error } = await supabase.functions.invoke('ai-tutor', {
      body: {
        session_id: a.sessionId || null,
        message: a.message,
        history: a.history,
        problem: a.problem || null,
        attempted: !!a.attempted,
        mode: a.mode,
        mission: a.mission || null,
      },
    });
    if (error || !data) return { fallback: true, reason: 'error' };
    return data;
  } catch {
    return { fallback: true, reason: 'error' };
  }
}
