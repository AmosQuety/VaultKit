import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function SyncStatusBar({ state }: { state: 'synced' | 'queued' | 'uploading' | 'failed' }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: state === 'failed' ? colors.danger : state === 'queued' ? colors.warning : state === 'uploading' ? colors.accent : colors.success }} /><Text style={{ color: colors.textMuted }}>{state}</Text></View>;
}