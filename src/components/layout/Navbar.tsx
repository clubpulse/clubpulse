'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { formatScores } from '@/lib/utils/format';

interface NavbarProps {
  name: string;
  balance: number;
  showAdmin?: boolean;
}

export function Navbar({ name, balance, showAdmin }: NavbarProps) {
  const pathname = usePathname();
  return (
    <header style={{ position:'sticky', top:0, zIndex:50, backgroundColor:'rgba(8,8,8,0.96)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', boxShadow:'0 1px 40px rgba(0,0,0,0.6)' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto', display:'flex', alignItems:'center', height:'56px', padding:'0 20px', gap:'8px' }}>
        <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none', flexShrink:0, marginRight:'8px' }}>
          <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'32px', height:'32px', borderRadius:'8px', background:'linear-gradient(135deg,#9b1c1c 0%,#7f1d1d 100%)', fontSize:'14px', fontWeight:800, color:'#fff', flexShrink:0, boxShadow:'0 2px 8px rgba(155,28,28,0.4)' }}>C</span>
          <span style={{ fontWeight:700, fontSize:'17px', color:'#f5f5f5', letterSpacing:'-0.3px' }}>ClubPulse</span>
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginLeft:'auto', flexShrink:0 }}>
          <Link href="/marketplace" style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 12px', borderRadius:'20px', textDecoration:'none', background:'rgba(201,165,76,0.1)', border:'1px solid rgba(201,165,76,0.3)', fontSize:'13px', fontWeight:600, color:'#c9a54c' }}>
            ⭐ {formatScores(balance)} Scores
          </Link>
          <Link href="/profile" style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 10px 4px 4px', borderRadius:'20px', textDecoration:'none', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <Avatar name={name} size="sm" />
            <span style={{ fontSize:'13px', fontWeight:500, color:'#ccc' }}>{name}</span>
          </Link>
          {showAdmin && (
            <Link href="/admin/club" style={{ fontSize:'13px', fontWeight:500, color:'#c9a54c', textDecoration:'none', padding:'5px 10px', borderRadius:'8px', background:'rgba(201,165,76,0.08)', border:'1px solid rgba(201,165,76,0.2)' }}>🛡️ Admin</Link>
          )}
          <form action="/auth/signout" method="post">
            <button type="submit" style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'5px 10px', fontSize:'12px', color:'#777', cursor:'pointer' }}>Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
