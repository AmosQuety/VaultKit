import { TextInput } from 'react-native';
import { colors } from '../../theme/colors';

export function Input({ placeholder }: { placeholder?: string }) {
  return <TextInput placeholder={placeholder} placeholderTextColor={colors.textMuted} style={{ borderWidth: 0.5, borderColor: colors.border, borderRadius: 14, padding: 12, color: colors.text, backgroundColor: colors.surfaceAlt }} />;
}