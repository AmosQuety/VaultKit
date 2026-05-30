import { Text, View } from 'react-native';
import { AssetCard } from '../../components/asset/AssetCard';

export function DashboardScreen() {
  return <View style={{ padding: 16, gap: 16 }}><Text>Recent assets</Text><AssetCard name="Campaign hero.jpg" syncStatus="synced" /></View>;
}