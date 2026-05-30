import { View } from 'react-native';
import { colors } from '../../theme/colors';

export function Card({ children }: { children: unknown }) {
  return <View style={{ backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, borderRadius: 20, padding: 16 }}>{children}</View>;
}