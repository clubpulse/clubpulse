import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompanionChat } from '../../components/CompanionChat';
import { useCompanion } from '../../hooks/useCompanion';
import { colors } from '../../constants/theme';
import { BackBar } from '../../components/BackBar';

export default function CompanionScreen() {
  const { messages, sending, error, send, reset } = useCompanion();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackBar />
      <CompanionChat messages={messages} sending={sending} error={error} onSend={send} onReset={reset} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.navy } });
