import { Text, View } from 'react-native';
import { AssetCard } from '../../components/asset/AssetCard';

export function CollectionScreen() {
  return <View style={{ padding: 16, gap: 16 }}><Text>Collection</Text><AssetCard name="Brand deck.pdf" syncStatus="queued" /></View>;
}