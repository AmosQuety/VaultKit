declare module 'react' {
  export type ReactNode = unknown;
  export function useState<T>(initial: T): [T, (value: T) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useRef<T>(initial: T): { current: T };
}

declare module 'react/jsx-runtime' {
  export const Fragment: unknown;
  export function jsx(type: unknown, props: unknown, key?: string): unknown;
  export function jsxs(type: unknown, props: unknown, key?: string): unknown;
}

declare module 'react-native' {
  export const View: unknown;
  export const Text: unknown;
  export const Pressable: unknown;
  export const TextInput: unknown;
  export const ScrollView: unknown;
  export const Image: unknown;
  export const FlatList: unknown;
  export const StyleSheet: { create: (styles: Record<string, unknown>) => Record<string, unknown>; hairlineWidth: number };
  export const Animated: { Value: new (value: number) => unknown };
  export const Linking: { openURL: (url: string) => Promise<void> };
  export const useWindowDimensions: () => { width: number; height: number };
}

declare module 'expo-font' {
  export function useFonts(fonts: Record<string, unknown>): [boolean, unknown];
}

declare module 'expo-secure-store' {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}

declare module 'expo-sqlite' {
  export const openDatabaseSync: (name: string) => {
    execSync: (sql: string) => void;
  };
}

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: unknown;
  }
}