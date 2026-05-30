import { Text, View } from 'react-native';
import { SyncStatusBar } from '../asset/SyncStatusBar';

export function UploadQueue() {
  return <View style={{ gap: 12 }}><SyncStatusBar state="queued" /><Text>Offline upload queue</Text></View>;
}