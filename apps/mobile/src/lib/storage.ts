import * as SecureStore from 'expo-secure-store';

export async function saveToken(key: string, value: string): Promise<void> {
  // Omit platform-specific options for compatibility with multiple expo-secure-store versions
  await SecureStore.setItemAsync(key, value);
}

export async function loadToken(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}