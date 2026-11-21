// Commentary Box, the Community feed: posts from your club, your area, your league or your county. Everything
// posted here is read by the safety check first, and Report sits on every post.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { BLUE, SCOPES, ago, type Comment, type Feed, type FeedPost, type Posted, type Scope } from '../../lib/community';
import { Avatar, Chips, Stopped, safetyMenu } from '../../components/CommunityBits';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function FeedScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>('club');
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [tell, setTell] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setFeed(await api<Feed>(`/api/community/feed?scope=${scope}`)); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load the feed.'); }
  }, [scope]);
  useEffect(() => { load(); }, [load]);

  const post = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true); setTell(null);
    try {
      const result = await api<Posted>('/api/community/feed', { method: 'POST', body: { body: draft } });
      if (result.status === 'live') { setDraft(''); await load(); } else { setTell(result.tell ?? 'This was not posted.'); }
    } catch (e) { setTell(e instanceof Error ? e.message : 'Could not post.'); }
    setBusy(false);
  };

  const like = async (p: FeedPost) => {
    setFeed((f) => f && { ...f, posts: f.posts.map((x) => x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x) });
    try { await api(`/api/community/posts/${p.id}/like`, { method: 'POST' }); } catch { load(); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={BLUE} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <Chips value={scope} onChange={setScope} options={SCOPES.map((s) => ({ ...s, off: !!feed && ((s.key === 'miles' && !feed.canFilter.miles) || (s.key === 'league' && !feed.canFilter.league) || (s.key === 'county' && !feed.canFilter.county)) }))} />

        <View style={styles.composer}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Share something with cricket people near you" placeholderTextColor={colors.textSubtle} multiline maxLength={1000}
            style={styles.input} accessibilityLabel="Write a post" />
          <View style={styles.composerRow}>
            <Text style={[fonts.small, { flex: 1 }]}>The Third Umpire checks every post before anyone sees it.</Text>
            <Pressable onPress={post} disabled={!draft.trim() || busy} accessibilityRole="button" style={[styles.postBtn, (!draft.trim() || busy) && { opacity: 0.4 }]}>
              {busy ? <ActivityIndicator color="#04091A" /> : <Text style={styles.postBtnText}>Post</Text>}
            </Pressable>
          </View>
        </View>
        {tell && <Stopped tell={tell} onClose={() => setTell(null)} />}

        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!feed && !error && <ActivityIndicator color={BLUE} style={{ marginTop: spacing.xl }} />}
        {feed && feed.posts.length === 0 && <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.xl }]}>Nothing here yet. Be the first to post.</Text>}

        {feed?.posts.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.row}>
              <Pressable onPress={() => router.push({ pathname: '/community/profile', params: { id: p.author.id } })} style={[styles.row, { flex: 1 }]} accessibilityRole="button" accessibilityLabel={`${p.author.name}. Open profile`}>
                <Avatar name={p.author.name} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.author.name}</Text>
                  <Text style={fonts.small} numberOfLines={1}>{[p.author.club, ago(p.createdAt)].filter(Boolean).join(' · ')}</Text>
                </View>
              </Pressable>
              {!p.mine && (
                <Pressable onPress={() => safetyMenu('post', p.id, p.author, load)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Report or block">
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted as string} />
                </Pressable>
              )}
            </View>
            <Text style={styles.body}>{p.body}</Text>
            {p.held ? (
              <Text style={[fonts.small, { color: colors.gold }]}>With the Third Umpire. Only you can see this until it is checked.</Text>
            ) : (
              <View style={styles.actions}>
                <Pressable onPress={() => like(p)} style={styles.action} accessibilityRole="button" accessibilityLabel={p.liked ? 'Unlike' : 'Like'} hitSlop={8}>
                  <Ionicons name={p.liked ? 'heart' : 'heart-outline'} size={20} color={p.liked ? colors.danger : (colors.textMuted as string)} />
                  <Text style={fonts.small}>{p.likes}</Text>
                </Pressable>
                <Pressable onPress={() => setOpen(open === p.id ? null : p.id)} style={styles.action} accessibilityRole="button" accessibilityLabel="Replies" hitSlop={8}>
                  <Ionicons name="chatbubble-outline" size={19} color={colors.textMuted as string} />
                  <Text style={fonts.small}>{p.comments}</Text>
                </Pressable>
              </View>
            )}
            {open === p.id && <Replies postId={p.id} onChange={load} />}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Replies({ postId, onChange }: { postId: string; onChange: () => void }) {
  const [list, setList] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [tell, setTell] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setList((await api<{ comments: Comment[] }>(`/api/community/posts/${postId}/comments`)).comments); } catch { setList([]); }
  }, [postId]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true); setTell(null);
    try {
      const result = await api<Posted>(`/api/community/posts/${postId}/comments`, { method: 'POST', body: { body: draft } });
      if (result.status === 'live') { setDraft(''); await load(); onChange(); } else { setTell(result.tell ?? 'This was not posted.'); }
    } catch (e) { setTell(e instanceof Error ? e.message : 'Could not reply.'); }
    setBusy(false);
  };

  return (
    <View style={styles.replies}>
      {!list && <ActivityIndicator color={BLUE} />}
      {list?.map((c) => (
        <Pressable key={c.id} onLongPress={() => !c.mine && safetyMenu('comment', c.id, c.author, load)} accessibilityHint={c.mine ? undefined : 'Hold to report or block'}>
          <Text style={styles.reply}><Text style={{ fontWeight: '700', color: colors.white }}>{c.author.name}  </Text>{c.body}</Text>
        </Pressable>
      ))}
      {tell && <Stopped tell={tell} onClose={() => setTell(null)} />}
      <View style={styles.row}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Write a reply" placeholderTextColor={colors.textSubtle} maxLength={500} style={[styles.input, styles.replyInput]} accessibilityLabel="Write a reply" />
        <Pressable onPress={send} disabled={!draft.trim() || busy} accessibilityRole="button" accessibilityLabel="Send reply" hitSlop={8} style={(!draft.trim() || busy) && { opacity: 0.4 }}>
          <Ionicons name="send" size={22} color={BLUE} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  composer: { backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(96,165,250,0.35)', padding: spacing.md, gap: spacing.sm },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: { color: colors.white, fontSize: 15, lineHeight: 21, minHeight: 44, textAlignVertical: 'top' },
  postBtn: { backgroundColor: BLUE, borderRadius: radius.pill, paddingHorizontal: 20, minHeight: 44, minWidth: 76, alignItems: 'center', justifyContent: 'center' },
  postBtnText: { color: '#04091A', fontWeight: '800', fontSize: 15 },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: 15, fontWeight: '700', color: colors.white },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.xl },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  replies: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.sm },
  reply: { fontSize: 14, lineHeight: 20, color: colors.text },
  replyInput: { flex: 1, backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
});
