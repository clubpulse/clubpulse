'use client';
import Link from 'next/link';
import type { NemesisPair } from '@/lib/types/rivalry';

export function NemesisWidget({ nemesis }: { nemesis: NemesisPair | null }) {
  if (!nemesis) return (
    <div style={{ background:'rgba(139,0,0,0.10)',border:'1px solid rgba(139,0,0,0.25)',borderRadius:'14px',padding:'20px 24px',fontFamily:"'Inter',sans-serif" }}>
      <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px' }}><span style={{fontSize:'20px'}} aria-hidden>👹</span><span style={{fontSize:'13px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)'}}>Your Nemesis</span></div>
      <p style={{ fontSize:'15px',color:'rgba(255,255,255,0.45)',margin:0 }}>No nemesis yet — keep playing</p>
    </div>
  );
  const lastDate = nemesis.last_dismissal ? new Date(nemesis.last_dismissal).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : null;
  return (
    <Link href={`/rivalry/${nemesis.bowler_id}`} style={{textDecoration:'none',display:'block'}}>
      <div style={{background:'linear-gradient(135deg,rgba(139,0,0,0.55) 0%,rgba(90,0,0,0.85) 100%)',border:'1px solid rgba(200,40,40,0.35)',borderRadius:'14px',padding:'20px 24px',fontFamily:"'Inter',sans-serif",cursor:'pointer'}}
        onMouseEnter={e=>((e.currentTarget as HTMLDivElement).style.borderColor='rgba(220,80,80,0.6)')}
        onMouseLeave={e=>((e.currentTarget as HTMLDivElement).style.borderColor='rgba(200,40,40,0.35)')}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}><span style={{fontSize:'20px'}} aria-hidden>👹</span><span style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,180,180,0.7)'}}>Your Nemesis</span></div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'12px'}}>
          <div>
            <p style={{margin:'0 0 4px',fontSize:'22px',fontWeight:700,color:'#fff',lineHeight:1.1}}>{nemesis.bowler_name}</p>
            {lastDate && <p style={{margin:0,fontSize:'12px',color:'rgba(255,200,200,0.55)'}}>Last got you: {lastDate}</p>}
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <p style={{margin:0,fontSize:'36px',fontWeight:800,color:'#ff6b6b',lineHeight:1}}>{nemesis.dismissals}</p>
            <p style={{margin:0,fontSize:'11px',color:'rgba(255,180,180,0.6)',fontWeight:600,letterSpacing:'0.05em'}}>DISMISSALS</p>
          </div>
        </div>
        <div style={{marginTop:'14px',paddingTop:'12px',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'rgba(255,200,200,0.5)'}}>
          <span aria-hidden>⚔️</span><span>View head-to-head rivalry</span><span style={{marginLeft:'auto'}} aria-hidden>→</span>
        </div>
      </div>
    </Link>
  );
}
