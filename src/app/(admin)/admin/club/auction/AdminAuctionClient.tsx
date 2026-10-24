'use client';

import { useState, useTransition } from 'react';
import {
  adminCreateAuction,
  adminAddLot,
  adminUpdateAuctionStatus,
} from '@/lib/actions/auction';
import type { Auction, AuctionLot, AuctionStatus } from '@/lib/types/auction';

const STATUS_COLOURS: Record<AuctionStatus, string> = {
  draft: 'rgba(255,255,255,0.3)',
  open: '#4ade80',
  closed: '#f87171',
  settled: '#c9a54c',
};

const STATUS_NEXT: Record<AuctionStatus, AuctionStatus | null> = {
  draft: 'open',
  open: 'closed',
  closed: 'settled',
  settled: null,
};

const STATUS_LABEL: Record<AuctionStatus, string> = {
  draft: 'Open Auction',
  open: 'Close Bidding',
  closed: 'Settle Auction',
  settled: 'Settled',
};

interface Props {
  clubId: string;
  auctions: Auction[];
  lots: AuctionLot[];
  members: { user_id: string }[];
}

export function AdminAuctionClient({ clubId, auctions, lots, members }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create auction form state
  const [newName, setNewName] = useState('');
  const [newOpens, setNewOpens] = useState('');
  const [newCloses, setNewCloses] = useState('');

  // Add lot form state
  const [selectedAuction, setSelectedAuction] = useState(auctions[0]?.id ?? '');
  const [lotPlayer, setLotPlayer] = useState('');
  const [lotName, setLotName] = useState('');
  const [lotRole, setLotRole] = useState('');
  const [lotBase, setLotBase] = useState(50);

  function notify(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  function handleCreateAuction(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await adminCreateAuction({
        club_id: clubId,
        name: newName.trim(),
        bidding_opens_at: newOpens || undefined,
        bidding_closes_at: newCloses || undefined,
      });
      if (!res.success) setError(res.error);
      else { setNewName(''); setNewOpens(''); setNewCloses(''); notify('Auction created'); }
    });
  }

  function handleAddLot(e: React.FormEvent) {
    e.preventDefault();
    if (!lotPlayer || !lotName.trim() || !selectedAuction) return;
    setError(null);
    startTransition(async () => {
      const res = await adminAddLot(selectedAuction, lotPlayer, lotName.trim(), lotRole || undefined, lotBase);
      if (!res.success) setError(res.error);
      else { setLotPlayer(''); setLotName(''); setLotRole(''); setLotBase(50); notify('Player added to auction'); }
    });
  }

  function handleStatusChange(auctionId: string, status: AuctionStatus) {
    setError(null);
    startTransition(async () => {
      const res = await adminUpdateAuctionStatus(auctionId, status);
      if (!res.success) setError(res.error);
      else notify(`Auction ${status}`);
    });
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#fff',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    width: '100%',
    boxSizing: 'border-box',
  };

  const btnStyle: React.CSSProperties = {
    padding: '9px 18px',
    borderRadius: '9px',
    border: 'none',
    background: '#9b1c1c',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: isPending ? 'not-allowed' : 'pointer',
    fontFamily: "'Inter', sans-serif",
    opacity: isPending ? 0.6 : 1,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 2px' }}>
          🏏 Auction Management
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Create auctions, add player lots, open and settle
        </p>
      </div>

      {/* Feedback */}
      {success && <p style={{ margin: 0, fontSize: '13px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '10px 14px', borderRadius: '10px' }}>{success}</p>}
      {error && <p style={{ margin: 0, fontSize: '13px', color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '10px 14px', borderRadius: '10px' }}>{error}</p>}

      {/* Create auction */}
      <section style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '22px' }}>
        <h2 style={{ margin: '0 0 16px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff' }}>
          Create Auction
        </h2>
        <form onSubmit={handleCreateAuction} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input style={inputStyle} placeholder="Auction name e.g. 2026 Summer Auction" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>Bidding opens</label>
              <input style={inputStyle} type="datetime-local" value={newOpens} onChange={(e) => setNewOpens(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>Bidding closes</label>
              <input style={inputStyle} type="datetime-local" value={newCloses} onChange={(e) => setNewCloses(e.target.value)} />
            </div>
          </div>
          <div><button type="submit" style={btnStyle} disabled={isPending}>Create Auction</button></div>
        </form>
      </section>

      {/* Add player lot */}
      {auctions.length > 0 && (
        <section style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '22px' }}>
          <h2 style={{ margin: '0 0 16px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff' }}>
            Add Player to Auction
          </h2>
          <form onSubmit={handleAddLot} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <select style={inputStyle} value={selectedAuction} onChange={(e) => setSelectedAuction(e.target.value)} required>
              {auctions.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.status})</option>
              ))}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>Player user ID</label>
                <input style={inputStyle} placeholder="UUID" value={lotPlayer} onChange={(e) => setLotPlayer(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>Display name</label>
                <input style={inputStyle} placeholder="Joe Bloggs" value={lotName} onChange={(e) => setLotName(e.target.value)} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>Role (optional)</label>
                <input style={inputStyle} placeholder="Opening Batsman" value={lotRole} onChange={(e) => setLotRole(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>Base price</label>
                <input style={inputStyle} type="number" min={1} value={lotBase} onChange={(e) => setLotBase(Number(e.target.value))} required />
              </div>
            </div>
            <div><button type="submit" style={btnStyle} disabled={isPending}>Add to Auction</button></div>
          </form>
        </section>
      )}

      {/* Auction list + controls */}
      {auctions.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff' }}>
            Auctions
          </h2>
          {auctions.map((auction) => {
            const auctionLots = lots.filter((l) => l.auction_id === auction.id);
            const nextStatus = STATUS_NEXT[auction.status as AuctionStatus];

            return (
              <div key={auction.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                {/* Auction header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>{auction.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                      Season {auction.season} · {auctionLots.length} lots
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(255,255,255,0.06)',
                      color: STATUS_COLOURS[auction.status as AuctionStatus],
                      textTransform: 'capitalize',
                    }}>
                      {auction.status}
                    </span>
                    {nextStatus && (
                      <button
                        onClick={() => handleStatusChange(auction.id, nextStatus)}
                        disabled={isPending}
                        style={{
                          padding: '5px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: nextStatus === 'open' ? 'rgba(74,222,128,0.2)' : nextStatus === 'closed' ? 'rgba(248,113,113,0.2)' : 'rgba(201,165,76,0.2)',
                          color: nextStatus === 'open' ? '#4ade80' : nextStatus === 'closed' ? '#f87171' : '#c9a54c',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {STATUS_LABEL[auction.status as AuctionStatus]}
                      </button>
                    )}
                  </div>
                </div>

                {/* Lots standings */}
                {auctionLots.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Current Standings
                    </p>
                    {auctionLots
                      .slice()
                      .sort((a, b) => (b.current_bid ?? 0) - (a.current_bid ?? 0))
                      .map((lot, i) => (
                        <div key={lot.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '8px',
                        }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', width: '18px' }}>#{i + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lot.display_name}
                            </p>
                            {lot.role && <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{lot.role}</p>}
                          </div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: lot.current_bid ? '#c9a54c' : 'rgba(255,255,255,0.3)',
                          }}>
                            {lot.current_bid ? `${lot.current_bid} Scores` : `Base ${lot.base_price}`}
                          </span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontSize: '10px',
                            fontWeight: 600,
                            background: lot.status === 'sold' ? 'rgba(201,165,76,0.15)' : lot.status === 'unsold' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
                            color: lot.status === 'sold' ? '#c9a54c' : lot.status === 'unsold' ? '#f87171' : 'rgba(255,255,255,0.4)',
                            textTransform: 'capitalize',
                          }}>
                            {lot.status}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {auctions.length === 0 && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '20px' }}>
          No auctions yet — create one above.
        </p>
      )}
    </div>
  );
}
