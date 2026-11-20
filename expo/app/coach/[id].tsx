import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Card } from '../../components/Card';
import { api } from '../../lib/api';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

type CoachDetail = {
  id: string;
  full_name: string;
  bio: string | null;
  ecb_level: number | null;
  dbs_verified: boolean;
  hourly_rate: number | null;
  specialisations: string[];
  rating: number | null;
  sessions_count: number;
  availability: string[];
};

export default function CoachDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [coach, setCoach] = useState<CoachDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api<CoachDetail>(`/api/coaches/${id}`)
      .then(setCoach)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Coach', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
        <View style={styles.center}><ActivityIndicator color={colors.brandSky} /></View>
      </SafeAreaView>
    );
  }

  if (!coach) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Coach', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
        <View style={styles.center}><Text style={fonts.regular}>Coach not found.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: coach.full_name, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {coach.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={fonts.heading}>{coach.full_name}</Text>
          <View style={styles.badgeRow}>
            {coach.ecb_level != null && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ECB Level {coach.ecb_level}</Text>
              </View>
            )}
            {coach.dbs_verified && (
              <View style={[styles.badge, { backgroundColor: colors.successDim }]}>
                <Text style={[styles.badgeText, { color: colors.success }]}>✓ DBS verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <Card>
          <View style={styles.statsRow}>
            {coach.rating != null && (
              <View style={styles.stat}>
                <Text style={[styles.statVal, { color: colors.gold }]}>⭐ {coach.rating.toFixed(1)}</Text>
                <Text style={fonts.small}>Rating</Text>
              </View>
            )}
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: colors.brandSky }]}>{coach.sessions_count}</Text>
              <Text style={fonts.small}>Sessions</Text>
            </View>
            {coach.hourly_rate != null && (
              <View style={styles.stat}>
                <Text style={[styles.statVal, { color: colors.success }]}>{coach.hourly_rate}</Text>
                <Text style={fonts.small}>Scores per hour</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Bio */}
        {coach.bio && (
          <Card>
            <Text style={fonts.title}>About</Text>
            <Text style={[fonts.regular, { marginTop: spacing.sm }]}>{coach.bio}</Text>
          </Card>
        )}

        {/* Specialisations */}
        {coach.specialisations.length > 0 && (
          <Card>
            <Text style={fonts.title}>Specialisations</Text>
            <View style={[styles.badgeRow, { marginTop: spacing.sm }]}>
              {coach.specialisations.map((s) => (
                <View key={s} style={[styles.badge, { backgroundColor: 'rgba(37,99,235,0.12)' }]}>
                  <Text style={[styles.badgeText, { color: colors.brandSky }]}>{s}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Availability */}
        <Card>
          <Text style={fonts.title}>Availability</Text>
          {coach.availability.length === 0 ? (
            <Text style={[fonts.small, { marginTop: spacing.sm }]}>No regular slots listed yet.</Text>
          ) : (
            coach.availability.map((slot) => (
              <Text key={slot} style={[fonts.regular, { marginTop: spacing.sm }]}>{slot}</Text>
            ))
          )}
        </Card>

        <Text style={[fonts.small, { textAlign: 'center' }]}>
          To book a session, speak to {coach.full_name.split(' ')[0]} or your club. Booking in the app is coming.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(37,99,235,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.brandSky, fontSize: 28, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(96,165,250,0.12)',
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.brandSky },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statVal: { fontFamily: display.heavy, fontSize: 20 },
  bookBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  bookBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
