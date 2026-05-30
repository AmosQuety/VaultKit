import { Text, View } from 'react-native';
import { BlurHashImage } from './BlurHashImage';
import { Badge } from '../ui/Badge';
import { colors } from '../../theme/colors';

export function AssetCard({ name, syncStatus }: { name: string; syncStatus: 'synced' | 'queued' | 'uploading' | 'failed' }) {
  return <View style={{ gap: 8 }}><BlurHashImage /><Text style={{ color: colors.text }}>{name}</Text><Badge label={syncStatus} /></View>;
}