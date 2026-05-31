declare module 'expo-font' {
  export type FontMap = { [name: string]: unknown };
  export function loadAsync(map: FontMap): Promise<void>;
  const Font: { loadAsync: typeof loadAsync };
  export default Font;
}
