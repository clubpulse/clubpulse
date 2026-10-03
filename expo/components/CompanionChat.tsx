import { useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../constants/theme';
import type { CompanionMessage } from '../hooks/useCompanion';

type Props = {
  messages: CompanionMessage[];
  sending: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onReset: () => void;
};

export function CompanionChat({ messages, sending, error, onSend, onReset }: Props) {
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<CompanionMessage>>(null);

  function submit() {
    if (!text.trim() || sending) return;
    onSend(text);
    setText('');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <Text style={fonts.heading}>Your Coach</Text>
        {messages.length > 0 && (
          <Pressable onPress={onReset} disabled={sending}><Text style={{ color: colors.gold }}>New chat</Text></Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.xxl }]}>
            Ask about your game, fitness or Creds.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.assistant]}>
            <Text style={{ color: colors.white, lineHeight: 21 }}>{item.content}</Text>
          </View>
        )}
        ListFooterComponent={sending ? <ActivityIndicator color={colors.gold} style={{ alignSelf: 'flex-start', margin: spacing.sm }} /> : null}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask your coach…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <Pressable onPress={submit} disabled={sending || !text.trim()} style={[styles.send, (sending || !text.trim()) && { opacity: 0.4 }]}>
          <Text style={{ color: colors.navy, fontWeight: '700' }}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  bubble: { maxWidth: '85%', padding: spacing.md, borderRadius: radius.lg },
  user: { alignSelf: 'flex-end', backgroundColor: colors.red },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.navyLight, borderWidth: 1, borderColor: colors.navyBorder },
  error: { color: colors.danger, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.navyBorder },
  input: {
    flex: 1, maxHeight: 120, backgroundColor: colors.navyLight, color: colors.white, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.navyBorder,
  },
  send: { backgroundColor: colors.gold, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
