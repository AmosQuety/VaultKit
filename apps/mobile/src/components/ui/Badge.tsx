import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function Badge({ label }: { label: string }) {
  return <View style={{ borderWidth: 0.5, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: colors.textMuted }}>{label}</Text></View>;
}