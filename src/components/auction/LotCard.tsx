'use client';

import { useState } from 'react';
import { BidForm } from './BidForm';
import type { AuctionLot } from '@/lib/types/auction';

interface LotCardProps {
  lot: AuctionLot;
  currentUserId: string;
  balance: number;
}

export function LotCard({ lot, currentUserId, balance }: LotCardProps) {
  const [showBid, setShowBid] = useState(false);
  const isTopBidder = lot.current_bidder === currentUserId;
  const isSelf = lot.player_user_id === currentUserId;
  const isSold = lot.status === 'sold';

  const minBid = lot.current_bid ? lot.current_bid + 1 : lot.base_price;

  const initials = lot.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        position: 'relative',
        background: isTopBidder
          ? 'rgba(74,222,128,0.06)'
          : 'rgba(255,255,255,0.03)',
        border: isTopBidder
          ? '1px solid rgba(74,222,128,0.25)'
          : '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* SOLD overlay */}
      {isSold && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '14px',
          zIndex: 10,
        }}>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 900,
            fontSize: '28px',
            color: '#c9a54c',
            letterSpacing: '4px',
            transform: 'rotate(-15deg)',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          }}>
            SOLD
          </span>
        </div>
      )}

      {/* Player info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(155,28,28,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lot.display_name}
            {isSelf && <span style={{ marginLeft: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>(you)</span>}
          </p>
          {lot.role && (
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{lot.role}</p>
          )}
        </div>
        <span style={{
          flexShrink: 0,
          padding: '3px 9px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(201,165,76,0.15)',
          color: '#c9a54c',
        }}>
          Base {lot.base_price}
        </span>
      </div>

      {/* Bid status */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '10px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Current bid</p>
          <p style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 700, color: isTopBidder ? '#4ade80' : '#fff' }}>
            {lot.current_bid ? `${lot.current_bid} Scores` : 'No bids yet'}
          </p>
        </div>
        {isTopBidder && (
          <span style={{
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            background: 'rgba(74,222,128,0.15)',
            color: '#4ade80',
          }}>
            You&apos;re leading
          </span>
        )}
      </div>

      {/* Bid action */}
      {!isSelf && !isSold && (
        showBid ? (
          <BidForm
            lotId={lot.id}
            minBid={minBid}
            balance={balance}
            onSuccess={() => setShowBid(false)}
            onCancel={() => setShowBid(false)}
          />
        ) : (
          <button
            onClick={() => setShowBid(true)}
            disabled={balance < minBid}
            style={{
              padding: '9px',
              borderRadius: '9px',
              border: 'none',
              background: balance < minBid ? 'rgba(255,255,255,0.04)' : 'rgba(155,28,28,0.7)',
              color: balance < minBid ? 'rgba(255,255,255,0.25)' : '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: balance < minBid ? 'not-allowed' : 'pointer',
              width: '100%',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {balance < minBid ? `Need ${minBid} Scores to bid` : `Place Bid (min ${minBid})`}
          </button>
        )
      )}
    </div>
  );
}
