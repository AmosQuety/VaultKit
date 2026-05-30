import { View } from 'react-native';
import { colors } from '../../theme/colors';

export function BlurHashImage() {
  return <View style={{ height: 220, backgroundColor: colors.surfaceAlt, borderRadius: 18, borderWidth: 0.5, borderColor: colors.border }} />;
}