// A Community profile: someone's cricket CV. Your own can be edited; anyone else's shows Connect,
// or Message once you are connected.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { BLUE, LOOKING_FOR, lookingLabel, type LookingFor, type Posted, type Profile } from '../../lib/community';
import { Avatar, Stopped, safetyMenu } from '../../components/CommunityBits';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [looking, setLooking] = useState<LookingFor[]>([]);
  const [openToClub, setOpenToClub] = useState(false);
  const [tell, setTell] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await api<Profile>(`/api/community/profile${id ? `?id=${id}` : ''}`);
      setProfile(p); setHeadline(p.headline); setAbout(p.about); setLooking(p.lookingFor); setOpenToClub(p.openToClub); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load this profile.'); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true); setTell(null);
    try {
      const r = await api<Posted>('/api/community/profile', { method: 'PUT', body: { headline, about, lookingFor: looking, openToClub } });
      if (r.status === 'live') { setEditing(false); await load(); } else { setTell(r.tell ?? 'This was not saved.'); }
    } catch (e) { setTell(e instanceof Error ? e.message : 'Could not save.'); }
    setBusy(false);
  };

  const connect = async () => {
    if (!profile) return;
    setBusy(true); setNote(null);
    try { await api('/api/community/connections', { method: 'POST', body: { userId: profile.id, yes: true } }); await load(); }
    catch (e) { setNote(e instanceof Error ? e.message : 'That did not work.'); }
    setBusy(false);
  };

  if (error) return <SafeAreaView style={styles.safe}><Text style={[fonts.small, { color: colors.danger, padding: spacing.lg }]}>{error}</Text></SafeAreaView>;
  if (!profile) return <SafeAreaView style={styles.safe}><ActivityIndicator color={BLUE} style={{ marginTop: spacing.xxl }} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.row}>
            <Avatar name={profile.name} size={72} tint="#22C55E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={fonts.small}>{[profile.roles.map((r) => r[0].toUpperCase() + r.slice(1)).join(' and '), profile.club].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
          {!editing && (
            <View style={styles.tags}>
              {profile.openToClub && <View style={[styles.tag, { backgroundColor: BLUE }]}><Text style={[styles.tagText, { color: '#04091A' }]}>Open to a new club</Text></View>}
              {profile.lookingFor.map((k) => <View key={k} style={styles.tag}><Text style={styles.tagText}>{lookingLabel(k)}</Text></View>)}
              <View style={styles.tag}><Text style={styles.tagText}>{profile.connections} {profile.connections === 1 ? 'connection' : 'connections'}</Text></View>
            </View>
          )}
        </View>

        {!editing && (
          <View style={styles.card}>
            <Text style={styles.label}>Plays as</Text>
            <Text style={styles.value}>{profile.headline || (profile.mine ? 'Add what you play: batter, bowler, keeper.' : 'Not filled in yet.')}</Text>
            <Text style={[styles.label, { marginTop: spacing.md }]}>About</Text>
            <Text style={styles.value}>{profile.about || (profile.mine ? 'Add a line about your cricket.' : 'Not filled in yet.')}</Text>
          </View>
        )}

        {editing && (
          <View style={styles.card}>
            <Text style={styles.label}>Plays as</Text>
            <TextInput value={headline} onChangeText={setHeadline} maxLength={80} placeholder="Top-order bat, off spin" placeholderTextColor={colors.textSubtle} style={styles.input} accessibilityLabel="Plays as" />
            <Text style={styles.label}>About</Text>
            <TextInput value={about} onChangeText={setAbout} maxLength={400} multiline placeholder="Sunday cricket, happy to help with juniors" placeholderTextColor={colors.textSubtle} style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]} accessibilityLabel="About" />
            <Text style={styles.label}>Looking for</Text>
            <View style={styles.tags}>
              {LOOKING_FOR.map((o) => {
                const on = looking.includes(o.key);
                return (
                  <Pressable key={o.key} onPress={() => setLooking(on ? looking.filter((k) => k !== o.key) : [...looking, o.key])} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                    style={[styles.tag, styles.pick, on && { backgroundColor: BLUE }]}>
                    <Text style={[styles.tagText, on && { color: '#04091A' }]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}><Text style={styles.value}>Open to a new club</Text><Text style={fonts.small}>Everyone can see this, including your own club.</Text></View>
              <Switch value={openToClub} onValueChange={setOpenToClub} trackColor={{ true: BLUE }} accessibilityLabel="Open to a new club" />
            </View>
            {tell && <Stopped tell={tell} onClose={() => setTell(null)} />}
          </View>
        )}

        {note && <Text style={[fonts.small, { color: colors.gold }]} accessibilityRole="alert">{note}</Text>}

        {profile.mine ? (
          editing ? (
            <View style={styles.row}>
              <Pressable onPress={() => { setEditing(false); setTell(null); }} style={[styles.btn, styles.btnGhost]} accessibilityRole="button"><Text style={styles.btnGhostText}>Cancel</Text></Pressable>
              <Pressable onPress={save} disabled={busy} style={[styles.btn, { backgroundColor: BLUE }]} accessibilityRole="button">{busy ? <ActivityIndicator color="#04091A" /> : <Text style={styles.btnText}>Save</Text>}</Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditing(true)} style={[styles.btn, { backgroundColor: BLUE, flex: 0 }]} accessibilityRole="button"><Text style={styles.btnText}>Edit profile</Text></Pressable>
          )
        ) : (
          <>
            {profile.link === 'connected' && profile.connectionId && (
              <Pressable onPress={() => router.push({ pathname: '/community/chat/[id]', params: { id: profile.connectionId! } })} style={[styles.btn, { backgroundColor: BLUE, flex: 0 }]} accessibilityRole="button"><Text style={styles.btnText}>Message</Text></Pressable>
            )}
            {(profile.link === 'none' || profile.link === 'incoming') && (
              <Pressable onPress={connect} disabled={busy} style={[styles.btn, { backgroundColor: BLUE, flex: 0 }]} accessibilityRole="button"><Text style={styles.btnText}>{profile.link === 'incoming' ? 'Accept and connect' : 'Connect'}</Text></Pressable>
            )}
            {profile.link === 'requested' && <Text style={[fonts.small, { textAlign: 'center' }]}>Request sent. You will be connected if they say yes too.</Text>}
            <Pressable onPress={() => safetyMenu('profile', profile.id, profile, () => router.back())} style={[styles.btn, styles.btnGhost, { flex: 0 }]} accessibilityRole="button"><Text style={styles.btnGhostText}>Report or block</Text></Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontFamily: display.heavy, fontSize: 22, color: colors.white },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  pick: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14 },
  tagText: { fontSize: 13, fontWeight: '600', color: colors.text },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: BLUE, textTransform: 'uppercase' },
  value: { fontSize: 15, lineHeight: 22, color: colors.text },
  input: { color: colors.white, fontSize: 15, lineHeight: 21, minHeight: 46, backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { flex: 1, minHeight: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#04091A', fontWeight: '800', fontSize: 16 },
  btnGhost: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnGhostText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
