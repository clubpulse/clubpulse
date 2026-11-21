// A private conversation between two connected people. Every message is read by the safety
// check before it is delivered, and Report and Block are one tap away.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { BLUE, type Message, type Posted } from '../../../lib/community';
import { Stopped, safetyMenu } from '../../../components/CommunityBits';
import { colors, fonts, radius, spacing } from '../../../constants/theme';

type Thread = { person: { id: string; name: string; club: string | null }; messages: Message[] };

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const scroller = useRef<ScrollView>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [tell, setTell] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setThread(await api<Thread>(`/api/community/messages/${id}`)); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load this conversation.'); }
  }, [id]);

  // New messages arrive by asking again every few seconds while the screen is open
  useEffect(() => { load(); const timer = setInterval(load, 8000); return () => clearInterval(timer); }, [load]);
  useEffect(() => { if (thread) navigation.setOptions({ title: thread.person.name }); }, [navigation, thread]);

  const send = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true); setTell(null);
    try {
      const result = await api<Posted>(`/api/community/messages/${id}`, { method: 'POST', body: { body: draft } });
      if (result.status === 'live') { setDraft(''); await load(); } else { setTell(result.tell ?? 'This was not sent.'); }
    } catch (e) { setTell(e instanceof Error ? e.message : 'Could not send.'); }
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView ref={scroller} contentContainerStyle={styles.content} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled">
          <Text style={[fonts.small, { textAlign: 'center' }]}>Messages are checked for safety before they are delivered.</Text>
          {error && <Text style={[fonts.small, { color: colors.danger, textAlign: 'center' }]}>{error}</Text>}
          {!thread && !error && <ActivityIndicator color={BLUE} />}
          {thread?.messages.map((m) => (
            <Pressable key={m.id} onLongPress={() => !m.mine && safetyMenu('message', m.id, thread.person, () => router.back())} accessibilityHint={m.mine ? undefined : 'Hold to report or block'}
              style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.bubbleText, m.mine && { color: '#04091A' }]}>{m.body}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {tell && <View style={{ paddingHorizontal: spacing.lg }}><Stopped tell={tell} onClose={() => setTell(null)} /></View>}
        <View style={styles.bar}>
          {thread && (
            <Pressable onPress={() => safetyMenu('profile', thread.person.id, thread.person, () => router.back())} hitSlop={8} accessibilityRole="button" accessibilityLabel="Report or block">
              <Ionicons name="flag-outline" size={22} color={colors.textMuted as string} />
            </Pressable>
          )}
          <TextInput value={draft} onChangeText={setDraft} placeholder="Write a message" placeholderTextColor={colors.textSubtle} maxLength={1000} multiline style={styles.input} accessibilityLabel="Write a message" />
          <Pressable onPress={send} disabled={!draft.trim() || busy} accessibilityRole="button" accessibilityLabel="Send" hitSlop={8} style={(!draft.trim() || busy) && { opacity: 0.4 }}>
            {busy ? <ActivityIndicator color={BLUE} /> : <Ionicons name="send" size={24} color={BLUE} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: BLUE },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#111D42' },
  bubbleText: { fontSize: 15, lineHeight: 21, color: colors.white },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, color: colors.white, fontSize: 15, lineHeight: 21, maxHeight: 120, minHeight: 44, backgroundColor: colors.navyLight, borderRadius: radius.lg, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, borderWidth: 1, borderColor: colors.border },
});
