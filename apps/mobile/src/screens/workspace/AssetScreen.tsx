import { Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';

export function AssetScreen() {
  return <View style={{ padding: 16, gap: 16 }}><Text>Asset detail</Text><Button label="Download" /></View>;
}