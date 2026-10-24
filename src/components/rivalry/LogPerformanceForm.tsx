'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logPerformance } from '@/lib/actions/rivalry';

interface Member { id: string; name: string; }
const f: React.CSSProperties = { width:'100%',padding:'10px 14px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',fontSize:'14px',color:'#fff',outline:'none',boxSizing:'border-box',fontFamily:"'Inter',sans-serif" };
const l: React.CSSProperties = { display:'block',fontSize:'12px',fontWeight:600,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'6px' };
const s: React.CSSProperties = { background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'20px',marginBottom:'16px' };
const h: React.CSSProperties = { fontSize:'13px',fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'16px' };

export function LogPerformanceForm({ clubId, members }: { clubId: string; members: Member[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = { club_id:clubId,match_date:fd.get('match_date') as string,opponent:fd.get('opponent') as string,
      runs_scored:Number(fd.get('runs_scored')||0),balls_faced:Number(fd.get('balls_faced')||0),
      dismissal_type:(fd.get('dismissal_type') as string)||undefined,dismissed_by:(fd.get('dismissed_by') as string)||undefined,
      overs_bowled:Number(fd.get('overs_bowled')||0),runs_conceded:Number(fd.get('runs_conceded')||0),
      wickets_taken:Number(fd.get('wickets_taken')||0),catches:Number(fd.get('catches')||0),run_outs:Number(fd.get('run_outs')||0) };
    startTransition(async () => {
      const r = await logPerformance(payload);
      if (r.success) { setSuccess(true); setTimeout(()=>router.push('/profile'),1500); } else setError(r.error??'Something went wrong');
    });
  }

  if (success) return <div style={{background:'rgba(0,139,0,0.15)',border:'1px solid rgba(0,200,0,0.25)',borderRadius:'14px',padding:'32px',textAlign:'center'}}><div style={{fontSize:'36px',marginBottom:'12px'}}>✅</div><p style={{fontSize:'18px',fontWeight:700,color:'#fff',margin:'0 0 6px'}}>Performance logged!</p><p style={{fontSize:'13px',color:'rgba(255,255,255,0.4)',margin:0}}>Returning to your profile…</p></div>;

  return (
    <form onSubmit={handleSubmit}>
      <div style={s}><div style={h}>Match Details</div><div style={{display:'grid',gap:'14px'}}>
        <div><label htmlFor="match_date" style={l}>Date</label><input id="match_date" name="match_date" type="date" defaultValue={today} required style={f}/></div>
        <div><label htmlFor="opponent" style={l}>Opponent</label><input id="opponent" name="opponent" type="text" placeholder="e.g. Windsor CC" required style={f}/></div>
      </div></div>
      <div style={s}><div style={h}>🏏 Batting</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
          <div><label htmlFor="runs_scored" style={l}>Runs Scored</label><input id="runs_scored" name="runs_scored" type="number" min="0" defaultValue="0" style={f}/></div>
          <div><label htmlFor="balls_faced" style={l}>Balls Faced</label><input id="balls_faced" name="balls_faced" type="number" min="0" defaultValue="0" style={f}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
          <div><label htmlFor="dismissal_type" style={l}>Dismissal</label><select id="dismissal_type" name="dismissal_type" style={{...f,appearance:'none'}}><option value="">Not out</option><option value="bowled">Bowled</option><option value="caught">Caught</option><option value="lbw">LBW</option><option value="run_out">Run Out</option><option value="stumped">Stumped</option><option value="hit_wicket">Hit Wicket</option></select></div>
          <div><label htmlFor="dismissed_by" style={l}>Dismissed by</label><select id="dismissed_by" name="dismissed_by" style={{...f,appearance:'none'}}><option value="">— Select bowler —</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
        </div>
      </div>
      <div style={s}><div style={h}>🎯 Bowling</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px'}}>
        <div><label htmlFor="overs_bowled" style={l}>Overs</label><input id="overs_bowled" name="overs_bowled" type="number" min="0" step="0.1" defaultValue="0" style={f}/></div>
        <div><label htmlFor="runs_conceded" style={l}>Runs</label><input id="runs_conceded" name="runs_conceded" type="number" min="0" defaultValue="0" style={f}/></div>
        <div><label htmlFor="wickets_taken" style={l}>Wickets</label><input id="wickets_taken" name="wickets_taken" type="number" min="0" defaultValue="0" style={f}/></div>
      </div></div>
      <div style={s}><div style={h}>🧤 Fielding</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
        <div><label htmlFor="catches" style={l}>Catches</label><input id="catches" name="catches" type="number" min="0" defaultValue="0" style={f}/></div>
        <div><label htmlFor="run_outs" style={l}>Run Outs</label><input id="run_outs" name="run_outs" type="number" min="0" defaultValue="0" style={f}/></div>
      </div></div>
      {error && <p style={{color:'#ff6b6b',fontSize:'13px',marginBottom:'12px'}}>{error}</p>}
      <button type="submit" disabled={isPending} style={{width:'100%',padding:'14px',background:isPending?'rgba(139,0,0,0.4)':'#8b0000',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:700,color:'#fff',cursor:isPending?'not-allowed':'pointer',transition:'background 0.15s',fontFamily:"'Inter',sans-serif"}}>{isPending?'Saving…':'✅ Log Performance'}</button>
    </form>
  );
}
