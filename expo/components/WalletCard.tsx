import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colors, fonts, radius, spacing } from '../constants/theme';
import type { Wallet } from '../lib/api';

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const credsToGbp = (creds: number) => gbp.format(creds / 50);   // 50 Creds = £1

export function WalletCard({ wallet, loading }: { wallet: Wallet | null; loading: boolean }) {
  const flexi = wallet?.flexi_balance ?? 0;
  const reward = wallet?.reward_balance ?? 0;
  const total = flexi + reward;

  return (
    <Card>
      <Text style={styles.label}>YOUR CREDS</Text>
      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <>
          <Text style={fonts.big}>{total.toLocaleString('en-GB')}</Text>
          <Text style={fonts.small}>≈ {credsToGbp(total)} · 50 Creds = £1</Text>
          <View style={styles.row}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Flexi</Text>
              <Text style={fonts.title}>{flexi.toLocaleString('en-GB')}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Reward</Text>
              <Text style={fonts.title}>{reward.toLocaleString('en-GB')}</Text>
            </View>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { ...fonts.small, letterSpacing: 1, marginBottom: spacing.sm, color: colors.gold },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  tile: { flex: 1, backgroundColor: colors.navy, borderRadius: radius.md, padding: spacing.md },
  tileLabel: { ...fonts.small, marginBottom: spacing.xs },
});
