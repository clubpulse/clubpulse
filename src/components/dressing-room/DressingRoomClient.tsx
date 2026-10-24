'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DressingRoomPost } from '@/lib/types/dressing-room';
import { createPost } from '@/lib/actions/dressing-room';
import { PostBubble } from './PostBubble';
import { AnnouncementCard } from './AnnouncementCard';
import { PollCard } from './PollCard';

type Tab = 'announcements' | 'chat' | 'polls';

interface DressingRoomClientProps {
  initialPosts: DressingRoomPost[];
  clubId: string;
  currentUserId: string;
  isAdmin: boolean;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'announcements', label: 'Announcements', icon: '📢' },
  { id: 'chat',          label: 'Chat',          icon: '💬' },
  { id: 'polls',         label: 'Polls',         icon: '📊' },
];

export function DressingRoomClient({
  initialPosts,
  clubId,
  currentUserId,
  isAdmin,
}: DressingRoomClientProps) {
  const [posts, setPosts] = useState<DressingRoomPost[]>(initialPosts);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [chatInput, setChatInput] = useState('');
  const [isSending, startSending] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Realtime subscription for new posts
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dressing_room:${clubId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dressing_room_posts',
          filter: `club_id=eq.${clubId}`,
        },
        (payload) => {
          const newPost = payload.new as DressingRoomPost;
          setPosts((prev) => {
            if (prev.some((p) => p.id === newPost.id)) return prev;
            return [...prev, newPost];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [posts, activeTab]);

  function handlePostUpdate(updated: DressingRoomPost) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function sendChat() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    startSending(async () => {
      await createPost(clubId, 'chat', text);
      // Realtime will push it back; optimistic update for own post only
    });
  }

  const announcements = posts.filter((p) => p.kind === 'announcement').reverse();
  const chatPosts = posts.filter((p) => p.kind === 'chat');
  const polls = posts.filter((p) => p.kind === 'poll').reverse();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100dvh - 10rem)',
      overflow: 'hidden',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.07)',
      background: '#080808',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h2 style={{
          margin: '0 0 14px',
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '18px',
          color: '#fff',
          letterSpacing: '-0.3px',
        }}>
          🏏 The Dressing Room
        </h2>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 14px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.35)',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                  transition: 'color 0.15s, background 0.15s',
                  borderBottom: active ? '2px solid #9b1c1c' : '2px solid transparent',
                }}
              >
                <span aria-hidden>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === 'announcements' && announcements.length > 0 && (
                  <span style={{
                    background: '#f59e0b',
                    color: '#000',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    lineHeight: 1.4,
                  }}>
                    {announcements.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab panels */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Announcements */}
        {activeTab === 'announcements' && (
          <>
            {announcements.length === 0 ? (
              <EmptyState icon="📢" message="No announcements yet." />
            ) : (
              announcements.map((p) => <AnnouncementCard key={p.id} post={p} />)
            )}
          </>
        )}

        {/* Chat */}
        {activeTab === 'chat' && (
          <>
            {chatPosts.length === 0 && (
              <EmptyState icon="💬" message="No messages yet — say hello!" />
            )}
            {chatPosts.map((p) => (
              <PostBubble key={p.id} post={p} isOwn={p.user_id === currentUserId} />
            ))}
            <div ref={bottomRef} />
          </>
        )}

        {/* Polls */}
        {activeTab === 'polls' && (
          <>
            {polls.length === 0 ? (
              <EmptyState icon="📊" message="No polls yet." />
            ) : (
              polls.map((p) => (
                <PollCard
                  key={p.id}
                  post={p}
                  currentUserId={currentUserId}
                  onUpdate={handlePostUpdate}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Chat input (only on chat tab) */}
      {activeTab === 'chat' && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
        }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            placeholder="Message the dressing room…"
            disabled={isSending}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '14px',
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
              resize: 'none',
            }}
          />
          <button
            type="button"
            onClick={sendChat}
            disabled={isSending || !chatInput.trim()}
            style={{
              background: chatInput.trim() ? '#166534' : 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              color: chatInput.trim() ? '#fff' : 'rgba(255,255,255,0.25)',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              cursor: chatInput.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s, color 0.15s',
              flexShrink: 0,
            }}
          >
            {isSending ? '…' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '40px 0',
      color: 'rgba(255,255,255,0.25)',
      fontFamily: "'Inter', sans-serif",
      fontSize: '14px',
    }}>
      <span style={{ fontSize: '32px' }}>{icon}</span>
      {message}
    </div>
  );
}
