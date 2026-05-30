import { Pressable, Text } from 'react-native';
import { colors } from '../../theme/colors';

export function Button({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 0.5, borderColor: colors.border }}>
      <Text style={{ color: '#fff' }}>{label}</Text>
    </Pressable>
  );
}