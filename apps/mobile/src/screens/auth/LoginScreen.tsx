import { Text, View, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { startAuthFlow } from '../../lib/authhub.client';

export function LoginScreen() {
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}><Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>VaultKit</Text><Pressable onPress={() => void startAuthFlow()} style={{ marginTop: 16, padding: 14, backgroundColor: colors.accent, borderRadius: 16 }}><Text style={{ color: '#fff' }}>Sign in with AuthHub</Text></Pressable></View>;
}