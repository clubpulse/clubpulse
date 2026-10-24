import { requireUser } from '@/lib/auth/server';
import { getRivalryStats } from '@/lib/actions/rivalry';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default async function RivalryPage({ params }: { params: Promise<{ opponentId: string }> }) {
  const { opponentId } = await params;
  const user = await requireUser();
  const result = await getRivalryStats(user.id, opponentId);
  if (!result.success) return <Card title="Rivalry unavailable"><p className="text-sm text-neutral-400">{result.error}</p></Card>;
  const { batter, bowler, dismissals, lastDismissal, h2h, encounters } = result.data;
  const lastDate = lastDismissal ? new Date(lastDismissal).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : null;
  return (
    <div style={{fontFamily:"'Inter',sans-serif",maxWidth:'720px',margin:'0 auto'}}>
      <div style={{background:'linear-gradient(135deg,rgba(139,0,0,0.5) 0%,rgba(30,0,0,0.85) 100%)',border:'1px solid rgba(200,40,40,0.3)',borderRadius:'16px',padding:'32px 24px',marginBottom:'24px',textAlign:'center'}}>
        <div style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,180,180,0.6)',marginBottom:'20px'}}>⚔️ Head-to-Head Rivalry</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:'16px'}}>
          <div><div style={{fontSize:'11px',fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'6px'}}>Batter</div><div style={{fontSize:'22px',fontWeight:700,color:'#fff'}}>{batter.name}</div><div style={{fontSize:'13px',color:'rgba(255,255,255,0.4)',marginTop:'4px'}}>You</div></div>
          <div style={{textAlign:'center'}}><div style={{fontSize:'48px',fontWeight:800,color:'#ff4444',lineHeight:1}}>{dismissals}</div><div style={{fontSize:'11px',color:'rgba(255,180,180,0.5)',fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase'}}>dismissals</div>{lastDate && <div style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',marginTop:'6px'}}>Last: {lastDate}</div>}</div>
          <div style={{textAlign:'right'}}><div style={{fontSize:'11px',fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'6px'}}>Bowler</div><div style={{fontSize:'22px',fontWeight:700,color:'#ff6b6b'}}>{bowler.name}</div><div style={{fontSize:'13px',color:'rgba(255,180,180,0.4)',marginTop:'4px'}}>👹 Nemesis</div></div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'12px',marginBottom:'24px'}}>
        {[{label:'Balls Faced',value:h2h.ballsFaced,icon:'🏏'},{label:'Runs Scored',value:h2h.runsScored,icon:'🏃'},{label:'Wickets Taken',value:h2h.wicketsTaken,icon:'🎯'},{label:'Runs Conceded',value:h2h.runsConceded,icon:'💥'}].map(({label,value,icon})=>(
          <div key={label} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'16px 20px',textAlign:'center'}}>
            <div style={{fontSize:'20px',marginBottom:'6px'}} aria-hidden>{icon}</div>
            <div style={{fontSize:'28px',fontWeight:700,color:'#fff',lineHeight:1}}>{value}</div>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',marginTop:'4px'}}>{label}</div>
          </div>
        ))}
      </div>
      {encounters.length > 0 && (
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'20px 24px',marginBottom:'24px'}}>
          <div style={{fontSize:'13px',fontWeight:600,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'16px'}}>📋 Encounter Timeline</div>
          {encounters.slice(0,10).map(e=>{
            const d=new Date(e.match_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
            const isDismissal=e.dismissed_by===opponentId||e.dismissed_by===user.id;
            return <div key={e.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <div style={{fontSize:'13px',color:'rgba(255,255,255,0.4)',minWidth:'90px'}}>{d}</div>
              <div style={{fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>vs {e.opponent}</div>
              <div style={{marginLeft:'auto',fontSize:'13px',fontWeight:600,color:isDismissal?'#ff6b6b':'rgba(255,255,255,0.5)'}}>{e.runs_scored}r{e.wickets_taken>0?` · ${e.wickets_taken}w`:''}{isDismissal?' 💀':''}</div>
            </div>;
          })}
        </div>
      )}
      <div style={{background:'rgba(139,0,0,0.15)',border:'1px solid rgba(200,40,40,0.25)',borderRadius:'14px',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px'}}>
        <div><p style={{margin:'0 0 4px',fontWeight:700,color:'#fff',fontSize:'16px'}}>🔥 Claim Your Revenge</p><p style={{margin:0,fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>Log your next performance to update this rivalry</p></div>
        <Link href="/log-performance" style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'10px 18px',background:'#8b0000',borderRadius:'10px',fontSize:'14px',fontWeight:600,color:'#fff',textDecoration:'none',whiteSpace:'nowrap',flexShrink:0}}>Log Game →</Link>
      </div>
    </div>
  );
}
