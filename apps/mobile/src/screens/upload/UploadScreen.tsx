import { Text, View } from 'react-native';
import { UploadQueue } from '../../components/upload/UploadQueue';

export function UploadScreen() {
  return <View style={{ padding: 16, gap: 16 }}><Text>Upload</Text><UploadQueue /></View>;
}