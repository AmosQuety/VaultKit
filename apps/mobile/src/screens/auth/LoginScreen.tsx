import React, { useEffect, useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import Font from 'expo-font';
import { colors } from '../../theme/colors';
import { startAuthFlow } from '../../lib/authhub.client';

export function LoginScreen() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Font.loadAsync({
          'Sora-Regular': require('../../../assets/fonts/Sora-Regular.ttf'),
          'Sora-Medium': require('../../../assets/fonts/Sora-Medium.ttf'),
          'Sora-SemiBold': require('../../../assets/fonts/Sora-SemiBold.ttf'),
        });
      } catch (e) {
        // Font files may not be present in dev; fall back silently
        // This is acceptable for prototype/dev environments.
      }
      if (mounted) setFontsLoaded(true);
    })();
    return () => { mounted = false; };
  }, []);

  const onPress = async () => {
    try {
      await startAuthFlow();
    } catch (err) {
      console.error('Auth failed', err);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }] }>
        <Text style={{ color: colors.text }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <Text style={[styles.title, { color: colors.text, fontFamily: 'Sora-SemiBold' }]}>VaultKit</Text>
      <Pressable onPress={onPress} style={[styles.button, { backgroundColor: colors.accent }]}>
        <Text style={[styles.buttonText, { color: colors.text }]}>Sign in with AuthHub</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, lineHeight: 34 },
  button: { marginTop: 16, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  buttonText: { fontSize: 15, fontFamily: 'Sora-Medium' },
});